import { readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = process.cwd();
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const types = {
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.zip': 'application/zip',
  '.json': 'application/json',
};
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(file)));
    else if (entry.isFile() && !file.startsWith(path.join(root, 'public', 'draco') + path.sep) && (await stat(file)).size >= 256 * 1024)
      files.push(file);
  }
  return files;
}
const entries = [];
for (const file of (await walk(path.join(root, 'public'))).sort()) {
  const bytes = await readFile(file),
    name = path
      .relative(path.join(root, 'public'), file)
      .split(path.sep)
      .join('/');
  entries.push({
    path: name,
    size: bytes.length,
    sha256: sha(bytes),
    contentType: types[path.extname(file)] ?? 'application/octet-stream',
  });
}
const manifest = { revision: sha(JSON.stringify(entries)), entries };
if (process.argv.includes('--strip-build')) {
  const saved = JSON.parse(
    await readFile(path.join(root, 'lib/storage/assets.json'), 'utf8'),
  );
  if (saved.revision !== manifest.revision)
    throw Error('Assets changed during build; rebuild before packaging.');
  for (const entry of entries)
    await rm(path.join(root, 'dist/client', entry.path), { force: true });
  console.log(
    `Stored separately: ${entries.length} assets, ${entries.reduce((n, e) => n + e.size, 0)} bytes`,
  );
} else
  await writeFile(
    path.join(root, 'lib/storage/assets.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );

// The browser download includes small assets and decoders too.
async function downloadFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await downloadFiles(file));
    else if (/\.(glb|png|jpg|jpeg|webp|mp3|wav|json|wasm|js)$/.test(entry.name)) files.push(file);
  }
  return files;
}
if (!process.argv.includes('--strip-build')) {
  const downloads = [];
  for (const folder of ['assets', 'audio', 'draco']) {
    for (const file of (await downloadFiles(path.join(root, 'public', folder))).sort()) {
      const bytes = await readFile(file);
      downloads.push({ path: path.relative(path.join(root, 'public'), file).split(path.sep).join('/'), size: bytes.length, sha256: sha(bytes) });
    }
  }
  const aliases = JSON.parse(await readFile(path.join(root, 'lib/storage/compression.json'), 'utf8'));
  const downloadManifest = { revision: sha(JSON.stringify({ downloads, aliases })), entries: downloads, aliases: Object.fromEntries(aliases.map(e => [e.source, e.output])) };
  await writeFile(path.join(root, 'lib/storage/download-assets.json'), JSON.stringify(downloadManifest, null, 2) + '\n');
  await writeFile(path.join(root, 'public/asset-cache-manifest.js'), 'self.assetManifest = ' + JSON.stringify(downloadManifest) + ';\n');
}
