import * as T from 'three';
import type { CultureStation } from '../../lib/game/culture';

/** Soft stage-light scattering follows the actual GLTF lamps, including scale. */
export function createStageHaze(scene: T.Scene, stations: CultureStation[]) {
  const geometry = new T.ConeGeometry(1, 1, 32, 1, true);
  const beams: {
    light: T.SpotLight;
    mesh: T.Mesh<T.ConeGeometry, T.ShaderMaterial>;
    stationId: string;
  }[] = [];
  const down = new T.Vector3(0, -1, 0);
  let disposed = false;
  return {
    register(root: T.Object3D) {
      root.updateWorldMatrix(true, true);
      root.traverse((owner) => {
        const station = stations.find((s) => s.id === owner.userData.stationId);
        if (
          !owner.userData.authoredLighting ||
          !station ||
          !['song', 'wayang'].includes(station.kind)
        )
          return;
        owner.traverse((light) => {
          if (
            !(light instanceof T.SpotLight) ||
            beams.some((b) => b.light === light)
          )
            return;
          const start = light.getWorldPosition(new T.Vector3());
          const direction = light.target
            .getWorldPosition(new T.Vector3())
            .sub(start)
            .normalize();
          // The platform top is authored at .925 before station scale/elevation.
          const floor =
            (station.elevation ?? 0.1) + 0.925 * (station.scale ?? 1);
          if (direction.y >= -0.05 || start.y <= floor) return;
          const length = Math.min(
            (floor - start.y) / direction.y,
            light.distance || 6,
          );
          const radius =
            Math.tan(light.angle * (1 - light.penumbra * 0.65)) * length;
          const material = new T.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: T.AdditiveBlending,
            uniforms: {
              tint: { value: light.color.clone() },
              density: { value: 0.18 },
              floorY: { value: floor },
            },
            vertexShader: `
              varying float alongBeam;
              varying vec3 surfaceNormal;
              varying float worldY;
              void main() {
                alongBeam = .5 - position.y;
                surfaceNormal = normalize(normalMatrix * normal);
                worldY = (modelMatrix * vec4(position, 1.)).y;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
              }`,
            fragmentShader: `
              uniform vec3 tint;
              uniform float density;
              uniform float floorY;
              varying float alongBeam;
              varying vec3 surfaceNormal;
              varying float worldY;
              void main() {
                // Orthographic view direction is constant in view space. Fading
                // tangential faces removes the hard outline of the light volume.
                float edge = pow(abs(normalize(surfaceNormal).z), 1.6);
                float ends = smoothstep(0., .07, alongBeam) * (1. - smoothstep(.55, 1., alongBeam));
                float ground = smoothstep(floorY, floorY + .18, worldY);
                float alpha = density * edge * ends * ground;
                if (alpha < .001) discard;
                gl_FragColor = vec4(tint, alpha);
              }`,
          });
          const mesh = new T.Mesh(geometry, material);
          mesh.name = `Stage haze ${light.name}`;
          mesh.userData.atmosphericLight = true;
          mesh.position.copy(start).addScaledVector(direction, length * 0.5);
          mesh.quaternion.setFromUnitVectors(down, direction);
          mesh.scale.set(radius, length, radius);
          // It is light, not selectable geometry or an occluder in the AO pass.
          mesh.raycast = () => {};
          scene.add(mesh);
          beams.push({ light, mesh, stationId: station.id });
        });
      });
    },
    update(stationId: string | null) {
      for (const { light, mesh, stationId: owner } of beams) {
        mesh.visible = light.visible && light.intensity > 0;
        mesh.material.uniforms.density.value =
          stationId === owner ? 0.18 : 0.09;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { mesh } of beams) {
        scene.remove(mesh);
        mesh.material.dispose();
      }
      beams.length = 0;
      geometry.dispose();
    },
  };
}
