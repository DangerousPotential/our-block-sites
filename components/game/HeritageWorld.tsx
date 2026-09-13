'use client';
// The focusable canvas host implements keyboard walking and pointer camera controls.
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex */
/* oxlint-disable react/react-compiler -- Three.js mutates only newly constructed sprites and cloned visitor objects in this imperative scene. */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { freshMotion, type RemoteMotion } from '@/lib/game/phone-motion';
import { findCharacter } from '@/lib/game/characters';
import { EXPLORATION_LAYOUTS as LAYOUTS } from '@/lib/game/trip-layouts';
import {
  pathTo,
  meetingPoint,
  walkable,
  type Point,
} from '@/lib/game/trip-navigation';
import {
  EXPLORATION_ERAS,
  PASTIMES_1950S,
  type WorldEra,
} from '@/lib/game/pastimes1950s';
import PastimeEncounter from './PastimeEncounter';
import type { PublicRoom } from '@/lib/game/engine';
import { createWorldLife } from './world-life';
import { createCityLife } from './city-life';
import ResidentConversation, {
  type ResidentStory,
} from './ResidentConversation';
import { residentLines, residentRole } from '@/lib/game/resident-stories';

export default function HeritageWorld({
  era,
  character,
  room,
  playerId,
  onNpc,
  onWalk,
  remoteMotion,
}: {
  era: WorldEra;
  character: string;
  room?: PublicRoom;
  playerId?: string;
  onNpc: (n: number) => void;
  onWalk?: (p: Point) => void;
  remoteMotion?: RefObject<RemoteMotion | null>;
}) {
  const mount = useRef<HTMLDivElement>(null),
    pins = useRef<(HTMLButtonElement | null)[]>([]);
  const live = useRef({ room, onNpc, onWalk }),
    command = useRef<(n: number) => void>(() => {});
  const zoom = useRef(0.9);
  const overview = useRef(false);
  const [pastime, setPastime] = useState<number | null>(null);
  const bearing = useRef(Math.PI / 5);
  const modalOpen = useRef(false);
  const residentCommand = useRef<(n: number) => void>(() => {});
  const districtCommand = useRef<(n: number) => void>(() => {});
  const [residents, setResidents] = useState<string[]>([]);
  const [conversation, setConversation] = useState<
    (ResidentStory & { era: WorldEra }) | null
  >(null);
  useEffect(() => {
    modalOpen.current = conversation !== null || pastime !== null;
  }, [conversation, pastime]);
  useEffect(() => {
    live.current = { room, onNpc, onWalk };
  }, [room, onNpc, onWalk]);
  const [status, setStatus] = useState('Opening the neighbourhood…');
  const definition = EXPLORATION_ERAS.find((e) => e.id === era)!;
  useEffect(() => {
    overview.current = false;
    zoom.current = era === 'pastimes' ? 0.82 : 0.9;
    bearing.current = era === 'pastimes' ? 0.25 : Math.PI / 5;
    let disposed = false,
      frame = 0,
      cleanup = () => {};
    const el = mount.current!,
      m = LAYOUTS[era];
    void (async () => {
      const T = await import('three'),
        { createModelLoader } = await import('./model-loader');
      if (disposed) return;
      setStatus('Opening the neighbourhood…');
      const scene = new T.Scene(),
        night = ['fair', 'garden', 'pastimes'].includes(era);
      scene.background = new T.Color(
        era === 'pastimes' ? '#51445f' : night ? '#101e36' : '#c4d8cf',
      );
      scene.fog = new T.Fog(scene.background, 65, 120);
      const renderer = new T.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(
        Math.min(
          devicePixelRatio,
          window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5,
        ),
      );
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = night ? 1.4 : 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFShadowMap;
      el.appendChild(renderer.domElement);
      const camera = new T.OrthographicCamera(-20, 20, 15, -15, 0.1, 150);
      scene.add(
        new T.HemisphereLight(
          night ? '#a5c9df' : '#fff5dc',
          '#51685f',
          era === 'pastimes' ? 0.7 : night ? 1.1 : 1.3,
        ),
      );
      const sun = new T.DirectionalLight('#ffe2b5', night ? 0.8 : 1.7);
      sun.position.set(-15, 30, 20);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, {
        left: -32,
        right: 32,
        top: 32,
        bottom: -32,
        near: 1,
        far: 100,
      });
      sun.shadow.bias = -0.001;
      scene.add(sun);
      const resize = () => {
        const w = el.clientWidth,
          h = el.clientHeight;
        renderer.setSize(w, h);
        camera.left = (-13 * w) / h;
        camera.right = (13 * w) / h;
        camera.top = 13;
        camera.bottom = -13;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      let disposeCity = () => {};
      observer.observe(el);
      resize();
      const textures: import('three').Texture[] = [];
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        el.removeEventListener('pointerdown', pointerDown);
        el.removeEventListener('pointermove', pointerMove);
        el.removeEventListener('pointerup', pointerUp);
        el.removeEventListener('pointercancel', pointerCancel);
        el.removeEventListener('wheel', wheel);
        el.removeEventListener('keydown', keyDown);
        el.removeEventListener('keyup', keyUp);
        el.removeEventListener('blur', clearKeys);
        disposeCity();
        scene.traverse((o) => {
          if (o instanceof T.Mesh || o instanceof T.Sprite) {
            if (o instanceof T.Mesh) o.geometry.dispose();
            for (const mat of Array.isArray(o.material)
              ? o.material
              : [o.material]) {
              if ('map' in mat)
                (mat.map as import('three').Texture | null)?.dispose();
              mat.dispose();
            }
          }
        });
        textures.forEach((t) => t.dispose());
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
      const [gltf, pets, people, micro, periodVisitors] = await Promise.all([
        createModelLoader().loadAsync(
          `/api/art?file=trip/${era}.glb&v=${era === 'pastimes' ? 'history17' : 'published-a234102'}`,
        ),
        new T.TextureLoader().loadAsync('/api/media?path=assets/pets.png'),
        new T.TextureLoader().loadAsync(
          '/api/media?path=assets/neighbours.png',
        ),
        createModelLoader().loadAsync(
          '/api/media?path=assets/trip/micro-props.glb&v=5',
        ),
        era === 'pastimes'
          ? createModelLoader().loadAsync(
              '/api/art?file=trip/period-visitors.glb&v=3',
            )
          : Promise.resolve(null),
      ]);
      textures.push(pets, people);
      if (disposed) {
        for (const source of [
          gltf.scene,
          micro.scene,
          ...(periodVisitors ? [periodVisitors.scene] : []),
        ])
          source.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.geometry.dispose();
              for (const mat of Array.isArray(o.material)
                ? o.material
                : [o.material])
                mat.dispose();
            }
          });
        textures.forEach((t) => t.dispose());
        return;
      }
      scene.add(gltf.scene);
      if (era === 'pastimes') {
        // One unshadowed light per attraction keeps its own warm focal point.
        const centres = [
          [-12, -10],
          [0, -10],
          [-4.5, 0],
          [12, -10],
          [-13, 7],
          [12, 4],
          [0, 11],
        ];
        for (const [x, z] of centres) {
          const light = new T.PointLight('#ffbb70', 105, 10, 2);
          light.position.set(x, 3.2, z + 1);
          scene.add(light);
        }
      }
      if (era === 'pastimes') {
        // Small additive halos around actual lamps, sharing one inexpensive texture.
        const haloCanvas = document.createElement('canvas');
        haloCanvas.width = haloCanvas.height = 64;
        const ctx = haloCanvas.getContext('2d')!;
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        const haloTexture = new T.CanvasTexture(haloCanvas);
        const haloMaterial = new T.SpriteMaterial({
          map: haloTexture,
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          opacity: 0.6,
          color: '#ffc06e',
        });
        const streetHaloMaterial = haloMaterial.clone();
        streetHaloMaterial.color.set('#dbe9ff');
        streetHaloMaterial.opacity = 0.35;
        const streetLamps = [
          [-18, -4],
          [-6, -4],
          [7, -4],
          [18, -4],
          [-6, 7],
          [6, 7],
          [18, 11],
          [-18, -15],
        ];
        for (const [x, z] of streetLamps) {
          const halo = new T.Sprite(streetHaloMaterial);
          halo.position.set(x + 0.65, 4.08, z);
          halo.scale.set(0.75, 0.75, 1);
          scene.add(halo);
          if (z === -4) {
            const light = new T.PointLight('#dbe9ff', 20, 5, 2);
            light.position.set(x + 0.65, 3.95, z);
            scene.add(light);
          }
        }
        const lampPositions = [
          [-14.7, 1.45, -6.29],
          [-9.3, 1.45, -6.29],
          [-6.9, 3.55, -0.5],
          [-4.5, 3.55, -0.5],
          [-2.1, 3.55, -0.5],
          [-1.1, 2.65, 10.8],

          [1.4, 2.65, 10.8],
        ];
        for (const [x, y, z] of lampPositions) {
          const halo = new T.Sprite(haloMaterial);
          halo.position.set(x, y, z);
          halo.scale.set(1.25, 1.25, 1);
          scene.add(halo);
        }
      }
      micro.scene.visible = false;
      scene.add(micro.scene);
      gltf.scene.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = !o.name.startsWith('anim_');
          o.receiveShadow = true;
        }
      });
      const corrected = new Set<import('three').Material>();
      const schoolRoofs: import('three').MeshStandardMaterial[] = [];
      gltf.scene.traverse((o) => {
        if (o instanceof T.Mesh)
          for (const material of Array.isArray(o.material)
            ? o.material
            : [o.material])
            if (
              material instanceof T.MeshStandardMaterial &&
              !corrected.has(material)
            ) {
              // This Blender scene exports correctly linearised material swatches.
              if (era !== 'pastimes') material.color.convertSRGBToLinear();
              if (material.name === 'thatch #995b43') {
                material.transparent = true;
                material.depthWrite = false;
                schoolRoofs.push(material);
              }
              corrected.add(material);
            }
      });
      gltf.scene.traverse((o) => {
        if (o instanceof T.Mesh && night && era !== 'pastimes')
          for (const material of Array.isArray(o.material)
            ? o.material
            : [o.material])
            if (
              material instanceof T.MeshStandardMaterial &&
              ['#ffe1a1', '#eabd73'].includes(material.name)
            ) {
              material.emissive.set('#ffbe72');
              material.emissiveIntensity = 0.65;
            }
      });
      if (night)
        for (const p of m.npcs) {
          const lamp = new T.PointLight('#ffc57c', 15, 9, 2);
          lamp.position.set(p.x, 3, p.z);
          scene.add(lamp);
        }
      // Two local light pools follow nearby districts, keeping shader cost bounded.
      const districtLights = night
        ? ['#ffc982', era === 'garden' ? '#a0dfe1' : '#e9a1c8'].map((color) => {
            const light = new T.PointLight(color, 45, 10, 2);
            scene.add(light);
            return light;
          })
        : [];
      let lastDistrictLightUpdate = -Infinity;
      let periodVisitorIndex = 0;
      const actor = (id: string, p: Point, size = 1.35, isPlayer = false) => {
        const c = findCharacter(id),
          rows = c.kind === 'pet' ? 2 : 3,
          map = (c.kind === 'pet' ? pets : people).clone();
        textures.push(map);
        map.colorSpace = T.SRGBColorSpace;
        map.magFilter = T.NearestFilter;
        map.minFilter = T.NearestFilter;
        map.repeat.set(0.25, 1 / rows);
        map.offset.set(c.column / 4, 1 - (c.row + 1) / rows);
        map.needsUpdate = true;
        const s = new T.Sprite(
          new T.SpriteMaterial({
            map,
            transparent: true,
            alphaTest: 0.12,
            depthWrite: false,
          }),
        );
        s.center.set(0.5, 0);
        s.scale.set(size, size * 1.3, 1);
        s.position.set(p.x, 0.2, p.z);
        s.userData.character = id;
        if (periodVisitors && !isPlayer) {
          const source = periodVisitors.scene.getObjectByName(
            `period_visitor_${periodVisitorIndex++ % 4}`,
          );
          if (source) {
            // Keep the existing sprite hit target and movement contract, while
            // rendering the same Blender clothing vocabulary as the static crowd.
            s.material.opacity = 0;
            const visitor = source.clone(true);
            visitor.scale
              .set(1 / size, 1 / (size * 1.3), 1)
              .multiplyScalar(size / 1.35);
            visitor.traverse((object) => {
              object.raycast = () => {};
              if (object instanceof T.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
              }
            });
            s.add(visitor);
          }
        }
        scene.add(s);
        return s;
      };
      const initial =
        live.current.room?.trip?.positions[playerId ?? ''] ?? m.spawn;
      const player = actor(character, initial, 1.6, true),
        npcs = m.npcs.map((p, i) =>
          actor(['otto', 'kopi', 'pandan', 'merly'][i], p),
        );
      const extras = m.npcs.flatMap((p, i) => [
        actor(
          ['mei', 'arun', 'aisyah', 'daniel'][i],
          { x: p.x + 1.3, z: p.z + 0.6 },
          1.1,
        ),
      ]);
      const tokens = new Map<string, import('three').Sprite>();
      const neighbours = [...extras];
      const animateLife = createWorldLife(
        gltf.scene,
        (id, p, size) => {
          const s = actor(id, p, size);
          neighbours.push(s);
          return s;
        },
        m,
        micro.scene,
        [...npcs, ...extras],
      );
      const speechBlockers: import('three').Object3D[] = [];
      gltf.scene.traverse((object) => {
        if (object instanceof T.Mesh) speechBlockers.push(object);
      });
      const city = createCityLife(
        T,
        scene,
        el,
        m,
        neighbours,
        micro.scene,
        speechBlockers,
      );
      disposeCity = () => city.dispose();
      const stories = neighbours.map((s) => {
        const r = s.userData.resident;
        return {
          name: `${findCharacter(s.userData.character).name} · ${residentRole(r?.name ?? 'Neighbour')}`,
          character: s.userData.character as string,
          lines: residentLines(era, r?.name ?? 'chat', r?.lines),
          era,
        };
      });
      setResidents(stories.map((s) => s.name));
      const boardCenter = m.board.reduce(
        (p, b) => ({
          x: p.x + b.x / m.board.length,
          z: p.z + b.z / m.board.length,
        }),
        { x: 0, z: 0 },
      );
      const board = new T.Group();
      scene.add(board);
      const route = new T.LineLoop(
        new T.BufferGeometry().setFromPoints(
          m.board.map((p) => new T.Vector3(p.x, 0.22, p.z)),
        ),
        new T.LineBasicMaterial({ color: '#f5dca8' }),
      );
      board.add(route);
      m.board.forEach((p, i) => {
        const tile = new T.Mesh(
          new T.CylinderGeometry(0.58, 0.62, 0.12, 16),
          new T.MeshStandardMaterial({
            color: [2, 5, 9, 13, 17, 20].includes(i)
              ? '#e7b758'
              : i % 2
                ? '#6eaaa0'
                : '#d98772',
            emissive: '#352f24',
            emissiveIntensity: 0.2,
          }),
        );
        tile.position.set(p.x, 0.22, p.z);
        board.add(tile);
        const badge = document.createElement('canvas');
        badge.width = 64;
        badge.height = 64;
        const ink = badge.getContext('2d')!;
        ink.fillStyle = '#243b46';
        ink.font = 'bold 36px sans-serif';
        ink.textAlign = 'center';
        ink.textBaseline = 'middle';
        ink.fillText(String(i + 1), 32, 34);
        const map = new T.CanvasTexture(badge);
        textures.push(map);
        const number = new T.Sprite(
          new T.SpriteMaterial({ map, depthWrite: false }),
        );
        number.position.set(p.x, 0.4, p.z);
        number.scale.set(0.62, 0.62, 1);
        board.add(number);
      });
      const destination = new T.Mesh(
        new T.RingGeometry(0.3, 0.4, 24),
        new T.MeshBasicMaterial({ color: '#fff0ae', side: T.DoubleSide }),
      );
      destination.rotation.x = -Math.PI / 2;
      destination.visible = false;
      scene.add(destination);
      let path: Point[] = [],
        pending = -1,
        pendingResident = -1,
        pendingAttraction = -1,
        last = performance.now(),
        lastSend = 0;
      const go = (p: Point, npc = -1) => {
        if (modalOpen.current) return false;
        pendingAttraction = -1;
        overview.current = false;
        pendingResident = -1;
        setConversation(null);
        const from = { x: player.position.x, z: player.position.z };
        // A tap on a roof or a pavement edge finds its nearest accessible approach.
        if (
          !walkable(m, {
            x: Math.round(p.x * 2) / 2,
            z: Math.round(p.z * 2) / 2,
          })
        ) {
          const approach = meetingPoint(m, from, {
            x: Math.max(-m.bounds.x, Math.min(m.bounds.x, p.x)),
            z: Math.max(-m.bounds.z, Math.min(m.bounds.z, p.z)),
          });
          if (approach) p = approach;
        }
        path = pathTo(m, from, p);
        pending = npc;
        if (
          !path.length &&
          Math.hypot(player.position.x - p.x, player.position.z - p.z) > 1
        ) {
          pending = -1;
          setStatus('That spot is blocked. Try the nearby path.');
          return false;
        }
        destination.position.set(p.x, 0.25, p.z);
        destination.visible = true;
        setStatus(
          npc >= 0
            ? `Walking to ${definition.npcs[npc]}…`
            : 'Tap a path to wander',
        );
        return true;
      };
      command.current = (n) => go(m.npcs[n], n);
      residentCommand.current = (n) => {
        if (
          disposed ||
          !neighbours[n] ||
          (live.current.room && live.current.room.phase !== 'exploring')
        )
          return;
        const s = neighbours[n],
          target = {
            x: s.position.x,
            z: s.position.z,
          };
        const p = meetingPoint(
          m,
          { x: player.position.x, z: player.position.z },
          target,
        );
        if (p && go(p)) {
          pendingResident = n;
          s.userData.visitUntil = performance.now() + 30000;
        }
      };
      districtCommand.current = (n) => {
        if (
          disposed ||
          (live.current.room && live.current.room.phase !== 'exploring')
        )
          return;
        const target = m.districts?.[n];
        if (!target) return;
        const p = meetingPoint(
          m,
          { x: player.position.x, z: player.position.z },
          target,
        );
        if (p && go(p) && era === 'pastimes') {
          pendingAttraction = n;
          zoom.current = 1.15;
          setStatus(`Walking to ${PASTIMES_1950S[n].name}…`);
        }
      };
      const ray = new T.Raycaster(),
        plane = new T.Plane(new T.Vector3(0, 1, 0), -0.2);
      function tap(e: PointerEvent) {
        if (modalOpen.current) return;
        if (live.current.room && live.current.room.phase !== 'exploring')
          return;
        const rect = el.getBoundingClientRect();
        ray.setFromCamera(
          new T.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            (-(e.clientY - rect.top) / rect.height) * 2 + 1,
          ),
          camera,
        );
        const p = new T.Vector3();
        if (era === 'pastimes') {
          for (const hit of ray.intersectObject(gltf.scene, true)) {
            let object: import('three').Object3D | null = hit.object;
            while (object) {
              if (typeof object.userData.pastimeIndex === 'number') {
                // Walk on the bathing deck; the building and selector still open its visit.
                if (
                  object.userData.pastimeIndex === 4 &&
                  hit.point.z >= 7 &&
                  walkable(m, hit.point)
                ) {
                  go({ x: hit.point.x, z: hit.point.z });
                  return;
                }
                districtCommand.current(object.userData.pastimeIndex);
                return;
              }
              object = object.parent;
            }
          }
        }
        const neighbour = ray.intersectObjects(npcs)[0];
        if (neighbour) {
          command.current(
            npcs.indexOf(neighbour.object as import('three').Sprite),
          );
          return;
        }
        const resident = ray.intersectObjects(neighbours)[0];
        if (resident) {
          residentCommand.current(
            neighbours.indexOf(resident.object as import('three').Sprite),
          );
          return;
        }
        // Small pixel-art silhouettes still get a finger-sized touch target.
        const near = [...npcs, ...neighbours]
          .filter((s) => s.visible)
          .map((s) => {
            const screen = s.position
              .clone()
              .add(new T.Vector3(0, 0.65, 0))
              .project(camera);
            return {
              s,
              distance: Math.hypot(
                (screen.x * 0.5 + 0.5) * rect.width - (e.clientX - rect.left),
                (-screen.y * 0.5 + 0.5) * rect.height - (e.clientY - rect.top),
              ),
            };
          })
          .filter((hit) => hit.distance < 22)
          .sort((a, b) => a.distance - b.distance)[0];
        if (near) {
          const index = npcs.indexOf(near.s);
          if (index >= 0) command.current(index);
          else residentCommand.current(neighbours.indexOf(near.s));
          return;
        }
        if (ray.ray.intersectPlane(plane, p)) go({ x: p.x, z: p.z });
      }
      const pointers = new Map<number, { x: number; y: number }>();
      const keys = new Set<string>();
      let gesture = false,
        downX = 0,
        downY = 0;
      function pointerDown(e: PointerEvent) {
        el.focus({ preventScroll: true });
        el.setPointerCapture(e.pointerId);
        if (!pointers.size) {
          gesture = false;
          downX = e.clientX;
          downY = e.clientY;
        }
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size > 1) gesture = true;
      }
      function pointerMove(e: PointerEvent) {
        const previous = pointers.get(e.pointerId);
        if (!previous) return;
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7)
          gesture = true;
        if (pointers.size === 2) {
          const other = [...pointers.entries()].find(
            ([id]) => id !== e.pointerId,
          )![1];
          const before = Math.hypot(previous.x - other.x, previous.y - other.y);
          const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
          if (before > 10) {
            overview.current = false;
            zoom.current = Math.max(
              0.55,
              Math.min(2.5, (zoom.current * after) / before),
            );
          }
        } else if (gesture) bearing.current -= (e.clientX - previous.x) * 0.007;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      function pointerUp(e: PointerEvent) {
        const tapped =
          pointers.has(e.pointerId) && !gesture && pointers.size === 1;
        pointers.delete(e.pointerId);
        if (el.hasPointerCapture(e.pointerId))
          el.releasePointerCapture(e.pointerId);
        if (tapped) tap(e);
      }
      function pointerCancel(e: PointerEvent) {
        pointers.delete(e.pointerId);
        gesture = true;
      }
      function wheel(e: WheelEvent) {
        e.preventDefault();
        overview.current = false;
        zoom.current = Math.max(
          0.55,
          Math.min(2.5, zoom.current * Math.exp(-e.deltaY * 0.001)),
        );
      }
      function keyDown(e: KeyboardEvent) {
        if (
          [
            'w',
            'a',
            's',
            'd',
            'ArrowUp',
            'ArrowLeft',
            'ArrowDown',
            'ArrowRight',
          ].includes(e.key)
        ) {
          e.preventDefault();
          keys.add(e.key);
        }
      }
      function keyUp(e: KeyboardEvent) {
        keys.delete(e.key);
      }
      function clearKeys() {
        keys.clear();
      }
      el.addEventListener('pointerdown', pointerDown);
      el.addEventListener('pointermove', pointerMove);
      el.addEventListener('pointerup', pointerUp);
      el.addEventListener('pointercancel', pointerCancel);
      el.addEventListener('wheel', wheel, { passive: false });
      el.addEventListener('keydown', keyDown);
      el.addEventListener('keyup', keyUp);
      el.addEventListener('blur', clearKeys);
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const cameraFocus = new T.Vector3(initial.x, 0.65, initial.z);
      const fireworks = new T.Group();
      scene.add(fireworks);
      if (era === 'garden')
        for (let i = 0; i < 32; i++) {
          const spark = new T.Mesh(
            new T.SphereGeometry(0.08, 4, 3),
            new T.MeshBasicMaterial({ color: i % 2 ? '#ffd892' : '#91e5dc' }),
          );
          fireworks.add(spark);
        }
      const tick = (time: number) => {
        if (disposed) return;
        const dt = Math.min(0.05, (time - last) / 1000);
        last = time;
        const r = live.current.room,
          boardMode = !!r && !['exploring', 'revealing'].includes(r.phase);
        board.visible = boardMode;
        animateLife(time, reduced, boardMode);
        player.visible = !boardMode;
        const school = m.activities?.find((a) =>
          /school/i.test(a.name ?? ''),
        )?.center;
        if (school) {
          const near =
            !boardMode &&
            Math.hypot(
              player.position.x - school.x,
              player.position.z - school.z,
            ) < 7;
          for (const roof of schoolRoofs)
            roof.opacity +=
              ((near ? 0.12 : 1) - roof.opacity) *
              (reduced ? 1 : 1 - Math.exp(-6 * dt));
        }
        const phone = freshMotion(remoteMotion?.current ?? null);
        if (
          !boardMode &&
          (keys.size || phone?.x || phone?.y) &&
          !modalOpen.current &&
          !document.querySelector('.trip-dialog')
        ) {
          const horizontal =
            Number(keys.has('d') || keys.has('ArrowRight')) -
            Number(keys.has('a') || keys.has('ArrowLeft')) +
            (phone?.x ?? 0);
          const forward =
            Number(keys.has('w') || keys.has('ArrowUp')) -
            Number(keys.has('s') || keys.has('ArrowDown')) -
            (phone?.y ?? 0);
          const length = Math.hypot(horizontal, forward) || 1;
          const a = bearing.current;
          const dx =
            ((horizontal * Math.cos(a) - forward * Math.sin(a)) / length) *
            4.5 *
            dt;
          const dz =
            ((-horizontal * Math.sin(a) - forward * Math.cos(a)) / length) *
            4.5 *
            dt;
          path = [];
          overview.current = false;
          pendingAttraction = -1;
          pending = -1;
          pendingResident = -1;
          destination.visible = false;
          if (walkable(m, { x: player.position.x + dx, z: player.position.z }))
            player.position.x += dx;
          if (walkable(m, { x: player.position.x, z: player.position.z + dz }))
            player.position.z += dz;
          player.position.y =
            0.2 + (reduced ? 0 : Math.abs(Math.sin(time * 0.015)) * 0.1);
        }
        if (districtLights.length && time - lastDistrictLightUpdate > 700) {
          lastDistrictLightUpdate = time;
          const closest = (m.districts ?? [])
            .slice()
            .sort(
              (a, b) =>
                Math.hypot(a.x - player.position.x, a.z - player.position.z) -
                Math.hypot(b.x - player.position.x, b.z - player.position.z),
            );
          districtLights.forEach((light, i) => {
            const p = closest[i];
            if (p) light.position.set(p.x, 2.8, p.z);
          });
        }
        if (!boardMode && path.length) {
          const p = path[0],
            dx = p.x - player.position.x,
            dz = p.z - player.position.z,
            d = Math.hypot(dx, dz),
            step = 4.5 * dt;
          if (d <= step) {
            player.position.x = p.x;
            player.position.z = p.z;
            path.shift();
          } else {
            player.position.x += (dx / d) * step;
            player.position.z += (dz / d) * step;
          }
          player.position.y =
            0.2 + (reduced ? 0 : Math.abs(Math.sin(time * 0.015)) * 0.1);
        }
        if (!boardMode && time - lastSend > 350) {
          lastSend = time;
          live.current.onWalk?.({ x: player.position.x, z: player.position.z });
        }
        if (!path.length && pending >= 0) {
          const n = pending;
          pending = -1;
          destination.visible = false;
          setStatus('You have arrived.');
          setTimeout(() => {
            if (
              !disposed &&
              (!live.current.room || live.current.room.phase === 'exploring')
            )
              live.current.onNpc(n);
          }, 450);
        }
        if (!path.length && pendingAttraction >= 0) {
          const n = pendingAttraction;
          pendingAttraction = -1;
          destination.visible = false;
          modalOpen.current = true;
          setPastime(n);
          setStatus(`Visiting ${PASTIMES_1950S[n].name}`);
        }
        if (!path.length && pendingResident >= 0) {
          const n = pendingResident;
          pendingResident = -1;
          destination.visible = false;
          if (!boardMode) setConversation(stories[n]);
        }
        for (const [i, s] of npcs.entries()) {
          s.position.y =
            0.2 + (reduced ? 0 : Math.sin(time * 0.003 + i) * 0.06);
          const v = s.position
              .clone()
              .add(new T.Vector3(0, 2.5, 0))
              .project(camera),
            pin = pins.current[i];
          if (pin) {
            pin.style.left = `${(v.x * 0.5 + 0.5) * 100}%`;
            pin.style.top = `${(-v.y * 0.5 + 0.5) * 100}%`;
            pin.style.visibility =
              boardMode || s.position.distanceTo(player.position) > 4
                ? 'hidden'
                : 'visible';
          }
        }
        extras.forEach((s, i) => {
          if (!reduced) {
            s.position.y = 0.2 + Math.abs(Math.sin(time * 0.002 + i)) * 0.05;
            s.material.rotation = Math.sin(time * 0.001 + i) * 0.035;
          }
        });
        const train = gltf.scene.getObjectByName('anim_train');
        if (train && !reduced) train.position.x = Math.sin(time * 0.00012) * 14;
        const boat = gltf.scene.getObjectByName('anim_boat');
        if (boat && !reduced) {
          boat.position.z = Math.sin(time * 0.0002) * 9;
          boat.rotation.z = Math.sin(time * 0.001) * 0.025;
        }
        const cart = gltf.scene.getObjectByName('anim_coaster');
        const pot = gltf.scene.getObjectByName('anim_kopi_pot'),
          stream = gltf.scene.getObjectByName('anim_kopi_stream');
        if (pot && stream && !reduced) {
          const pour = (Math.sin(time * 0.0018) + 1) / 2;
          pot.position.y = 1.4 + pour * 0.65;
          pot.rotation.z = -0.35 - pour * 0.5;
          stream.scale.y = 0.6 + pour;
          stream.position.y = 0.9 + pour * 0.3;
          stream.visible = pour > 0.15;
        }
        if (cart && !reduced) {
          const a = time * 0.00055;
          cart.position.set(
            12 + 4 * Math.cos(a),
            2.3 + 1.2 * Math.sin(a * 2),
            2 + 6 * Math.sin(a),
          );
          cart.rotation.y = -a;
          extras[0].position.copy(cart.position).add(new T.Vector3(0, 0.4, 0));
        }
        fireworks.children.forEach((s, i) => {
          const phase = (time / 2200) % 1,
            a = (i * Math.PI * 2) / 32;
          s.position.set(
            -3 + Math.cos(a) * phase * 5,
            9 + Math.sin(a) * phase * 5,
            -8,
          );
          s.visible = !reduced && phase > 0.05 && phase < 0.8;
        });
        if (r)
          for (const [i, p] of r.players.entries()) {
            let s = tokens.get(p.id);
            if (!s) {
              s = actor(p.character, m.spawn);
              tokens.set(p.id, s);
            }
            s.visible = boardMode || p.id !== playerId;
            let point = boardMode
              ? m.board[p.position % 22]
              : (r.trip?.positions[p.id] ?? m.spawn);
            if (boardMode && r.move?.playerId === p.id && !r.move.settled) {
              const steps = Math.min(
                r.move.steps,
                Math.max(
                  0,
                  Math.floor((Date.now() - r.move.startedAt - 900) / 360),
                ),
              );
              point = m.board[(r.move.from + steps) % 22];
            }
            s.position.set(
              point.x + (i % 2) * 0.35,
              0.3,
              point.z + Math.floor(i / 2) * 0.35,
            );
          }
        const focus = overview.current
          ? { x: 0, z: 0 }
          : boardMode
            ? boardCenter
            : { x: player.position.x, z: player.position.z };
        // Smooth the target AND eye together: no tilting lag or era-specific sky framing.
        cameraFocus.lerp(
          new T.Vector3(
            focus.x,
            boardMode ? 0 : overview.current ? 3.6 : 0.65,
            focus.z,
          ),
          reduced ? 1 : 1 - Math.exp(-7 * dt),
        );
        const angle = boardMode ? Math.PI / 5 : bearing.current;
        camera.position.set(
          cameraFocus.x + Math.sin(angle) * (era === 'pastimes' ? 34 : 28),
          cameraFocus.y + (era === 'pastimes' ? 26 : 34),
          cameraFocus.z + Math.cos(angle) * (era === 'pastimes' ? 34 : 28),
        );
        camera.lookAt(cameraFocus);
        const desiredZoom = overview.current
          ? Math.min(0.64, (26 * el.clientWidth) / el.clientHeight / 48)
          : zoom.current;
        camera.zoom +=
          ((boardMode ? 0.95 : desiredZoom) - camera.zoom) *
          (reduced ? 1 : 1 - Math.exp(-5 * dt));
        const motorcycle = gltf.scene.getObjectByName(
          'anim_pastime_motorcycle',
        );
        if (motorcycle && !reduced) motorcycle.rotation.y = time * 0.0015;
        camera.updateProjectionMatrix();
        city?.update(
          time,
          reduced,
          boardMode || modalOpen.current || overview.current,
          camera,
          player,
        );
        renderer.render(scene, camera);
        renderer.shadowMap.autoUpdate = false;
        frame = requestAnimationFrame(tick);
      };
      camera.position.set(initial.x + 19, 27, initial.z + 25);
      camera.lookAt(initial.x, 0, initial.z);
      setStatus('Tap a path to wander · tap a neighbour to visit');
      setPastime(null);
      setConversation(null);
      frame = requestAnimationFrame(tick);
    })().catch((e) => {
      if (!disposed)
        setStatus(`Could not open this world: ${e.message}. Reload to retry.`);
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [era, character, playerId, definition.npcs, remoteMotion]);
  return (
    <div className={`trip-world ${era === 'pastimes' ? 'pastimes-world' : ''}`}>
      {/* The canvas is a keyboard-operated 3D surface, not a decorative div. */}
      <div
        className="trip-canvas"
        role="application"
        ref={mount}
        tabIndex={0}
        aria-label="Explore the city. Tap to walk, drag to rotate, pinch or scroll to zoom. Arrow keys or WASD to walk."
      />
      {era === 'pastimes' && pastime !== null && (
        <PastimeEncounter
          key={pastime}
          attraction={PASTIMES_1950S[pastime]}
          onClose={() => setPastime(null)}
        />
      )}
      {conversation?.era === era && (!room || room.phase === 'exploring') && (
        <ResidentConversation
          key={conversation.name}
          resident={conversation}
          onClose={() => setConversation(null)}
        />
      )}
      {definition.npcs.map((name, i) => (
        <button
          key={name}
          ref={(el) => {
            pins.current[i] = el;
          }}
          className="trip-pin"
          onClick={() => command.current(i)}
        >
          <span aria-label={`Talk to ${name}`}>•••</span>
        </button>
      ))}
      <output
        className={`trip-world-hint ${status.startsWith('Could not') || status.startsWith('Opening') || status.startsWith('That spot') ? 'trip-important' : ''}`}
      >
        {status}
      </output>
      <details className="trip-map-controls">
        <summary aria-label="Map controls">Map</summary>
        <button
          aria-label="Zoom out"
          onClick={() => {
            overview.current = false;
            zoom.current = Math.max(0.55, zoom.current - 0.2);
          }}
        >
          −
        </button>
        <button
          aria-label="Zoom in"
          onClick={() => {
            overview.current = false;
            zoom.current = Math.min(2.5, zoom.current + 0.2);
          }}
        >
          +
        </button>
        <button
          aria-label="Rotate camera left"
          onClick={() => {
            bearing.current -= Math.PI / 4;
          }}
        >
          ↶
        </button>
        <button
          aria-label="Rotate camera right"
          onClick={() => {
            bearing.current += Math.PI / 4;
          }}
        >
          ↷
        </button>
        <button
          aria-label="Reset camera"
          onClick={() => {
            overview.current = false;
            bearing.current = Math.PI / 5;
            zoom.current = 0.9;
          }}
        >
          Reset view
        </button>
        <small>Tap to walk · drag to rotate · pinch to zoom</small>
        {(!room || room.phase === 'exploring') && (
          <>
            <select
              aria-label="Walk to a neighbour"
              value=""
              onChange={(e) => command.current(Number(e.target.value))}
            >
              <option value="" disabled>
                Walk to…
              </option>
              {definition.npcs.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <select
              aria-label="Visit a district"
              value=""
              onChange={(e) => districtCommand.current(Number(e.target.value))}
            >
              <option value="" disabled>
                Districts…
              </option>
              {LAYOUTS[era].districts?.map((d, i) => (
                <option key={d.name} value={i}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Talk to a resident"
              value=""
              onChange={(e) => residentCommand.current(Number(e.target.value))}
            >
              <option value="" disabled>
                Residents…
              </option>
              {residents.map((name, i) => (
                <option key={`${i}:${name}`} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </>
        )}
      </details>
    </div>
  );
}
