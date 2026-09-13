import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Group, Sprite, SpriteMaterial } from 'three';
import { createModelLoader } from '../components/game/model-loader.ts';
import { createWorldLife } from '../components/game/world-life.ts';
import {
  passBeat,
  performanceKind,
  rallyBeat,
  createMicroLife,
} from '../components/game/micro-life.ts';
import { LAYOUTS } from '../lib/game/trip-layouts.ts';

const bytes = readFileSync(
  new URL('../public/assets/trip/micro-props.glb', import.meta.url),
);
const library = (
  await createModelLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
).scene;
test('native Blender micro library is compact and contains cooking/sport/work props', () => {
  assert.ok(bytes.length < 600000);
  for (const name of [
    'ball',
    'noodles',
    'wok',
    'ladle',
    'bowl',
    'pot',
    'racket',
    'shuttle',
    'fish',
    'rod',
    'hammer',
    'book',
    'cloth',
    'basket',
  ])
    assert.ok(library.getObjectByName('micro_' + name), name);
});
test('ball has explicit possession, travel and reception phases', () => {
  assert.deepEqual(passBeat(0, 5), { from: 0, to: 1, phase: 0, travel: 0 });
  assert.equal(passBeat(1.8, 5).from, 0);
  assert.ok(passBeat(1.8, 5).travel > 0 && passBeat(1.8, 5).travel < 1);
  assert.equal(passBeat(2.7, 5).travel, 1);
  assert.equal(passBeat(3, 5).from, 1);
  assert.equal(passBeat(15, 5).from, 0);
});
test('badminton alternates across the net, not between same-side partners', () => {
  for (let turn = 0; turn < 12; turn++) {
    const rally = rallyBeat(turn * 1.6 + 0.01);
    assert.notEqual(Math.floor(rally.from / 2), Math.floor(rally.to / 2));
  }
});
test('noodles toss above the wok then travel inside the served bowl', () => {
  const world = new Group(),
    actors = Array.from({ length: 4 }, (_, i) => {
      const s = new Sprite(new SpriteMaterial());
      s.position.set(i, 0.2, 0);
      return s;
    });
  const animate = createMicroLife(
    world,
    [
      {
        kind: 'district_serve',
        name: 'Roadside supper',
        x: 0,
        z: 0,
        count: 4,
        actors,
      },
    ],
    library,
  );
  const prop = (name) =>
    world
      .getObjectByName('performance_0')
      .children.find((o) => o.name.includes('_' + name + '_'));
  animate(3000, false, false);
  assert.ok(prop('noodles').position.y > prop('wok').position.y + 0.7);
  animate(6000, false, false);
  assert.equal(prop('noodles').position.x, prop('bowl').position.x);
  assert.ok(prop('chopsticks').visible);
});
test('both retained eras animate finite prop transforms, reduced-motion freezes, board hides central game', () => {
  for (const layout of [LAYOUTS.river, LAYOUTS.estate]) {
    const world = new Group();
    const actors = [];
    const animate = createWorldLife(
      world,
      () => {
        const s = new Sprite(new SpriteMaterial());
        s.scale.set(1.15, 1.5, 1);
        actors.push(s);
        return s;
      },
      layout,
      library,
    );
    const snapshots = () => {
      const result = [];
      world.traverse((o) => {
        if (o.name.startsWith('performance_'))
          result.push([
            ...o.position.toArray(),
            ...o.scale.toArray(),
            ...o.quaternion.toArray(),
          ]);
      });
      return result;
    };
    animate(0, false, false);
    const start = snapshots();
    animate(1800, false, false);
    assert.notDeepEqual(snapshots(), start, layout.id);
    for (let ms = 0; ms < 24000; ms += 137) {
      animate(ms, false, false);
      assert.ok(snapshots().flat().every(Number.isFinite), layout.id);
    }
    animate(1300, true, false);
    const frozen = snapshots();
    animate(9700, true, false);
    assert.deepEqual(snapshots(), frozen, layout.id);
    animate(9700, true, true);
    assert.equal(world.getObjectByName('performance_0').visible, layout.activities[0].kind !== 'play');
  }
});
test('cooking, café, sports and work districts use distinct actions', () => {
  assert.equal(
    performanceKind({ kind: 'district_serve', name: 'Roadside supper' }),
    'noodles',
  );
  assert.equal(
    performanceKind({ kind: 'district_serve', name: 'Quayside kopi' }),
    'kopi',
  );
  assert.equal(
    performanceKind({ kind: 'district_exercise', name: 'Community court' }),
    'badminton',
  );
  assert.equal(
    performanceKind({ kind: 'district_work', name: 'Community workshop' }),
    'repair',
  );
});
