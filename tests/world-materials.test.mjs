import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { readFileSync } from 'node:fs';
import {
  prepareWorldMaterial,
  disposeWorldMaterial,
} from '../components/game/world-materials.ts';

// Compressed glTF images are selected by EXT_texture_webp instead of core source.
const textureSource = (texture) =>
  texture.extensions?.EXT_texture_webp?.source ?? texture.source;
const textureImage = (doc, texture) => doc.images[textureSource(texture)];

function assertLosslessImage(bytes, doc, image, label) {
  assert.ok(['image/png', 'image/webp'].includes(image.mimeType), label);
  if (image.mimeType === 'image/webp') {
    const view = doc.bufferViews[image.bufferView];
    const binaryStart = 20 + bytes.readUInt32LE(12) + 8;
    const data = bytes.subarray(
      binaryStart + (view.byteOffset ?? 0),
      binaryStart + (view.byteOffset ?? 0) + view.byteLength,
    );
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', label);
    let lossless = false;
    for (let offset = 12; offset + 8 <= data.length;) {
      if (data.toString('ascii', offset, offset + 4) === 'VP8L')
        lossless = true;
      const size = data.readUInt32LE(offset + 4);
      offset += 8 + size + (size % 2);
    }
    assert.ok(lossless, label + ' uses lossless VP8L encoding');
  }
}

test('world setup retains native normal, roughness and their authored strengths', () => {
  const map = new T.Texture(),
    normalMap = new T.Texture(),
    roughnessMap = new T.Texture();
  const material = new T.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap,
    roughness: 1,
    normalScale: new T.Vector2(0.7, 0.7),
  });
  material.name = 'culture_#62566e:1:False';
  prepareWorldMaterial(material, 'fair', 16);
  assert.equal(material.normalMap, normalMap);
  assert.equal(material.roughnessMap, roughnessMap);
  assert.equal(material.roughness, 1);
  assert.equal(material.normalScale.x, 0.7);
  assert.equal(material.bumpMap, null);
  assert.equal(normalMap.colorSpace, T.NoColorSpace);
  assert.equal(map.colorSpace, T.SRGBColorSpace);
  assert.equal(normalMap.anisotropy, 8);
});

test('changing eras disposes shared colour, normal and roughness maps only once', () => {
  const maps = [new T.Texture(), new T.Texture(), new T.Texture()];
  const counts = [0, 0, 0];
  maps.forEach((map, index) =>
    map.addEventListener('dispose', () => counts[index]++),
  );
  const a = new T.MeshStandardMaterial({
    map: maps[0],
    normalMap: maps[1],
    roughnessMap: maps[2],
  });
  const b = a.clone();
  const disposed = new Set();
  disposeWorldMaterial(a, disposed);
  disposeWorldMaterial(b, disposed);
  disposeWorldMaterial(a, disposed);
  assert.deepEqual(counts, [1, 1, 1]);
});

test('painted artwork is not embossed and legacy ground has a gentle fallback', () => {
  const poster = new T.MeshStandardMaterial({ map: new T.Texture() });
  poster.name = 'culture_#f0d6a3:9:False';
  prepareWorldMaterial(poster, 'town', 4);
  assert.equal(poster.bumpMap, null);
  const ground = poster.clone();
  ground.name = 'culture_#c6a875:0:False';
  prepareWorldMaterial(ground, 'estate', 4);
  assert.equal(ground.bumpMap, ground.map);
  assert.equal(ground.bumpScale, 0.012);
});

test('four fidelity worlds embed lossless PBR maps alongside original architecture', () => {
  for (const era of ['fair', 'estate', 'town', 'garden']) {
    const bytes = readFileSync(
      new URL(`../public/assets/trip/${era}.glb`, import.meta.url),
    );
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    const surfaces = doc.materials.filter(
      (m) => m.name?.startsWith('culture_') && /:[0-5]:/.test(m.name),
    );
    assert.ok(surfaces.length >= 3, era + ' authored surface materials');
    for (const m of surfaces) {
      assert.ok(m.normalTexture, era + ' missing native normal: ' + m.name);
      assert.ok(
        m.pbrMetallicRoughness.metallicRoughnessTexture,
        era + ' missing surface roughness: ' + m.name,
      );
      const image = textureImage(doc, doc.textures[m.normalTexture.index]);
      assertLosslessImage(
        bytes,
        doc,
        image,
        era + ' normal vectors must remain lossless',
      );
      assert.ok(
        doc.bufferViews[image.bufferView].byteLength > 100,
        era + ' packed material data',
      );
    }
    if (era === 'estate') {
      const mosaic = doc.materials.find((m) => m.name?.includes(':11:'));
      const tex =
        doc.textures[mosaic.pbrMetallicRoughness.baseColorTexture.index];
      const sampler = doc.samplers[tex.sampler];
      assert.equal(
        sampler.wrapS ?? 10497,
        10497,
        'mosaic repeats outside atlas boundaries',
      );
      const normal = textureImage(
        doc,
        doc.textures[mosaic.normalTexture.index],
      );
      assert.ok(normal.name.startsWith('dragon-normal'));
      assert.ok(
        ['image/jpeg', 'image/webp'].includes(textureImage(doc, tex).mimeType),
      );
    }
  }
});

test('fitted interiors export their own lights and packed artwork within each station', () => {
  for (const [era, kind, artwork] of [
    ['town', 'lan', 'lan-game-screen.png'],
    ['fair', 'cinema', 'cinema-poster.png'],
    ['fair', 'song', 'song-stage-portrait.png'],
    ['town', 'arcade', 'arcade-racing-screen.png'],
    ['town', 'arcade', 'arcade-dance-screen.png'],
  ]) {
    const bytes = readFileSync(
      new URL(`../public/assets/trip/${era}.glb`, import.meta.url),
    );
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    const station = doc.nodes.find((n) => n.name === `station_${kind}`);
    assert.equal(station.extras.authoredLighting, true);
    const descendants = [];
    const visit = (node) => {
      descendants.push(node);
      for (const index of node.children ?? []) visit(doc.nodes[index]);
    };
    visit(station);
    const lights = descendants.flatMap((node) => {
      const index = node.extensions?.KHR_lights_punctual?.light;
      return index === undefined
        ? []
        : [doc.extensions.KHR_lights_punctual.lights[index]];
    });
    assert.equal(
      lights.length,
      3,
      era + ' native fixtures stay parented to the attraction',
    );
    for (const light of lights) {
      assert.ok(['point', 'spot'].includes(light.type));
      assert.ok(
        light.intensity > 0 && light.intensity < 12,
        era + ' scene-scaled light intensity',
      );
      assert.ok(light.range > 0 && light.range < 5, era + ' local falloff');
    }
    assert.equal(
      lights.filter((light) => light.type === 'spot').length,
      kind === 'arcade' ? 1 : 2,
      'aimed key fixtures survive the native export',
    );
    for (const light of lights.filter((light) => light.type === 'spot')) {
      assert.ok(light.spot.innerConeAngle > 0);
      assert.ok(light.spot.innerConeAngle < light.spot.outerConeAngle);
      assert.ok(light.spot.outerConeAngle < Math.PI / 2);
    }
    const materialIndex = doc.materials.findIndex(
      (m) => m.name === 'culture_print_' + artwork,
    );
    assert.ok(materialIndex >= 0, era + ' printed material');
    assert.ok(
      descendants.some(
        (n) =>
          n.mesh !== undefined &&
          doc.meshes[n.mesh].primitives.some(
            (p) => p.material === materialIndex,
          ),
      ),
      era + ' print attached to station geometry',
    );
    const material = doc.materials[materialIndex];
    const texture =
      doc.textures[material.pbrMetallicRoughness.baseColorTexture.index];
    const image = textureImage(doc, texture);
    assert.ok(
      doc.bufferViews[image.bufferView].byteLength > 1000,
      era + ' embedded artwork',
    );
    assert.equal(image.uri, undefined, era + ' no external texture dependency');
    if (kind === 'lan' || kind === 'arcade') {
      assert.equal(
        textureSource(doc.textures[material.emissiveTexture.index]),
        textureSource(texture),
      );
      assert.ok(
        material.emissiveFactor.some((v) => v > 0),
        'CRT phosphor survives export',
      );
    } else {
      assert.equal(
        material.emissiveTexture,
        undefined,
        'printed posters use fixture lighting',
      );
    }
  }
});

test('native stage and court beams point down and retain soft cone falloff', () => {
  for (const { era, ids } of [
    { era: 'fair', ids: ['song', 'wayang', 'badminton'] },
    { era: 'garden', ids: ['stage', 'badminton'] },
  ]) {
    const bytes = readFileSync(
      new URL(`../public/assets/trip/${era}.glb`, import.meta.url),
    );
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    for (const id of ids) {
      const station = doc.nodes.find((node) => node.name === `station_${id}`);
      assert.equal(station.extras.authoredLighting, true);
      const spots = [];
      const visit = (index) => {
        const node = doc.nodes[index];
        const lightIndex = node.extensions?.KHR_lights_punctual?.light;
        const light =
          lightIndex === undefined
            ? null
            : doc.extensions.KHR_lights_punctual.lights[lightIndex];
        if (light?.type === 'spot') spots.push({ node, light });
        for (const child of node.children ?? []) visit(child);
      };
      station.children.forEach(visit);
      assert.equal(
        spots.length,
        id === 'badminton' ? 3 : 2,
        `${era} ${id} aimed fixtures`,
      );
      for (const { node, light } of spots) {
        const direction = new T.Vector3(0, 0, -1).applyQuaternion(
          new T.Quaternion().fromArray(node.rotation),
        );
        assert.ok(direction.y < -0.5, `${era} ${id} beam reaches the floor`);
        assert.ok(light.spot.innerConeAngle > 0);
        assert.ok(light.spot.innerConeAngle < light.spot.outerConeAngle);
        assert.ok(light.intensity > 0 && light.intensity < 12);
      }
    }
  }
});
