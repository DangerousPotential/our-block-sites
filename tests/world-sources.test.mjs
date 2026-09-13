import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sources from './fixtures/world-sources.json';
import compression from '../lib/storage/compression.json';
import { EXPLORATION_ERAS } from '../lib/game/pastimes1950s.ts';
import { TRIP_ERAS } from '../lib/game/trip.ts';

test('imported native worlds match the published baseline and PR 7 exactly', () => {
  for (const [file, hash] of Object.entries(sources.files)) {
    const original =
      file.startsWith('public/') &&
      compression.some((entry) => entry.source === file.slice(7))
        ? 'art/runtime-originals/' + file.slice(7)
        : file;
    assert.equal(
      createHash('sha256')
        .update(readFileSync(new URL('../' + original, import.meta.url)))
        .digest('hex'),
      hash,
      file,
    );
  }
});
test('1950s exploration is added while the five multiplayer eras retain their identities', () => {
  assert.deepEqual(
    EXPLORATION_ERAS.map((e) => e.id),
    ['pastimes', 'river', 'fair', 'estate', 'town', 'garden'],
  );
  assert.deepEqual(
    TRIP_ERAS.map((e) => e.id),
    ['river', 'fair', 'estate', 'town', 'garden'],
  );
});
