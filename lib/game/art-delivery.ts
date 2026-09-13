import assets from './art-assets.json';
import { runtimeAssetPath } from '../storage/asset-path';

export async function serveArt(req: Request, bucket?: Pick<R2Bucket, 'get'>) {
  const url = new URL(req.url);
  const file = url.searchParams.get('file') ?? '';
  const asset = assets.find((item) => item.file === file);
  if (!asset) return new Response('Not found', { status: 404 });
  const runtimePath = runtimeAssetPath(`assets/${file}`);
  const contentType = runtimePath.endsWith('.webp')
    ? 'image/webp'
    : asset.contentType;
  let fallback = bucket ? 'object-missing' : 'no-binding';
  if (bucket) {
    try {
      const etag = req.headers.get('if-none-match');
      const object = await bucket.get(
        runtimePath,
        etag ? { onlyIf: new Headers({ 'If-None-Match': etag }) } : undefined,
      );
      if (object) {
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('Content-Type', contentType);
        headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=3600');
        headers.set('X-Our-Block-Asset-Source', 'r2');
        // R2 returns metadata without a body when If-None-Match is satisfied.
        return new Response('body' in object ? object.body : null, {
          status: 'body' in object ? 200 : 304,
          headers,
        });
      }
    } catch {
      fallback = 'bucket-unavailable';
      console.warn('R2 artwork read failed; serving the bundled asset.');
    }
  }
  return new Response(null, {
    status: 307,
    headers: {
      Location: new URL(`/${runtimePath}`, url).href,
      'Cache-Control': 'no-store',
      'X-Our-Block-Asset-Source': 'bundled',
      'X-Our-Block-Asset-Fallback': fallback,
    },
  });
}
