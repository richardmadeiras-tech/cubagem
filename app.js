import { criarStore } from './store.js';
import { NOME_APP } from './util.js';
import { montarInicio } from './tela-inicio.js';
import { montarPacote } from './tela-pacote.js';
import { montarToras } from './tela-toras.js';
import { iniciarSync } from './sync.js';

function armazenamento() {
  try { return window.localStorage; } catch { return null; }
}

const raiz = document.getElementById('app');
const botaoVoltar = document.getElementById('voltar');
const tituloEl = document.getElementById('titulo');
const avisoEl = document.getElementById('aviso');
const store = criarStore(armazenamento());

// Telas de edição: chave = rota (#/pacote/<id>, #/toras/<id>). Registradas pelas tarefas das telas.
const telas = new Map();
telas.set('pacote', montarPacote);
telas.set('toras', montarToras);

let timer = null;
function avisar(mensagem) {
  avisoEl.textContent = mensagem;
  avisoEl.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { avisoEl.hidden = true; }, 4000);
}

function titulo(texto, comVoltar) {
  tituloEl.textContent = texto;
  botaoVoltar.hidden = !comVoltar;
  document.title = texto === NOME_APP ? NOME_APP : `${texto} · ${NOME_APP}`;
}

function ir(hash) {
  if (location.hash === hash) rotear();
  else location.hash = hash;
}

let abertoId = null;
const vazio = item => (item.pecas ?? item.toras ?? []).length === 0;

function rotear() {
  // Ao sair de um lançamento vazio, ele é apagado para não acumular lixo na lista.
  if (abertoId) {
    const anterior = store.obter(abertoId);
    if (anterior && vazio(anterior)) store.apagar(abertoId);
    abertoId = null;
  }
  const [, rota, idBruto] = location.hash.split('/');
  let id;
  try { id = idBruto ? decodeURIComponent(idBruto) : undefined; } catch { id = undefined; }
  const montar = telas.get(rota);
  const item = id ? store.obter(id) : null;
  const ctx = { raiz, store, avisar, ir, titulo };
  if (montar && item && item.tipo === rota) {
    abertoId = id;
    montar(ctx, id);
    return;
  }
  if (rota) { location.replace('#/'); return; }
  montarInicio(ctx);
}

botaoVoltar.addEventListener('click', () => ir('#/'));
window.addEventListener('hashchange', rotear);
rotear();

// Só redesenha a lista; uma tela de edição aberta não é trocada por baixo do usuário.
iniciarSync(store, {
  aoAtualizar: () => { if (!location.hash || location.hash === '#/') rotear(); },
  aoFalhar: () => {},
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
