'use client';
// The keyboard-focusable region owns the game's arrow-key controls.
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Footprints, Minus, Plus, X } from 'lucide-react';
import { ERAS, type EraId } from '@/lib/game/worlds';
import { characters, findCharacter } from '@/lib/game/characters';
import { placesForEra, walkingPath, type WalkPoint } from '@/lib/game/walking';
import NeighbourhoodVisit from './NeighbourhoodVisit';
import type { ActivityId } from '@/lib/game/activities';
import { AMBIENCE, neighbourhoodBoardPoint } from '@/lib/game/ambience';

export default function WalkNeighbourhood({
  era,
  character,
  age,
  onEra,
  onExit,
  boardMode = false,
  onProject,
}: {
  era: EraId;
  character: string;
  age: number;
  onEra: (era: EraId) => void;
  onExit: () => void;
  boardMode?: boolean;
  onProject?: (points: { x: number; y: number }[]) => void;
}) {
  const mount = useRef<HTMLDivElement>(null),
    markers = useRef<(HTMLButtonElement | null)[]>([]);
  const command = useRef<(p: WalkPoint) => void>(() => {}),
    zoom = useRef(!boardMode && era === 'garden' ? 0.8 : 1);
  const [status, setStatus] = useState('Opening the neighbourhood…'),
    [ready, setReady] = useState(false),
    [selected, setSelected] = useState(''),
    [arrived, setArrived] = useState(false),
    [visit, setVisit] = useState<ActivityId | null>(null);
  const paused = useRef(false);
  const exitWalk = useRef(onExit);
  const projection = useRef(onProject);
  useEffect(() => {
    projection.current = onProject;
  }, [onProject]);
  useEffect(() => {
    exitWalk.current = onExit;
  }, [onExit]);
  useEffect(() => {
    paused.current = !!visit;
  }, [visit]);
  const places = useMemo(() => placesForEra(era), [era]),
    place = places.find((p) => p.id === selected);
  useEffect(() => {
    const el = mount.current!;
    let cancelled = false,
      frame = 0;
    let cleanup = () => {};
    void (async () => {
      const T = await import('three');
      const { createModelLoader } = await import('./model-loader');
      if (cancelled) return;
      const scene = new T.Scene();
      const mood = AMBIENCE[era];
      scene.background = new T.Color(mood.sky);
      scene.fog = new T.Fog(mood.sky, 65, 130);
      const camera = new T.OrthographicCamera(-18, 18, 12, -12, 0.1, 160);
      const renderer = new T.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.type = T.PCFShadowMap;
      el.appendChild(renderer.domElement);
      scene.add(new T.HemisphereLight(mood.light, mood.ground, mood.ambient));
      const sun = new T.DirectionalLight(mood.sun, mood.power);
      sun.position.set(-18, 35, 20);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, {
        left: -40,
        right: 40,
        top: 40,
        bottom: -40,
        near: 1,
        far: 100,
      });
      sun.shadow.bias = -0.0006;
      scene.add(sun);
      const objects: import('three').Object3D[] = [];
      const textures: import('three').Texture[] = [];
      const dispose = (root: import('three').Object3D) => {
        root.traverse((o) => {
          if (o instanceof T.Mesh || o instanceof T.Sprite) {
            if (o instanceof T.Mesh) o.geometry.dispose();
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material]) {
              if ('map' in m)
                (m.map as import('three').Texture | null)?.dispose();
              m.dispose();
            }
          }
        });
      };
      const resize = () => {
        const w = el.clientWidth,
          h = el.clientHeight;
        if (!w || !h) return;
        const halfH = boardMode
          ? Math.max(18, (23 * h) / w)
          : w / h < 1
            ? 13
            : 11;
        camera.left = (-halfH * w) / h;
        camera.right = (halfH * w) / h;
        camera.top = halfH;
        camera.bottom = -halfH;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      resize();
      const lost = (event: Event) => {
        event.preventDefault();
        setStatus('3D paused. Reload to restore your walk.');
      };
      renderer.domElement.addEventListener('webglcontextlost', lost);
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        renderer.domElement.removeEventListener('webglcontextlost', lost);
        objects.forEach(dispose);
        textures.forEach((t) => t.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
      const [gltf, pets, people] = await Promise.all([
        createModelLoader().loadAsync(`/api/media?path=assets/neighbourhood/${era}.glb`),
        new T.TextureLoader().loadAsync('/api/media?path=assets/pets.png'),
        new T.TextureLoader().loadAsync('/api/media?path=assets/neighbours.png'),
      ]);
      if (cancelled) {
        dispose(gltf.scene);
        pets.dispose();
        people.dispose();
        return;
      }
      textures.push(pets, people);
      const model = gltf.scene;
      const train: { object: import('three').Object3D; x: number }[] = [];
      objects.push(model);
      scene.add(model);
      renderer.shadowMap.needsUpdate = true;
      model.traverse((o) => {
        if (o.name.startsWith('AnimatedMRT'))
          train.push({ object: o, x: o.position.x });
        if (o instanceof T.Mesh) {
          o.castShadow = !o.name.startsWith('AnimatedMRT');
          o.receiveShadow = true;
          if (era !== 'kampong')
            for (const material of Array.isArray(o.material)
              ? o.material
              : [o.material]) {
              if (
                material instanceof T.MeshStandardMaterial &&
                (o.name.startsWith('AnimatedMRTWindows') ||
                  ['f2d59a', 'c26848', 'dfb95b'].includes(
                    material.color.getHexString(),
                  ))
              ) {
                material.emissive.set(
                  o.name.startsWith('AnimatedMRT') ? '#8ecbcc' : '#ffbb65',
                );
                material.emissiveIntensity = era === 'garden' ? 1.5 : 0.6;
              }
            }
        }
      });
      function sprite(
        id: string,
        x: number,
        z: number,
        y = 0,
        s = 0.95,
        lifeAge = 0,
      ) {
        const c = findCharacter(id),
          rows = c.kind === 'pet' ? 2 : 3,
          row = c.kind === 'pet' ? c.row : lifeAge;
        const map = (c.kind === 'pet' ? pets : people).clone();
        map.colorSpace = T.SRGBColorSpace;
        map.magFilter = T.NearestFilter;
        map.minFilter = T.NearestFilter;
        map.repeat.set(0.25, 1 / rows);
        map.offset.set(c.column / 4, 1 - (row + 1) / rows);
        map.needsUpdate = true;
        const actor = new T.Sprite(
          new T.SpriteMaterial({
            map,
            transparent: true,
            alphaTest: 0.12,
            depthWrite: false,
          }),
        );
        actor.center.set(0.5, 0);
        actor.scale.set(s * 1.35, s * 1.7, 1);
        actor.position.set(x, y + 0.12, z);
        scene.add(actor);
        objects.push(actor);
        return actor;
      }
      const player = sprite(character, 0, 1, 0, 1.05, age);
      player.visible = !boardMode;
      if (boardMode)
        for (let i = 0; i < 22; i++) {
          const p = neighbourhoodBoardPoint(i);
          const tile = new T.Mesh(
            new T.CylinderGeometry(0.64, 0.64, 0.08, 24),
            new T.MeshStandardMaterial({
              color: i % 2 ? '#e2a05d' : '#61c5bc',
              emissive: '#285859',
              emissiveIntensity: 0.35,
            }),
          );
          tile.position.set(p.x, p.y, p.z);
          scene.add(tile);
          objects.push(tile);
        }
      if (era !== 'kampong')
        for (const [x, z, color] of [
          [-10, -5, '#ffc277'],
          [10, -5, '#6be4dc'],
          [-17, 2, '#ffc277'],
          [17, 2, '#d28aff'],
          [9, 18, '#83c9ff'],
        ] as const) {
          const light = new T.PointLight(
            color,
            era === 'garden' ? 45 : 25,
            16,
            2,
          );
          light.position.set(x, 3.6, z);
          scene.add(light);
        }
      const bursts = new T.BufferGeometry(),
        sparks = new Float32Array(180 * 3);
      bursts.setAttribute('position', new T.BufferAttribute(sparks, 3));
      const fireworks = new T.Points(
        bursts,
        new T.PointsMaterial({
          color: '#ffb9dc',
          size: 3.4,
          transparent: true,
          depthWrite: false,
          blending: T.AdditiveBlending,
        }),
      );
      fireworks.visible = era === 'garden';
      fireworks.frustumCulled = false;
      scene.add(fireworks);
      const beforeFireworks = cleanup;
      cleanup = () => {
        bursts.dispose();
        fireworks.material.dispose();
        beforeFireworks();
      };
      const seller = sprite('kopi', -10, -6),
        customer = sprite('merly', -9.4, -3.8);
      const tvWatchers = [
        sprite('aisyah', 8.5, 19, 0.5),
        sprite('arun', 9.5, 19, 0.5),
        sprite('kopi', 12, 19, 0.5),
      ];
      const market = sprite('aisyah', -8, 12.8),
        cook = sprite('arun', 9, 12.8),
        hopping = sprite('merly', -26, 7);
      sprite('aisyah', -12, -4.8, 0.35);
      sprite('arun', -8, -4.8, 0.35);
      sprite('kopi', 5, 7, 0.35);
      sprite('merly', 13, 7, 0.35);
      const walkers = characters.slice(0, 6).map((c, i) => ({
        actor: sprite(c.id, -15 + i * 6, 1.5),
        offset: i * 2.2,
      }));
      const riders =
        era === 'estate'
          ? [
              sprite('merly', 29, -10, 2.5, 0.8),
              sprite('kopi', 29, -10, 2.5, 0.8),
            ]
          : [];
      const performer =
        era === 'estate' || era === 'kampong'
          ? sprite('aisyah', -25, -10, 0.95)
          : undefined;
      if (performer) {
        sprite('arun', -28, -4.5, 0.5);
        sprite('kopi', -25, -4.5, 0.5);
        sprite('merly', -22, -4.5, 0.5);
      }
      sprite('aisyah', 24, 16);
      sprite('arun', 26, 18, 0.5);
      const coffeePot = model.getObjectByName('AnimatedCoffeePot'),
        stream = model.getObjectByName('AnimatedCoffeeStream'),
        cup = model.getObjectByName('AnimatedCoffeeCup');
      const steam = [0, 1, 2].map((i) =>
        model.getObjectByName('AnimatedSteam' + i),
      );
      coffeePot?.position.set(-10, 1.9, -5.4);
      stream?.position.set(-9.75, 1.5, -5.3);
      cup?.position.set(-9.75, 1.2, -5.3);
      steam.forEach((s) => {
        if (s) {
          s.position.x = -9.75;
          s.position.z = -5.3;
        }
      });
      const carts = [
        model.getObjectByName('AnimatedCoasterCar'),
        model.getObjectByName('AnimatedCoasterCarTwo'),
      ];
      // Original tiny TV programme: hills, a travelling train and changing sky.
      const tvCanvas = document.createElement('canvas');
      tvCanvas.width = 128;
      tvCanvas.height = 72;
      const ctx = tvCanvas.getContext('2d')!;
      const tvTexture = new T.CanvasTexture(tvCanvas);
      tvTexture.colorSpace = T.SRGBColorSpace;
      textures.push(tvTexture);
      const screen = model.getObjectByName('AnimatedTVScreen');
      if (screen instanceof T.Mesh) {
        screen.geometry.computeBoundingBox();
        const bounds = screen.geometry.boundingBox!;
        const positions = screen.geometry.getAttribute('position');
        const uv = new Float32Array(positions.count * 2);
        for (let i = 0; i < positions.count; i++) {
          uv[i * 2] =
            (positions.getX(i) - bounds.min.x) / (bounds.max.x - bounds.min.x);
          uv[i * 2 + 1] =
            (positions.getY(i) - bounds.min.y) / (bounds.max.y - bounds.min.y);
        }
        screen.geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
        const old = screen.material;
        screen.material = new T.MeshBasicMaterial({ map: tvTexture });
        (Array.isArray(old) ? old : [old]).forEach((m) => m.dispose());
      }
      const ring = new T.Mesh(
        new T.RingGeometry(0.35, 0.46, 32),
        new T.MeshBasicMaterial({
          color: '#fff4b1',
          side: T.DoubleSide,
          transparent: true,
          opacity: 0.85,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.16, 1);
      scene.add(ring);
      objects.push(ring);
      const footprintGeo = new T.CircleGeometry(0.08, 6),
        footprintMat = new T.MeshBasicMaterial({
          color: '#7c7052',
          transparent: true,
          opacity: 0.35,
        });
      const footprints = Array.from({ length: 22 }, () => {
        const f = new T.Mesh(footprintGeo, footprintMat);
        f.rotation.x = -Math.PI / 2;
        f.visible = false;
        scene.add(f);
        objects.push(f);
        return f;
      });
      let path: WalkPoint[] = [],
        target: WalkPoint = { x: 0, z: 1 },
        last = 0,
        time = 0,
        footIndex = 0,
        footTime = 0,
        lastTV = 0,
        lastProjection = '';
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const cameraFocus = new T.Vector3(0, 0, 1);
      const walk = (p: WalkPoint) => {
        if (boardMode) return;
        const route = walkingPath(
          { x: player.position.x, z: player.position.z },
          p,
        );
        if (!route.length) {
          setStatus('That spot is occupied. Tap a path nearby.');
          return;
        }
        path = route;
        target = route[route.length - 1];
        ring.position.set(target.x, 0.16, target.z);
        setArrived(false);
        setStatus('Walking…');
      };
      command.current = walk;
      const ray = new T.Raycaster(),
        plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
      let down: { x: number; y: number } | null = null;
      const pointerDown = (e: PointerEvent) => {
        down = { x: e.clientX, y: e.clientY };
      };
      const pointerUp = (e: PointerEvent) => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12)
          return;
        const rect = el.getBoundingClientRect();
        ray.setFromCamera(
          new T.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            1 - ((e.clientY - rect.top) / rect.height) * 2,
          ),
          camera,
        );
        const p = ray.ray.intersectPlane(plane, new T.Vector3());
        if (p) {
          setSelected('');
          walk(p);
        }
        el.focus();
      };
      const key = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          exitWalk.current();
          return;
        }
        const d: Record<string, number[]> = {
          ArrowUp: [0, -2],
          w: [0, -2],
          ArrowDown: [0, 2],
          s: [0, 2],
          ArrowLeft: [-2, 0],
          a: [-2, 0],
          ArrowRight: [2, 0],
          d: [2, 0],
        };
        if (d[e.key]) {
          e.preventDefault();
          const [x, z] = d[e.key];
          walk({ x: player.position.x + x, z: player.position.z + z });
        }
      };
      const wheel = (e: WheelEvent) => {
        e.preventDefault();
        zoom.current = T.MathUtils.clamp(
          zoom.current - e.deltaY * 0.001,
          0.65,
          1.6,
        );
      };
      el.addEventListener('pointerdown', pointerDown);
      el.addEventListener('pointerup', pointerUp);
      el.addEventListener('keydown', key);
      el.addEventListener('wheel', wheel, { passive: false });
      const previousCleanup = cleanup;
      cleanup = () => {
        el.removeEventListener('pointerdown', pointerDown);
        el.removeEventListener('pointerup', pointerUp);
        el.removeEventListener('keydown', key);
        el.removeEventListener('wheel', wheel);
        previousCleanup();
      };
      setStatus('Tap a path to walk. Tap a place to visit.');
      setReady(true);
      const draw = (now: number) => {
        if (cancelled) return;
        frame = requestAnimationFrame(draw);
        if (document.hidden || paused.current) {
          last = now;
          return;
        }
        if (now - last < 33) return;
        const dt = Math.min((now - last) / 1000, 0.06);
        last = now;
        time += dt;
        const anim = motion.matches ? 0 : time;
        train.forEach(({ object, x }) => {
          object.position.x =
            x + (motion.matches ? 0 : ((anim * 2 + 20) % 84) - 42);
          object.visible = Math.abs(object.position.x) < 30;
        });
        if (path.length) {
          const p = path[0],
            dx = p.x - player.position.x,
            dz = p.z - player.position.z,
            dist = Math.hypot(dx, dz);
          if (dist < 0.14) path.shift();
          else {
            const step = Math.min(dist, dt * 5.5);
            player.position.x += (dx / dist) * step;
            player.position.z += (dz / dist) * step;
            player.material.rotation = motion.matches
              ? 0
              : Math.sin(time * 15) * 0.04;
          }
          if (!path.length) {
            setStatus('Take your time. There is plenty to explore.');
            setArrived(true);
            player.material.rotation = 0;
          }
          if (time - footTime > 0.18) {
            footTime = time;
            const f = footprints[footIndex++ % footprints.length];
            f.visible = true;
            f.position.set(
              player.position.x + (footIndex % 2 ? 0.12 : -0.12),
              0.13,
              player.position.z,
            );
          }
        }
        player.position.y =
          0.12 +
          (path.length && !motion.matches
            ? Math.abs(Math.sin(time * 13)) * 0.13
            : 0);
        cameraFocus.lerp(
          new T.Vector3(player.position.x, 0, player.position.z),
          motion.matches ? 1 : Math.min(1, dt * 5),
        );
        camera.position.set(cameraFocus.x + 10, 23, cameraFocus.z + 25);
        camera.lookAt(cameraFocus);
        if (boardMode) {
          camera.position.set(18, 42, 43);
          camera.lookAt(0, 0, -2);
        }
        camera.zoom = zoom.current;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        const projectionKey = `${el.clientWidth}:${el.clientHeight}:${zoom.current}`;
        if (
          boardMode &&
          projection.current &&
          projectionKey !== lastProjection
        ) {
          lastProjection = projectionKey;
          projection.current(
            Array.from({ length: 22 }, (_, i) => {
              const p = neighbourhoodBoardPoint(i),
                v = new T.Vector3(p.x, p.y, p.z).project(camera);
              return { x: (v.x + 1) * 50, y: (1 - v.y) * 50 };
            }),
          );
        }
        if (era === 'garden') {
          fireworks.visible = !motion.matches;
          const phase = (anim % 7) / 7;
          for (let i = 0; i < 180; i++) {
            const group = Math.floor(i / 60),
              a = i * 2.39996,
              radius = Math.sqrt((i % 60) / 60) * phase * 8;
            sparks[i * 3] = (group - 1) * 16 + Math.cos(a) * radius;
            sparks[i * 3 + 1] = 10 + Math.sin(a) * radius - phase * phase * 4;
            sparks[i * 3 + 2] = -8 + Math.sin(i * 7) * radius * 0.3;
          }
          bursts.attributes.position.needsUpdate = true;
          fireworks.material.opacity = Math.sin(phase * Math.PI) * 0.9;
          fireworks.material.color.setHSL(
            (Math.floor(anim / 7) * 0.17) % 1,
            0.85,
            0.75,
          );
        }
        const pour = (anim % 6) / 6,
          pouring = pour > 0.15 && pour < 0.65;
        const pullHeight =
          1.7 + (pouring ? Math.sin(((pour - 0.15) / 0.5) * Math.PI) * 0.9 : 0);
        if (coffeePot) {
          coffeePot.rotation.z = pouring ? -0.65 : 0;
          coffeePot.position.y = pullHeight;
        }
        if (stream) {
          stream.visible = pouring;
          stream.position.y = (pullHeight + 1.3) / 2;
          stream.scale.y = (pullHeight - 1.3) / 0.7;
        }
        if (cup)
          cup.position.z =
            -5.3 + (pour > 0.68 ? ((pour - 0.68) / 0.32) * 1.2 : 0);
        seller.position.y = 0.12 + (pouring ? Math.sin(anim * 5) * 0.07 : 0);
        seller.material.rotation = pouring ? Math.sin(anim * 3) * 0.07 : 0;
        customer.material.rotation =
          pour > 0.75 ? Math.sin(anim * 7) * 0.06 : 0;
        steam.forEach((s, i) => {
          if (s) {
            s.visible = pour > 0.3;
            s.position.y = 1.6 + ((anim * 0.45 + i * 0.2) % 0.9);
            const puff = 0.65 + ((anim + i) % 1) * 0.4;
            s.scale.set(0.08 * puff, 0.12 * puff, 0.08 * puff);
          }
        });
        walkers.forEach(({ actor, offset }, i) => {
          actor.position.x = Math.sin(anim * 0.12 + offset) * 16;
          actor.position.z = i % 2 ? 2.8 : 0.1;
          actor.position.y =
            0.12 + Math.abs(Math.sin(anim * 7 + offset)) * 0.09;
        });
        market.material.rotation = Math.sin(anim * 2) * 0.035;
        cook.material.rotation = Math.sin(anim * 4) * 0.06;
        hopping.position.x = -26 + (Math.floor(anim / 1.2) % 6) * 0.65;
        hopping.position.y =
          0.12 + Math.abs(Math.sin((anim * Math.PI) / 1.2)) * 0.4;
        if (performer) {
          performer.material.rotation = Math.sin(anim * 3) * 0.12;
          performer.position.x = -25 + Math.sin(anim) * 0.5;
        }
        tvWatchers.forEach((actor, i) => {
          actor.material.rotation = Math.sin(anim * 0.9 + i) * 0.025;
        });
        if (time - lastTV > 0.12) {
          lastTV = time;
          ctx.fillStyle = '#61aeb8';
          ctx.fillRect(0, 0, 128, 72);
          ctx.fillStyle = '#d7d498';
          ctx.beginPath();
          ctx.arc(100, 15, 9, 0, 7);
          ctx.fill();
          ctx.fillStyle = '#538b60';
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(i * 45, 68, 32, 0, 7);
            ctx.fill();
          }
          ctx.fillStyle = '#f7d8aa';
          const tx = ((anim * 14) % 160) - 35;
          ctx.fillRect(tx, 40, 35, 16);
          ctx.fillStyle = '#b45b43';
          ctx.fillRect(tx, 38, 35, 4);
          ctx.fillStyle = '#355f67';
          for (let i = 0; i < 4; i++) ctx.fillRect(tx + 3 + i * 8, 44, 5, 5);
          tvTexture.needsUpdate = true;
        }
        carts.forEach((cart, i) => {
          if (!cart) return;
          const a = anim * 0.48 - i * 0.42,
            x = 25 + 4 * Math.cos(a),
            z = -10 + 3 * Math.sin(a),
            y = 1.5 + 0.7 * (1 + Math.sin(a * 2));
          cart.position.set(x, y + 0.2, z);
          cart.rotation.y = Math.atan2(-4 * Math.sin(a), 3 * Math.cos(a));
          riders[i]?.position.set(x, y + 0.48, z);
        });
        places.forEach((p, i) => {
          const marker = markers.current[i];
          if (!marker) return;
          const v = new T.Vector3(p.point.x, 0.35, p.point.z).project(camera);
          marker.style.left = `${(v.x + 1) * 50}%`;
          marker.style.top = `calc(${(1 - v.y) * 50}% + 18px)`;
          marker.style.display =
            Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05 ? 'none' : 'block';
        });
        el.dataset.position = `${player.position.x.toFixed(2)},${player.position.z.toFixed(2)}`;
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(draw);
    })().catch(() => {
      if (!cancelled)
        setStatus('Could not load this neighbourhood. Reload to try again.');
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [era, character, age, places, boardMode]);
  function go(id: string) {
    if (!ready) return;
    const p = places.find((p) => p.id === id);
    if (p) {
      setSelected(id);
      setArrived(false);
      command.current(p.point);
    }
  }
  return (
    <section
      className={`walk-world ${boardMode ? 'walk-board-scene' : ''}`}
      data-era={era}
    >
      <div
        ref={mount}
        className="walk-canvas"
        role="application"
        tabIndex={0}
        aria-label="Walkable neighbourhood. Tap paths or use arrow keys to move."
      />
      {!boardMode && (
        <>
          <div
            className="walk-places"
            style={{ visibility: ready ? 'visible' : 'hidden' }}
          >
            {places.map((p, i) => (
              <button
                key={p.id}
                ref={(n) => {
                  markers.current[i] = n;
                }}
                onClick={() => go(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <header className="walk-toolbar">
            <div>
              <strong>Our Block</strong>
              <span>{AMBIENCE[era].label}</span>
            </div>
            <select
              aria-label="Explore era"
              value={era}
              onChange={(e) => onEra(e.target.value as EraId)}
            >
              {ERAS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
            <button onClick={onExit}>
              <ArrowLeft size={17} /> Board
            </button>
          </header>
          <div className="walk-tools">
            <button
              aria-label="Zoom in"
              onClick={() => {
                zoom.current = Math.min(1.6, zoom.current + 0.15);
              }}
            >
              <Plus size={20} />
            </button>
            <button
              aria-label="Zoom out"
              onClick={() => {
                zoom.current = Math.max(0.65, zoom.current - 0.15);
              }}
            >
              <Minus size={20} />
            </button>
            <select
              value={selected}
              aria-label="Walk to a place"
              onChange={(e) => go(e.target.value)}
            >
              <option value="">Walk to…</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {place && (
            <aside className="walk-place-detail">
              <button
                className="walk-dismiss"
                aria-label="Close place information"
                onClick={() => setSelected('')}
              >
                <X size={18} />
              </button>
              <h2>{place.label}</h2>
              <p>{place.detail}</p>
              {place.activity && (
                <button
                  disabled={!arrived}
                  onClick={() => setVisit(place.activity!)}
                >
                  {arrived ? 'Join the activity' : 'Walking there…'}
                </button>
              )}
              {!place.activity && (
                <small>
                  {arrived
                    ? 'You are here. Enjoy the neighbourhood.'
                    : 'On our way…'}
                </small>
              )}
            </aside>
          )}
          <output className="walk-hint">
            <Footprints size={17} />
            {status}
          </output>
          {visit && (
            <NeighbourhoodVisit
              id={visit}
              character={character}
              age={age}
              onClose={() => setVisit(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
