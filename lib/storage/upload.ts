import { assetFor, manifest, readyKey, storageKey } from './assets';
export async function receiveAsset(
  req: Request,
  bucket?: R2Bucket,
  token?: string,
) {
  if (!token || req.headers.get('authorization') !== `Bearer ${token}`)
    return new Response('Unauthorized', { status: 401 });
  if (!bucket) return new Response('Storage unavailable', { status: 503 });
  const url = new URL(req.url);
  if (url.searchParams.get('action') === 'finalize') {
    const pending = new Map(
      manifest.entries.map((e) => [storageKey(e.sha256), e]),
    );
    let cursor: string | undefined;
    do {
      const options: R2ListOptions & { include: string[] } = {
        prefix: 'game-assets/',
        include: ['customMetadata'],
        cursor,
      };
      const page = await bucket.list(options);
      for (const object of page.objects) {
        const expected = pending.get(object.key);
        if (
          expected &&
          object.size === expected.size &&
          object.customMetadata?.sha256 === expected.sha256
        )
          pending.delete(object.key);
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor && pending.size);
    if (pending.size)
      return Response.json(
        { error: 'Assets are incomplete', remaining: pending.size },
        { status: 409 },
      );
    await bucket.put(
      readyKey,
      JSON.stringify({
        revision: manifest.revision,
        files: manifest.entries.length,
      }),
    );
    return Response.json({ ready: true });
  }
  const asset = assetFor(url.searchParams.get('path') ?? '');
  if (!asset) return new Response('Unknown asset', { status: 404 });
  const existing = await bucket.head(storageKey(asset.sha256));
  if (
    existing?.size === asset.size &&
    existing.customMetadata?.sha256 === asset.sha256
  )
    return Response.json({ stored: true, sha256: asset.sha256 });
  if (Number(req.headers.get('content-length')) !== asset.size)
    return new Response('Wrong size', { status: 400 });
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength !== asset.size)
    return new Response('Wrong size', { status: 400 });
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  if (digest !== asset.sha256)
    return new Response('Checksum mismatch', { status: 400 });
  await bucket.put(storageKey(digest), bytes, {
    httpMetadata: { contentType: asset.contentType },
    customMetadata: { sha256: digest },
  });
  return Response.json({ stored: true, sha256: digest });
}
