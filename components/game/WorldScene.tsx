'use client';
import { useEffect, useRef, useState } from 'react';
import type { EraId } from '@/lib/game/worlds';
import { routePoint } from '@/lib/game/worlds';
export type ProjectedPoint = { x: number; y: number };
export default function WorldScene({
  era,
  onProject,
}: {
  era: EraId;
  onProject: (points: ProjectedPoint[]) => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Loading neighbourhood…');
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let cancelled = false;
    let cleanup = () => {};
    setStatus('Loading neighbourhood…');
    void (async () => {
      const THREE = await import('three');
      const { createModelLoader } = await import('./model-loader');
      if (cancelled) return;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#b9d7d8');
      const camera = new THREE.OrthographicCamera(-16, 16, 12, -12, 0.1, 150);
      camera.position.set(19, 23, 25);
      camera.lookAt(0, 1, 0);
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      el.appendChild(renderer.domElement);
      scene.add(new THREE.HemisphereLight('#fff5de', '#56726b', 2));
      const sun = new THREE.DirectionalLight('#fff0d0', 3);
      sun.position.set(-8, 18, 10);
      sun.castShadow = true;
      Object.assign(sun.shadow.camera, {
        left: -15,
        right: 15,
        top: 15,
        bottom: -15,
        near: 0.1,
        far: 60,
      });
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.bias = -0.001;
      scene.add(sun);
      let model: import('three').Group | undefined;
      function disposeModel(root: import('three').Object3D) {
        root.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              m.dispose();
          }
        });
      }
      const resize = () => {
        const w = el!.clientWidth,
          h = el!.clientHeight;
        if (!w || !h) return;
        // Fit the entire island on portrait screens, keeping every tile reachable.
        const halfWidth = Math.max(14, (11 * w) / h),
          halfHeight = (halfWidth * h) / w;
        camera.left = -halfWidth;
        camera.right = halfWidth;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        renderer.setSize(w, h);
        onProject(
          Array.from({ length: 22 }, (_, i) => {
            const p = routePoint(i);
            const v = new THREE.Vector3(p.x, p.y, p.z).project(camera);
            return { x: (v.x + 1) * 50, y: (1 - v.y) * 50 };
          }),
        );
        renderer.render(scene, camera);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      const lost = (event: Event) => {
        event.preventDefault();
        setStatus('3D paused. Reload to restore the neighbourhood.');
      };
      renderer.domElement.addEventListener('webglcontextlost', lost);
      cleanup = () => {
        observer.disconnect();
        renderer.domElement.removeEventListener('webglcontextlost', lost);
        if (model) disposeModel(model);
        renderer.dispose();
        renderer.domElement.remove();
      };
      resize();
      try {
        const gltf = await createModelLoader().loadAsync(
          `/api/media?path=assets/worlds/${era}.glb`,
        );
        if (cancelled) {
          disposeModel(gltf.scene);
          return;
        }
        model = gltf.scene;
        model.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        scene.add(model);
        resize();
        setStatus('');
      } catch {
        if (!cancelled)
          setStatus('Could not load this world. Choose another era or reload.');
      }
    })().catch(() => {
      if (!cancelled)
        setStatus(
          'This device could not start 3D. Try a browser with WebGL enabled.',
        );
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [era, onProject]);
  return (
    <>
      <div className="world-canvas" ref={mount} aria-hidden="true" />
      {status && (
        <div className="world-load" role="status">
          {status}
        </div>
      )}
    </>
  );
}
