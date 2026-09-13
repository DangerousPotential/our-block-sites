import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createFixtureShadows } from '../components/game/fixture-shadows.ts';

test('focused fixtures bound shadow cost, preserve native light and release old targets', () => {
  const root = new T.Group();
  const makeStation = (stationId) => {
    const station = new T.Group();
    station.userData = { stationId, authoredLighting: true };
    const lights = Array.from(
      { length: 3 },
      () => new T.SpotLight('#ffd39a', 8, 4),
    );
    station.add(...lights, new T.PointLight());
    root.add(station);
    return lights;
  };
  const a = makeStation('a'),
    b = makeStation('b');
  const shadows = createFixtureShadows();
  shadows.register(root);
  shadows.register(root);
  assert.equal(shadows.update(null, 0), false);
  assert.ok([...a, ...b].every((light) => !light.castShadow));
  assert.equal(
    shadows.update('a', 1),
    true,
    'activation requires an immediate renderer shadow pass',
  );
  assert.deepEqual(
    a.map((light) => light.castShadow),
    [true, true, false],
  );
  assert.ok(b.every((light) => !light.castShadow));
  assert.equal(a[0].shadow.mapSize.x, 512);
  assert.equal(a[0].shadow.camera.far, 4);
  a[0].shadow.needsUpdate = false;
  assert.equal(shadows.update('a', 50), false);
  assert.equal(a[0].shadow.needsUpdate, false);
  shadows.update('a', 101);
  assert.equal(a[0].shadow.needsUpdate, true);
  let released = 0;
  const map = new T.WebGLRenderTarget(512, 512);
  map.addEventListener('dispose', () => released++);
  a[0].shadow.map = map;
  assert.equal(
    shadows.update('b', 102),
    true,
    'switching allocates the new station before rendering',
  );
  assert.equal(released, 1);
  assert.equal(a[0].shadow.map, null);
  assert.ok(a.every((light) => !light.castShadow));
  assert.equal(a[0].intensity, 8, 'overview still has the authored light');
  assert.equal(a[0].visible, true);
  assert.deepEqual(
    b.map((light) => light.castShadow),
    [true, true, false],
  );
  assert.equal(shadows.update(null, 103), true);
  assert.ok(b.every((light) => !light.castShadow));
  shadows.dispose();
  shadows.dispose();
  assert.equal(released, 1, 'released targets cannot be disposed twice');
});
