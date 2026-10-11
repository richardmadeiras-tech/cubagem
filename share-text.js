import { fmt2, fmt3, fmtNum } from './util.js';
import { acabamentoDe, volumePeca, totaisPacote, volumeCompra, volumeIbama, totaisLote } from './calc.js';

export function dataBR(iso) {
  const [ano, mes, dia] = String(iso ?? '').split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function textoPacote(pacote) {
  const aplainado = acabamentoDe(pacote) === 'aplainado';
  const titulo = ['PACOTE' + (pacote.numero ? ' ' + pacote.numero : ''), pacote.especie, pacote.qualidade, aplainado ? 'APLAINADO' : 'SERRADO']
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
    `TOTAL: ${plural(t.pecas, 'peça', 'peças')} = ${aplainado ? `${fmt2(t.m2)} m² (${fmt3(t.m3)} m³)` : `${fmt3(t.m3)} m³ (${fmt2(t.m2)} m²)`}`,
  ].join('\n');
}

export function textoToras(lote) {
  const titulo = ['TORAS', lote.especie, dataBR(lote.data)].filter(Boolean).join(' – ');
  const blocos = lote.toras.flatMap((t, i) => [
    [t.numero || i + 1, t.especie].filter(Boolean).join(' '),
    `Compra: Ponta ${fmtNum(t.compraPonta)} | Pé ${fmtNum(t.compraPe)} | Comp ${fmtNum(t.compraComp)} = ${fmt3(volumeCompra(t))} m³`,
    `IBAMA: Pé ${fmtNum(t.ibamaPe)} | Ponta ${fmtNum(t.ibamaPonta)} | Comp ${fmtNum(t.ibamaComp)} = ${fmt3(volumeIbama(t))} m³`,
    '',
  ]);
  const total = totaisLote(lote.toras);
  return [
    `🌳 ${titulo}`,
    '',
    ...blocos,
    `TOTAL (${plural(total.toras, 'tora', 'toras')})`,
    `Compra: ${fmt3(total.compra)} m³`,
    `IBAMA: ${fmt3(total.ibama)} m³`,
    `Diferença: ${fmt3(total.diferenca)} m³`,
  ].join('\n');
}
