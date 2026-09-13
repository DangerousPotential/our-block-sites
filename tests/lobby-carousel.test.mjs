import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nearestTurn,
  wrapSeat,
  orbitSeat,
} from '../lib/game/lobby-carousel.ts';
test('a last-to-first step rotates one seat rather than a full lap', () => {
  assert.equal(nearestTurn(7, 0, 8), 8);
  assert.equal(nearestTurn(0, 7, 8), -1);
  assert.equal(nearestTurn(23, 0, 8), 24);
});
test('dragging wraps in both directions for both roster sizes', () => {
  assert.equal(wrapSeat(-1, 8), 7);
  assert.equal(wrapSeat(17.2, 8), 1);
  assert.equal(wrapSeat(-5, 4), 3);
  assert.equal(wrapSeat(3.7, 4), 0);
});
test('selected seat is central, largest and in front; rear seat is separated', () => {
  for (const count of [4, 8]) {
    const front = orbitSeat(0, 0, count),
      back = orbitSeat(count / 2, 0, count);
    assert.equal(front.x, 0);
    assert.equal(front.scale, 1);
    assert.ok(back.scale < front.scale);
    assert.ok(front.y - back.y > 170);
    assert.ok(front.depth > back.depth);
    const next = orbitSeat(1, 1, count);
    assert.deepEqual(next, front);
  }
});
