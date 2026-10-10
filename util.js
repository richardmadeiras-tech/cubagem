// Lê um número digitado pelo usuário. Aceita vírgula ou ponto; devolve NaN se não for um número simples >= 0.
export function parseDecimal(texto) {
  const s = String(texto ?? '').trim().replace(',', '.');
  if (!/^(\d+(\.\d+)?|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

// Volume com 3 casas e vírgula: 0.354645 -> "0,355"
export function fmt3(n) {
  return n.toFixed(3).replace('.', ',');
}

// Medida como o usuário digitou, com vírgula: 2.3 -> "2,3"
export function fmtNum(n) {
  return String(n).replace('.', ',');
}

// Data local no formato AAAA-MM-DD (não usa UTC, para não virar o dia seguinte à noite).
export function hojeISO(d = new Date()) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Escapa texto para inserir com segurança em HTML.
export function esc(valor) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(valor ?? '').replace(/[&<>"']/g, c => mapa[c]);
}
