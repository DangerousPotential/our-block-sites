import manifest from './assets.json';
export { manifest };
export const storageKey = (sha: string) => `game-assets/${sha}`;
export const readyKey = `game-assets/ready/${manifest.revision}`;
export const assetFor = (path: string) =>
  manifest.entries.find((e) => e.path === path);

export async function serveStoredAsset(
  request: Request,
  path: string,
  bucket?: R2Bucket,
) {
  const asset = assetFor(path);
  if (!asset) return new Response('Not found', { status: 404 });
  if (!bucket)
    return new Response('Storage unavailable', {
      status: 503,
      headers: { 'Retry-After': '5' },
    });
  const etag = `"${asset.sha256}"`;
  const headers = new Headers({
    'Content-Type': asset.contentType,
    ETag: etag,
    'Cache-Control': 'public, max-age=3600',
    'Accept-Ranges': 'bytes',
  });
  if (request.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers });
  const rangeHeader = request.headers.get('range');
  let range: { offset: number; length: number } | undefined;
  if (
    rangeHeader &&
    (!request.headers.has('if-range') ||
      request.headers.get('if-range') === etag)
  ) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match || (!match[1] && !match[2]))
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${asset.size}` },
      });
    const start = match[1]
      ? Number(match[1])
      : Math.max(0, asset.size - Number(match[2]));
    const end = match[1]
      ? match[2]
        ? Math.min(Number(match[2]), asset.size - 1)
        : asset.size - 1
      : asset.size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start > end ||
      start >= asset.size
    )
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${asset.size}` },
      });
    range = { offset: start, length: end - start + 1 };
  }
  const object = await bucket.get(
    storageKey(asset.sha256),
    range ? { range } : undefined,
  );
  if (!object)
    return new Response('Asset is loading', {
      status: 503,
      headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
    });
  headers.set('Content-Length', String(range?.length ?? asset.size));
  if (range)
    headers.set(
      'Content-Range',
      `bytes ${range.offset}-${range.offset + range.length - 1}/${asset.size}`,
    );
  return new Response(request.method === 'HEAD' ? null : object.body, {
    status: range ? 206 : 200,
    headers,
  });
}
