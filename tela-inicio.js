import { esc, fmt2, fmt3, NOME_APP } from './util.js';
import { acabamentoDe, totaisPacote, totaisLote } from './calc.js';
import { dataBR } from './share-text.js';
import { novoItem } from './store.js';
import { baixarBackup } from './compartilhar.js';

export function resumo(item) {
  if (item.tipo === 'pacote') {
    const t = totaisPacote(item.pecas);
    const aplainado = acabamentoDe(item) === 'aplainado';
    const m3 = `${fmt3(t.m3)} m³`;
    const m2 = `${fmt2(t.m2)} m²`;
    const partes = [
      `Pacote ${item.numero || '(sem nº)'}`,
      item.especie,
      aplainado ? 'Aplainado' : 'Serrado',
      `${t.pecas} pç`,
      ...(aplainado ? [m2, m3] : [m3, m2]),
    ];
    return '📦 ' + partes.filter(Boolean).join(' · ');
  }
  const t = totaisLote(item.toras);
  const partes = [
    'Toras',
    item.especie,
    `${t.toras} ${t.toras === 1 ? 'tora' : 'toras'}`,
    `compra ${fmt3(t.compra)} m³`,
    `IBAMA ${fmt3(t.ibama)} m³`,
  ];
  return '🌳 ' + partes.filter(Boolean).join(' · ');
}

export function htmlInicio(itens, persistente) {
  const cartoes = itens
    .map(
      i => `
    <div class="cartao">
      <button class="cartao-abrir" data-acao="abrir" data-tipo="${esc(i.tipo)}" data-id="${esc(i.id)}">
        ${esc(resumo(i))}<small>${esc(dataBR(i.data))}</small>
      </button>
      <button class="icone" data-acao="duplicar" data-id="${esc(i.id)}" aria-label="Duplicar lançamento">⧉</button>
      <button class="icone" data-acao="apagar" data-id="${esc(i.id)}" aria-label="Apagar lançamento">🗑</button>
    </div>`,
    )
    .join('');
  return `
    <div class="botoes-grandes">
      <button class="grande primario" data-acao="novo" data-tipo="pacote">📦 Pacote</button>
      <button class="grande primario" data-acao="novo" data-tipo="toras">🌳 Toras</button>
    </div>
    <h2>Salvos</h2>
    ${cartoes || '<p class="vazio">Nada salvo ainda.</p>'}
    ${persistente ? '' : '<p class="alerta">Atenção: não foi possível salvar neste navegador. Os lançamentos somem ao fechar.</p>'}
    <div class="acoes">
      <button data-acao="exportar">Exportar cópia de segurança</button>
      <label class="botao">Importar cópia<input type="file" id="arquivo" accept=".json,application/json" hidden></label>
    </div>`;
}

export function montarInicio({ raiz, store, avisar, ir, titulo }) {
  titulo(NOME_APP, false);
  raiz.innerHTML = htmlInicio(store.listar(), store.persistente());

  raiz.querySelectorAll('[data-acao="novo"]').forEach(botao =>
    botao.addEventListener('click', () => {
      const item = store.salvar(novoItem(botao.dataset.tipo));
      ir(`#/${item.tipo}/${encodeURIComponent(item.id)}`);
    }),
  );
  raiz.querySelectorAll('[data-acao="abrir"]').forEach(botao =>
    botao.addEventListener('click', () => ir(`#/${botao.dataset.tipo}/${encodeURIComponent(botao.dataset.id)}`)),
  );
  raiz.querySelectorAll('[data-acao="duplicar"]').forEach(botao =>
    botao.addEventListener('click', () => {
      const copia = store.duplicar(botao.dataset.id);
      if (!copia) { avisar('Não encontrei o lançamento para duplicar.'); return; }
      avisar('Cópia criada.');
      ir(`#/${copia.tipo}/${encodeURIComponent(copia.id)}`);
    }),
  );
  raiz.querySelectorAll('[data-acao="apagar"]').forEach(botao =>
    botao.addEventListener('click', () => {
      if (!confirm('Apagar este lançamento?')) return;
      store.apagar(botao.dataset.id);
      montarInicio({ raiz, store, avisar, ir, titulo });
    }),
  );
  raiz.querySelector('[data-acao="exportar"]').addEventListener('click', () => {
    if (store.listar().length === 0) { avisar('Não há nada para exportar.'); return; }
    baixarBackup(store.exportar());
  });
  raiz.querySelector('#arquivo').addEventListener('change', async evento => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    const r = store.importar(await arquivo.text());
    if (!r.ok) { avisar(r.erro); return; }
    avisar(`${r.importados} lançamento(s) importado(s)` + (r.ignorados ? `, ${r.ignorados} ignorado(s).` : '.'));
    montarInicio({ raiz, store, avisar, ir, titulo });
  });
}
