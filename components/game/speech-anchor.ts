import {
  Vector2,
  Vector3,
  Raycaster,
  Mesh,
  type Sprite,
  type Camera,
  type Object3D,
} from 'three';

/** Sprites billboard towards the camera. Their head is NOT a world-Y offset. */
export function speechAnchor(
  sprite: Sprite,
  camera: Camera,
  width: number,
  height: number,
) {
  const base = sprite.getWorldPosition(new Vector3());
  const scale = sprite.getWorldScale(new Vector3());
  const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const angle = sprite.material.rotation;
  const head = base
    .clone()
    .addScaledVector(up, scale.y * (1 - sprite.center.y) * Math.cos(angle))
    .addScaledVector(right, -scale.y * (1 - sprite.center.y) * Math.sin(angle));
  const torso = base.clone().addScaledVector(up, scale.y * 0.55);
  const clip = head.clone().project(camera);
  return {
    head,
    torso,
    x: (clip.x * 0.5 + 0.5) * width,
    y: (-clip.y * 0.5 + 0.5) * height - 7,
    inView:
      sprite.visible &&
      clip.z >= -1 &&
      clip.z <= 1 &&
      Math.abs(clip.x) < 1 &&
      Math.abs(clip.y) < 1,
  };
}

/** Conservative visibility: don't announce a character hidden behind a roof or tree. */
export function speakerVisible(
  anchor: ReturnType<typeof speechAnchor>,
  camera: Camera,
  blockers: Object3D[],
  ray = new Raycaster(),
) {
  if (!anchor.inView) return false;
  for (const point of [anchor.torso, anchor.head]) {
    const clip = point.clone().project(camera);
    ray.setFromCamera(new Vector2(clip.x, clip.y), camera);
    ray.far = ray.ray.origin.distanceTo(point) - 0.08;
    const hit = ray.intersectObjects(blockers, false).some(({ object }) => {
      if (!(object instanceof Mesh) || !object.visible) return false;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      return materials.some(
        (m) => m.visible && (!m.transparent || m.opacity > 0.45),
      );
    });
    if (hit) return false;
  }
  return true;
}
