'use client';
import { useEffect, useRef, useState } from 'react';
import Sprite from './Sprite';
import { ridePoint, type ActivityId } from '@/lib/game/activities';
export default function ActivityStage({
  id,
  character,
  age,
  progress,
  step,
  running,
  onReady,
}: {
  id: ActivityId;
  character: string;
  age: number;
  progress: number;
  step: number;
  running: boolean;
  onReady: (ok: boolean) => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const actors = useRef<(HTMLDivElement | null)[]>([]);
  const current = useRef({ progress, step, running });
  useEffect(() => {
    current.current = { progress, step, running };
  }, [progress, step, running]);
  const [error, setError] = useState('');
  useEffect(() => {
    const el = mount.current!;
    let stopped = false,
      frame = 0;
    let cleanup = () => {};
    onReady(false);
    void (async () => {
      const T = await import('three');
      const { createModelLoader } = await import('./model-loader');
      if (stopped) return;
      const scene = new T.Scene();
      scene.background = new T.Color(id === 'stage' ? '#293e56' : '#b9d7d8');
      const camera = new T.OrthographicCamera(-11, 11, 8, -8, 0.1, 100);
      camera.position.set(10, 14, 20);
      camera.lookAt(0, 1, 0);
      const renderer = new T.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      el.appendChild(renderer.domElement);
      scene.add(new T.HemisphereLight('#fff6df', '#496263', 1.7));
      const light = new T.DirectionalLight('#ffe5bb', 1.8);
      light.position.set(-5, 15, 10);
      scene.add(light);
      const loadedModels: import('three').Object3D[] = [];
      const dispose = (object: import('three').Object3D) =>
        object.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry.dispose();
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              m.dispose();
          }
        });
      const resize = () => {
        const w = el.clientWidth,
          h = el.clientHeight;
        if (!w || !h) return;
        const hw = Math.max(9, (5.5 * w) / h),
          hh = (hw * h) / w;
        camera.left = -hw;
        camera.right = hw;
        camera.top = hh;
        camera.bottom = -hh;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        actors.current.forEach((actor, i) => {
          if (!actor) return;
          const pixels =
            ((id === 'coaster' && i < 2 ? 1.1 : 1.8) * h) / (2 * hh);
          actor.style.height = `${pixels}px`;
          actor.style.width = `${pixels * 0.8}px`;
        });
      };
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      resize();
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        loadedModels.forEach(dispose);
        renderer.dispose();
        renderer.domElement.remove();
      };
      const gltf = await createModelLoader().loadAsync(
        `/api/media?path=assets/activities/${id}.glb`,
      );
      if (stopped) {
        dispose(gltf.scene);
        return;
      }
      const model = gltf.scene;
      loadedModels.push(model);
      scene.add(model);
      onReady(true);
      const car = model.getObjectByName('CoasterCar');
      const secondCar = car?.clone();
      if (secondCar) model.add(secondCar);
      let last = 0;
      const draw = (now: number) => {
        if (stopped) return;
        frame = requestAnimationFrame(draw);
        if (document.hidden || now - last < 33) return;
        last = now;
        const s = current.current,
          t = s.progress * Math.PI * 4;
        const positions =
          id === 'coaster'
            ? [
                ridePoint(t),
                ridePoint(t - 0.38),
                { x: -6, y: 0.1, z: 1 },
                { x: 5.8, y: 0.1, z: 2.5 },
              ]
            : id === 'kopi'
              ? [
                  { x: -0.6, y: 0.1, z: -1.2 },
                  { x: 1, y: 0.1, z: 1.3 },
                  { x: -3, y: 0.1, z: 2.9 },
                  { x: 3, y: 0.1, z: 2.9 },
                ]
              : id === 'market'
                ? [
                    { x: -4 + Math.min(s.step, 2) * 4, y: 0.1, z: 2.4 },
                    { x: -4, y: 0.1, z: -2 },
                    { x: 0, y: 0.1, z: -2 },
                    { x: 4, y: 0.1, z: -2 },
                  ]
                : id === 'garden'
                  ? [
                      { x: -3 + (s.step % 3) * 3, y: 0.1, z: 2 },
                      { x: -3, y: 0.1, z: -3.4 },
                      { x: 0, y: 0.1, z: -3.4 },
                      { x: 3, y: 0.1, z: -3.4 },
                    ]
                  : id === 'playground'
                    ? [
                        { x: -2 + Math.min(s.step, 5) * 0.75, y: 0.2, z: 1.8 },
                        { x: 0, y: 0.85, z: -2 },
                        { x: 3, y: 0.1, z: 2 },
                        { x: -4, y: 0.1, z: 1 },
                      ]
                    : [
                        { x: 0, y: 0.8, z: -1 },
                        { x: -3, y: 0.1, z: 2 },
                        { x: 0, y: 0.1, z: 3.4 },
                        { x: 3, y: 0.1, z: 2 },
                      ];
        positions.forEach((p, i) => {
          const actor = actors.current[i];
          if (!actor) return;
          const height = id === 'coaster' && i < 2 ? 0.4 : 0;
          const v = new T.Vector3(p.x, p.y + height, p.z).project(camera);
          actor.style.left = `${(v.x + 1) * 50}%`;
          actor.style.top = `${(1 - v.y) * 50}%`;
          actor.style.zIndex = String(10 + Math.round(v.y * -10));
        });
        [car, secondCar].forEach((cart, i) => {
          if (!cart) return;
          const angle = t - i * 0.38;
          const p = ridePoint(angle);
          cart.position.set(p.x, p.y + 0.18, p.z);
          cart.rotation.y = Math.atan2(
            -5 * Math.sin(angle),
            -3 * Math.cos(angle),
          );
        });
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(draw);
    })().catch(() => {
      if (!stopped) {
        setError('This activity could not load. Close and try again.');
        onReady(false);
      }
    });
    return () => {
      stopped = true;
      cleanup();
    };
  }, [id, onReady]);
  return (
    <div className="activity-stage">
      <div className="activity-canvas" ref={mount} />
      {[character, 'kopi', 'aisyah', 'arun'].map((c, i) => (
        <div
          key={i}
          className={`activity-actor ${id === 'coaster' && i < 2 ? 'seated' : ''}`}
          ref={(node) => {
            actors.current[i] = node;
          }}
        >
          <Sprite
            id={c}
            age={i ? 0 : age}
            pose={running && id === 'stage' && i === 0 ? 'cheer' : 'idle'}
          />
          <span>
            {i === 0
              ? 'You'
              : id === 'kopi' && i === 1
                ? 'Your customer'
                : 'Neighbour'}
          </span>
        </div>
      ))}
      {error && (
        <p className="activity-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
