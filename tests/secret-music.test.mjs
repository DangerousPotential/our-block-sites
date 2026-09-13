import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSecretTap } from '../lib/game/secretMusic.ts';
function taps(events) {
  let state = null;
  return events.map(([id, time]) => {
    const result = registerSecretTap(state, id, time);
    state = result.sequence;
    return result.track;
  });
}
test('each character selects its requested town after exactly five rapid taps', () => {
  for (const [id, track] of [
    ['merly', 'maple-opening'],
    ['kopi', 'henesys'],
    ['pandan', 'ellinia'],
    ['kueh', 'sleepywood'],
    ['otto', 'perion'],
    ['duri', 'singapore'],
    ['chope', 'lith-harbor'],
    ['long', 'kerning-city'],
  ]) {
    assert.deepEqual(taps(Array.from({ length: 6 }, (_, i) => [id, i * 200])), [
      null,
      null,
      null,
      null,
      track,
      null,
    ]);
  }
});
test('slow taps, switching characters and unrelated characters reset the streak', () => {
  assert.ok(
    taps(Array.from({ length: 8 }, (_, i) => ['merly', i * 500])).every(
      (x) => x === null,
    ),
  );
  assert.ok(
    taps([
      ['merly', 0],
      ['merly', 100],
      ['merly', 200],
      ['merly', 300],
      ['duri', 400],
    ]).every((x) => x === null),
  );
  assert.ok(
    taps([
      ['merly', 0],
      ['merly', 100],
      ['mei', 200],
      ['merly', 300],
      ['merly', 400],
      ['merly', 500],
      ['merly', 600],
    ]).every((x) => x === null),
  );
});

test('human characters and inherited object names never select tracks', () => {
  for (const id of [
    'mei',
    'aisyah',
    'arun',
    'daniel',
    'constructor',
    'toString',
  ]) {
    assert.ok(
      taps(Array.from({ length: 6 }, (_, i) => [id, i * 100])).every(
        (x) => x === null,
      ),
    );
  }
});
