#!/bin/bash
set -e
npm run build
mkdir -p .vercel/output/functions/index.func/assets
mkdir -p .vercel/output/static/assets
cp dist/server/server.js .vercel/output/functions/index.func/server.js
cp dist/server/assets/* .vercel/output/functions/index.func/assets/
cp dist/client/assets/* .vercel/output/static/assets/
echo '{"runtime":"nodejs22.x","handler":"index.js","launcherType":"Nodejs","shouldAddHelpers":true}' > .vercel/output/functions/index.func/.vc-config.json
echo '{"version":3,"routes":[{"handle":"filesystem"},{"src":"/(.*)","dest":"/index"}]}' > .vercel/output/config.json
