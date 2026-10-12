#!/bin/bash
# Saves the latest build (the .ipa, simulator screenshots, test report and build logs) to the ios-build branch,
# replacing the previous one, so it can be fetched with plain git.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
cat > out/README.md <<EOF
# Territory Control iPhone app: latest build

Build ${GITHUB_RUN_NUMBER:-?} from commit ${GITHUB_SHA:-?} on branch ios-app ($(date -u '+%Y-%m-%d %H:%M UTC')).

- \`TerritoryControl.ipa\`: the app, unsigned. Install it with Sideloadly and your Apple ID (see the ios-app README).
- \`simulator/\`: the self-test in the iPhone simulator: screenshots of each step, \`report.json\`, \`persist.json\`.
- \`build-info.txt\`, \`*.log\`: what was built and the full build logs.

This branch is rewritten on every build. It is not a release and does not touch main or Render.
EOF
cd out
rm -rf .git
git init -q -b ios-build
git config user.name "github-actions[bot]"
git config user.email "41898099+github-actions[bot]@users.noreply.github.com"
git add -A
git commit -q -m "iPhone app build ${GITHUB_RUN_NUMBER:-?} from ios-app ${GITHUB_SHA:0:7}"
git push -q -f "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" ios-build
echo "saved to branch ios-build"
