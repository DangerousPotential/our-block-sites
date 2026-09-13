import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, Headers as WorkerHeaders } from 'miniflare';
const mf = new Miniflare({
  modules: true,
  compatibilityDate: '2026-05-22',
  script: 'export default {fetch(){return new Response("ok")}}',
  r2Buckets: ['ART'],
});
const original = globalThis.Headers;
globalThis.Headers = WorkerHeaders;
try {
  const bucket = await mf.getR2Bucket('ART');
  await import('./register.mjs');
  const { manifest, serveStoredAsset, readyKey } =
    await import('../lib/storage/assets.ts');
  const { receiveAsset } = await import('../lib/storage/upload.ts');
  const asset = manifest.entries[0],
    bytes = await readFile(new URL('../public/' + asset.path, import.meta.url));
  const request = (options = {}) =>
    new Request(
      'https://site.test/api/asset-storage?path=' +
        encodeURIComponent(asset.path),
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer testing',
          'Content-Length': String(bytes.length),
        },
        body: bytes,
        ...options,
      },
    );
  await test('asset uploads require authorization, exact size and checksum', async () => {
    assert.equal((await receiveAsset(request(), bucket)).status, 401);
    assert.equal((await receiveAsset(request(), bucket, 'wrong')).status, 401);
    assert.equal(
      (
        await receiveAsset(
          request({
            headers: { Authorization: 'Bearer testing', 'Content-Length': '1' },
          }),
          bucket,
          'testing',
        )
      ).status,
      400,
    );
    const corrupt = Buffer.from(bytes);
    corrupt[0] ^= 255;
    assert.equal(
      (await receiveAsset(request({ body: corrupt }), bucket, 'testing'))
        .status,
      400,
    );
    assert.equal(
      (await receiveAsset(request(), bucket, 'testing')).status,
      200,
    );
    assert.equal(
      (await receiveAsset(request(), bucket, 'testing')).status,
      200,
    );
  });
  await test('stored media preserves bytes, MIME, ranges, ETags and HEAD responses', async () => {
    const req = (headers) =>
      new Request('https://site.test/' + asset.path, { headers });
    const full = await serveStoredAsset(req(), asset.path, bucket);
    assert.equal(full.headers.get('content-type'), asset.contentType);
    assert.deepEqual(Buffer.from(await full.arrayBuffer()), bytes);
    const range = await serveStoredAsset(
      req({ Range: 'bytes=4-12' }),
      asset.path,
      bucket,
    );
    assert.equal(range.status, 206);
    assert.deepEqual(
      Buffer.from(await range.arrayBuffer()),
      bytes.subarray(4, 13),
    );
    assert.equal(
      (
        await serveStoredAsset(
          req({ 'If-None-Match': `"${asset.sha256}"` }),
          asset.path,
          bucket,
        )
      ).status,
      304,
    );
    assert.equal(
      (
        await serveStoredAsset(
          req({ Range: 'bytes=999999999-' }),
          asset.path,
          bucket,
        )
      ).status,
      416,
    );
    assert.equal(
      (
        await serveStoredAsset(
          new Request('https://site.test/' + asset.path, { method: 'HEAD' }),
          asset.path,
          bucket,
        )
      ).body,
      null,
    );
    assert.equal(
      (await serveStoredAsset(req(), 'assets/../../secret', bucket)).status,
      404,
    );
  });
  await test('incomplete storage cannot activate the game', async () => {
    const response = await receiveAsset(
      new Request('https://site.test/api/asset-storage?action=finalize', {
        method: 'POST',
        headers: { Authorization: 'Bearer testing' },
      }),
      bucket,
      'testing',
    );
    assert.equal(response.status, 409);
    assert.equal(await bucket.head(readyKey), null);
  });
  await test('verified inventory activates storage and preserves its manifest revision', async () => {
    const remaining = manifest.entries.splice(1);
    try {
      const result = await receiveAsset(new Request('https://site.test/api/asset-storage?action=finalize', {method:'POST',headers:{Authorization:'Bearer testing'}}),bucket,'testing');
      assert.equal(result.status,200);
      const ready = await bucket.get(readyKey);
      assert.equal(JSON.parse(await ready.text()).revision,manifest.revision);
    } finally { manifest.entries.push(...remaining); }
  });

} finally {
  globalThis.Headers = original;
  await mf.dispose();
}
