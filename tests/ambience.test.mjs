import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  AMBIENCE,
  neighbourhoodBoardPoint,
  isEra,
} from '../lib/game/ambience.ts';
import { canWalk } from '../lib/game/walking.ts';
test('each era has its own mood and a real playable soundtrack', () => {
  assert.equal(new Set(Object.values(AMBIENCE).map((m) => m.sky)).size, 4);
  for (const era of Object.keys(AMBIENCE)) {
    const source = `audio/eras/${era}.wav`;
    const records = JSON.parse(
      readFileSync(new URL('../lib/storage/compression.json', import.meta.url)),
    );
    const record = records.find((entry) => entry.source === source);
    assert.ok(record, `${era} compressed soundtrack mapping`);
    const runtime = new URL(`../public/${record.output}`, import.meta.url);
    const original = new URL(
      `../art/runtime-originals/${source}`,
      import.meta.url,
    );
    const probe = (url) =>
      JSON.parse(
        execFileSync(
          'ffprobe',
          [
            '-v',
            'error',
            '-select_streams',
            'a:0',
            '-show_entries',
            'stream=codec_name,sample_rate,channels:format=duration',
            '-of',
            'json',
            fileURLToPath(url),
          ],
          { encoding: 'utf8' },
        ),
      );
    const audio = probe(runtime),
      before = probe(original);
    assert.equal(audio.streams[0].codec_name, 'mp3');
    assert.ok(Number(audio.streams[0].sample_rate) > 0);
    assert.equal(audio.streams[0].channels, before.streams[0].channels);
    assert.ok(
      Number(audio.format.duration) > 10,
      `${era} playable soundtrack duration`,
    );
    assert.ok(
      Math.abs(Number(audio.format.duration) - Number(before.format.duration)) <
        0.2,
      `${era} full soundtrack survives compression`,
    );
    assert.ok(
      statSync(runtime).size < statSync(original).size,
      `${era} transfer savings`,
    );
  }
  assert.equal(isEra('__proto__'), false);
});
test('all board tiles use open walkable neighbourhood space', () => {
  for (let i = 0; i < 22; i++)
    assert.ok(canWalk(neighbourhoodBoardPoint(i)), `tile ${i}`);
});
test('modern Blender worlds retain independently animated train pieces', () => {
  for (const era of ['town', 'garden']) {
    const bytes = readFileSync(
      new URL(`../public/assets/neighbourhood/${era}.glb`, import.meta.url),
    );
    const gltf = JSON.parse(
      bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)),
    );
    for (const name of [
      'AnimatedMRTCarriage',
      'AnimatedMRTWindows',
      'AnimatedMRTStripe',
    ])
      assert.equal(gltf.nodes.filter((n) => n.name.startsWith(name)).length, 3);
  }
});
