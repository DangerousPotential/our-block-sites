import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXPLORATION_LAYOUTS, LAYOUTS } from "../lib/game/trip-layouts.ts";
import { TRIP_ERAS } from "../lib/game/trip.ts";
import { pathTo, walkable } from "../lib/game/trip-navigation.ts";

function glb(name) {
  const bytes = readFileSync(
    new URL(`../public/assets/trip/${name}.glb`, import.meta.url),
  );
  assert.equal(bytes.toString("utf8", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  return JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
}
test("every 1950s attraction is reachable from every other attraction without crossing solids", () => {
  const m = EXPLORATION_LAYOUTS.pastimes;
  const points = [m.spawn, ...m.districts, ...m.npcs];
  for (const from of points)
    for (const to of points) {
      assert.ok(walkable(m, from));
      if (from.x === to.x && from.z === to.z) continue;
      const route = pathTo(m, from, to);
      assert.ok(
        route.length,
        `${from.name ?? "spawn/NPC"} -> ${to.name ?? "spawn/NPC"}`,
      );
      assert.deepEqual(route.at(-1), { x: to.x, z: to.z });
      for (const p of route) assert.ok(walkable(m, p));
    }
  assert.equal(
    walkable(m, { x: -13, z: 9 }),
    false,
    "sea bathing is a visit, not a walk across the sea",
  );
});
test("Blender combined and standalone exports retain all seven building pick targets and packed artwork", () => {
  const names = [
    "cathay",
    "wall-of-death",
    "bunga-tanjong",
    "badminton",
    "katong",
    "tiger-balm",
    "rediffusion",
  ];
  const combined = glb("pastimes");
  names.forEach((name, index) => {
    const node = combined.nodes.find((n) => n.name === `attraction_${name}`);
    assert.equal(node?.extras?.pastimeIndex, index);
    const single = glb(`attraction_${name}`);
    assert.equal(
      single.nodes.find((n) => n.name === `attraction_${name}`)?.extras
        ?.pastimeIndex,
      index,
    );
    assert.ok(single.meshes.length);
  });
  assert.equal(combined.images.length, 1);
  assert.equal(
    glb("attraction_tiger-balm").images?.length ?? 0,
    0,
    "garden must use freestanding geometry, not a picture panel",
  );
  assert.ok(
    combined.images.every(
      (image) => image.bufferView !== undefined && !image.uri,
    ),
  );
  assert.ok(combined.nodes.some((n) => n.name === "anim_pastime_motorcycle"));
});
test("the coastal water stays inside the finished map footprint", () => {
  const model = glb("pastimes");
  const sea = model.nodes.find(
    (node) => node.name === "Street scenery #397c86",
  );
  assert.ok(sea, "export includes the coastal water surface");
  const surface = model.meshes[sea.mesh].primitives[0];
  const positions = model.accessors[surface.attributes.POSITION];
  const footprint = EXPLORATION_LAYOUTS.pastimes.groundSize;
  for (const [axis, halfExtent] of [
    [0, footprint.x / 2],
    [2, footprint.z / 2],
  ]) {
    const lower = sea.translation[axis] + positions.min[axis] * sea.scale[axis];
    const upper = sea.translation[axis] + positions.max[axis] * sea.scale[axis];
    assert.ok(
      lower >= -halfExtent && upper <= halfExtent,
      "sea must not project past the map edge",
    );
  }
});
test("1950s exploration does not enter multiplayer era selection or board layouts", () => {
  assert.equal(TRIP_ERAS.length, 5);
  assert.equal(
    TRIP_ERAS.some((e) => e.id === "pastimes"),
    false,
  );
  assert.equal(LAYOUTS.pastimes, undefined);
});

test("Katong promenade and all three bathing decks are reachable while water remains blocked", () => {
  const m = EXPLORATION_LAYOUTS.pastimes;
  const decks = [
    { x: -8.5, z: 7.5 },
    { x: -9.5, z: 8 },
    { x: -9.5, z: 11 },
    { x: -13, z: 12 },
    { x: -16.5, z: 11 },
    { x: -16.5, z: 8 },
  ];
  for (const target of decks) {
    assert.ok(walkable(m, target), `deck ${JSON.stringify(target)} is open`);
    const route = pathTo(m, m.spawn, target);
    assert.deepEqual(route.at(-1), target);
    for (const point of route) assert.ok(walkable(m, point));
  }
  for (const water of [
    { x: -13, z: 9 },
    { x: -18, z: 10 },
    { x: -8.5, z: 10 },
    { x: -13, z: 14 },
  ])
    assert.equal(walkable(m, water), false);
  assert.deepEqual(
    { x: m.districts[4].x, z: m.districts[4].z },
    { x: -9.5, z: 8 },
  );
});

test("wall rider leans into the drum with wheel axles near vertical", () => {
  const model = glb("attraction_wall-of-death");
  const orbit = model.nodes.find((n) => n.name === "anim_pastime_motorcycle");
  const parts = orbit.children.map((i) => model.nodes[i]);
  const tyres = parts.filter((n) => /^Motorcycle tyre(?:\.\d+)?$/.test(n.name));
  const head = parts.find((n) => n.name === "Rider head");
  assert.equal(tyres.length, 2);
  const radius = (n) => Math.hypot(n.translation[0], n.translation[2]);
  for (const tyre of tyres) {
    assert.ok(
      radius(tyre) > 2.5 && radius(tyre) < 3.1,
      "tyres stay near the inner drum wall",
    );
    assert.ok(
      radius(head) < radius(tyre) - 0.5,
      "rider leans inward, not upright above a road bike",
    );
    const [qx, , qz] = tyre.rotation;
    assert.ok(
      Math.abs(1 - 2 * (qx * qx + qz * qz)) > 0.8,
      "wheel axle faces mostly upward on the vertical wall",
    );
    assert.ok(
      tyre.translation[1] > 3 && head.translation[1] < 4.25,
      "ride stays below the spectator gallery",
    );
  }
});

test("period visitors export compact geometry without modern sprite textures", () => {
  const model = glb("period-visitors");
  assert.equal(model.images?.length ?? 0, 0);
  const roots = model.scenes[model.scene ?? 0].nodes.map(i => model.nodes[i]);
  assert.equal(roots.length, 4);
  for (const root of roots) {
    const meshes = root.children.map(i => model.nodes[i]).filter(n => n.mesh !== undefined);
    assert.ok(meshes.length > 0 && meshes.length <= 6, "merge clothing pieces by material for repeated crowd instances");
    assert.match(root.extras.evidence, /2011-02733/);
  }
});
