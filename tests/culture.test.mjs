import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CULTURE, culturePhase } from '../lib/game/culture.ts';
import { LAYOUTS } from '../lib/game/trip-layouts.ts';
import { walkable, pathTo } from '../lib/game/trip-navigation.ts';
import { createCultureWorld } from '../components/game/culture-world.ts';
import * as T from 'three';

test('authored attraction lighting suppresses the extra focus fill only when a light exists', () => {
  const station = CULTURE.town.stations.find((entry) => entry.kind === 'lan');
  for (const hasNativeLight of [false, true]) {
    const scene = new T.Scene(),
      root = new T.Group(),
      native = new T.Group();
    native.name = `station_${station.id}`;
    native.userData.authoredLighting = true;
    if (hasNativeLight) native.add(new T.SpotLight());
    root.add(native);
    const world = createCultureWorld(
      T,
      scene,
      root,
      'town',
      () => new T.Sprite(),
    );
    world.update(0, true, false, station, null);
    const fill = scene.children.find(
      (object) => object instanceof T.PointLight,
    );
    assert.equal(fill.visible, !hasNativeLight);
    world.update(0, true, true, station, null);
    assert.equal(fill.visible, false);
    world.dispose();
  }
});

test('every cultural entrance is reachable from its plaza and the existing neighbourhood', () => {
  for (const [era, world] of Object.entries(CULTURE)) {
    const layout = LAYOUTS[era];
    assert.ok(walkable(layout, world.spawn), era + ' cultural spawn');
    assert.deepEqual(
      world.spawn,
      layout.spawn,
      era + ' original courtyard spawn',
    );
    assert.ok(
      world.stations.every(
        (s) =>
          Math.abs(s.x) < layout.bounds.x && Math.abs(s.z) < layout.bounds.z,
      ),
      era + ' attractions inside original world',
    );
    assert.equal(
      new Set(world.stations.map((s) => s.id)).size,
      world.stations.length,
    );
    for (const s of world.stations) {
      assert.ok(walkable(layout, s.entrance), era + ' ' + s.id + ' entrance');
      assert.ok(
        pathTo(layout, world.spawn, s.entrance).length,
        era + ' ' + s.id + ' route',
      );
    }
  }
});

test('all original game anchors and major native landmarks survive cultural integration', () => {
  const original = JSON.parse(
    readFileSync(
      new URL('./fixtures/original-world-layouts.json', import.meta.url),
    ),
  );
  const landmarks = {
    river: {
      'Attap home': 2,
      'Singapore River water': 23,
      'Timber footbridge': 2,
    },
    fair: {
      Theatre: 1,
      'Illuminated gateway': 1,
      'Carousel platform': 1,
      'Wonderland inspired coaster rail': 48,
      'Getai stage': 1,
    },
    estate: {
      'HDB block': 3,
      'Communal TV cabinet': 1,
      'Tiled wet market counter': 3,
      'Elevated railway': 1,
    },
    town: {
      'Neighbourhood mall': 1,
      'Regional library': 1,
      'Bus shelter': 3,
      'HDB block': 2,
      'Elevated railway': 1,
    },
    garden: {
      'Marina Bay Sands tower': 3,
      'SkyPark boat deck': 1,
      'Supertree trunk': 3,
      'Conservatory glass rib': 216,
      'Waterfront water': 1,
      'Raised community garden': 5,
    },
  };
  for (const [era, expected] of Object.entries(original)) {
    for (const field of ['spawn', 'board', 'npcs', 'bounds'])
      assert.deepEqual(
        LAYOUTS[era][field],
        expected[field],
        `${era} original ${field}`,
      );
    const bytes = readFileSync(
      new URL(`../public/assets/trip/${era}.glb`, import.meta.url),
    );
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    // The published river predates the cultural wrapper; its exact source
    // bytes and anchors are verified in world-sources.test.mjs.
    if (era === 'river') continue;
    const native = gltf.nodes.find((n) => n.name === 'original_world');
    assert.ok(native?.children.length, era + ' native original scene');
    if (['estate', 'town', 'garden'].includes(era)) {
      const carriage = gltf.nodes.find((n) => n.name === 'Train carriage');
      assert.ok(
        Math.abs(carriage.translation?.[2] ?? 0) < 0.01,
        era + ' carriage stays on its parent railway',
      );
    }
    for (const [name, count] of Object.entries(landmarks[era]))
      assert.ok(
        native.extras.preservedLandmarks[name] >= count,
        `${era} lost ${name}`,
      );
  }
});

test('native exports contain each selectable station and the approved moving components', () => {
  const required = {
    fair: ['cups', 'coaster', 'shuttle', 'ring', 'projection', 'pour'],
    estate: ['train', 'chapteh', 'hammer', 'scissors', 'pour'],
    town: ['pixel', 'pad', 'ball', 'pin', 'football', 'flash', 'steam'],
    river: ['boat', 'laundry', 'hammer', 'chapteh'],
    garden: ['brush', 'skate', 'shuttle', 'flash', 'steam'],
  };
  for (const [era, world] of Object.entries(CULTURE)) {
    const bytes = readFileSync(
      new URL(`../public/assets/trip/${era}.glb`, import.meta.url),
    );
    const doc = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
    );
    assert.ok(bytes.length < 12_000_000, era + ' transfer budget');
    for (const s of world.stations)
      assert.ok(
        doc.nodes.some(
          (n) => n.name === `station_${s.id}` && n.extras.stationId === s.id,
        ),
        s.id,
      );
    for (const part of required[era])
      assert.ok(
        doc.nodes.some(
          (n) => n.name.startsWith('motion_') && n.name.includes('_' + part),
        ),
        era + ' ' + part,
      );
    assert.ok(doc.images.length > 0, era + ' embedded texture');
  }
});

test('bowling rolls down the lane, knocks pins, resets, and freezes for reduced motion', () => {
  const scene = new T.Scene(),
    root = new T.Group(),
    station = new T.Group();
  station.name = 'station_bowling';
  root.add(station);
  scene.add(root);
  const ball = new T.Object3D();
  ball.name = 'motion_bowling_ball';
  ball.position.set(-2.5, 0.62, 2.5);
  station.add(ball);
  const pin = new T.Object3D();
  pin.name = 'motion_bowling_pin';
  pin.position.set(-2.5, 0.68, -3.5);
  station.add(pin);
  const culture = createCultureWorld(
    T,
    scene,
    root,
    'town',
    () => new T.Sprite(new T.SpriteMaterial()),
  );
  culture.update(100, false, false, null, null);
  const start = ball.position.z;
  culture.update(4000, false, false, null, null);
  assert.ok(ball.position.z < start - 3);
  culture.update(5700, false, false, null, null);
  assert.ok(Math.abs(pin.rotation.x) > 0.5);
  culture.update(7000, false, false, null, null);
  assert.equal(pin.rotation.x, 0);
  culture.update(1000, true, false, null, null);
  const still = ball.position.clone();
  culture.update(6000, true, false, null, null);
  assert.deepEqual(ball.position, still);
  assert.equal(culturePhase(1000, 7, true), culturePhase(6000, 7, true));
});

test('seated patrons stay on their chairs and mirror inside one atlas frame as the camera turns', () => {
  const scene = new T.Scene(),
    root = new T.Group(),
    patrons = [];
  for (const id of ['lan', 'arcade']) {
    const station = new T.Group();
    station.name = 'station_' + id;
    root.add(station);
  }
  const culture = createCultureWorld(
    T,
    scene,
    root,
    'town',
    (id, point, size, pose) => {
      const sprite = new T.Sprite(
        new T.SpriteMaterial({ map: new T.Texture() }),
      );
      sprite.position.set(point.x, 0, point.z);
      if (pose === 'seated') {
        sprite.userData.seated = true;
        sprite.userData.seatedFrame = { left: 0.2, width: 0.3, hip: 0.4 };
      }
      patrons.push(sprite);
      return sprite;
    },
  );
  const seated = patrons.filter((s) => s.userData.seated);
  assert.equal(seated.length, 4, 'two LAN patrons and two drivers');
  const homes = seated.map((s) => s.position.clone());
  culture.update(1000, false, false, null, null, -0.48);
  seated.forEach((s, i) => {
    assert.deepEqual(
      s.position,
      homes[i],
      'seated actors do not use the dance bounce',
    );
    assert.equal(s.material.map.offset.x, 0.5);
    assert.equal(s.material.map.repeat.x, -0.3);
    assert.equal(s.center.x, 0.6, 'hip pivot follows the mirrored body');
  });
  culture.update(4000, true, false, null, null, 0.48);
  seated.forEach((s, i) => {
    assert.deepEqual(
      s.position,
      homes[i],
      'camera changes also work under reduced motion',
    );
    assert.equal(s.material.map.offset.x, 0.2);
    assert.equal(s.material.map.repeat.x, 0.3);
    assert.equal(s.center.x, 0.4);
  });
  culture.update(4500, false, true, null, null, -0.48);
  assert.ok(
    patrons.every((s) => !s.visible),
    'board phase hides attraction patrons',
  );
  culture.dispose();
});
