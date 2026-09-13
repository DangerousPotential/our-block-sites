type Vector = { x: number | null; y: number | null; z: number | null };
export type MotionReading = {
  acceleration: Vector | null;
  accelerationIncludingGravity: Vector | null;
};
export type Flick = { x: number; y: number; power: number };
export type FlickDetector = {
  gravity: { x: number; y: number; z: number } | null;
  lastAt: number;
  quietSince: number | null;
  armed: boolean;
  lastFlick: number;
  capture?: { at: number; x: number; y: number; strength: number };
};
export const createFlickDetector = (): FlickDetector => ({
  gravity: null,
  lastAt: -Infinity,
  quietSince: null,
  armed: false,
  lastFlick: -Infinity,
});
function valid(v: Vector | null): v is { x: number; y: number; z: number } {
  return (
    !!v &&
    [v.x, v.y, v.z].every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}
export function hasMotionReading(e: MotionReading) {
  return valid(e.acceleration) || valid(e.accelerationIncludingGravity);
}
/** Leading acceleration maps to the screen plane, not to an absolute compass direction. */
export function screenAcceleration(x: number, y: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: x * Math.cos(radians) + y * Math.sin(radians),
    y: x * Math.sin(radians) - y * Math.cos(radians),
  };
}
export function detectFlick(
  d: FlickDetector,
  e: MotionReading,
  now: number,
  angle = 0,
): Flick | null {
  if (!hasMotionReading(e) || !Number.isFinite(now) || !Number.isFinite(angle))
    return null;
  const elapsed = now - d.lastAt;
  if (elapsed <= 0 || elapsed > 500) {
    d.armed = false;
    d.quietSince = null;
    d.capture = undefined;
    d.gravity = null;
  }
  d.lastAt = now;
  let acceleration;
  if (valid(e.acceleration)) acceleration = e.acceleration;
  else {
    const raw = e.accelerationIncludingGravity! as {
      x: number;
      y: number;
      z: number;
    };
    d.gravity ??= { ...raw };
    const alpha = 1 - Math.exp(-Math.min(100, Math.max(1, elapsed)) / 450);
    acceleration = { x: raw.x - d.gravity.x, y: raw.y - d.gravity.y };
    d.gravity.x += (raw.x - d.gravity.x) * alpha;
    d.gravity.y += (raw.y - d.gravity.y) * alpha;
    d.gravity.z += (raw.z - d.gravity.z) * alpha;
  }
  const v = screenAcceleration(acceleration.x, acceleration.y, angle);
  const strength = Math.hypot(v.x, v.y);
  if (d.capture) {
    // Keep the initial lobe; braking at the end of a swing must not reverse the shot.
    if (now - d.capture.at < 90) {
      if (
        v.x * d.capture.x + v.y * d.capture.y > 0 &&
        strength > d.capture.strength
      )
        d.capture = { ...d.capture, x: v.x, y: v.y, strength };
      return null;
    }
    const shot = d.capture;
    d.capture = undefined;
    d.lastFlick = now;
    if (shot.strength < 6) return null;
    return {
      x: shot.x / shot.strength,
      y: shot.y / shot.strength,
      power: Math.max(0.12, Math.min(1, (shot.strength - 4) / 15)),
    };
  }
  if (strength < 2) {
    d.quietSince ??= now;
    if (now - d.quietSince >= 250 && now - d.lastFlick >= 800) d.armed = true;
    return null;
  }
  d.quietSince = null;
  if (d.armed && strength >= 2 && now - d.lastFlick >= 800) {
    d.armed = false;
    d.capture = { at: now, x: v.x, y: v.y, strength };
  }
  return null;
}

export type MotionCalibration = {
  right: { x: number; y: number };
  up: { x: number; y: number };
};
export function motionCalibration(
  right: Flick,
  up: Flick,
): MotionCalibration | null {
  const dot = right.x * up.x + right.y * up.y;
  const determinant = right.x * up.y - right.y * up.x;
  if (
    ![dot, determinant].every(Number.isFinite) ||
    Math.abs(dot) > 0.55 ||
    Math.abs(determinant) < 0.65
  )
    return null;
  return { right: { x: right.x, y: right.y }, up: { x: up.x, y: up.y } };
}
export function calibratedFlick(
  flick: Flick,
  calibration: MotionCalibration,
): Flick {
  const { right, up } = calibration;
  const determinant = right.x * up.y - right.y * up.x;
  const x = (flick.x * up.y - flick.y * up.x) / determinant;
  const y = -(right.x * flick.y - right.y * flick.x) / determinant;
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length, power: flick.power };
}
