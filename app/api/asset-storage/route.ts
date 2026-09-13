import { env } from 'cloudflare:workers';
import { readyKey } from '@/lib/storage/assets';
import { receiveAsset } from '@/lib/storage/upload';
export const dynamic = 'force-dynamic';
const bindings = () =>
  env as unknown as { WORLD_ASSETS?: R2Bucket; ASSET_UPLOAD_TOKEN?: string };
export async function GET() {
  const b = bindings();
  return Response.json(
    {
      ready: !b.ASSET_UPLOAD_TOKEN || !!(await b.WORLD_ASSETS?.head(readyKey)),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function POST(req: Request) {
  const b = bindings();
  return receiveAsset(req, b.WORLD_ASSETS, b.ASSET_UPLOAD_TOKEN);
}
