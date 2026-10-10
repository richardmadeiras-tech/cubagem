// Aumente VERSAO sempre que qualquer arquivo do app mudar, senão o celular fica com a versão antiga.
const VERSAO = 'cubagem-v4';
const ARQUIVOS = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'src/app.js',
  'src/calc.js',
  'src/compartilhar.js',
  'src/share-text.js',
  'src/store.js',
  'src/tela-inicio.js',
  'src/tela-pacote.js',
  'src/tela-toras.js',
  'src/util.js',
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      // cache: 'reload' ignora o cache HTTP do navegador, para nunca guardar uma versão velha dos arquivos.
      .then(cache => cache.addAll(ARQUIVOS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(c => c !== VERSAO).map(c => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', evento => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(caches.match(evento.request).then(guardado => guardado || fetch(evento.request)));
});
