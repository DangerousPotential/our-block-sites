import manifest from './download-assets.json';

export const assetBytes = manifest.entries.reduce((sum, entry) => sum + entry.size, 0);
const cacheName = `our-block-assets-${manifest.revision}`;
export type DownloadProgress = { completed: number; total: number; failed: number };

async function connectCache() {
  if (!('serviceWorker' in navigator) || !('caches' in window))
    throw new Error('Asset downloads need HTTPS or localhost.');
  await navigator.serviceWorker.register('/asset-cache-worker.js', { updateViaCache: 'none' });
  await navigator.serviceWorker.ready;
  // Verify the controlling worker, including after an asset revision changes.
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      const revision = await new Promise<unknown>(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 1000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
        controller.postMessage('revision', [channel.port2]);
      });
      if (revision === manifest.revision) return caches.open(cacheName);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Reload the lobby to finish updating assets.');
}

async function runDownload(onProgress: (progress: DownloadProgress) => void) {
  const cache = await connectCache();
  let cursor = 0, completed = 0, failed = 0;
  const report = () => onProgress({ completed, total: assetBytes, failed });
  report();
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < manifest.entries.length) {
      const entry = manifest.entries[cursor++];
      const key = new URL('/' + entry.path, location.origin).href;
      if (await cache.match(key)) { completed += entry.size; report(); continue; }
      let saved = false;
      for (let attempt = 0; attempt < 3 && !saved; attempt++) {
        try {
          const url = entry.path.startsWith('draco/') ? '/' + entry.path : '/api/media?path=' + encodeURIComponent(entry.path);
          const response = await fetch(url, { cache: 'reload', signal: AbortSignal.timeout(60000) });
          if (!response.ok) throw new Error(`Download failed: ${response.status}`);
          const bytes = await response.arrayBuffer();
          const digest = await crypto.subtle.digest('SHA-256', bytes);
          const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
          if (bytes.byteLength !== entry.size || hash !== entry.sha256) throw new Error('Incomplete asset');
          await cache.put(key, new Response(bytes, { headers: { 'Content-Type': response.headers.get('content-type') || 'application/octet-stream' } }));
          saved = true;
        } catch {
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
      if (saved) completed += entry.size;
      else failed++;
      report();
    }
  }));
  if (failed) throw new Error(`${failed} asset${failed === 1 ? '' : 's'} unavailable. Retry download.`);
}

// Reuse an in-flight download when moving between the lobby and its gate.
let pending: Promise<void> | undefined;
const listeners = new Set<(progress: DownloadProgress) => void>();
export async function downloadAssets(onProgress: (progress: DownloadProgress) => void) {
  listeners.add(onProgress);
  try {
    pending ??= runDownload(progress => listeners.forEach(listener => listener(progress))).finally(() => { pending = undefined; });
    await pending;
  } finally { listeners.delete(onProgress); }
}
