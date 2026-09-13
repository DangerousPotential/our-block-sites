import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ACTIVITIES,
  ERA_ACTIVITIES,
  KOPI_ORDERS,
  MARKET_LIST,
  ridePoint,
  inTimingWindow,
} from '../lib/game/activities.ts';

test('six cultural activities ship valid Blender models within the asset budget', () => {
  assert.equal(Object.keys(ACTIVITIES).length, 6);
  for (const id of Object.keys(ACTIVITIES)) {
    const bytes = readFileSync(
      new URL(`../public/assets/activities/${id}.glb`, import.meta.url),
    );
    assert.equal(bytes.toString('utf8', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(bytes.length < 2_000_000, `${id} exceeds mobile budget`);
    const json = JSON.parse(
      bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)),
    );
    assert.ok(json.meshes.length > 10);
    if (id === 'coaster')
      assert.ok(json.nodes.some((n) => n.name === 'CoasterCar'));
  }
});
test('era activities are valid and historic entertainment stays in the earlier eras', () => {
  for (const ids of Object.values(ERA_ACTIVITIES)) {
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.ok(ACTIVITIES[id]);
  }
  assert.ok(ERA_ACTIVITIES.estate.includes('coaster'));
  for (const era of ['town', 'garden']) {
    assert.ok(!ERA_ACTIVITIES[era].includes('coaster'));
    assert.ok(!ERA_ACTIVITIES[era].includes('stage'));
  }
  assert.match(ACTIVITIES.coaster.place, /Wonderland/);
});
test('kopi recipes distinguish milk, sugar and kosong with explicit serving', () => {
  assert.deepEqual(
    KOPI_ORDERS.map((o) => o.recipe),
    [
      ['Brew coffee', 'Condensed milk', 'Serve'],
      ['Brew coffee', 'Sugar', 'Serve'],
      ['Brew coffee', 'Serve'],
    ],
  );
  assert.deepEqual(MARKET_LIST, ['Pandan', 'Eggs', 'Coconut']);
});
test('ride follows the closed Blender track and timing cues have defined boundaries', () => {
  const start = ridePoint(0),
    end = ridePoint(4 * Math.PI);
  for (const axis of ['x', 'y', 'z'])
    assert.ok(Math.abs(start[axis] - end[axis]) < 1e-8);
  for (let i = 0; i <= 200; i++) {
    const p = ridePoint((i * Math.PI) / 50);
    assert.ok(p.y >= 1.3 - 1e-8 && p.y <= 3 + 1e-8);
    assert.ok(Math.abs(p.x) <= 5 && Math.abs(p.z) <= 3);
  }
  assert.equal(inTimingWindow(0.379), false);
  assert.equal(inTimingWindow(0.38), true);
  assert.equal(inTimingWindow(0.62), true);
  assert.equal(inTimingWindow(0.621), false);
});
