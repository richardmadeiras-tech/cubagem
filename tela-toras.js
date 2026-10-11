import { esc, fmt3, fmtNum, parseDecimal } from './util.js';
import { validarTora, avisosTora, totaisLote, volumeCompra, volumeIbama } from './calc.js';
import { textoToras } from './share-text.js';
import { enviarWhatsApp, copiarTexto } from './compartilhar.js';

const MEDIDAS = ['compraPonta', 'compraPe', 'compraComp', 'ibamaPe', 'ibamaPonta', 'ibamaComp'];

// `memoria.especie` = espécie da última tora lançada (vem preenchida na próxima).
export function htmlToras(lote, memoria = { especie: '' }) {
  const tot = totaisLote(lote.toras);
  const semToras = lote.toras.length === 0;
  const linhas = lote.toras
    .map(
      (t, i) => `
      <tr>
        <td>${esc(t.numero || i + 1)}${t.especie ? `<br><small class="especie">${esc(t.especie)}</small>` : ''}</td>
        <td>${fmtNum(t.compraPonta)} / ${fmtNum(t.compraPe)}<br><small>${fmtNum(t.compraComp)} m</small><br><strong>${fmt3(volumeCompra(t))}</strong></td>
        <td>${fmtNum(t.ibamaPonta)} / ${fmtNum(t.ibamaPe)}<br><small>${fmtNum(t.ibamaComp)} m</small><br><strong>${fmt3(volumeIbama(t))}</strong></td>
        <td><button class="icone" data-acao="remover" data-i="${i}" aria-label="Remover tora">🗑</button></td>
      </tr>`,
    )
    .join('');
  return `
    <section class="cab">
      <label style="grid-column: 1 / -1">Espécie do lote<input data-campo="especie" value="${esc(lote.especie)}" autocomplete="off"></label>
    </section>
    <form id="form-tora" class="entrada" novalidate>
      <label>Nº da tora (opcional)<input name="numero" inputmode="text" autocomplete="off" placeholder="${lote.toras.length + 1}"></label>
      <label>Espécie desta tora (opcional)<input name="especie" inputmode="text" autocomplete="off" value="${esc(memoria.especie)}"></label>
      <p class="grupo">Compra</p>
      <label>Compra · Ponta (cm)<input name="compraPonta" inputmode="decimal" autocomplete="off"></label>
      <label>Compra · Pé (cm)<input name="compraPe" inputmode="decimal" autocomplete="off"></label>
      <label>Compra · Comprimento (m)<input name="compraComp" inputmode="decimal" autocomplete="off"></label>
      <p class="grupo">IBAMA</p>
      <label>IBAMA · Ponta (cm)<input name="ibamaPonta" inputmode="decimal" autocomplete="off"></label>
      <label>IBAMA · Pé (cm)<input name="ibamaPe" inputmode="decimal" autocomplete="off"></label>
      <label>IBAMA · Comprimento (m)<input name="ibamaComp" inputmode="decimal" autocomplete="off"></label>
      <button class="primario" type="submit">Adicionar tora</button>
    </form>
    <p class="dica">Compra: medidas sem alburno. IBAMA: medidas totais, com alburno. Cada conta tem o seu comprimento (o do IBAMA acompanha o da Compra até você mudar).</p>
    <div class="tabela-rolagem">
      <table>
        <thead><tr><th>Nº</th><th>Compra<br><small>Ponta / Pé</small></th><th>IBAMA<br><small>Ponta / Pé</small></th><th></th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="4" class="vazio">Nenhuma tora ainda.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="total" id="total">
      <div>${tot.toras} ${tot.toras === 1 ? 'tora' : 'toras'}</div>
      <div>Compra: ${fmt3(tot.compra)} m³</div>
      <div>IBAMA: ${fmt3(tot.ibama)} m³</div>
      <div>Diferença: ${fmt3(tot.diferenca)} m³</div>
    </div>
    <div class="acoes">
      <button class="primario" data-acao="whatsapp" ${semToras ? 'disabled' : ''}>Enviar no WhatsApp</button>
      <button data-acao="copiar" ${semToras ? 'disabled' : ''}>Copiar texto</button>
    </div>`;
}

export function montarToras({ raiz, store, avisar, titulo }, id) {
  let atual = store.obter(id);
  let memoria = { especie: '' };
  titulo('Toras', true);

  const salvar = mudanca => {
    atual = store.salvar({ ...atual, ...mudanca });
    if (!store.persistente()) avisar('Atenção: não foi possível salvar neste navegador.');
  };

  const desenhar = focar => {
    raiz.innerHTML = htmlToras(atual, memoria);
    ligar();
    if (focar) raiz.querySelector(`[name="${focar}"]`)?.focus();
  };

  function ligar() {
    raiz.querySelector('[data-campo="especie"]').addEventListener('input', evento =>
      salvar({ especie: evento.target.value.trim() }),
    );

    // O comprimento do IBAMA acompanha o da Compra enquanto você não mexer nele (os dois costumam ser iguais).
    const compraComp = raiz.querySelector('[name="compraComp"]');
    const ibamaComp = raiz.querySelector('[name="ibamaComp"]');
    let ibamaMexido = false;
    compraComp.addEventListener('input', () => { if (!ibamaMexido) ibamaComp.value = compraComp.value; });
    ibamaComp.addEventListener('input', () => { ibamaMexido = ibamaComp.value.trim() !== compraComp.value.trim(); });

    raiz.querySelector('#form-tora').addEventListener('submit', evento => {
      evento.preventDefault();
      const f = evento.target.elements;
      const nova = { numero: f.numero.value.trim(), especie: f.especie.value.trim() };
      for (const medida of MEDIDAS) nova[medida] = parseDecimal(f[medida].value);
      const erro = validarTora(nova);
      if (erro) { avisar(erro); return; }
      salvar({ toras: [...atual.toras, nova] });
      memoria = { especie: nova.especie };
      desenhar('compraPonta');
      const avisos = avisosTora(nova);
      if (avisos.length) avisar(avisos.join(' '));
    });

    raiz.querySelectorAll('[data-acao="remover"]').forEach(botao =>
      botao.addEventListener('click', () => {
        if (!confirm('Remover esta tora?')) return;
        const toras = atual.toras.filter((_, i) => i !== Number(botao.dataset.i));
        salvar({ toras });
        desenhar(null);
      }),
    );

    raiz.querySelector('[data-acao="whatsapp"]').addEventListener('click', () => {
      enviarWhatsApp(textoToras(atual));
    });
    raiz.querySelector('[data-acao="copiar"]').addEventListener('click', async () => {
      avisar((await copiarTexto(textoToras(atual))) ? 'Texto copiado.' : 'Não consegui copiar o texto.');
    });
  }

  desenhar(null);
}
