/* Only game media is cached; pages and APIs retain their normal network behavior. */
importScripts('/asset-cache-manifest.js');
const manifest = self.assetManifest;
const cacheName = `our-block-assets-${manifest.revision}`;
const paths = new Set(manifest.entries.map(entry => entry.path));
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data === 'revision') event.ports[0]?.postMessage(manifest.revision);
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const logical = url.pathname === '/api/media' ? url.searchParams.get('path') : url.pathname === '/api/art' ? 'assets/' + (url.searchParams.get('file') || '') : decodeURIComponent(url.pathname.slice(1));
  const path = manifest.aliases[logical] || logical;
  if (!paths.has(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(new URL('/' + path, self.location.origin).href);
    if (!cached) return fetch(event.request);
    const range = event.request.headers.get('range');
    if (!range) return cached;
    const bytes = await cached.arrayBuffer();
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return fetch(event.request);
    const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.byteLength - 1) : bytes.byteLength - 1;
    if (start > end || start >= bytes.byteLength) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } });
    const headers = new Headers(cached.headers);
    headers.set('Content-Range', `bytes ${start}-${end}/${bytes.byteLength}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(bytes.slice(start, end + 1), { status: 206, headers });
  })());
});
