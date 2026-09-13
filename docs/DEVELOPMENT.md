# Development guide

## Run locally

Requires Node.js 22.13 or newer.

```sh
git clone https://github.com/DangerousPotential/our-block-sites.git
cd our-block-sites
npm ci
npx wrangler d1 execute DB --local --config wrangler.local.jsonc --file drizzle/0000_conscious_avengers.sql
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Open http://localhost:3000 on the central computer. Phone controllers must be able to reach its network address. Browser asset caching requires HTTPS or localhost.

## Checks

```sh
node --test tests/asset-cache.test.mjs
node --import ./tests/register.mjs --test tests/phone-motion.test.mjs tests/god-mode.test.mjs tests/getai.test.mjs
npx tsc --noEmit
npm run build
```

## Sites hosting

This edition uses Cloudflare D1 (`DB`) and R2 (`WORLD_ASSETS`) through Sites. Register your own Sites project and add its project ID to `.openai/hosting.json`. The build separates large assets from the application archive. Configure your own `ASSET_UPLOAD_TOKEN` and use `scripts/upload-storage-assets.mjs` with `OUR_BLOCK_UPLOAD_ORIGIN` and `OUR_BLOCK_UPLOAD_TOKEN` to populate your storage. Never commit tokens.

All runtime assets are included for local development. Historical design files and retired worlds are omitted. Regenerating source art requires the original authoring files.

## Submission provenance

This public snapshot preserves source checkpoint `2e827e727db44ee550bb59211cd02eb04fb68532` with publication documentation and a project-neutral hosting configuration. The hosted asset-download release was built from `f074ee946f85632859e92a32d0e9ea1ebff596b3`; this snapshot also includes the subsequently saved phone-control changes. The documentation update adds the art workflow and Astra attribution without changing that game snapshot.

