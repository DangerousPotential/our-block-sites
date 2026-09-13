import type * as Three from 'three';
import {
  CULTURE,
  culturePhase,
  type CultureStation,
} from '../../lib/game/culture';
import type { Point } from '../../lib/game/trip-navigation';

type Actor = (
  id: string,
  p: Point,
  size?: number,
  pose?: 'seated',
) => Three.Sprite;

export function createCultureWorld(
  T: typeof Three,
  scene: Three.Scene,
  root: Three.Group,
  era: string,
  actor: Actor,
) {
  const world = CULTURE[era];
  const pickables: Three.Object3D[] = [];
  const authoredLighting = new Set<string>();
  const actors: {
    sprite: Three.Sprite;
    station: CultureStation;
    index: number;
    home: Three.Vector3;
  }[] = [];
  const motions: {
    object: Three.Object3D;
    station: CultureStation;
    home: Three.Vector3;
    rotation: Three.Euler;
    index: number;
  }[] = [];
  for (const [index, s] of world.stations.entries()) {
    const station = root.getObjectByName(`station_${s.id}`);
    if (!station) continue;
    station.traverse((o) => {
      if (station.userData.authoredLighting && o instanceof T.Light)
        authoredLighting.add(s.id);
      o.userData.stationId = s.id;
      if (o instanceof T.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        pickables.push(o);
        for (const material of Array.isArray(o.material)
          ? o.material
          : [o.material]) {
          if (material instanceof T.MeshStandardMaterial && material.map)
            material.map.anisotropy = 4;
        }
      }
      if (o.name.startsWith('motion_'))
        motions.push({
          object: o,
          station: s,
          home: o.position.clone(),
          rotation: o.rotation.clone(),
          index: motions.length,
        });
    });
    const places =
      s.kind === 'badminton'
        ? [
            [0, -3],
            [0, 3],
          ]
        : s.kind === 'bowling'
          ? [
              [-2.5, 3.8],
              [2.5, 3.8],
            ]
          : ['song', 'wayang'].includes(s.kind)
            ? [
                [-1, -0.5],
                [1, -0.5],
              ]
            : s.kind === 'lan'
              ? [
                  [-1.3, 0.32],
                  [1.3, 0.32],
                ]
              : s.kind === 'arcade'
                ? [
                    [-3, 0.73],
                    [1.45, 1.03],
                    [4.05, 1.03],
                  ]
                : s.kind === 'trades'
                  ? [
                      [-2.5, -0.5],
                      [2.5, 0.3],
                    ]
                  : s.kind === 'voiddeck'
                    ? [
                        [-2, 1.8],
                        [3, 1.5],
                      ]
                    : s.kind === 'rides' ||
                        s.kind === 'jetty' ||
                        s.kind === 'mrt'
                      ? [
                          [-3, 5],
                          [3, 5],
                        ]
                      : [
                          [-2, 2],
                          [2, 2],
                        ];
    places.forEach(([x, z], i) => {
      const sprite = actor(
        ['mei', 'arun', 'aisyah', 'daniel'][(index + i) % 4],
        { x: s.x + x * (s.scale ?? 1), z: s.z + z * (s.scale ?? 1) },
        s.kind === 'lan'
          ? 0.84
          : s.kind === 'arcade' && i > 0
            ? 0.9
            : s.kind === 'arcade'
              ? 0.78
              : s.scale
                ? 0.95
                : 1.15,
        s.kind === 'lan' || (s.kind === 'arcade' && i > 0)
          ? 'seated'
          : undefined,
      );
      sprite.position.y =
        (sprite.userData.seated
          ? s.kind === 'lan'
            ? 0.72
            : 0.96
          : ['song', 'wayang'].includes(s.kind)
            ? 0.96
            : s.kind === 'arcade' && i === 0
              ? 0.51
              : 0.3) *
          (s.scale ?? 1) +
        (s.elevation ?? 0);
      actors.push({
        sprite,
        station: s,
        index: i,
        home: sprite.position.clone(),
      });
    });
  }
  // A selected entrance gets one quiet ring; the world is not covered in pins.
  const halo = new T.Mesh(
    new T.RingGeometry(0.65, 0.76, 40),
    new T.MeshBasicMaterial({
      color: '#ffe1a4',
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.visible = false;
  scene.add(halo);
  const light = new T.PointLight(
    era === 'town' ? '#9edee9' : '#ffc58c',
    65,
    17,
    2,
  );
  light.position.set(0, 4, 0);
  scene.add(light);
  // Rain is geometry in the world, never a screen overlay covering the controls.
  const drops = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) {
    drops[i * 3] = ((i * 17.37) % 54) - 27;
    drops[i * 3 + 1] = (i * 0.73) % 12;
    drops[i * 3 + 2] = -25 + ((i * 11.17) % 50);
  }
  const rainGeometry = new T.BufferGeometry();
  rainGeometry.setAttribute('position', new T.BufferAttribute(drops, 3));
  const rain = new T.Points(
    rainGeometry,
    new T.PointsMaterial({
      color: '#c6c5de',
      size: 0.055,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  rain.visible = era === 'fair';
  scene.add(rain);
  return {
    pickables,
    dispose() {
      rainGeometry.dispose();
      rain.material.dispose();
      scene.remove(rain);
    },
    update(
      time: number,
      reduced: boolean,
      hidden: boolean,
      selected: CultureStation | null,
      started: number | null,
      cameraBearing = -0.48,
    ) {
      halo.visible = !!selected && !hidden;
      if (selected) {
        halo.position.set(selected.entrance.x, 0.27, selected.entrance.z);
        const scale = selected.scale ?? 1;
        light.position.set(selected.x, 4 * scale, selected.z + scale);
        light.intensity =
          (['fair', 'town', 'garden'].includes(era) ? 18 : 4) * scale * scale;
      }
      light.visible =
        !hidden && !!selected && !authoredLighting.has(selected.id);
      rain.visible = era === 'fair' && !reduced && !hidden;
      if (rain.visible) {
        for (let i = 0; i < 180; i++)
          drops[i * 3 + 1] = 12 - ((time * 0.004 + i * 0.73) % 12);
        rainGeometry.attributes.position.needsUpdate = true;
      }
      for (const { object: o, station: s, home, rotation, index } of motions) {
        const t =
          selected?.id === s.id && started !== null ? time - started : time;
        const p = culturePhase(t, s.duration, reduced),
          a = p * Math.PI * 2;
        o.position.copy(home);
        o.rotation.copy(rotation);
        const n = o.name;
        if (n.includes('_cups')) o.rotation.y = a;
        else if (n.includes('_coaster')) {
          o.position.set(
            4 + 2 * Math.cos(a),
            1.9 + 0.6 * Math.sin(a * 2),
            3 * Math.sin(a),
          );
          o.rotation.y = -a;
        } else if (n.includes('_shuttle')) {
          o.position.z = 3 * Math.cos(a);
          o.position.y = 1.6 + Math.abs(Math.sin(a)) * 2.2;
        } else if (n.includes('_ring')) {
          o.position.z = 2 - p * 2.2;
          o.position.y = 1.3 + Math.sin(p * Math.PI) * 1.5;
        } else if (n.includes('_ball')) {
          o.position.z = 2.5 - Math.min(p / 0.7, 1) * 6.7;
          o.rotation.x = -p * 25;
        } else if (n.includes('_pin')) {
          o.rotation.x =
            p > 0.7 ? (index % 2 ? 1 : -1) * Math.min(1, (p - 0.7) * 12) : 0;
          o.position.y = home.y - (p > 0.78 ? 0.22 : 0);
        } else if (n.includes('_train')) o.position.x = Math.sin(a) * 2.8;
        else if (n.includes('_boat')) {
          o.position.z = Math.sin(a) * 0.7;
          o.rotation.z = Math.sin(a) * 0.025;
        } else if (n.includes('_pour')) {
          o.position.y = home.y + 0.35 * (1 + Math.sin(a));
          o.rotation.z = -0.35 - 0.3 * Math.sin(a);
        } else if (n.includes('_stream')) {
          o.scale.y = 0.6 + 0.4 * (1 + Math.sin(a));
          o.position.y = home.y + 0.15 * Math.sin(a);
        } else if (n.includes('_steam')) {
          o.position.y = home.y + p * 0.8;
          o.scale.setScalar(0.6 + p);
        } else if (
          n.includes('_hammer') ||
          n.includes('_scissors') ||
          n.includes('_brush')
        ) {
          o.rotation.z = Math.sin(a * 4) * 0.5;
          o.position.y = home.y + Math.abs(Math.sin(a * 4)) * 0.25;
        } else if (n.includes('_chapteh'))
          o.position.y = 0.35 + Math.abs(Math.sin(a * 3)) * 1.7;
        else if (n.includes('_football')) {
          o.position.z = 2 - Math.sin(p * Math.PI) * 3.4;
          o.position.y = 0.45 + Math.sin(p * Math.PI) * 0.5;
        } else if (n.includes('_skate')) {
          o.position.x = Math.sin(a) * 3.5;
          o.position.y = 0.4 + Math.pow(Math.abs(Math.sin(a)), 8) * 1.2;
          o.rotation.z = Math.sin(a) * 0.12;
        } else if (n.includes('_laundry'))
          o.rotation.x = Math.sin(a + index) * 0.08;
        if (
          o instanceof T.Mesh &&
          /_(pixel|pad|flash|projection|spotlight)/.test(n)
        ) {
          for (const mat of Array.isArray(o.material)
            ? o.material
            : [o.material])
            if (mat instanceof T.MeshStandardMaterial) {
              // Slow illumination changes; photo uses a steady glow under reduced motion.
              mat.emissiveIntensity = reduced
                ? 0.65
                : n.includes('_flash')
                  ? p > 0.5 && p < 0.6
                    ? 2
                    : 0.15
                  : 0.6 + 0.5 * (1 + Math.sin(a + index));
            }
        }
      }
      for (const { sprite, station: s, index, home } of actors) {
        const scale = s.scale ?? 1,
          elevation = s.elevation ?? 0;
        sprite.visible = !hidden;
        sprite.position.copy(home);
        sprite.material.rotation = 0;
        // The authored pose faces right. Mirror within its own atlas frame
        // when the camera sees the keyboard/wheel to the patron's left.
        const pose = sprite.userData.seatedFrame;
        if (pose && sprite.material.map) {
          const mirrored = Math.sin(cameraBearing) < 0;
          sprite.material.map.repeat.x = mirrored ? -pose.width : pose.width;
          sprite.material.map.offset.x =
            pose.left + (mirrored ? pose.width : 0);
          sprite.center.x = mirrored ? 1 - pose.hip : pose.hip;
        }
        if (reduced) continue;
        const p = culturePhase(
            selected?.id === s.id && started !== null ? time - started : time,
            s.duration,
            false,
          ),
          a = p * Math.PI * 2;
        if (s.kind === 'dragon' && index === 0) {
          sprite.position.set(
            s.x - 2.5 * scale,
            elevation + (2.96 - 2.62 * p * p * (3 - 2 * p)) * scale,
            s.z + (1.3 + p * 2.45) * scale,
          );
        } else if (s.kind === 'cinema') {
          if (p > 0.2)
            sprite.position.set(
              s.x + (index ? 3.3 : 0.3) * scale,
              elevation + 0.55 * scale,
              s.z + scale,
            );
        } else if (s.kind === 'badminton') {
          sprite.position.x += Math.sin(a) * 0.7 * scale;
          sprite.material.rotation = Math.sin(a) * 0.09;
        } else if (
          ['song', 'wayang', 'games'].includes(s.kind) ||
          (s.kind === 'arcade' && index === 0)
        ) {
          sprite.position.y += Math.abs(Math.sin(a * 3 + index)) * 0.18;
          sprite.material.rotation = Math.sin(a * 3 + index) * 0.05;
        } else if (s.kind === 'bowling') {
          sprite.material.rotation =
            p < 0.2 ? -0.12 * Math.sin((p / 0.2) * Math.PI) : 0;
        } else if (['trades', 'lan', 'arts', 'provisions'].includes(s.kind)) {
          sprite.material.rotation = Math.sin(a * 3 + index) * 0.035;
        }
      }
    },
  };
}
