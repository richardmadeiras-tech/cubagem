import { hojeISO } from './util.js';

export function urlWhatsApp(texto) {
  return 'https://wa.me/?text=' + encodeURIComponent(texto);
}

// Tenta o compartilhamento nativo do celular; se não houver (ou falhar), abre o wa.me.
export async function enviarWhatsApp(
  texto,
  nav = globalThis.navigator,
  abrir = url => globalThis.open(url, '_blank', 'noopener'),
) {
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ text: texto });
      return 'compartilhado';
    } catch (erro) {
      if (erro && erro.name === 'AbortError') return 'cancelado';
    }
  }
  abrir(urlWhatsApp(texto));
  return 'wa.me';
}

export async function copiarTexto(texto, nav = globalThis.navigator) {
  try {
    await nav.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

// Baixa a cópia de segurança como arquivo .json (usa o DOM; testado no navegador).
export function baixarBackup(texto, doc = document) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const link = doc.createElement('a');
  link.href = url;
  link.download = `cubagem-backup-${hojeISO()}.json`;
  doc.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
