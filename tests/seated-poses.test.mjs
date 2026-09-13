import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { SEATED_ATLAS_SIZE, SEATED_POSES } from '../lib/game/seated-poses.ts';
import { characters } from '../lib/game/characters.ts';

test('seated frame measurements match an RGBA atlas and retain each neighbour identity', async () => {
  const records = JSON.parse(
    readFileSync(new URL('../lib/storage/compression.json', import.meta.url)),
  );
  const source = 'assets/culture/neighbours-seated.png';
  const record = records.find((entry) => entry.source === source);
  assert.ok(record, 'seated atlas compression mapping');
  const webp = readFileSync(
    new URL(`../public/${record.output}`, import.meta.url),
  );
  const metadata = await sharp(webp).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, SEATED_ATLAS_SIZE);
  assert.equal(metadata.height, SEATED_ATLAS_SIZE);
  assert.equal(
    metadata.hasAlpha,
    true,
    'RGBA, not the rejected opaque checkerboard output',
  );
  const original = readFileSync(
    new URL(`../art/runtime-originals/${source}`, import.meta.url),
  );
  const decoded = await sharp(webp).ensureAlpha().raw().toBuffer();
  const before = await sharp(original).ensureAlpha().raw().toBuffer();
  // Transparent RGB may be normalised by WebP; visible colour and all alpha must survive.
  for (let i = 0; i < decoded.length; i += 4) {
    assert.equal(decoded[i + 3], before[i + 3], 'preserved alpha');
    if (before[i + 3] > 0)
      assert.ok(
        decoded.subarray(i, i + 3).equals(before.subarray(i, i + 3)),
        'lossless visible pixels',
      );
  }
  assert.ok(webp.length < 1_000_000, 'optional town pose transfer budget');
  const people = characters.filter((c) => c.kind === 'neighbour');
  assert.deepEqual(
    Object.keys(SEATED_POSES),
    people.map((c) => c.id),
  );
  for (const person of people) {
    const f = SEATED_POSES[person.id];
    const left = ((person.column % 2) * SEATED_ATLAS_SIZE) / 2;
    const top = (Math.floor(person.column / 2) * SEATED_ATLAS_SIZE) / 2;
    assert.ok(f.x >= left && f.y >= top);
    assert.ok(f.x + f.width <= left + SEATED_ATLAS_SIZE / 2);
    assert.ok(f.y + f.height <= top + SEATED_ATLAS_SIZE / 2);
    assert.ok(f.hipX > f.x && f.hipX < f.x + f.width);
    assert.ok(f.hipY > f.y && f.hipY < f.y + f.height);
  }
});
