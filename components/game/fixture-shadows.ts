import * as T from 'three';

/** Local shadows follow the inspected attraction; overview keeps the native light. */
export function createFixtureShadows() {
  const fixtures: { light: T.SpotLight; stationId: string }[] = [];
  let lastUpdate = -Infinity;
  function release(light: T.SpotLight) {
    light.castShadow = false;
    light.shadow.dispose();
    light.shadow.map = null;
    light.shadow.mapPass = null;
  }
  return {
    register(root: T.Object3D) {
      root.traverse((station) => {
        if (!station.userData.authoredLighting) return;
        station.traverse((light) => {
          if (!(light instanceof T.SpotLight)) return;
          if (fixtures.some((entry) => entry.light === light)) return;
          light.castShadow = false;
          light.shadow.mapSize.set(512, 512);
          light.shadow.camera.near = 0.05;
          light.shadow.camera.far = light.distance || 8;
          light.shadow.bias = -0.0002;
          light.shadow.normalBias = 0.012;
          light.shadow.autoUpdate = false;
          fixtures.push({ light, stationId: station.userData.stationId });
        });
      });
    },
    update(stationId: string | null, time: number) {
      let changed = false;
      const selected = fixtures
        .filter((entry) => entry.stationId === stationId)
        .slice(0, 2);
      const refresh = time - lastUpdate >= 100;
      for (const entry of fixtures) {
        const enabled = selected.includes(entry);
        if (!enabled && entry.light.castShadow) {
          release(entry.light);
          changed = true;
        }
        if (enabled) {
          if (!entry.light.castShadow) changed = true;
          if (!entry.light.castShadow || refresh)
            entry.light.shadow.needsUpdate = true;
          entry.light.castShadow = true;
        }
      }
      if (refresh) lastUpdate = time;
      return changed;
    },
    dispose() {
      fixtures.forEach(({ light }) => release(light));
      fixtures.length = 0;
    },
  };
}
