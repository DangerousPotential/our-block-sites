import type { EraId } from './worlds';
import type { ActivityId } from './activities';
export type WalkPoint = { x: number; z: number };
export const WALK_LIMIT = 30;
// Footprints match the Blender generator. Open shop fronts remain accessible.
export const SOLIDS = [
  [-14.8, -13.5, -5.2, -6.5],
  [5.2, -13.5, 14.8, -6.5],
  [-29.5, -14, -20.5, -6.5],
  [20.5, -14, 29.5, -6.5],
  [-14, 9.5, -2, 12.5],
  [3, 9.5, 15, 12.5],
  [-29, -12, -22, -8],
  [21.5, 4.5, 24.5, 15.5],
  [25.5, 4.5, 28.5, 15.5],
  [-29, 9, -23, 12],
  [3.5, 15.8, 14.5, 17.6],
  [19.3, -5.7, 22.7, -3.5],
  [-18, -28, 18, -21],
] as const;
export function canWalk(p: WalkPoint) {
  return (
    Math.abs(p.x) <= WALK_LIMIT &&
    Math.abs(p.z) <= WALK_LIMIT &&
    !SOLIDS.some(
      ([l, t, r, b]) =>
        p.x > l - 0.3 && p.x < r + 0.3 && p.z > t - 0.3 && p.z < b + 0.3,
    )
  );
}
export function walkingPath(from: WalkPoint, to: WalkPoint): WalkPoint[] {
  const start = { x: Math.round(from.x), z: Math.round(from.z) };
  const goal = { x: Math.round(to.x), z: Math.round(to.z) };
  if (!canWalk(goal)) return [];
  const key = (p: WalkPoint) => `${p.x},${p.z}`;
  const open = [start],
    came = new Map<string, WalkPoint>(),
    costs = new Map([[key(start), 0]]);
  const closed = new Set<string>();
  const distance = (p: WalkPoint) => Math.hypot(p.x - goal.x, p.z - goal.z);
  while (open.length && closed.size < 4000) {
    open.sort(
      (a, b) =>
        costs.get(key(a))! + distance(a) - (costs.get(key(b))! + distance(b)),
    );
    const p = open.shift()!,
      k = key(p);
    if (closed.has(k)) continue;
    if (k === key(goal)) {
      const path = [goal];
      let prev = came.get(k);
      while (prev) {
        path.unshift(prev);
        prev = came.get(key(prev));
      }
      return path;
    }
    closed.add(k);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const n = { x: p.x + dx, z: p.z + dz },
        nk = key(n);
      if (
        !canWalk(n) ||
        closed.has(nk) ||
        !canWalk({ x: p.x + dx, z: p.z }) ||
        !canWalk({ x: p.x, z: p.z + dz })
      )
        continue;
      const cost = costs.get(k)! + Math.hypot(dx, dz);
      if (cost < (costs.get(nk) ?? Infinity)) {
        costs.set(nk, cost);
        came.set(nk, p);
        open.push(n);
      }
    }
  }
  return [];
}
export const PLACES: {
  id: string;
  label: string;
  point: WalkPoint;
  activity?: ActivityId;
  eras?: EraId[];
  detail: string;
}[] = [
  {
    id: 'kopi',
    label: 'Kopitiam',
    point: { x: -10, z: -4 },
    activity: 'kopi',
    detail:
      'Kopi is being pulled at the counter. Take a seat, watch the morning rush, or help serve the neighbours.',
  },
  {
    id: 'provision',
    label: 'Provision shop',
    point: { x: 10, z: -4 },
    detail:
      'Biscuit tins, fruit crates, paper calendars and a bicycle parked under the five-foot way. A familiar stop on the way home.',
  },
  {
    id: 'market',
    label: 'Morning market',
    point: { x: -8, z: 8 },
    activity: 'market',
    detail:
      'Pandan, eggs and coconuts. Shopkeepers chat while neighbours gather the ingredients for dinner.',
  },
  {
    id: 'hawker',
    label: 'Hawker tables',
    point: { x: 9, z: 4 },
    activity: 'kopi',
    detail:
      'Nasi, prata and kueh stalls share a shady dining space. Pull up a stool and spend a little time here.',
  },
  {
    id: 'stage',
    label: 'Gay World',
    point: { x: -25, z: -4 },
    activity: 'stage',
    eras: ['kampong', 'estate'],
    detail:
      'An imagined evening outside Gay World: food, theatre and neighbours meeting under warm lights.',
  },
  {
    id: 'club',
    label: 'Community club',
    point: { x: -25, z: -4 },
    eras: ['town', 'garden'],
    detail:
      'A meeting place for the neighbourhood, with open arcades, noticeboards and shady seats.',
  },
  {
    id: 'coaster',
    label: 'Wonderland',
    point: { x: 25, z: -4 },
    activity: 'coaster',
    eras: ['estate'],
    detail:
      'Watch two neighbours ride the hills, then board your own ride. A fictional track inspired by Wonderland at Kallang, not Gay World.',
  },
  {
    id: 'library',
    label: 'Reading room',
    point: { x: 25, z: -4 },
    eras: ['kampong', 'town', 'garden'],
    detail:
      'A quiet fictional neighbourhood reading room. Rest here before wandering back through the market.',
  },
  {
    id: 'playground',
    label: 'Dragon playground',
    point: { x: -25, z: 6 },
    activity: 'playground',
    detail:
      'Children hop along chalk squares beside the mosaic-inspired dragon, while neighbours rest in the shade.',
  },
  {
    id: 'garden',
    label: 'Community garden',
    point: { x: 25, z: 3 },
    activity: 'garden',
    eras: ['garden'],
    detail: 'Water the beds and harvest pandan, chilli and greens to share.',
  },
  {
    id: 'park',
    label: 'Garden paths',
    point: { x: 25, z: 3 },
    eras: ['kampong', 'estate', 'town'],
    detail:
      'A little green escape between the streets. Walk between planting beds, benches and shade trees.',
  },
  {
    id: 'tv',
    label: 'Evening TV',
    point: { x: 9, z: 18 },
    detail:
      'The neighbours have gathered around the television. Sit with them while a tiny original animated programme plays.',
  },
];
export function placesForEra(era: EraId) {
  return PLACES.filter((p) => !p.eras || p.eras.includes(era));
}
