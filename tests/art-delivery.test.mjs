import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, Headers as WorkerHeaders } from 'miniflare';

// Initialise the installed Workers runtime before the project's JSON import hook.
const mf = new Miniflare({
  modules: true,
  // Latest date supported by this checkout's installed Miniflare/workerd binary.
  // This is a test fixture, not the application's deployment configuration.
  compatibilityDate: '2026-05-22',
  script:
    'export default { fetch() { return new Response("R2 delivery test"); } };',
  r2Buckets: ['ART'],
});
const nativeHeaders = globalThis.Headers;
// Miniflare's proxy serialises its own Headers class across the Worker boundary.
globalThis.Headers = WorkerHeaders;
try {
  const bucket = await mf.getR2Bucket('ART');
  await import('./register.mjs');
  const { serveArt } = await import('../lib/game/art-delivery.ts');
  const { runtimeAssetPath } = await import('../lib/storage/asset-path.ts');
  const req = (file, headers = {}) =>
    new Request(
      `https://example.test/api/art?file=${encodeURIComponent(file)}`,
      { headers },
    );

  await test('R2 runtime streams native GLB and artwork bytes with correct MIME and conditional caching', async () => {
    for (const [file, mime] of [
      ['trip/estate.glb', 'model/gltf-binary'],
      ['party/hawker-dishes.png', 'image/webp'],
    ]) {
      const bytes = await readFile(
        new URL(
          `../public/${runtimeAssetPath('assets/' + file)}`,
          import.meta.url,
        ),
      );
      await bucket.put(runtimeAssetPath(`assets/${file}`), bytes, {
        httpMetadata: { contentType: 'text/plain' },
      });
      const response = await serveArt(req(file), bucket);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), mime);
      assert.equal(response.headers.get('x-our-block-asset-source'), 'r2');
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
      const etag = response.headers.get('etag');
      assert.ok(etag?.startsWith('"'));
      const cached = await serveArt(
        req(file, { 'If-None-Match': etag }),
        bucket,
      );
      assert.equal(cached.status, 304);
      assert.equal(cached.body, null);
      assert.equal(cached.headers.get('etag'), etag);
      const changed = await serveArt(
        req(file, { 'If-None-Match': '"old-version"' }),
        bucket,
      );
      assert.equal(changed.status, 200);
      assert.equal((await changed.arrayBuffer()).byteLength, bytes.length);
    }
  });
  await test('unbound, missing and unavailable R2 preserve same-origin bundled artwork without caching failure', async () => {
    const cases = [
      [undefined, 'no-binding'],
      [bucket, 'object-missing'],
      [
        {
          get: async () => {
            throw new Error('Simulated R2 outage');
          },
        },
        'bucket-unavailable',
      ],
    ];
    for (const [binding, reason] of cases) {
      const response = await serveArt(
        req('party/forest-props-key.png'),
        binding,
      );
      assert.equal(response.status, 307);
      assert.equal(
        response.headers.get('location'),
        'https://example.test/' +
          runtimeAssetPath('assets/party/forest-props-key.png'),
      );
      assert.equal(response.headers.get('x-our-block-asset-source'), 'bundled');
      assert.equal(response.headers.get('x-our-block-asset-fallback'), reason);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  });
  await test('asset allowlist rejects arbitrary paths before consulting storage', async () => {
    let reads = 0;
    const binding = {
      get: async () => {
        reads++;
        throw new Error('Must not read');
      },
    };
    for (const file of [
      '../.env',
      'trip/../../private.json',
      'https://elsewhere.test/a.png',
      'party/missing.png',
      '',
    ])
      assert.equal((await serveArt(req(file), binding)).status, 404);
    assert.equal(reads, 0);
  });
} finally {
  globalThis.Headers = nativeHeaders;
  await mf.dispose();
}
