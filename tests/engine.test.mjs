import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makePlayer,
  makeRoom,
  applyAction,
  orderFor,
  settle,
  publicRoom,
} from '../lib/game/engine.ts';
function finishBoard(r) {
  let now = -100000;
  for (let turn = 0; turn < r.players.length; turn++) {
    applyAction(r, r.players[turn].id, 'roll', { round: r.round, turn }, now);
    now = r.move.endsAt;
    settle(r, now);
  }
  for (const p of r.players) p.score = 0;
}
test('room lifecycle, scoring, replay protection and time jump', () => {
  const p = makePlayer('Test', 'merly', 0),
    r = makeRoom('TEST', p);
  const guest = makePlayer('Guest', 'kopi', 0);
  r.players.push(guest);
  assert.throws(() => applyAction(r, guest.id, 'board'));
  applyAction(r, p.id, 'board');
  finishBoard(r);
  applyAction(r, p.id, 'start', {}, 10000);
  assert.equal(r.startedAt, 13000);
  assert.throws(() =>
    applyAction(r, p.id, 'serve', { food: 0, step: 0 }, 12000),
  );
  const food = orderFor(r, p);
  applyAction(r, p.id, 'serve', { food, step: 0 }, 14000);
  assert.equal(p.roundScore, 1);
  applyAction(r, p.id, 'serve', { food, step: 0 }, 15000);
  assert.equal(p.roundScore, 1, 'replayed input must not score');
  applyAction(
    r,
    p.id,
    'serve',
    { food: (orderFor(r, p) + 1) % 4, step: 1 },
    16000,
  );
  assert.equal(p.roundScore, 0);
  applyAction(r, p.id, 'serve', { food: orderFor(r, p), step: 2 }, 17000);
  settle(r, 43000);
  assert.equal(r.phase, 'results');
  assert.equal(r.players[0].score, 1);
  settle(r, 50000);
  assert.equal(r.players[0].score, 1, 'settlement must happen once');
  applyAction(r, p.id, 'next', {}, 51000);
  assert.ok(r.year >= 1995 && r.year <= 1997);
  assert.equal(r.round, 2);
  assert.ok(r.twist >= 1 && r.twist <= 3);
  assert.ok(!('token' in publicRoom(r).players[0]));
});
test('age and avatar do not affect scoring', () => {
  for (const [id, age] of [
    ['merly', 0],
    ['mei', 2],
    ['aisyah', 1],
    ['arun', 0],
  ]) {
    const p = makePlayer('Test', id, age),
      r = makeRoom('TEST', p);
    applyAction(r, p.id, 'board');
    finishBoard(r);
    applyAction(r, p.id, 'start', {}, 0);
    r.twist = 1;
    applyAction(r, p.id, 'serve', { food: orderFor(r, p), step: 0 }, 4000);
    assert.equal(p.roundScore, 2);
  }
});
test('game finishes at configured round count', () => {
  const p = makePlayer('Test', 'merly', 0),
    r = makeRoom('TEST', p, 1);
  applyAction(r, p.id, 'board');
  finishBoard(r);
  applyAction(r, p.id, 'start', {}, 0);
  settle(r, 33000);
  applyAction(r, p.id, 'next', {}, 34000);
  assert.equal(r.phase, 'finished');
});
