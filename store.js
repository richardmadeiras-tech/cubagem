import { hojeISO } from './util.js';
import { normalizarTora } from './calc.js';

const CHAVE = 'cubagem:v1';
const CHAVE_APAGADOS = 'cubagem:apagados'; // id -> momento da exclusão (para a sincronização)

export function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function novoItem(tipo, hoje = hojeISO()) {
  const base = { id: novoId(), tipo, especie: '', data: hoje, atualizado: 0 };
  return tipo === 'pacote'
    ? { ...base, numero: '', qualidade: '', acabamento: 'serrado', pecas: [] }
    : { ...base, toras: [] };
}

const numerico = (obj, chaves) => !!obj && typeof obj === 'object' && chaves.every(k => Number.isFinite(obj[k]));

function itemValido(i) {
  if (!i || typeof i !== 'object' || typeof i.id !== 'string' || i.id === '') return false;
  if (i.tipo === 'pacote') {
    return Array.isArray(i.pecas) && i.pecas.every(p => numerico(p, ['esp', 'larg', 'comp', 'qtd']));
  }
  if (i.tipo === 'toras') {
    const novas = ['compraPonta', 'compraPe', 'compraComp', 'ibamaPe', 'ibamaPonta', 'ibamaComp'];
    const antigas = ['cerne', 'ponta', 'pe', 'comp']; // formato anterior (uma medida de compra só)
    return Array.isArray(i.toras) && i.toras.every(t => numerico(t, novas) || numerico(t, antigas));
  }
  return false;
}

// Lançamentos antigos de toras são convertidos ao abrir.
const normalizarItem = i => (i.tipo === 'toras' ? { ...i, toras: i.toras.map(normalizarTora) } : i);

function carregar(storage) {
  try {
    const bruto = storage.getItem(CHAVE);
    const dados = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(dados) ? dados.filter(itemValido).map(normalizarItem) : [];
  } catch {
    return [];
  }
}

function carregarApagados(storage) {
  try {
    const dados = JSON.parse(storage.getItem(CHAVE_APAGADOS) || '{}');
    return dados && typeof dados === 'object' && !Array.isArray(dados) ? dados : {};
  } catch {
    return {};
  }
}

const ERRO_ARQUIVO = 'O arquivo não é uma cópia de segurança válida do app de cubagem.';

export function criarStore(storage) {
  let itens = carregar(storage);
  let apagados = carregarApagados(storage);
  const ouvintes = [];
  let persistente = true;
  let relogio = itens.reduce((maior, i) => Math.max(maior, i.atualizado || 0), 0);
  const agora = () => (relogio = Math.max(Date.now(), relogio + 1));

  const gravar = () => {
    try {
      storage.setItem(CHAVE, JSON.stringify(itens));
      storage.setItem(CHAVE_APAGADOS, JSON.stringify(apagados));
      persistente = true;
    } catch {
      persistente = false;
    }
  };

  const avisarMudanca = () => ouvintes.forEach(f => f());

  const gravarItem = item => {
    const novo = { ...item, atualizado: agora() };
    itens = itens.some(i => i.id === item.id)
      ? itens.map(i => (i.id === item.id ? novo : i))
      : [...itens, novo];
    return novo;
  };

  return {
    listar: () => [...itens].sort((a, b) => b.atualizado - a.atualizado),
    obter: id => itens.find(i => i.id === id) ?? null,
    salvar(item) {
      const novo = gravarItem(item);
      gravar();
      avisarMudanca();
      return novo;
    },
    apagar(id) {
      itens = itens.filter(i => i.id !== id);
      apagados = { ...apagados, [id]: agora() };
      gravar();
      avisarMudanca();
    },
    // Cópia independente: id novo, data de hoje e, no pacote, sem número (para não repetir o número).
    duplicar(id, hoje = hojeISO()) {
      const original = itens.find(i => i.id === id);
      if (!original) return null;
      const copia = { ...structuredClone(original), id: novoId(), data: hoje };
      if (copia.tipo === 'pacote') copia.numero = '';
      const nova = gravarItem(copia);
      gravar();
      avisarMudanca();
      return nova;
    },
    // --- sincronização (veja sync.js) ---
    aoMudar: f => ouvintes.push(f),
    todos: () => [...itens],
    apagadosLocais: () => ({ ...apagados }),
    // Aplica o que veio do servidor sem alterar o relógio do item. Devolve false se o item for inválido.
    aplicarRemoto(item) {
      if (!itemValido(item) || !Number.isFinite(item.atualizado)) return false;
      const novo = normalizarItem(item);
      relogio = Math.max(relogio, novo.atualizado);
      itens = itens.some(i => i.id === novo.id) ? itens.map(i => (i.id === novo.id ? novo : i)) : [...itens, novo];
      if (apagados[novo.id]) { apagados = { ...apagados }; delete apagados[novo.id]; }
      gravar();
      return true;
    },
    removerRemoto(id, momento) {
      itens = itens.filter(i => i.id !== id);
      apagados = { ...apagados, [id]: momento };
      gravar();
    },
    persistente: () => persistente,
    exportar: () => JSON.stringify({ app: 'cubagem', versao: 1, itens }, null, 2),
    importar(texto) {
      let dados;
      try {
        dados = JSON.parse(texto);
      } catch {
        return { ok: false, erro: ERRO_ARQUIVO };
      }
      if (!dados || dados.app !== 'cubagem' || !Array.isArray(dados.itens)) {
        return { ok: false, erro: ERRO_ARQUIVO };
      }
      const validos = dados.itens.filter(itemValido).map(normalizarItem);
      if (validos.length === 0) {
        return { ok: false, erro: 'A cópia de segurança não tem nenhum lançamento válido.' };
      }
      // Nunca sobrescreve o que já existe: igual = ignora; diferente = entra como cópia com id novo.
      const semRelogio = i => JSON.stringify({ ...i, atualizado: 0 });
      let importados = 0;
      let repetidos = 0;
      for (const item of validos) {
        const local = itens.find(i => i.id === item.id);
        if (!local) {
          gravarItem(item);
          importados++;
        } else if (semRelogio(local) === semRelogio(item)) {
          repetidos++;
        } else {
          gravarItem({ ...item, id: novoId() });
          importados++;
        }
      }
      gravar();
      avisarMudanca();
      return { ok: true, importados, ignorados: dados.itens.length - validos.length + repetidos };
    },
  };
}
