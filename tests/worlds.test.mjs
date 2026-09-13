import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ERAS, eraForYear, routePoint } from '../lib/game/worlds.ts';
import { BOARD_TILES } from '../lib/game/engine.ts';
import { OrthographicCamera, Vector3 } from 'three';

test('every era ships a valid, compact Blender GLB', () => {
  for (const era of ERAS) {
    const bytes = readFileSync(
      new URL(`../public/assets/worlds/${era.id}.glb`, import.meta.url),
    );
    assert.equal(bytes.toString('utf8', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.ok(
      bytes.length < 2_000_000,
      `${era.id} exceeds mobile asset budget`,
    );
    const json = JSON.parse(
      bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)),
    );
    assert.ok(json.meshes.length > 10);
    assert.ok(json.materials.length > 10);
  }
});
test('the 3D route closes and all 22 sprite anchors fit portrait and landscape', () => {
  assert.equal(BOARD_TILES.length, 22);
  const a = routePoint(0),
    b = routePoint(22);
  assert.ok(Math.abs(a.x - b.x) < 1e-8 && Math.abs(a.z - b.z) < 1e-8);
  for (const [w, h] of [
    [390, 480],
    [1280, 600],
    [844, 200],
  ]) {
    const hw = Math.max(14, (11 * w) / h),
      hh = (hw * h) / w;
    const camera = new OrthographicCamera(-hw, hw, hh, -hh, 0.1, 150);
    camera.position.set(19, 23, 25);
    camera.lookAt(0, 1, 0);
    camera.updateMatrixWorld();
    for (let i = 0; i < 22; i++) {
      const p = routePoint(i),
        v = new Vector3(p.x, p.y, p.z).project(camera);
      assert.ok(
        Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.9,
        `tile ${i} clipped at ${w}x${h}`,
      );
    }
  }
});
test('game years select an era at the defined boundaries', () => {
  for (const [year, id] of [
    [1965, 'kampong'],
    [1987, 'estate'],
    [1995, 'town'],
    [2005, 'town'],
    [2025, 'garden'],
  ])
    assert.equal(eraForYear(year), id);
});
