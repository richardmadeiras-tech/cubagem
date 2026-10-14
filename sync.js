import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const TABELA = 'lancamentos';

export const syncAtivo = () => !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

async function chamar(caminho, opcoes = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...opcoes.headers,
    },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.status === 204 ? null : r.json();
}

// Último que mexeu vence. Nada é apagado do celular sem um registro de exclusão mais novo no servidor.
export async function sincronizar(store) {
  const remotos = new Map((await chamar(`${TABELA}?select=id,dados,atualizado,apagado`)).map(l => [l.id, l]));
  const locais = new Map(store.todos().map(i => [i.id, i]));
  const apagados = store.apagadosLocais();
  const enviar = [];

  for (const r of remotos.values()) {
    const local = locais.get(r.id);
    const tumulo = apagados[r.id];
    if (r.apagado) {
      if (local && local.atualizado > r.atualizado) enviar.push(local);
      else if (local) store.removerRemoto(r.id, r.atualizado);
    } else if (local) {
      if (r.atualizado > local.atualizado) store.aplicarRemoto({ ...r.dados, atualizado: r.atualizado });
      else if (r.atualizado < local.atualizado) enviar.push(local);
    } else if (tumulo && tumulo >= r.atualizado) {
      enviar.push({ id: r.id, tumulo });
    } else {
      store.aplicarRemoto({ ...r.dados, atualizado: r.atualizado });
    }
  }
  for (const local of locais.values()) if (!remotos.has(local.id)) enviar.push(local);
  for (const [id, tumulo] of Object.entries(apagados)) if (!remotos.has(id)) enviar.push({ id, tumulo });

  if (enviar.length === 0) return;
  const linhas = enviar.map(i => i.tumulo
    ? { id: i.id, dados: {}, atualizado: i.tumulo, apagado: true }
    : { id: i.id, dados: i, atualizado: i.atualizado, apagado: false });
  await chamar(TABELA, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(linhas),
  });
}

// Liga a sincronização: ao abrir, ao voltar a ter internet, ao voltar para o app e 2 s depois de cada alteração.
export function iniciarSync(store, { aoAtualizar, aoFalhar }) {
  if (!syncAtivo()) return;
  let rodando = false;
  let pendente = false;
  let timer = null;

  const rodar = async () => {
    if (rodando) { pendente = true; return; }
    rodando = true;
    try {
      const antes = JSON.stringify(store.todos());
      await sincronizar(store);
      if (JSON.stringify(store.todos()) !== antes) aoAtualizar();
    } catch {
      aoFalhar();
    } finally {
      rodando = false;
      if (pendente) { pendente = false; agendar(); }
    }
  };
  const agendar = () => { clearTimeout(timer); timer = setTimeout(rodar, 2000); };

  store.aoMudar(agendar);
  window.addEventListener('online', rodar);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) rodar(); });
  rodar();
}
