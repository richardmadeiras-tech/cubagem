import { esc, fmt3, fmtNum, parseDecimal } from './util.js';
import { validarPeca, adicionarPeca, substituirPeca, totaisPacote, volumePeca } from './calc.js';
import { textoPacote } from './share-text.js';
import { enviarWhatsApp, copiarTexto } from './compartilhar.js';

// `editando` = índice da linha que está sendo corrigida (ou null para lançar uma peça nova).
export function htmlPacote(p, memoria = { esp: '', larg: '' }, editando = null) {
  const t = totaisPacote(p.pecas);
  const semPecas = p.pecas.length === 0;
  const linhaEmEdicao = Number.isInteger(editando) && editando >= 0 && editando < p.pecas.length
    ? p.pecas[editando]
    : null;
  const v = linhaEmEdicao
    ? { esp: fmtNum(linhaEmEdicao.esp), larg: fmtNum(linhaEmEdicao.larg), comp: fmtNum(linhaEmEdicao.comp), qtd: String(linhaEmEdicao.qtd) }
    : { esp: memoria.esp, larg: memoria.larg, comp: '', qtd: '1' };
  const linhas = p.pecas
    .map((x, i) => {
      const toque = `class="editavel" data-acao="editar" data-i="${i}"`;
      return `
      <tr${linhaEmEdicao && i === editando ? ' class="em-edicao"' : ''}>
        <td ${toque}>${fmtNum(x.esp)}</td><td ${toque}>${fmtNum(x.larg)}</td><td ${toque}>${fmtNum(x.comp)}</td>
        <td class="qtd">
          <button class="mini" data-acao="menos" data-i="${i}" aria-label="Menos uma">−</button>
          <span>${x.qtd}</span>
          <button class="mini" data-acao="mais" data-i="${i}" aria-label="Mais uma">+</button>
        </td>
        <td>${fmt3(volumePeca(x))}</td>
        <td><button class="icone" data-acao="remover" data-i="${i}" aria-label="Remover linha">🗑</button></td>
      </tr>`;
    })
    .join('');
  const botoes = linhaEmEdicao
    ? `<button class="primario" type="submit">Salvar alteração</button>
      <button class="larga" type="button" data-acao="cancelar-edicao">Cancelar</button>`
    : '<button class="primario" type="submit">Adicionar peça</button>';
  return `
    <section class="cab">
      <label>Nº do pacote<input data-campo="numero" value="${esc(p.numero)}" autocomplete="off"></label>
      <label>Espécie<input data-campo="especie" value="${esc(p.especie)}" autocomplete="off"></label>
      <label>Qualidade<input data-campo="qualidade" value="${esc(p.qualidade)}" autocomplete="off"></label>
    </section>
    <form id="form-peca" class="entrada" novalidate>
      <label>Espessura (cm)<input name="esp" inputmode="decimal" autocomplete="off" value="${esc(v.esp)}"></label>
      <label>Largura (cm)<input name="larg" inputmode="decimal" autocomplete="off" value="${esc(v.larg)}"></label>
      <label>Comprimento (m)<input name="comp" inputmode="decimal" autocomplete="off" value="${esc(v.comp)}"></label>
      <label>Quantidade<input name="qtd" inputmode="numeric" autocomplete="off" value="${esc(v.qtd)}"></label>
      ${botoes}
    </form>
    <div class="tabela-rolagem">
      <table>
        <thead><tr><th>Esp</th><th>Larg</th><th>Comp</th><th>Qtd</th><th>m³</th><th></th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6" class="vazio">Nenhuma peça ainda.</td></tr>'}</tbody>
      </table>
    </div>
    ${semPecas ? '' : '<p class="dica">Toque nas medidas de uma linha para corrigir.</p>'}
    <div class="total" id="total">${t.pecas} ${t.pecas === 1 ? 'peça' : 'peças'} = ${fmt3(t.m3)} m³</div>
    <div class="acoes">
      <button class="primario" data-acao="whatsapp" ${semPecas ? 'disabled' : ''}>Enviar no WhatsApp</button>
      <button data-acao="copiar" ${semPecas ? 'disabled' : ''}>Copiar texto</button>
    </div>`;
}

export function montarPacote({ raiz, store, avisar, titulo }, id) {
  let atual = store.obter(id);
  let memoria = { esp: '', larg: '' };
  let editando = null;
  titulo('Pacote', true);

  const salvar = mudanca => {
    atual = store.salvar({ ...atual, ...mudanca });
    if (!store.persistente()) avisar('Atenção: não foi possível salvar neste navegador.');
  };

  const desenhar = focar => {
    raiz.innerHTML = htmlPacote(atual, memoria, editando);
    ligar();
    if (focar) raiz.querySelector(`[name="${focar}"]`)?.focus();
  };

  function ligar() {
    raiz.querySelectorAll('[data-campo]').forEach(campo =>
      campo.addEventListener('input', () => salvar({ [campo.dataset.campo]: campo.value.trim() })),
    );

    raiz.querySelector('#form-peca').addEventListener('submit', evento => {
      evento.preventDefault();
      const f = evento.target.elements;
      const nova = {
        esp: parseDecimal(f.esp.value),
        larg: parseDecimal(f.larg.value),
        comp: parseDecimal(f.comp.value),
        qtd: parseDecimal(f.qtd.value),
      };
      const erro = validarPeca(nova);
      if (erro) { avisar(erro); return; }
      const corrigindo = editando !== null;
      salvar({ pecas: corrigindo ? substituirPeca(atual.pecas, editando, nova) : adicionarPeca(atual.pecas, nova) });
      editando = null;
      memoria = { esp: f.esp.value.trim(), larg: f.larg.value.trim() };
      desenhar('comp');
      if (corrigindo) avisar('Linha corrigida.');
    });

    raiz.querySelector('[data-acao="cancelar-edicao"]')?.addEventListener('click', () => {
      editando = null;
      desenhar('comp');
    });

    raiz.querySelectorAll('[data-i]').forEach(botao =>
      botao.addEventListener('click', () => {
        const i = Number(botao.dataset.i);
        const acao = botao.dataset.acao;
        if (acao === 'editar') { editando = i; desenhar('comp'); return; }
        if (acao === 'remover' && !confirm('Remover esta linha?')) return;
        const pecas = atual.pecas.map(p => ({ ...p }));
        if (acao === 'mais') pecas[i].qtd += 1;
        else if (acao === 'menos') { if (pecas[i].qtd > 1) pecas[i].qtd -= 1; }
        else if (acao === 'remover') pecas.splice(i, 1);
        salvar({ pecas });
        editando = null; // os índices mudaram
        desenhar(null);
      }),
    );

    raiz.querySelector('[data-acao="whatsapp"]').addEventListener('click', () => {
      enviarWhatsApp(textoPacote(atual));
    });
    raiz.querySelector('[data-acao="copiar"]').addEventListener('click', async () => {
      avisar((await copiarTexto(textoPacote(atual))) ? 'Texto copiado.' : 'Não consegui copiar o texto.');
    });
  }

  desenhar(null);
}
