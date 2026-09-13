import { env } from 'cloudflare:workers';
import hostingConfig from '@/.openai/hosting.json';
import { assetFor, serveStoredAsset } from '@/lib/storage/assets';
import { serveArt } from '@/lib/game/art-delivery';
import { runtimeAssetPath } from '@/lib/storage/asset-path';
export async function GET(req: Request) {
  const bindings = env as unknown as Record<string, R2Bucket | undefined>;
  const path = runtimeAssetPath(
    `assets/${new URL(req.url).searchParams.get('file') ?? ''}`,
  );
  if (
    process.env.NODE_ENV !== 'development' &&
    assetFor(path) &&
    bindings[hostingConfig.r2 || 'WORLD_ASSETS']
  )
    return serveStoredAsset(
      req,
      path,
      bindings[hostingConfig.r2 || 'WORLD_ASSETS'],
    );
  return serveArt(req, bindings[hostingConfig.r2 || 'WORLD_ASSETS']);
}
