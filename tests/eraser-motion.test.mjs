import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFlickDetector,
  detectFlick,
  screenAcceleration,
} from '../lib/game/eraser-motion.ts';
const sample = (x = 0, y = 0) => ({
  acceleration: { x, y, z: 0 },
  accelerationIncludingGravity: null,
});
function quiet(d, from = 0, to = 350) {
  for (let t = from; t <= to; t += 25)
    assert.equal(detectFlick(d, sample(), t), null);
}
test('rest, gentle motion, missing sensors and gravity alone never launch', () => {
  const d = createFlickDetector();
  quiet(d);
  for (let t = 375; t < 1000; t += 25)
    assert.equal(detectFlick(d, sample(Math.sin(t) * 1.8), t), null);
  assert.equal(
    detectFlick(
      d,
      { acceleration: null, accelerationIncludingGravity: null },
      1100,
    ),
    null,
  );
  assert.equal(detectFlick(d, sample(NaN), 1120), null);
  const raw = createFlickDetector();
  for (let t = 0; t < 2000; t += 25)
    assert.equal(
      detectFlick(
        raw,
        {
          acceleration: null,
          accelerationIncludingGravity: { x: 0, y: 9.81, z: 0 },
        },
        t,
      ),
      null,
    );
});
test('leading impulse retains its direction when the phone brakes, with bounded power', () => {
  const d = createFlickDetector();
  quiet(d);
  assert.equal(detectFlick(d, sample(12, 0), 375), null);
  assert.equal(detectFlick(d, sample(18, 0), 400), null);
  assert.equal(detectFlick(d, sample(-25, 0), 425), null);
  assert.equal(detectFlick(d, sample(-20, 0), 450), null);
  const flick = detectFlick(d, sample(), 475);
  assert.equal(flick.x, 1);
  assert.equal(flick.y, 0);
  assert.ok(flick.power > 0.8 && flick.power <= 1);
  for (let t = 500; t < 1700; t += 25)
    assert.equal(
      detectFlick(d, sample(15), t),
      null,
      'continuous shaking must not rearm',
    );
  quiet(d, 1725, 2100);
  detectFlick(d, sample(0, 12), 2125);
  const up = detectFlick(d, sample(), 2225);
  assert.equal(up.y, -1);
});
test('landscape maps device axes to screen axes and gaps require settling again', () => {
  const v = screenAcceleration(10, 0, 90);
  assert.ok(Math.abs(v.x) < 1e-10);
  assert.equal(v.y, 10);
  const d = createFlickDetector();
  quiet(d);
  assert.equal(detectFlick(d, sample(20), 2000), null);
  assert.equal(detectFlick(d, sample(20), 2100), null);
});
test('raw accelerometer fallback filters gravity and detects a sideways swing', () => {
  const d = createFlickDetector(),
    raw = (x) => ({
      acceleration: null,
      accelerationIncludingGravity: { x, y: 9.81, z: 0 },
    });
  for (let t = 0; t <= 350; t += 25) detectFlick(d, raw(0), t);
  detectFlick(d, raw(-16), 375);
  detectFlick(d, raw(-18), 400);
  const result = detectFlick(d, raw(0), 475);
  assert.equal(result.x, -1);
  assert.ok(Math.abs(result.y) < 0.001);
});
test('a weak starting movement followed by a sharp stop does not launch backwards', () => {
  const d = createFlickDetector();
  quiet(d);
  detectFlick(d, sample(2.5), 375);
  detectFlick(d, sample(4), 400);
  detectFlick(d, sample(-22), 425);
  assert.equal(detectFlick(d, sample(-18), 475), null);
  assert.equal(detectFlick(d, sample(-12), 500), null);
});
test('right/up calibration corrects reversed sensor signs and preserves all four directions', async () => {
  const { motionCalibration, calibratedFlick } =
    await import('../lib/game/eraser-motion.ts');
  for (const angle of [0, 90, 180, 270]) {
    for (const sign of [-1, 1]) {
      const right = { ...screenAcceleration(sign, 0, angle), power: 0.5 };
      const up = { ...screenAcceleration(0, sign, angle), power: 0.5 };
      const calibration = motionCalibration(right, up);
      assert.ok(calibration);
      for (const [input, expected] of [
        [right, [1, 0]],
        [up, [0, -1]],
        [{ ...right, x: -right.x, y: -right.y }, [-1, 0]],
        [{ ...up, x: -up.x, y: -up.y }, [0, 1]],
      ]) {
        const mapped = calibratedFlick(input, calibration);
        assert.ok(Math.abs(mapped.x - expected[0]) < 1e-10);
        assert.ok(Math.abs(mapped.y - expected[1]) < 1e-10);
        assert.equal(mapped.power, 0.5);
      }
    }
  }
  assert.equal(
    motionCalibration({ x: 1, y: 0, power: 0.5 }, { x: 1, y: 0, power: 0.5 }),
    null,
  );
});
