#!/bin/bash
set -e
npm run build
npx esbuild dist/server/server.js \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile=dist/server/server-bundled.js \
  --external:node:* \
  --external:react-dom/server \
  --log-level=error
mkdir -p .vercel/output/functions/index.func/assets
mkdir -p .vercel/output/static/assets
cp dist/server/server-bundled.js .vercel/output/functions/index.func/server.js
cp -r dist/server/assets .vercel/output/functions/index.func/assets
cp -r dist/client/assets .vercel/output/static/assets
echo '{"type":"module"}' > .vercel/output/functions/index.func/package.json
cat > .vercel/output/functions/index.func/index.mjs << 'JSEOF'
import server from "./server.js";
export default async function handler(req, res) {
  const host = req.headers.host || "localhost";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const url = new URL(req.url, `${protocol}://${host}`);
  const headers = new Headers();
  for (const [key, va
