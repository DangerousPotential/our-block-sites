import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const compressed = JSON.parse(
  await readFile(
    new URL('../lib/storage/compression.json', import.meta.url),
    'utf8',
  ),
);
const runtimePath = (file) =>
  compressed.find((entry) => entry.source === `assets/${file}`)?.output ??
  `assets/${file}`;
const assets = JSON.parse(
  await readFile(
    new URL('../lib/game/art-assets.json', import.meta.url),
    'utf8',
  ),
);
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--origin'))
  throw new Error(
    'Usage: node scripts/check-art-delivery.mjs [--origin http://localhost:3000]',
  );
const origin = args[1] ? new URL(args[1]) : null;
if (
  origin &&
  (!['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash)
)
  throw new Error(
    'Provide an HTTP(S) origin without credentials, path, query or fragment.',
  );

async function digest(stream) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of stream) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { bytes, sha256: hash.digest('hex') };
}

const manifest = [];
for (const asset of assets) {
  const localPath = path.join(root, 'public', runtimePath(asset.file));
  manifest.push({
    ...asset,
    contentType: runtimePath(asset.file).endsWith('.webp')
      ? 'image/webp'
      : asset.contentType,
    key: runtimePath(asset.file),
    ...(await digest(createReadStream(localPath))),
  });
}
const output = path.join(root, 'outputs');
await mkdir(output, { recursive: true });
await writeFile(
  path.join(output, 'r2-asset-manifest.json'),
  JSON.stringify({ assets: manifest }, null, 2) + '\n',
);
console.log(
  `Manifest: ${manifest.length} assets, ${manifest.reduce((sum, a) => sum + a.bytes, 0)} bytes. outputs/r2-asset-manifest.json`,
);
if (origin) {
  const checks = [];
  for (const asset of manifest) {
    let result;
    try {
      const url = new URL('/api/art', origin);
      url.searchParams.set('file', asset.file);
      let response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(60000),
      });
      const source =
        response.headers.get('x-our-block-asset-source') || 'unknown';
      const fallback = response.headers.get('x-our-block-asset-fallback');
      if (response.status === 307) {
        const target = new URL(response.headers.get('location'), url);
        if (
          target.origin !== origin.origin ||
          target.pathname !== `/${runtimePath(asset.file)}`
        )
          throw new Error('Unexpected asset redirect');
        await response.body?.cancel();
        response = await fetch(target, {
          redirect: 'error',
          signal: AbortSignal.timeout(60000),
        });
      }
      if (!response.ok || !response.body)
        throw new Error(`HTTP ${response.status}`);
      const actual = await digest(response.body);
      result = {
        file: asset.file,
        source,
        ...(fallback ? { fallback } : {}),
        matches: actual.sha256 === asset.sha256 && actual.bytes === asset.bytes,
        contentType: response.headers.get('content-type'),
        ...actual,
      };
      if (!result.matches) process.exitCode = 1;
    } catch (error) {
      result = { file: asset.file, matches: false, error: error.message };
      process.exitCode = 1;
    }
    checks.push(result);
    console.log(
      `${result.matches ? 'PASS' : 'FAIL'} ${asset.file}: ${result.source || result.error}${result.fallback ? ` (${result.fallback})` : ''}`,
    );
  }
  await writeFile(
    path.join(output, 'art-delivery-check.json'),
    JSON.stringify(
      { origin: origin.origin, checkedAt: new Date().toISOString(), checks },
      null,
      2,
    ) + '\n',
  );
}
