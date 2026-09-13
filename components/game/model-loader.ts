import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const draco = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({ type: 'wasm' }).setWorkerLimit(2);

export function createModelLoader() {
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setDRACOLoader(draco);
}
