import type { Flick } from './eraser-motion';

// The tabletop is a trapezoid: the far edge is narrower than the near edge.
export function projectDesk(x: number, y: number) {
  const scale = 5.6 + (y / 64) * 3.2;
  return { x: 500 + (x - 50) * scale, y: 460 + y * 6, scale: scale / 10 };
}

// Invert the local perspective derivative so screen gestures keep their direction.
export function screenFlickToDesk(
  flick: Flick,
  origin: { x: number; y: number },
  sceneRatio = 1,
): Flick {
  const scale = 5.6 + (origin.y / 64) * 3.2;
  const dy = flick.y / (6 * sceneRatio);
  const dx = (flick.x - (origin.x - 50) * (3.2 / 64) * dy) / scale;
  const length = Math.hypot(dx, dy);
  return length
    ? { x: dx / length, y: dy / length, power: flick.power }
    : flick;
}
