import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  access,
  rename,
} from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import {
  ALL_EXTENSIONS,
  EXTMeshoptCompression,
} from '@gltf-transform/extensions';
import { textureCompress, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

// Keep source bytes outside the served public tree. Repeated runs always encode
// from these originals, never from a previous lossy audio encode.
const originalRoot = 'art/runtime-originals';
const reportPath = 'lib/storage/compression.json';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function preserveNodeTransforms(encoded, original) {
  const source = JSON.parse(original.subarray(20, 20 + original.readUInt32LE(12)));
  const output = JSON.parse(encoded.subarray(20, 20 + encoded.readUInt32LE(12)));
  if (source.nodes?.length !== output.nodes?.length) throw Error('Scene node count changed');
  for (let i = 0; i < (source.nodes?.length ?? 0); i++) {
    if (source.nodes[i].name !== output.nodes[i].name) throw Error('Scene node order changed');
    for (const key of ['matrix', 'translation', 'rotation', 'scale']) {
      delete output.nodes[i][key];
      if (source.nodes[i][key]) output.nodes[i][key] = source.nodes[i][key];
    }
  }
  // NodeIO omits transforms within its identity tolerance. Retain even the
  // original sub-millimetre offsets, without changing compressed buffer data.
  const json = Buffer.from(JSON.stringify(output));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(padded);
  const binary = encoded.subarray(20 + encoded.readUInt32LE(12));
  const header = Buffer.from(encoded.subarray(0, 20));
  header.writeUInt32LE(20 + padded.length + binary.length, 8);
  header.writeUInt32LE(padded.length, 12);
  return Buffer.concat([header, padded, binary]);
}
const exists = async (file) =>
  access(file).then(
    () => true,
    () => false,
  );
async function walk(dir) {
  if (!(await exists(dir))) return [];
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...(await walk(file)));
    else result.push(file);
  }
  return result;
}
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
  });
const retired = new Set(JSON.parse(await readFile('lib/storage/retired-assets.json', 'utf8')));
const photographic = new Set([
  'assets/courtyard.png',
  'assets/party/singapore-skyways.png',
  'assets/party/game-worlds.png',
  'assets/party/getai-singapore.png',
  'assets/party/ellinia-background.png',
  'assets/party/teh-tarik-empty-stall.png',
]);
const previous = (await exists(reportPath))
  ? JSON.parse(await readFile(reportPath, 'utf8'))
  : [];
const outputs = new Set(previous.map((entry) => entry.output));
const sources = new Set([
  ...(await walk('public'))
    .map((file) => path.relative('public', file))
    .filter((file) => !outputs.has(file)),
  ...(await walk(originalRoot)).map((file) =>
    path.relative(originalRoot, file),
  ),
]);
const modelsOnly = process.argv.includes('--models-only');
const entries = modelsOnly
  ? previous.filter((entry) => !entry.source.endsWith('.glb'))
  : [];
for (const logical of [...sources].sort((a, b) => a.localeCompare(b))) {
  if (retired.has(logical)) continue;
  const ext = path.extname(logical);
  if (modelsOnly && ext !== '.glb') continue;
  const lobby = /^assets\/lobby\/(1950|1987)\.webp$/.test(logical);
  if (!['.glb', '.png', '.wav', '.mp3'].includes(ext) && !lobby) continue;
  const backup = path.join(originalRoot, logical);
  const source = (await exists(backup)) ? backup : path.join('public', logical);
  const bytes = await readFile(source);
  let output = logical;
  let encoded;
  if (ext === '.glb') {
    const doc = await io.readBinary(bytes);
    // No simplification, quantization, node merging or transform changes.
    // QUANTIZE here selects the codec's unfiltered mode; it does not quantize
    // accessor data without the separate quantize() transform.
    await doc.transform(
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        formats: /^png$/,
        lossless: true,
        effort: 6,
      }),
    );
    if (/^assets\/trip\/(pastimes|estate)\.glb$/.test(logical)) {
      // The sole 1950s poster is colour artwork, not a normal/roughness map.
      // Keep dimensions and every data texture; only the poster is perceptually encoded.
      if (logical.endsWith('/pastimes.glb')) {
        await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, pattern: /pontianak-poster/, effort: 6 }));
      }
      await doc.transform(draco({ method: 'edgebreaker', encodeSpeed: 0, decodeSpeed: 5, quantizePosition: 20, quantizeNormal: 14, quantizeTexcoord: 16, quantizationVolume: 'mesh' }));
    } else {
      doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    }
    encoded = preserveNodeTransforms(Buffer.from(await io.writeBinary(doc)), bytes);
  } else if (ext === '.png' || lobby) {
    output = logical.replace(/\.png$/, '.webp');
    encoded = await sharp(bytes).webp({ lossless: !photographic.has(logical) && !lobby, quality: 85, effort: 6 }).toBuffer();
  } else {
    const info = JSON.parse(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_format', '-of', 'json', source],
        { encoding: 'utf8' },
      ),
    );
    if (ext === '.mp3' && Number(info.format.bit_rate) <= 160000) continue;
    output = logical.replace(/\.wav$/, '.mp3');
    encoded = execFileSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        source,
        '-map',
        '0:a:0',
        '-map_metadata',
        '-1',
        '-codec:a',
        'libmp3lame',
        '-b:a',
        '128k',
        '-f',
        'mp3',
        'pipe:1',
      ],
      { maxBuffer: 32 * 1024 * 1024 },
    );
  }
  if (encoded.length >= bytes.length) continue;
  await mkdir(path.dirname(backup), { recursive: true });
  if (!(await exists(backup))) await rename(source, backup);
  await mkdir(path.dirname(path.join('public', output)), { recursive: true });
  await writeFile(path.join('public', output), encoded);
  entries.push({
    source: logical,
    output,
    before: bytes.length,
    after: encoded.length,
    originalSha256: hash(bytes),
    sha256: hash(encoded),
    profile: /^assets\/trip\/(pastimes|estate)\.glb$/.test(logical) ? 'draco20' : photographic.has(logical) || lobby ? 'webp85' : 'lossless',
  });
  console.log(
    `${logical}: ${(bytes.length / 1e6).toFixed(2)} → ${(encoded.length / 1e6).toFixed(2)} MB`,
  );
}
await writeFile(reportPath, JSON.stringify(entries, null, 2) + '\n');
console.log(
  `Saved ${(entries.reduce((sum, e) => sum + e.before - e.after, 0) / 1e6).toFixed(2)} MB`,
);
