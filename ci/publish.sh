#!/bin/bash
# Saves the latest build (the .ipa, simulator screenshots, test report and build logs) to the ios-build branch,
# replacing the previous one, so it can be fetched with plain git.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out

# A note on the run page (read with: gh api repos/OWNER/REPO/check-runs/JOB_ID/annotations), so the outcome can be
# seen even when the build could not be saved and the logs cannot be fetched.
note() {
  local level=$1 title=$2 msg=$3
  if [ -n "${GITHUB_TOKEN:-}" ]; then msg=${msg//"$GITHUB_TOKEN"/***}; fi
  msg=${msg//'%'/%25}; msg=${msg//$'\r'/%0D}; msg=${msg//$'\n'/%0A}
  echo "::$level title=$title::$msg"
}

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

# GitHub refuses any file over 100 MB: a log that big keeps its first and last 20 MB.
find . -type f -size +90M -print | while IFS= read -r f; do
  size=$(wc -c < "$f")
  { head -c 20000000 "$f"; printf '\n\n... (cut here: the file was %s bytes) ...\n\n' "$size"; tail -c 20000000 "$f"; } > "$f.cut"
  mv "$f.cut" "$f"
  note warning "File cut to fit" "$f was $size bytes"
done
biggest=$(find . -type f -exec du -k {} + | sort -rn | awk 'NR<=3{printf "%s (%d KB) ", $2, $1}')
total=$(du -sk . | cut -f1)

git init -q -b ios-build
git config user.name "github-actions[bot]"
git config user.email "41898099+github-actions[bot]@users.noreply.github.com"
git add -A
git commit -q -m "iPhone app build ${GITHUB_RUN_NUMBER:-?} from ios-app ${GITHUB_SHA:0:7}"

# A push can fail for a moment on GitHub's side: try again before giving up.
err=""
for attempt in 1 2 3 4; do
  if err=$(git push -f "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" ios-build 2>&1); then
    echo "saved to branch ios-build"
    note notice "Build saved" "ios-build $(git rev-parse --short HEAD) (attempt $attempt), ${total} KB; largest: ${biggest}"
    exit 0
  fi
  echo "saving, attempt $attempt failed:"
  echo "$err" | sed "s/${GITHUB_TOKEN:-no-token}/***/g" | tail -20
  sleep $((attempt * 20))
done
note error "Build not saved to ios-build" "$(echo "$err" | tail -8) | ${total} KB; largest: ${biggest}"
exit 1
