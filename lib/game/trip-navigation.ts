export type Point = { x: number; z: number };
export type Layout = {
  id: string;
  spawn: Point;
  bounds: Point;
  board: Point[];
  npcs: Point[];
  solids: {
    x: number;
    z: number;
    w: number;
    d: number;
    bridge?: boolean;
    padding?: number;
  }[];
  animated: string[];
  groundSize?: Point;
  districts?: (Point & { name: string; role?: string })[];
  activities?: {
    kind: string;
    x: number;
    z: number;
    count: number;
    name?: string;
    dialogue?: string[];
    center?: Point;
  }[];
};
export function walkable(m: Layout, p: Point) {
  if (
    !Number.isFinite(p.x) ||
    !Number.isFinite(p.z) ||
    Math.abs(p.x) > m.bounds.x ||
    Math.abs(p.z) > m.bounds.z
  )
    return false;
  if (
    m.solids.some(
      (s) =>
        s.bridge &&
        Math.abs(p.z - s.z) < 0.55 &&
        Math.abs(p.x - s.x) < (s.w ? s.w / 2 : 4.2),
    )
  )
    return true;
  return !m.solids.some(
    (s) =>
      !s.bridge &&
      Math.abs(p.x - s.x) < s.w / 2 + (s.padding ?? 0.28) &&
      Math.abs(p.z - s.z) < s.d / 2 + (s.padding ?? 0.28),
  );
}
export function pathTo(m: Layout, from: Point, to: Point): Point[] {
  const cell = 0.5,
    key = (x: number, z: number) => `${x},${z}`;
  const starts = [Math.floor(from.x / cell), Math.ceil(from.x / cell)]
    .flatMap((x) =>
      [Math.floor(from.z / cell), Math.ceil(from.z / cell)].map((z) => ({
        x,
        z,
      })),
    )
    .filter(({ x, z }) =>
      [0, 0.25, 0.5, 0.75, 1].every((f) =>
        walkable(m, {
          x: from.x + (x * cell - from.x) * f,
          z: from.z + (z * cell - from.z) * f,
        }),
      ),
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x * cell - from.x, a.z * cell - from.z) -
        Math.hypot(b.x * cell - from.x, b.z * cell - from.z),
    );
  if (!starts.length) return [];
  const sx = starts[0].x,
    sz = starts[0].z,
    tx = Math.round(to.x / cell),
    tz = Math.round(to.z / cell);
  if (!walkable(m, { x: tx * cell, z: tz * cell })) return [];
  const start = key(sx, sz),
    queue = [[sx, sz]],
    prev = new Map<string, string | null>([[start, null]]);
  let found = '';
  const budget = Math.ceil((m.bounds.x * 4 + 1) * (m.bounds.z * 4 + 1));
  for (let i = 0; i < queue.length && i < budget; i++) {
    const [x, z] = queue[i],
      k = key(x, z);
    if (x === tx && z === tz) {
      found = k;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = key(x + dx, z + dz);
      if (
        !prev.has(n) &&
        [0.25, 0.5, 0.75, 1].every((fraction) =>
          walkable(m, {
            x: (x + dx * fraction) * cell,
            z: (z + dz * fraction) * cell,
          }),
        )
      ) {
        prev.set(n, k);
        queue.push([x + dx, z + dz]);
      }
    }
  }
  const path: Point[] = [];
  while (found && found !== start) {
    const [x, z] = found.split(',').map(Number);
    path.push({ x: x * cell, z: z * cell });
    found = prev.get(found) ?? '';
  }
  if (!path.length) return [];
  path.reverse();
  // Join the grid without cutting a corner after free keyboard movement.
  if (Math.hypot(sx * cell - from.x, sz * cell - from.z) > 0.001)
    path.unshift({ x: sx * cell, z: sz * cell });
  return path;
}

/** Find a real, reachable meeting spot beside a resident or inaccessible ride. */
export function meetingPoint(
  m: Layout,
  from: Point,
  target: Point,
): Point | null {
  for (let radius = 0; radius <= 6; radius += 0.5) {
    const candidates: Point[] = [];
    for (let j = 0; j < (radius ? 12 : 1); j++) {
      const angle = (j * Math.PI) / 6;
      const p = {
        x: Math.round((target.x + Math.cos(angle) * radius) * 2) / 2,
        z: Math.round((target.z + Math.sin(angle) * radius) * 2) / 2,
      };
      if (walkable(m, p)) candidates.push(p);
    }
    candidates.sort(
      (a, b) =>
        Math.hypot(a.x - from.x, a.z - from.z) -
        Math.hypot(b.x - from.x, b.z - from.z),
    );
    for (const p of candidates)
      if (
        Math.hypot(p.x - from.x, p.z - from.z) < 0.5 ||
        pathTo(m, from, p).length
      )
        return p;
  }
  return null;
}
