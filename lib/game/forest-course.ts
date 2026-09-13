import type { Runner } from './trip';

// Narrow Singapore rooftops and walkways retain a demanding jump envelope.
// The broad floor catches a missed climb physically; there are no save points.
const route = [-2.4, 0, 2.4, 4.8, 2.4, 0, -2.4, -4.8];
export const FOREST_PLATFORMS = [
  { x: 0, y: 0, width: 18 },
  ...Array.from({ length: 24 }, (_, i) => ({
    x: route[i % route.length],
    y: (i + 1) * 1.65,
    width: i === 23 ? 2.8 : (i + 1) % 8 === 0 ? 2.2 : 1.45,
  })),
];
export const FOREST_TOP = FOREST_PLATFORMS.at(-1)!;
export const FOREST_FALL_PENALTY = 2;
export type ForestRunner = Runner & {
  climb?: number;
  climbing?: number;
  detachUntil?: number;
  fallPeak?: number;
  falls?: number;
  hurtUntil?: number;
};

export function nextForestPlatform(r: Pick<Runner, 'y'>, year = 1965) {
  const next = climbPlatforms(year).findIndex((p) => p.y > r.y + 0.05);
  return next < 0 ? FOREST_PLATFORMS.length - 1 : next;
}

export function stepForestRunner(
  r: ForestRunner,
  now: number,
  dt = 1 / 30,
  year = 1965,
) {
  if (r.finished) return;
  const hurt = (r.hurtUntil ?? 0) > now;
  const links = climbLinks(year);
  const climb = Math.max(-1, Math.min(1, r.climb ?? 0));
  if (
    r.climbing === undefined &&
    climb &&
    !hurt &&
    !r.jump &&
    (r.detachUntil ?? 0) <= now
  ) {
    const index = links.findIndex(
      (l) =>
        Math.abs(r.x - l.x) < 0.43 && r.y >= l.bottom - 0.15 && r.y <= l.top,
    );
    if (index >= 0) r.climbing = index;
  }
  if (r.climbing !== undefined) {
    const link = links[r.climbing];
    if (r.jump || hurt || !link) {
      r.climbing = undefined;
      r.detachUntil = now + 400;
      if (r.jump && !hurt) {
        r.vy = 11;
        r.grace = 0;
      }
    } else {
      r.x = link.x;
      r.vy = 0;
      r.grounded = false;
      r.y = Math.max(link.bottom, Math.min(link.top, r.y - climb * 2.7 * dt));
      r.fallPeak = r.y;
      if (r.y >= link.top && climb < 0) {
        r.grounded = true;
        r.climbing = undefined;
        r.detachUntil = now + 250;
      } else if (r.y <= link.bottom && climb > 0) {
        r.climbing = undefined;
        r.detachUntil = now + 250;
      }
      return;
    }
  }
  if (r.grounded) {
    r.grace = now + (r.steady > now ? 150 : 90);
    r.fallPeak = r.y;
  }
  if (!hurt && r.jump && (r.grounded || r.grace > now)) {
    r.vy = 11;
    r.grounded = false;
    r.grace = 0;
  }
  const drift =
    r.breeze > now && r.breeze - now < 2000 && r.shield <= now ? 1.1 : 0;
  r.x = Math.max(
    -8.5,
    Math.min(
      8.5,
      r.x +
        ((hurt ? 0 : r.direction) * (r.boost > now ? 5.72 : 5.2) + drift) * dt,
    ),
  );
  const before = r.y;
  r.fallPeak = Math.max(r.fallPeak ?? before, before);
  r.vy -= 26 * dt;
  r.y += r.vy * dt;
  r.grounded = false;
  if (r.vy <= 0) {
    for (let i = FOREST_PLATFORMS.length - 1; i >= 0; i--) {
      const p = climbPlatforms(year)[i];
      if (
        before >= p.y &&
        r.y <= p.y &&
        Math.abs(r.x - p.x) < p.width / 2 + 0.12
      ) {
        const drop = r.fallPeak - p.y;
        if (drop > 4.4 && r.shield <= now) {
          r.falls = (r.falls ?? 0) + 1;
          r.hurtUntil = now + (r.steady > now ? 250 : 600);
        }
        r.y = p.y;
        r.vy = 0;
        r.grounded = true;
        r.fallPeak = p.y;
        break;
      }
    }
  }
}

export const CLIMB_ERAS = [
  { year: 1950, name: 'Kampong Skyways', material: 'timber', color: '#967044' },
  { year: 1965, name: 'Above the Quays', material: 'tile', color: '#b46543' },
  {
    year: 1975,
    name: 'Fairground Heights',
    material: 'stage',
    color: '#c05668',
  },
  { year: 1987, name: 'Up the Block', material: 'concrete', color: '#cfb995' },
  { year: 2005, name: 'Rooftop Rush', material: 'steel', color: '#699196' },
  {
    year: 2026,
    name: 'Gardens in the Sky',
    material: 'garden',
    color: '#5b9980',
  },
] as const;
// Four landings per era, with transitions halfway between adjacent landings.
export function climbEraAtHeight(height: number) {
  const index = Math.max(0, Math.min(5, Math.floor((height - 0.825) / 6.6)));
  return CLIMB_ERAS[index];
}

export function climbEra(year = 1965) {
  return CLIMB_ERAS.find((e) => e.year === year) ?? CLIMB_ERAS[1];
}
// Every layout stays within the same jump envelope. Mirroring and narrower
// landings change the route without granting any era a shortcut to the finish.
const courses = CLIMB_ERAS.map((era, index) =>
  FOREST_PLATFORMS.map((p, i) => ({
    ...p,
    x:
      i === 0
        ? 0
        : p.x * (index % 2 ? 1 : -1) + (i % 8 === 0 ? (index - 1) * 0.08 : 0),
    width: i === 0 || i === 24 ? p.width : p.width - (index % 3) * 0.07,
  })),
);
export function climbPlatforms(year = 1965) {
  return courses[CLIMB_ERAS.indexOf(climbEra(year))];
}
const links = courses.map((ps, era) =>
  [3, 11, 19].map((i, n) => ({
    x: ps[i].x,
    bottom: ps[i].y,
    top: ps[i + 2].y,
    kind: (n + era) % 2 ? 'ladder' : 'rope',
  })),
);
export function climbLinks(year = 1965) {
  return links[CLIMB_ERAS.indexOf(climbEra(year))];
}
