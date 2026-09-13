import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { walkingPath, canWalk, placesForEra } from '../lib/game/walking.ts';
test('every facility is reachable on foot in every era', () => {
  for (const era of ['kampong', 'estate', 'town', 'garden'])
    for (const place of placesForEra(era)) {
      const path = walkingPath({ x: 0, z: 1 }, place.point);
      assert.ok(path.length, `${era}: ${place.label} unreachable`);
      assert.deepEqual(path.at(-1), place.point);
      for (const p of path) assert.ok(canWalk(p));
    }
});
test('routes avoid shop interiors, bounds and diagonal corner cutting', () => {
  assert.equal(canWalk({ x: -10, z: -10 }), false);
  assert.equal(walkingPath({ x: 0, z: 1 }, { x: 90, z: 0 }).length, 0);
  const path = walkingPath({ x: -17, z: -10 }, { x: -3, z: -10 });
  assert.ok(path.length > 14);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i];
    assert.ok(canWalk({ x: b.x, z: a.z }));
    assert.ok(canWalk({ x: a.x, z: b.z }));
  }
});
test('four Blender neighbourhoods include packed textures and animation props', () => {
  for (const era of ['kampong', 'estate', 'town', 'garden']) {
    const bytes = readFileSync(
      new URL(`../public/assets/neighbourhood/${era}.glb`, import.meta.url),
    );
    assert.equal(bytes.toString('utf8', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    // Richer walkable districts include perimeter greenery and packed textures.
    assert.ok(bytes.length < 9_000_000);
    const json = JSON.parse(
      bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)),
    );
    assert.ok(json.images.length > 20);
    for (const name of [
      'AnimatedCoffeePot',
      'AnimatedCoffeeCup',
      'AnimatedCoffeeStream',
      'AnimatedTVScreen',
    ])
      assert.ok(
        json.nodes.some((n) => n.name === name),
        `${era} lacks ${name}`,
      );
    if (era === 'estate')
      assert.ok(json.nodes.some((n) => n.name === 'AnimatedCoasterCar'));
  }
});
