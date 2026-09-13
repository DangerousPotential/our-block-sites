import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import draco from 'draco3dgltf';

const entries = JSON.parse(
  await readFile(
    new URL('../lib/storage/compression.json', import.meta.url),
    'utf8',
  ),
);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'draco3d.decoder': await draco.createDecoderModule() });
await MeshoptDecoder.ready;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function samePixels(a, b, label, lossy = false) {
  const decode = (bytes) =>
    sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [left, right] = await Promise.all([decode(a), decode(b)]);
  assert.deepEqual(left.info, right.info, label + ' dimensions/channels');
  // RGB under fully transparent pixels is invisible and may be discarded by WebP.
  for (let i = 0; i < left.data.length; i += 4) {
    if (left.data[i + 3] === 0 && right.data[i + 3] === 0) {
      left.data.fill(0, i, i + 3);
      right.data.fill(0, i, i + 3);
    }
  }
  if (lossy) {
    let error = 0;
    for (let i=0;i<left.data.length;i++) error += (left.data[i]-right.data[i])**2;
    assert.ok(10*Math.log10(255**2/(error/left.data.length)) > 25, label + ' image fidelity');
  } else assert.ok(left.data.equals(right.data), label + ' lossless pixels');
}

await test('compressed assets preserve visible pixels, geometry bounds and scene hierarchy', async () => {
  assert.ok(entries.length >= 40);
  for (const entry of entries) {
    const source = new URL(
      '../art/runtime-originals/' + entry.source,
      import.meta.url,
    );
    const output = new URL('../public/' + entry.output, import.meta.url);
    const [before, after] = await Promise.all([
      readFile(source),
      readFile(output),
    ]);
    assert.equal(sha(before), entry.originalSha256, entry.source);
    assert.equal(sha(after), entry.sha256, entry.output);
    assert.ok(after.length < before.length, entry.source + ' smaller');
    if (/\.(png|webp)$/.test(entry.source))
      await samePixels(before, after, entry.source, entry.profile === 'webp85');
    if (entry.source.endsWith('.glb')) {
      const [a, b] = await Promise.all([
        io.readBinary(before),
        io.readBinary(after),
      ]);
      const nodes = (doc) =>
        doc
          .getRoot()
          .listNodes()
          .map((n) => ({
            name: n.getName(),
            matrix: n.getMatrix(),
            extras: n.getExtras(),
            children: n.listChildren().map((c) => c.getName()),
          }));
      assert.deepEqual(nodes(a), nodes(b), entry.source + ' scene hierarchy');
      const aa = a.getRoot().listMeshes(),
        bb = b.getRoot().listMeshes();
      assert.equal(aa.length, bb.length);
      for (let i = 0; i < aa.length; i++) {
        assert.equal(aa[i].getName(), bb[i].getName());
        const ap = aa[i].listPrimitives(),
          bp = bb[i].listPrimitives();
        assert.equal(ap.length, bp.length);
        for (let j = 0; j < ap.length; j++) {
          if (entry.profile === 'draco20') {
            assert.equal(ap[j].getMaterial()?.getName(),bp[j].getMaterial()?.getName());
            const sourcePosition=ap[j].getAttribute('POSITION'), targetPosition=bp[j].getAttribute('POSITION');
            for (const method of ['getMin','getMax']) {
              const a=sourcePosition[method]([]), b=targetPosition[method]([]);
              a.forEach((v,k)=>assert.ok(Math.abs(v-b[k])<0.01, entry.source+' geometry bounds'));
            }
            continue;
          }
          for (const semantic of ap[j].listSemantics())
            assert.deepEqual(
              ap[j].getAttribute(semantic).getArray(),
              bp[j].getAttribute(semantic).getArray(),
              entry.source + ' ' + semantic,
            );
          const ai = ap[j].getIndices()?.getArray(),
            bi = bp[j].getIndices()?.getArray();
          if (ai) {
            assert.equal(ai.length, bi.length);
            // Triangle compression may cyclically rotate each triangle; winding
            // and triangle order must remain identical.
            for (let k = 0; k < ai.length; k += 3)
              assert.ok(
                [0, 1, 2].some((r) =>
                  [0, 1, 2].every((v) => ai[k + v] === bi[k + ((v + r) % 3)]),
                ),
                entry.source + ' triangles',
              );
          }
        }
      }
      const at = a.getRoot().listTextures(),
        bt = b.getRoot().listTextures();
      assert.equal(at.length, bt.length);
      for (let i = 0; i < at.length; i++)
        await samePixels(
          at[i].getImage(),
          bt[i].getImage(),
          entry.source + ' texture ' + i,
          entry.source.includes('pastimes') && at[i].getName().includes('pontianak'),
        );
    }
    if (/\.(mp3|wav)$/.test(entry.source)) {
      const duration = (url) =>
        Number(
          execFileSync(
            'ffprobe',
            [
              '-v',
              'error',
              '-show_entries',
              'format=duration',
              '-of',
              'default=noprint_wrappers=1:nokey=1',
              url.pathname,
            ],
            { encoding: 'utf8' },
          ),
        );
      assert.ok(
        Math.abs(duration(source) - duration(output)) < 0.15,
        entry.source + ' duration',
      );
    }
  }
});
