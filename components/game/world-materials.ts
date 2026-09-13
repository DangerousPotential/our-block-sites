import * as T from 'three';

/** Shared atlas maps are freed once, including when an era changes mid-load. */
export function disposeWorldMaterial(
  material: T.Material,
  disposed: Set<T.Material | T.Texture>,
) {
  if (disposed.has(material)) return;
  disposed.add(material);
  for (const value of Object.values(material)) {
    if (value instanceof T.Texture && !disposed.has(value)) {
      disposed.add(value);
      value.dispose();
    }
  }
  material.dispose();
}

/** Retain Blender's tangent normals and roughness through GLTFLoader. */
export function prepareWorldMaterial(
  material: T.MeshStandardMaterial,
  era: string,
  maxAnisotropy: number,
) {
  for (const texture of [
    material.map,
    material.normalMap,
    material.roughnessMap,
  ])
    if (texture) texture.anisotropy = Math.min(8, maxAnisotropy);
  if (!material.name.startsWith('culture_') || !material.map) return;
  material.map.colorSpace = T.SRGBColorSpace;
  // A printed poster must not become embossed just because its ink is dark.
  // Older exports get a subtle surface-only fallback until they are rebuilt.
  if (!material.normalMap && /:[0-5]:/.test(material.name)) {
    material.bumpMap = material.map;
    material.bumpScale = 0.012;
  }
  material.color.set('#ffffff');
  if (!material.roughnessMap && material.name.includes(':1:'))
    material.roughness = 0.42;
  if (era === 'fair' && material.name.includes('#62566e:1:'))
    material.color.set('#b8aeca');
  if (era === 'town' && material.name.includes('#607985:2:'))
    material.color.set('#a9bfdc');
}
