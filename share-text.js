import { fmt2, fmt3, fmtNum } from './util.js';
import { volumePeca, totaisPacote, volumeCompra, volumeIbama, totaisLote } from './calc.js';

export function dataBR(iso) {
  const [ano, mes, dia] = String(iso ?? '').split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function textoPacote(pacote) {
  const titulo = ['PACOTE' + (pacote.numero ? ' ' + pacote.numero : ''), pacote.especie, pacote.qualidade]
    .filter(Boolean)
    .join(' – ');
  const data = dataBR(pacote.data);
  const linhas = pacote.pecas.map(
    p => `${fmtNum(p.esp)} × ${fmtNum(p.larg)} × ${fmtNum(p.comp)} m ........ ${p.qtd} pç = ${fmt3(volumePeca(p))} m³`,
  );
  const t = totaisPacote(pacote.pecas);
  return [
    `📦 ${titulo}`,
    ...(data ? [`Data: ${data}`] : []),
    '',
    ...linhas,
    '',
    `TOTAL: ${plural(t.pecas, 'peça', 'peças')} = ${fmt3(t.m3)} m³ (${fmt2(t.m2)} m²)`,
  ].join('\n');
}

export function textoToras(lote) {
  const titulo = ['TORAS', lote.especie, dataBR(lote.data)].filter(Boolean).join(' – ');
  const linhas = lote.toras.map((t, i) =>
    [
      [t.numero || i + 1, t.especie].filter(Boolean).join(' '),
      fmtNum(t.cerne),
      fmtNum(t.ponta),
      fmtNum(t.pe),
      fmtNum(t.comp),
      `${fmt3(volumeCompra(t))} m³`,
      `${fmt3(volumeIbama(t))} m³`,
    ].join(' | '),
  );
  const total = totaisLote(lote.toras);
  return [
    `🌳 ${titulo}`,
    '',
    'Nº | Compra | Ponta | Pé | Comp | m³ Compra | m³ IBAMA',
    ...linhas,
    '',
    `TOTAL (${plural(total.toras, 'tora', 'toras')})`,
    `Compra: ${fmt3(total.compra)} m³`,
    `IBAMA: ${fmt3(total.ibama)} m³`,
    `Diferença: ${fmt3(total.diferenca)} m³`,
  ].join('\n');
}
