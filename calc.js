import { parseDecimal } from './util.js';

const PI_4 = Math.PI / 4;

const positivo = n => Number.isFinite(n) && n > 0;

// ---------- Pacote (madeira serrada) ----------

export function validarPeca({ esp, larg, comp, qtd }) {
  if (![esp, larg, comp].every(positivo)) {
    return 'Espessura, largura e comprimento precisam ser números maiores que zero.';
  }
  if (!Number.isInteger(qtd) || qtd < 1) {
    return 'A quantidade precisa ser um número inteiro de 1 ou mais.';
  }
  return null;
}

// esp e larg em cm, comp em m, resultado em m³ (sem arredondar).
export function volumePeca({ esp, larg, comp, qtd }) {
  return (esp / 100) * (larg / 100) * comp * qtd;
}

// Devolve uma lista nova: soma a quantidade se a medida já existe, e ordena por esp, larg, comp.
export function adicionarPeca(pecas, nova) {
  const mesma = p => p.esp === nova.esp && p.larg === nova.larg && p.comp === nova.comp;
  const lista = pecas.some(mesma)
    ? pecas.map(p => (mesma(p) ? { ...p, qtd: p.qtd + nova.qtd } : { ...p }))
    : [...pecas.map(p => ({ ...p })), { ...nova }];
  return lista.sort((a, b) => a.esp - b.esp || a.larg - b.larg || a.comp - b.comp);
}

// Vários comprimentos de uma vez, com a mesma espessura e largura. `linhas` = [{comp, qtd}] como texto digitado.
// Linhas totalmente em branco são ignoradas; quantidade em branco vale 1. Tudo ou nada: se uma linha estiver
// errada, não devolve peça nenhuma e diz qual é a linha.
export function pecasDeComprimentos({ esp, larg }, linhas) {
  const falha = erro => ({ pecas: [], erro });
  if (![esp, larg].every(positivo)) return falha('Espessura e largura precisam ser números maiores que zero.');
  const pecas = [];
  for (let i = 0; i < linhas.length; i++) {
    const compTxt = String(linhas[i].comp ?? '').trim();
    const qtdTxt = String(linhas[i].qtd ?? '').trim();
    if (compTxt === '') {
      if (qtdTxt === '' || qtdTxt === '1') continue; // linha em branco
      return falha(`Linha ${i + 1}: falta o comprimento.`);
    }
    const comp = parseDecimal(compTxt);
    if (!positivo(comp)) return falha(`Linha ${i + 1}: o comprimento precisa ser um número maior que zero.`);
    const qtd = qtdTxt === '' ? 1 : parseDecimal(qtdTxt);
    if (!Number.isInteger(qtd) || qtd < 1) {
      return falha(`Linha ${i + 1}: a quantidade precisa ser um número inteiro de 1 ou mais.`);
    }
    pecas.push({ esp, larg, comp, qtd });
  }
  if (pecas.length === 0) return falha('Preencha pelo menos um comprimento.');
  return { pecas, erro: null };
}

// Troca as medidas da linha `indice` por `nova` (soma se a medida já existe em outra linha).
export function substituirPeca(pecas, indice, nova) {
  if (!Number.isInteger(indice) || indice < 0 || indice >= pecas.length) {
    return pecas.map(p => ({ ...p }));
  }
  return adicionarPeca(pecas.filter((_, i) => i !== indice), nova);
}

// Acabamento do pacote: "aplainado" só quando está marcado; qualquer outra coisa (inclusive lançamento antigo) é serrado.
export function acabamentoDe(pacote) {
  return pacote?.acabamento === 'aplainado' ? 'aplainado' : 'serrado';
}

// Área da face larga em m² (larg em cm, comp em m). É a conversão de m³ para m²: m³ ÷ espessura.
export function areaPeca({ larg, comp, qtd }) {
  return (larg / 100) * comp * qtd;
}

export function totaisPacote(pecas) {
  return {
    pecas: pecas.reduce((soma, p) => soma + p.qtd, 0),
    m3: pecas.reduce((soma, p) => soma + volumePeca(p), 0),
    m2: pecas.reduce((soma, p) => soma + areaPeca(p), 0),
  };
}

// ---------- Tora ----------

// Diâmetro em cm -> área do círculo em m².
export function areaCirculo(diametroCm) {
  return PI_4 * (diametroCm / 100) ** 2;
}

// Compra: cilindro só com o cerne (ponta fina).
export function volumeCompra({ cerne, comp }) {
  return areaCirculo(cerne) * comp;
}

// IBAMA: Smalian com os diâmetros totais (com alburno) da ponta e do pé.
export function volumeIbama({ ponta, pe, comp }) {
  return ((areaCirculo(ponta) + areaCirculo(pe)) / 2) * comp;
}

export function validarTora({ cerne, ponta, pe, comp }) {
  if (![cerne, ponta, pe, comp].every(positivo)) {
    return 'Cerne, ponta, pé e comprimento precisam ser números maiores que zero.';
  }
  return null;
}

// Avisos de medida suspeita. Não impedem o lançamento.
export function avisosTora({ cerne, ponta, pe }) {
  const avisos = [];
  if (cerne > ponta) avisos.push('A medida de Compra é maior que a Ponta do IBAMA. Confira as medidas.');
  if (pe < ponta) avisos.push('O Pé é menor que a Ponta. Confira as medidas.');
  return avisos;
}

export function totaisLote(toras) {
  const compra = toras.reduce((soma, t) => soma + volumeCompra(t), 0);
  const ibama = toras.reduce((soma, t) => soma + volumeIbama(t), 0);
  return { toras: toras.length, compra, ibama, diferenca: ibama - compra };
}
