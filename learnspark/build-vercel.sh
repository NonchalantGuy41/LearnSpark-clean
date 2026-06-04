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
cat > .vercel/output/functions/index.func/index.mjs << 'JSEOF'
import server from "./server.js";
export default async function handler(req, res) {
  const host = req.headers.host || "localhost";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const url = new URL(req.url, `${protocol}://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const request = new Request(url, { method: req.method, headers, body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined, duplex: "half" });
  const response = await server.fetch(request, process.env, {});
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const body = await response.arrayBuffer();
  res.end(Buffer.from(body));
}
JSEOF
echo '{"type":"module"}' > .vercel/output/functions/index.func/package.json
echo '{"runtime":"nodejs22.x","handler":"index.mjs","launcherType":"Nodejs","shouldAddHelpers":true}' > .vercel/output/functions/index.func/.vc-config.json
echo '{"version":3,"routes":[{"handle":"filesystem"},{"src":"/(.*)","dest":"/index"}]}' > .vercel/output/config.json
