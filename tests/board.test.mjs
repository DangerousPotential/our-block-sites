import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRoom,
  makePlayer,
  applyAction,
  settle,
  BOARD_TILES,
  tilePoint,
} from '../lib/game/engine.ts';
function setup() {
  const p = makePlayer('Host', 'merly', 0),
    q = makePlayer('Guest', 'kopi', 0),
    r = makeRoom('TEST', p);
  r.players.push(q);
  applyAction(r, p.id, 'board', {}, 0);
  return { p, q, r };
}
test('turn ownership, replay protection and arrival settlement', () => {
  const { p, q, r } = setup();
  p.position = 21;
  assert.throws(
    () => applyAction(r, q.id, 'roll', { round: 1, turn: 0 }, 0),
    /turn/,
  );
  assert.throws(() => applyAction(r, p.id, 'start', {}, 0), /rolls/);
  applyAction(r, p.id, 'roll', { round: 1, turn: 0 }, 100);
  const move = { ...r.move };
  assert.ok(move.steps >= 1 && move.steps <= 6);
  assert.equal(p.position, 21);
  assert.throws(
    () => applyAction(r, p.id, 'roll', { round: 1, turn: 0 }, 200),
    /moving/,
  );
  settle(r, move.endsAt - 1);
  assert.equal(r.boardTurn, 0);
  settle(r, move.endsAt);
  assert.equal(r.boardTurn, 1);
  assert.equal(p.position, (21 + move.steps) % BOARD_TILES.length);
  assert.equal(p.score, Math.max(0, BOARD_TILES[p.position][1] + 2));
  const score = p.score;
  settle(r, move.endsAt + 1);
  assert.equal(p.score, score);
  assert.throws(
    () => applyAction(r, p.id, 'roll', { round: 1, turn: 0 }, move.endsAt + 2),
    /passed/,
  );
  applyAction(r, q.id, 'roll', { round: 1, turn: 1 }, move.endsAt + 3);
  settle(r, r.move.endsAt);
  applyAction(r, p.id, 'start', {}, r.move.endsAt + 1);
  assert.equal(r.phase, 'playing');
});
test('CPU rolls automatically and next round clears movement without teleporting', () => {
  const { p, q, r } = setup();
  q.bot = true;
  applyAction(r, p.id, 'roll', { round: 1, turn: 0 }, 0);
  settle(r, r.move.endsAt);
  assert.equal(r.move.playerId, q.id);
  settle(r, r.move.endsAt);
  assert.equal(r.boardTurn, 2);
  const positions = r.players.map((p) => p.position);
  applyAction(r, p.id, 'start', {}, 100000);
  settle(r, 133000);
  assert.deepEqual(
    r.players.map((p) => p.position),
    positions,
  );
  applyAction(r, p.id, 'next', {}, 134000);
  assert.equal(r.boardTurn, 0);
  assert.equal(r.move, null);
  assert.throws(
    () => applyAction(r, p.id, 'roll', { round: 1, turn: 0 }, 135000),
    /passed/,
  );
});
test('tile path has twenty-two distinct spaces and wraps exactly', () => {
  assert.equal(
    new Set(BOARD_TILES.map((_, i) => JSON.stringify(tilePoint(i)))).size,
    22,
  );
  assert.deepEqual(tilePoint(22), tilePoint(0));
});
