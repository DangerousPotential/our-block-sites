import { env } from 'cloudflare:workers';
import { assetFor, serveStoredAsset } from '@/lib/storage/assets';
import { runtimeAssetPath } from '@/lib/storage/asset-path';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const path = runtimeAssetPath(
    new URL(req.url).searchParams.get('path') ?? '',
  );
  if (
    !/^(assets|audio)\/[a-zA-Z0-9_./ -]+$/.test(path) ||
    path.split('/').some((part) => part === '..' || part === '.')
  )
    return new Response('Not found', { status: 404 });
  if (process.env.NODE_ENV === 'development' || !assetFor(path))
    return Response.redirect(new URL('/' + path, req.url), 307);
  return serveStoredAsset(
    req,
    path,
    (env as unknown as { WORLD_ASSETS?: R2Bucket }).WORLD_ASSETS,
  );
}
export const HEAD = GET;
