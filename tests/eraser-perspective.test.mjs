import test from 'node:test';
import assert from 'node:assert/strict';
import {
  projectDesk,
  screenFlickToDesk,
} from '../lib/game/eraser-perspective.ts';

test('table far edge is narrower and higher than near edge', () => {
  const farLeft = projectDesk(0, 0),
    farRight = projectDesk(100, 0);
  const nearLeft = projectDesk(0, 64),
    nearRight = projectDesk(100, 64);
  assert.ok(farRight.x - farLeft.x < nearRight.x - nearLeft.x);
  assert.ok(farLeft.y < nearLeft.y);
});
test('perspective correction preserves swipe direction across the tabletop', () => {
  for (const sceneRatio of [0.56, 1, 2.16]) {
    for (const origin of [
      { x: 10, y: 10 },
      { x: 50, y: 32 },
      { x: 90, y: 58 },
    ]) {
      for (const [x, y] of [
        [1, 0],
        [0, -1],
        [-0.6, 0.8],
      ]) {
        const motion = screenFlickToDesk({ x, y, power: 0.7 }, origin);
        const from = projectDesk(origin.x, origin.y);
        const to = projectDesk(
          origin.x + motion.x * 0.001,
          origin.y + motion.y * 0.001,
        );
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        assert.ok(Math.abs((to.x - from.x) / length - x) < 0.0001);
        assert.ok(Math.abs((to.y - from.y) / length - y) < 0.0001);
        assert.equal(motion.power, 0.7);
      }
    }
  }
});
