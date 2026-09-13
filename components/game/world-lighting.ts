import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SAOPass } from 'three/addons/postprocessing/SAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ATMOSPHERE, CULTURE } from '../../lib/game/culture';
import { createFixtureShadows } from './fixture-shadows';
import { createStageHaze } from './stage-haze';

/** Linear-light PBR, contact shading and wet-ground reflections share the game camera. */
export function createWorldLighting(
  renderer: T.WebGLRenderer,
  scene: T.Scene,
  camera: T.OrthographicCamera,
  era: string,
) {
  const night = ['fair', 'garden', 'town'].includes(era);
  const palette = ATMOSPHERE[era];
  const studio = new RoomEnvironment();
  studio.traverse((o) => {
    if (o instanceof T.PointLight) o.color.set(palette.sun);
  });
  const pmrem = new T.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.08);
  scene.environment = environment.texture;
  scene.environmentIntensity = night ? 0.24 : 0.35;
  studio.dispose();
  pmrem.dispose();

  // Local fixtures illuminate the objects and pavement, not just glowing bulbs.
  const fixtures: T.PointLight[] = [];
  const fixtureShadows = createFixtureShadows();
  const stageHaze = createStageHaze(scene, CULTURE[era].stations);
  for (const station of CULTURE[era].stations) {
    const scale = station.scale ?? 1;
    const color =
      station.kind === 'arcade'
        ? '#e2a4ff'
        : station.kind === 'lan'
          ? '#a8eaff'
          : '#ffd3a0';
    const fixture = new T.PointLight(
      color,
      (night ? 32 : 8) * scale * scale,
      13 * scale,
      2,
    );
    fixture.position.set(
      station.x,
      3.2 * scale + (station.elevation ?? 0),
      station.z + 1.5 * scale,
    );
    fixtures.push(fixture);
    fixture.userData.stationId = station.id;
    scene.add(fixture);
  }

  let reflection: Reflector | undefined;
  if (era === 'fair') {
    reflection = new Reflector(new T.PlaneGeometry(58, 54), {
      textureWidth: 512,
      textureHeight: 512,
      clipBias: 0,
      color: '#797086',
      multisample: 0,
    });
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.y = 0.075;
    const surface = reflection.material as T.ShaderMaterial;
    surface.vertexShader = surface.vertexShader
      .replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 puddleUv;')
      .replace('vUv = textureMatrix', 'puddleUv = uv; vUv = textureMatrix');
    surface.fragmentShader = surface.fragmentShader
      .replace(
        'varying vec4 vUv;',
        `varying vec4 vUv;
        varying vec2 puddleUv;
        float grain(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float wetness(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(grain(i),grain(i+vec2(1.,0.)),f.x),mix(grain(i+vec2(0.,1.)),grain(i+vec2(1.)),f.x),f.y);
        }`,
      )
      .replace(
        'vec4 base = texture2DProj( tDiffuse, vUv );',
        `
        vec4 reflectedUv = vUv;
        reflectedUv.xy += vec2(sin(puddleUv.y*280.0),cos(puddleUv.x*260.0)) * 0.0007 * vUv.w;
        vec4 base = texture2DProj(tDiffuse, reflectedUv);
        float puddle = smoothstep(0.35,0.72,wetness(puddleUv*26.0) + wetness(puddleUv*79.0)*0.22);`,
      )
      .replace(
        'blendOverlay( base.rgb, color ), 1.0',
        'blendOverlay( base.rgb, color ), puddle * base.a * 0.32 * smoothstep(0.0, 0.08, min(min(puddleUv.x, puddleUv.y), min(1.0-puddleUv.x, 1.0-puddleUv.y)))',
      );
    surface.transparent = true;
    surface.depthWrite = false;
    // A transparent reflection background avoids painting the night sky as a
    // dark rectangle on the pavement. Only reflected geometry enters puddles.
    const reflectRender = reflection.onBeforeRender.bind(reflection);
    reflection.onBeforeRender = (...args) => {
      const background = scene.background;
      const alpha = renderer.getClearAlpha();
      scene.background = null;
      renderer.setClearAlpha(0);
      try {
        reflectRender(...args);
      } finally {
        scene.background = background;
        renderer.setClearAlpha(alpha);
      }
    };
    scene.add(reflection);
  }
  const renderSize = renderer.getDrawingBufferSize(new T.Vector2());
  const renderTarget = new T.WebGLRenderTarget(renderSize.x, renderSize.y, {
    type: T.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, renderTarget);
  const render = new RenderPass(scene, camera);
  const contact = new SAOPass(scene, camera, new T.Vector2(640, 360));
  Object.assign(contact.params, {
    saoIntensity: 0.025,
    saoScale: 20,
    saoKernelRadius: 12,
    saoBlurRadius: 4,
    saoBlurStdDev: 2,
    saoBlurDepthCutoff: 0.02,
  });
  const bloom = new UnrealBloomPass(
    new T.Vector2(640, 360),
    night ? 0.12 : 0.06,
    0.35,
    1.65,
  );
  const output = new OutputPass();
  composer.addPass(render);
  composer.addPass(contact);
  composer.addPass(bloom);
  composer.addPass(output);
  // Billboard silhouettes must not write rectangular occlusion onto the scene.
  const contactRender = contact.render.bind(contact);
  contact.render = (...args) => {
    contact.saoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(
      camera.projectionMatrixInverse,
    );
    const hidden: T.Object3D[] = [];
    scene.traverse((o) => {
      if (
        o.visible &&
        (o instanceof T.Sprite ||
          o instanceof T.Points ||
          o === reflection ||
          o.userData.atmosphericLight)
      ) {
        hidden.push(o);
        o.visible = false;
      }
    });
    try {
      contactRender(...args);
    } finally {
      hidden.forEach((o) => {
        o.visible = true;
      });
    }
  };
  return {
    adoptNativeFixtures(root: T.Object3D) {
      fixtureShadows.register(root);
      stageHaze.register(root);
      root.traverse((station) => {
        if (!station.userData.authoredLighting) return;
        let hasLight = false;
        station.traverse((o) => {
          if (o instanceof T.Light) hasLight = true;
        });
        if (!hasLight) return;
        for (const fallback of fixtures)
          if (fallback.userData.stationId === station.userData.stationId)
            scene.remove(fallback);
      });
    },
    resize(width: number, height: number) {
      composer.setSize(width, height);
      contact.setSize(Math.round(width * 0.5), Math.round(height * 0.5));
    },
    updateFixtures(stationId: string | null, time: number) {
      stageHaze.update(stationId);
      // A new shadow sampler must have its depth texture before the colour pass.
      // The normal 10 Hz world cadence can otherwise skip the activation frame.
      if (fixtureShadows.update(stationId, time))
        renderer.shadowMap.needsUpdate = true;
    },
    render() {
      composer.render();
    },
    dispose() {
      fixtureShadows.dispose();
      stageHaze.dispose();
      for (const pass of [render, contact, bloom, output]) pass.dispose();
      composer.dispose();
      if (reflection) {
        scene.remove(reflection);
        reflection.geometry.dispose();
        reflection.dispose();
      }
      fixtures.forEach((o) => scene.remove(o));
      scene.environment = null;
      environment.dispose();
    },
  };
}
