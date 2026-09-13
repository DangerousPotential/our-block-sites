import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRoom,
  makePlayer,
  applyAction,
  settle,
  publicRoom,
} from '../lib/game/engine.ts';
import { enableEraser, DESK, stacked } from '../lib/game/eraser.ts';
function setup(stock = 1) {
  const a = makePlayer('Student A', 'mei', 0),
    b = makePlayer('Student B', 'arun', 0);
  const room = enableEraser(makeRoom('TEST', a));
  room.players.push(b);
  applyAction(room, a.id, 'start', {}, 1000);
  room.eraser.readyAt = 1000;
  room.eraser.stock = { [a.id]: stock, [b.id]: stock };
  return { room, a, b };
}
const right = { match: 1, turn: 1, x: 1, y: 0, power: (42 - 6) / 46 };
test('only two students and the host can start; flags are validated in the lobby', () => {
  const a = makePlayer('A', 'mei', 0),
    r = enableEraser(makeRoom('TEST', a));
  assert.throws(() => applyAction(r, a.id, 'start', {}, 1000));
  assert.throws(() => applyAction(r, a.id, 'flag', { flag: 99 }, 1000));
  applyAction(r, a.id, 'flag', { flag: 3 }, 1000);
  const b = makePlayer('B', 'arun', 0);
  r.players.push(b);
  assert.throws(() => applyAction(r, b.id, 'start', {}, 1000));
  applyAction(r, a.id, 'start', {}, 1000);
  assert.equal(r.eraser.pieces[a.id].flag, 3);
  assert.throws(() => applyAction(r, a.id, 'flag', { flag: 1 }, 1000));
});
test('landing on the other eraser wins only after the flight, and settles once', () => {
  const { room, a } = setup();
  applyAction(room, a.id, 'flick', right, 1100);
  assert.equal(room.phase, 'playing');
  settle(room, 1100 + DESK.flightMs - 1);
  assert.equal(room.eraser.winner, undefined);
  settle(room, 1100 + DESK.flightMs);
  assert.equal(room.eraser.winner, a.id);
  assert.equal(room.phase, 'finished');
  assert.equal(a.score, 1);
  settle(room, 100000);
  assert.equal(a.score, 1);
});
test('flying over a target without landing on it is not a win; corner contact is not a stack', () => {
  const { room, a, b } = setup();
  room.eraser.pieces[b.id].x = 48;
  applyAction(room, a.id, 'flick', right, 1100);
  settle(room, 2200);
  assert.equal(room.phase, 'playing');
  assert.equal(room.eraser.active, b.id);
  assert.equal(stacked({ x: 0, y: 0 }, { x: 11, y: 7 }), false);
  assert.equal(stacked({ x: 0, y: 0 }, { x: 0, y: 0 }), true);
});
test('off-desk returns the eraser and passes the turn; a missed turn times out', () => {
  const { room, a, b } = setup();
  applyAction(room, a.id, 'flick', { ...right, x: 0, y: -1, power: 1 }, 1100);
  settle(room, 2200);
  assert.equal(room.eraser.pieces[a.id].y, 32);
  assert.equal(room.eraser.active, b.id);
  assert.equal(room.eraser.turn, 2);
  settle(room, 2200 + DESK.turnMs);
  assert.equal(room.eraser.active, a.id);
  assert.equal(room.eraser.turn, 3);
});
test('out-of-turn, stale, duplicated, non-finite and excessive inputs are rejected', () => {
  const { room, a, b } = setup();
  assert.throws(() => applyAction(room, b.id, 'flick', right, 1100));
  for (const patch of [
    { turn: 0 },
    { match: 0 },
    { x: NaN },
    { y: Infinity },
    { power: 2 },
    { x: 0, y: 0 },
    { x: '1' },
  ])
    assert.throws(() =>
      applyAction(room, a.id, 'flick', { ...right, ...patch }, 1100),
    );
  applyAction(room, a.id, 'flick', { ...right, power: 0 }, 1100);
  const shot = structuredClone(room.eraser.shot);
  assert.throws(() => applyAction(room, a.id, 'flick', right, 1101));
  assert.deepEqual(room.eraser.shot, shot);
  settle(room, 2200);
  assert.throws(() => applyAction(room, a.id, 'flick', right, 2300));
});
test('rematch generation prevents an old shot from entering the new first turn', () => {
  const { room, a } = setup();
  applyAction(room, a.id, 'flick', right, 1100);
  settle(room, 2200);
  applyAction(room, a.id, 'restart', {}, 2300);
  applyAction(room, a.id, 'start', {}, 2400);
  assert.equal(room.eraser.match, 2);
  assert.throws(() => applyAction(room, a.id, 'flick', right, 2500));
});
test('practice opponent takes a real shot; public room never exposes seat tokens', () => {
  const { room, a, b } = setup();
  b.bot = true;
  applyAction(room, a.id, 'flick', { ...right, power: 0 }, 1100);
  settle(room, 2200);
  settle(room, 4100);
  assert.equal(room.eraser.shot.playerId, b.id);
  settle(room, 5200);
  for (const p of Object.values(room.eraser.pieces))
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.ok(publicRoom(room).players.every((p) => !('token' in p)));
});
test('a new showdown arms both players with three erasers and gates early input', () => {
  const a = makePlayer('A', 'mei', 0),
    b = makePlayer('B', 'arun', 0);
  const room = enableEraser(makeRoom('TEST', a));
  room.players.push(b);
  applyAction(room, a.id, 'start', {}, 1000);
  assert.deepEqual(room.eraser.stock, { [a.id]: 3, [b.id]: 3 });
  assert.equal(room.eraser.deadline, 1000 + DESK.showdownMs + DESK.turnMs);
  assert.throws(() => applyAction(room, a.id, 'flick', right, 1001));
  applyAction(room, a.id, 'flick', right, 1000 + DESK.showdownMs);
  assert.ok(room.eraser.shot);
});
test('captures remove exactly one eraser and the third loss ends the match once', () => {
  const { room, a, b } = setup(3);
  let now = 1100;
  for (let remaining = 2; remaining >= 0; remaining--) {
    if (room.eraser.active === b.id) {
      settle(room, room.eraser.deadline);
      now = room.eraser.deadline - DESK.turnMs + 1;
    }
    applyAction(room, a.id, 'flick', { ...right, turn: room.eraser.turn }, now);
    settle(room, now + DESK.flightMs);
    assert.equal(room.eraser.stock[b.id], remaining);
    assert.equal(room.eraser.stock[a.id], 3);
    settle(room, now + DESK.flightMs + 1);
    assert.equal(
      room.eraser.stock[b.id],
      remaining,
      'repeated settle cannot capture twice',
    );
    if (remaining) {
      assert.equal(room.phase, 'playing');
      assert.equal(a.score, 0);
      assert.throws(() =>
        applyAction(
          room,
          a.id,
          'flick',
          { ...right, turn: room.eraser.turn },
          now + DESK.flightMs + 10,
        ),
      );
      settle(room, room.eraser.readyAt);
      assert.equal(room.eraser.active, b.id, 'loser starts next duel');
      assert.equal(room.eraser.shot, undefined);
      assert.equal(room.eraser.pieces[a.id].x, 29);
    }
  }
  assert.equal(room.phase, 'finished');
  assert.equal(a.score, 1);
  applyAction(room, a.id, 'restart', {}, now + DESK.flightMs + 1);
  applyAction(room, a.id, 'start', {}, now + DESK.flightMs + 2);
  assert.equal(room.eraser.stock[b.id], 3);
  assert.equal(room.eraser.duel, 1);
});
test('practice no longer removes erasers or awards a win for five missed turns', () => {
  const { room, b } = setup(3);
  b.bot = true;
  for (let turn = 0; turn < 20; turn++) settle(room, room.eraser.deadline);
  assert.equal(room.phase, 'playing');
  assert.deepEqual(Object.values(room.eraser.stock), [3, 3]);
  assert.equal(room.eraser.winner, undefined);
});
