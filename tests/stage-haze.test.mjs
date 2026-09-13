import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createStageHaze } from '../components/game/stage-haze.ts';

test('stage haze stays attached to transformed native lamps and stops at the platform', () => {
  const scene = new T.Scene();
  const root = new T.Group();
  scene.add(root);
  const owner = new T.Group();
  owner.userData = { stationId: 'song', authoredLighting: true };
  owner.position.set(-14, 0.46, 10);
  owner.rotation.y = 0.6;
  owner.scale.setScalar(0.6);
  root.add(owner);
  const light = new T.SpotLight('#ffd398', 28, 6, Math.PI / 5, 0.6);
  light.position.set(-2.8, 3.18, -0.1);
  light.target.position.set(-1.176, 0.95, -1);
  owner.add(light, light.target);
  const haze = createStageHaze(scene, [
    { id: 'song', kind: 'song', scale: 0.6, elevation: 0.46 },
  ]);
  haze.register(root);
  haze.register(root);
  const beams = scene.children.filter((o) => o.userData.atmosphericLight);
  assert.equal(
    beams.length,
    1,
    'registration must not duplicate native fixtures',
  );
  const beam = beams[0];
  beam.updateWorldMatrix(true, false);
  const apex = beam.localToWorld(new T.Vector3(0, 0.5, 0));
  const end = beam.localToWorld(new T.Vector3(0, -0.5, 0));
  const start = light.getWorldPosition(new T.Vector3());
  const aim = light.target
    .getWorldPosition(new T.Vector3())
    .sub(start)
    .normalize();
  assert.ok(
    apex.distanceTo(start) < 1e-6,
    'beam must start at the transformed lamp',
  );
  assert.ok(end.clone().sub(start).normalize().distanceTo(aim) < 1e-6);
  assert.ok(
    Math.abs(end.y - (0.46 + 0.925 * 0.6)) < 1e-6,
    'beam must not extend beneath the stage',
  );
  assert.equal(beam.material.depthWrite, false);
  assert.equal(beam.castShadow, false);
  const hits = [];
  beam.raycast(new T.Raycaster(), hits);
  assert.deepEqual(
    hits,
    [],
    'light must not intercept walking or attraction clicks',
  );
  haze.update('song');
  const focused = beam.material.uniforms.density.value;
  haze.update(null);
  assert.ok(beam.material.uniforms.density.value < focused);
  light.intensity = 0;
  haze.update('song');
  assert.equal(beam.visible, false);
  let geometryDisposals = 0,
    materialDisposals = 0;
  beam.geometry.addEventListener('dispose', () => geometryDisposals++);
  beam.material.addEventListener('dispose', () => materialDisposals++);
  haze.dispose();
  haze.dispose();
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
  assert.ok(!scene.children.includes(beam));
});

test('ordinary fixtures and horizontal stage lights do not create haze volumes', () => {
  const scene = new T.Scene();
  const root = new T.Group();
  const stations = [
    { id: 'cafe', kind: 'lan' },
    { id: 'song', kind: 'song' },
  ];
  for (const s of stations) {
    const owner = new T.Group();
    owner.userData = { stationId: s.id, authoredLighting: true };
    const light = new T.SpotLight();
    light.position.set(0, 3, 0);
    light.target.position.set(2, 3, 0);
    owner.add(light, light.target);
    root.add(owner);
  }
  scene.add(root);
  const haze = createStageHaze(scene, stations);
  haze.register(root);
  assert.equal(
    scene.children.filter((o) => o.userData.atmosphericLight).length,
    0,
  );
  haze.dispose();
});
