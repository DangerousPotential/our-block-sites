import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile(new URL('../lib/storage/download-assets.json', import.meta.url)));

test('download inventory matches local assets and includes decoder and small files', async () => {
  assert.ok(manifest.entries.some(e => e.path === 'draco/draco_decoder.wasm'));
  assert.ok(manifest.entries.some(e => e.path === 'assets/trip/estate.json'));
  for (const entry of manifest.entries) {
    const bytes = await readFile(new URL('../public/' + entry.path, import.meta.url));
    assert.equal(bytes.length, entry.size, entry.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.path);
  }
});

test('cached logical media aliases, direct paths, and byte ranges work without network', async () => {
  const handlers = {};
  let networkCalls = 0;
  const context = {
    self: { assetManifest: manifest, location: { origin: 'https://site.test' }, addEventListener: (name, handler) => { handlers[name] = handler; } },
    importScripts() {}, URL, Set, Response, Headers,
    caches: { open: async () => ({ match: async key => key.endsWith('/assets/pets.webp') ? new Response('0123456789') : undefined }) },
    fetch: async () => { networkCalls++; return new Response('network'); },
  };
  vm.runInNewContext(await readFile(new URL('../public/asset-cache-worker.js', import.meta.url), 'utf8'), context);
  async function request(path, headers) {
    let response;
    handlers.fetch({ request: new Request('https://site.test' + path, { headers }), respondWith: value => { response = value; } });
    return response;
  }
  assert.equal(await (await request('/api/media?path=assets/pets.png')).text(), '0123456789');
  assert.equal(await (await request('/assets/pets.webp')).text(), '0123456789');
  assert.equal(await (await request('/api/art?file=pets.png&v=1')).text(), '0123456789');
  const range = await request('/api/media?path=assets/pets.png', { Range: 'bytes=2-5' });
  assert.equal(range.status, 206);
  assert.equal(await range.text(), '2345');
  assert.equal((await request('/assets/pets.webp', { Range: 'bytes=99-' })).status, 416);
  assert.equal(await request('/api/rooms'), undefined);
  assert.equal(networkCalls, 0);
  assert.equal(await (await request('/assets/trip/estate.glb')).text(), 'network');
});

test('failed downloads cannot mark ready; retry preserves completed assets', async () => {
  await import('./register.mjs');
  const original = Object.getOwnPropertyDescriptors(globalThis);
  const entry = manifest.entries[0];
  const key = 'https://site.test/' + entry.path;
  const saved = new Map(manifest.entries.slice(1).map(e => ['https://site.test/' + e.path, new Response('cached')]));
  let requests = 0, corrupt = true;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: {
    register: async () => {}, ready: Promise.resolve(),
    controller: { postMessage: (_, ports) => { ports[0].postMessage(manifest.revision); ports[0].close(); } },
  } } });
  globalThis.window = { caches: {} };
  globalThis.location = { origin: 'https://site.test' };
  globalThis.caches = { open: async () => ({ match: async k => saved.get(k), put: async (k, value) => saved.set(k, value) }) };
  globalThis.fetch = async () => { requests++; return new Response(corrupt ? 'bad' : await readFile(new URL('../public/' + entry.path, import.meta.url))); };
  try {
    const { downloadAssets, assetBytes } = await import('../lib/storage/download-assets.ts');
    const progress = [];
    await assert.rejects(downloadAssets(p => progress.push(p)), /1 asset unavailable/);
    assert.equal(requests, 3);
    assert.equal(saved.has(key), false);
    assert.equal(progress.at(-1).failed, 1);
    assert.ok(progress.at(-1).completed < assetBytes);
    corrupt = false;
    await downloadAssets(p => progress.push(p));
    assert.equal(requests, 4);
    assert.equal(saved.size, manifest.entries.length);
    assert.equal(progress.at(-1).completed, assetBytes);
  } finally {
    for (const name of ['navigator', 'window', 'location', 'caches', 'fetch']) {
      if (original[name]) Object.defineProperty(globalThis, name, original[name]);
      else delete globalThis[name];
    }
  }
});
