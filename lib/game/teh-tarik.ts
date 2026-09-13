import type { Contender, MinigameState } from './party-games';

export const TEA_CAPACITY_ML = 500;
export const TEA_FLOW_ML = 28;
export const TEA_CUP_RADIUS = 0.8;
export const TEA_SOURCE = { x: 1, y: -10 };
export const TEA_BOUNDS = 6;
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/** A moving pot, shared by physics and rendering; cup coordinates stay fixed. */
export function teaSource(seed: number, seconds: number) {
  const t = Math.max(0, seconds),
    phase = ((seed % 97) / 97) * Math.PI * 2;
  return {
    x: Math.sin(t * 0.63 + phase) * 2.8,
    y: -10 + Math.sin(t * 1.15 + phase) * 1.1,
  };
}
/** The full falling ribbon, not a single target: higher cups intercept lower ones. */
export function teaStreamX(seed: number, seconds: number, y: number) {
  const t = Math.max(0, seconds),
    source = teaSource(seed, t);
  const phase = ((seed % 97) / 97) * Math.PI * 2;
  const bottom = Math.sin(t * 0.8 + phase) * 4.6;
  const u = clamp((y - source.y) / (7 - source.y), 0, 1);
  return (
    source.x +
    (bottom - source.x) * u +
    Math.sin(t * 1.1) * Math.sin(u * Math.PI) * 0.65
  );
}
export function teaPourHeight(y: number, sourceY = TEA_SOURCE.y) {
  return (y - sourceY) / 10;
}
/** Actual pot-to-cup drop: .4 m gives ×1; 1.6 m or more gives ×2. */
export function teaFoamMultiplier(y: number, sourceY = TEA_SOURCE.y) {
  return 1 + clamp((teaPourHeight(y, sourceY) - 0.4) / 1.2, 0, 1);
}
export function teaTarget(seed: number, seconds: number) {
  const y = 2 + Math.sin(seconds * 0.45) * 3;
  return { x: teaStreamX(seed, seconds, y), y, pull: teaFoamMultiplier(y) - 1 };
}
export function teaCatch(
  x: number,
  y: number,
  target: { x: number; y: number },
  radius = 1.35,
) {
  return Math.hypot(x - target.x, y - target.y) < radius ? 1 : 0;
}
export function moveTeaCup(p: Contender, now: number, dt: number) {
  // Briefly let the impulse win over steering so impacts visibly launch the cup.
  const control = (p.impactUntil ?? 0) - now > 260 ? 0.35 : 1;
  const speed = (p.boost > now ? 7.5 : 5.5) * control;
  const gust =
    p.breeze > now && p.breeze - now < 2000 && p.shield <= now ? 2.5 : 0;
  const x = p.x + (p.axisX * speed + p.vx + gust) * dt;
  const y = p.y + (p.axisY * speed + p.vy) * dt;
  if (Math.abs(x) > TEA_BOUNDS)
    p.vx = -Math.sign(x) * Math.max(2, Math.abs(p.vx) * 0.68);
  if (Math.abs(y) > TEA_BOUNDS)
    p.vy = -Math.sign(y) * Math.max(2, Math.abs(p.vy) * 0.68);
  p.x = clamp(x, -TEA_BOUNDS, TEA_BOUNDS);
  p.y = clamp(y, -TEA_BOUNDS, TEA_BOUNDS);
  p.vx *= Math.exp(-1.8 * dt);
  p.vy *= Math.exp(-1.8 * dt);
}
function spill(p: Contender, ml: number, now: number) {
  if (p.shield > now || (p.bumpUntil ?? 0) > now) return;
  const volume = p.teaMl ?? 0;
  const lost = Math.min(volume, ml);
  if (volume > 0) p.points *= (volume - lost) / volume;
  p.teaMl = volume - lost;
  p.spilledMl = (p.spilledMl ?? 0) + lost;
  p.drops++;
  p.bumpUntil = now + 600;
}
/** Resolve all cups together. Stable ordering makes reconnects/replays deterministic. */
export function resolveTeaCollisions(g: MinigameState, now: number) {
  const entries = Object.entries(g.players)
    .filter(([, p]) => !p.finished)
    .sort(([a], [b]) => a.localeCompare(b));
  for (let pass = 0; pass < 3; pass++)
    for (let i = 0; i < entries.length; i++)
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i][1],
          b = entries[j][1];
        const dx = b.x - a.x,
          dy = b.y - a.y,
          distance = Math.hypot(dx, dy / 2);
        const diameter = TEA_CUP_RADIUS * 2;
        if (distance >= diameter) continue;
        const nx = distance > 0.0001 ? dx / distance : Math.cos((i + j) * 2.4);
        const ny =
          distance > 0.0001 ? dy / 2 / distance : Math.sin((i + j) * 2.4);
        const overlap = (diameter - distance) / 2 + 0.001;
        a.x = clamp(a.x - nx * overlap, -6, 6);
        a.y = clamp(a.y - ny * overlap * 2, -6, 6);
        b.x = clamp(b.x + nx * overlap, -6, 6);
        b.y = clamp(b.y + ny * overlap * 2, -6, 6);
        if (pass !== 0) continue;
        const closing =
          (a.axisX * 5.5 + a.vx - b.axisX * 5.5 - b.vx) * nx +
          (a.axisY * 5.5 + a.vy - b.axisY * 5.5 - b.vy) * ny;
        if (closing <= 0.2) continue;
        const impulse = clamp(closing * 1.35 + 3, 5, 18);
        a.impactUntil = b.impactUntil = now + 500;
        a.impactPower = b.impactPower = impulse;
        a.vx = clamp(a.vx - nx * impulse, -24, 24);
        a.vy = clamp(a.vy - ny * impulse, -24, 24);
        b.vx = clamp(b.vx + nx * impulse, -24, 24);
        b.vy = clamp(b.vy + ny * impulse, -24, 24);
        if (closing > 2) {
          spill(a, Math.min(12, closing * 1.2), now);
          spill(b, Math.min(12, closing * 1.2), now);
        }
      }
}
export function teaCatcher(g: MinigameState, now: number) {
  const seconds = (now - g.start) / 1000;
  // The first mouth encountered from the pot captures the finite stream.
  return Object.entries(g.players)
    .filter(
      ([, p]) =>
        !p.finished &&
        (p.teaMl ?? 0) < TEA_CAPACITY_ML &&
        Math.abs(p.x - teaStreamX(g.seed, seconds, p.y)) <=
          (p.steady > now ? 1.05 : TEA_CUP_RADIUS),
    )
    .sort(
      ([aid, a], [bid, b]) =>
        a.y - b.y ||
        Math.abs(a.x - teaStreamX(g.seed, seconds, a.y)) -
          Math.abs(b.x - teaStreamX(g.seed, seconds, b.y)) ||
        aid.localeCompare(bid),
    )[0]?.[0];
}
export function stepTeaArena(g: MinigameState, now: number, dt = 1 / 30) {
  if (now < g.start || now > g.start + 35000) return;
  resolveTeaCollisions(g, now);
  const winner = teaCatcher(g, now);
  for (const [id, p] of Object.entries(g.players)) {
    p.catchingTea = id === winner;
    p.foamMultiplier = teaFoamMultiplier(
      p.y,
      teaSource(g.seed, (now - g.start) / 1000).y,
    );
    if (id !== winner) continue;
    const ml = Math.min(TEA_CAPACITY_ML - (p.teaMl ?? 0), TEA_FLOW_ML * dt);
    p.teaMl = (p.teaMl ?? 0) + ml;
    p.points += ml * p.foamMultiplier;
    p.progress += dt;
  }
}
export function tiltAxes(
  beta: number,
  gamma: number,
  baseline: { beta: number; gamma: number },
  angle: number,
) {
  if (
    ![beta, gamma, baseline.beta, baseline.gamma, angle].every(Number.isFinite)
  )
    return { x: 0, y: 0 };
  const delta = (a: number, b: number) => ((a - b + 540) % 360) - 180;
  const dx = delta(gamma, baseline.gamma) / 22;
  const dy = delta(beta, baseline.beta) / 22;
  const radians = (angle * Math.PI) / 180;
  const axis = (v: number) =>
    Math.abs(v) < 0.035 ? 0 : Math.max(-1, Math.min(1, v));
  return {
    x: axis(dx * Math.cos(radians) + dy * Math.sin(radians)),
    y: axis(dy * Math.cos(radians) - dx * Math.sin(radians)),
  };
}
