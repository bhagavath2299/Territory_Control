#!/bin/bash
# Put a built world test page (the dist/ folder of the world-test project: index.html and its data folders)
# inside the app as www/. Usage: bash tools/sync_world.sh /path/to/world/dist
set -euo pipefail
SRC="${1:?usage: bash tools/sync_world.sh /path/to/world/dist}"
cd "$(dirname "$0")/.."
[ -f "$SRC/index.html" ] || { echo "no index.html in $SRC"; exit 1; }
rm -rf www && mkdir www && cp -R "$SRC"/. www/
echo "www/ now holds $(find www -type f | wc -l | tr -d ' ') files, $(du -sh www | cut -f1)"
