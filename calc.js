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

// Troca as medidas da linha `indice` por `nova` (soma se a medida já existe em outra linha).
export function substituirPeca(pecas, indice, nova) {
  if (!Number.isInteger(indice) || indice < 0 || indice >= pecas.length) {
    return pecas.map(p => ({ ...p }));
  }
  return adicionarPeca(pecas.filter((_, i) => i !== indice), nova);
}

export function totaisPacote(pecas) {
  return {
    pecas: pecas.reduce((soma, p) => soma + p.qtd, 0),
    m3: pecas.reduce((soma, p) => soma + volumePeca(p), 0),
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
  if (cerne > ponta) avisos.push('O cerne é maior que a ponta total. Confira as medidas.');
  if (pe < ponta) avisos.push('O pé é menor que a ponta. Confira as medidas.');
  return avisos;
}

export function totaisLote(toras) {
  const compra = toras.reduce((soma, t) => soma + volumeCompra(t), 0);
  const ibama = toras.reduce((soma, t) => soma + volumeIbama(t), 0);
  return { toras: toras.length, compra, ibama, diferenca: ibama - compra };
}
