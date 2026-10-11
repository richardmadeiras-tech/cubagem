import { esc, fmt2, fmt3, fmtNum, parseDecimal } from './util.js';
import {
  acabamentoDe, validarPeca, adicionarPeca, substituirPeca, pecasDeComprimentos, totaisPacote, volumePeca,
} from './calc.js';
import { textoPacote } from './share-text.js';
import { enviarWhatsApp, copiarTexto } from './compartilhar.js';

const LINHAS_INICIAIS = 3;

// Uma linha em branco de "comprimento × quantidade" (a quantidade começa em 1).
export function htmlLinhaComprimento() {
  return `<div class="linha-comp">
        <label>Comprimento (m)<input data-comp inputmode="decimal" autocomplete="off"></label>
        <label>Qtd<input data-qtd inputmode="numeric" autocomplete="off" value="1"></label>
      </div>`;
}

// Total do pacote: serrado mostra m³ primeiro e aplainado mostra m² primeiro.
export function textoTotal(p) {
  const t = totaisPacote(p.pecas);
  const pecas = `${t.pecas} ${t.pecas === 1 ? 'peça' : 'peças'}`;
  const m3 = `${fmt3(t.m3)} m³`;
  const m2 = `${fmt2(t.m2)} m²`;
  return acabamentoDe(p) === 'aplainado' ? `${pecas} = ${m2} · ${m3}` : `${pecas} = ${m3} · ${m2}`;
}

// `editando` = índice da linha que está sendo corrigida (ou null para lançar peças novas).
export function htmlPacote(p, memoria = { esp: '', larg: '' }, editando = null) {
  const t = totaisPacote(p.pecas);
  const semPecas = p.pecas.length === 0;
  const linhaEmEdicao = Number.isInteger(editando) && editando >= 0 && editando < p.pecas.length
    ? p.pecas[editando]
    : null;
  const v = linhaEmEdicao
    ? { esp: fmtNum(linhaEmEdicao.esp), larg: fmtNum(linhaEmEdicao.larg), comp: fmtNum(linhaEmEdicao.comp), qtd: String(linhaEmEdicao.qtd) }
    : { esp: memoria.esp, larg: memoria.larg };
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
  const campos = linhaEmEdicao
    ? `<label>Comprimento (m)<input name="comp" inputmode="decimal" autocomplete="off" value="${esc(v.comp)}"></label>
      <label>Quantidade<input name="qtd" inputmode="numeric" autocomplete="off" value="${esc(v.qtd)}"></label>
      <button class="primario" type="submit">Salvar alteração</button>
      <button class="larga" type="button" data-acao="cancelar-edicao">Cancelar</button>`
    : `<div class="comprimentos larga" id="comprimentos">${htmlLinhaComprimento().repeat(LINHAS_INICIAIS)}</div>
      <button class="larga" type="button" data-acao="mais-comprimento">+ Outro comprimento</button>
      <button class="primario" type="submit">Adicionar peças</button>`;
  const acabamento = acabamentoDe(p);
  const opcao = (valor, rotulo) =>
    `<button type="button" class="opcao" data-acabamento="${valor}" aria-pressed="${acabamento === valor}">${rotulo}</button>`;
  return `
    <div class="seletor" role="group" aria-label="Acabamento do pacote">${opcao('serrado', 'Serrado')}${opcao('aplainado', 'Aplainado')}</div>
    <section class="cab">
      <label>Nº do pacote<input data-campo="numero" value="${esc(p.numero)}" autocomplete="off"></label>
      <label>Espécie<input data-campo="especie" value="${esc(p.especie)}" autocomplete="off"></label>
      <label>Qualidade<input data-campo="qualidade" value="${esc(p.qualidade)}" autocomplete="off"></label>
    </section>
    <form id="form-peca" class="entrada" novalidate>
      <label>Espessura (cm)<input name="esp" inputmode="decimal" autocomplete="off" value="${esc(v.esp)}"></label>
      <label>Largura (cm)<input name="larg" inputmode="decimal" autocomplete="off" value="${esc(v.larg)}"></label>
      ${campos}
    </form>
    <div class="tabela-rolagem">
      <table>
        <thead><tr><th>Esp</th><th>Larg</th><th>Comp</th><th>Qtd</th><th>m³</th><th></th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6" class="vazio">Nenhuma peça ainda.</td></tr>'}</tbody>
      </table>
    </div>
    ${semPecas ? '' : '<p class="dica">Toque nas medidas de uma linha para corrigir.</p>'}
    <div class="total" id="total">${textoTotal(p)}</div>
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
    if (focar === 'comp') {
      (raiz.querySelector('[name="comp"]') ?? raiz.querySelector('[data-comp]'))?.focus();
    } else if (focar) {
      raiz.querySelector(`[name="${focar}"]`)?.focus();
    }
  };

  function ligar() {
    raiz.querySelectorAll('[data-campo]').forEach(campo =>
      campo.addEventListener('input', () => salvar({ [campo.dataset.campo]: campo.value.trim() })),
    );

    raiz.querySelector('#form-peca').addEventListener('submit', evento => {
      evento.preventDefault();
      const f = evento.target.elements;
      if (editando !== null) {
        const nova = {
          esp: parseDecimal(f.esp.value),
          larg: parseDecimal(f.larg.value),
          comp: parseDecimal(f.comp.value),
          qtd: parseDecimal(f.qtd.value),
        };
        const erro = validarPeca(nova);
        if (erro) { avisar(erro); return; }
        salvar({ pecas: substituirPeca(atual.pecas, editando, nova) });
        editando = null;
        memoria = { esp: f.esp.value.trim(), larg: f.larg.value.trim() };
        desenhar('comp');
        avisar('Linha corrigida.');
        return;
      }
      const linhas = [...raiz.querySelectorAll('.linha-comp')].map(l => ({
        comp: l.querySelector('[data-comp]').value,
        qtd: l.querySelector('[data-qtd]').value,
      }));
      const r = pecasDeComprimentos({ esp: parseDecimal(f.esp.value), larg: parseDecimal(f.larg.value) }, linhas);
      if (r.erro) { avisar(r.erro); return; }
      salvar({ pecas: r.pecas.reduce((lista, p) => adicionarPeca(lista, p), atual.pecas) });
      memoria = { esp: f.esp.value.trim(), larg: f.larg.value.trim() };
      desenhar('comp');
      avisar(r.pecas.length === 1 ? 'Peça adicionada.' : `${r.pecas.length} comprimentos adicionados.`);
    });

    raiz.querySelector('[data-acao="mais-comprimento"]')?.addEventListener('click', () => {
      const lista = raiz.querySelector('#comprimentos');
      lista.insertAdjacentHTML('beforeend', htmlLinhaComprimento());
      lista.lastElementChild.querySelector('[data-comp]').focus();
    });

    // Troca o acabamento sem redesenhar a tela (não perde o que está sendo digitado).
    raiz.querySelectorAll('[data-acabamento]').forEach(botao =>
      botao.addEventListener('click', () => {
        salvar({ acabamento: botao.dataset.acabamento });
        raiz.querySelectorAll('[data-acabamento]').forEach(b => b.setAttribute('aria-pressed', String(b === botao)));
        raiz.querySelector('#total').textContent = textoTotal(atual);
      }),
    );

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
