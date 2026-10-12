#!/bin/bash
# Builds the iPhone app on a Mac (GitHub's macOS runner):
#   out/TerritoryControl.ipa  unsigned; Sideloadly (or Xcode) signs it with your Apple ID when it installs it
#   build/sim/...app          the same app for the iPhone simulator, with the self-test compiled in
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out build
BUILD_NUMBER="${GITHUB_RUN_NUMBER:-1}"
COMMON=(-project TerritoryControl.xcodeproj -scheme TerritoryControl -configuration Release
        CURRENT_PROJECT_VERSION="$BUILD_NUMBER")

keep_logs() { cp build/*.log out/ 2>/dev/null || true; }
trap keep_logs EXIT

run() {  # run <log name> <xcodebuild args...>: full log kept, warnings and errors shown
  local log="build/$1.log"; shift
  if ! xcodebuild "$@" > "$log" 2>&1; then
    grep -E "error:|warning:|BUILD FAILED" "$log" | sort -u | head -60 || true
    echo "---- last lines of $log ----"; tail -60 "$log"
    return 1
  fi
  grep -E "(error|warning):" "$log" | grep -v "^ld: warning: ignoring duplicate" | sort -u | head -40 || true
}

echo "== $(xcodebuild -version | tr '\n' ' ')"

echo "== iPhone build (unsigned)"
run device "${COMMON[@]}" -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath build/device \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build
APP=build/device/Build/Products/Release-iphoneos/TerritoryControl.app
rm -rf build/ipa && mkdir -p build/ipa/Payload && cp -R "$APP" build/ipa/Payload/
(cd build/ipa && zip -qry -X ../../out/TerritoryControl.ipa Payload)

echo "== iPhone simulator build (with the self-test)"
run simulator "${COMMON[@]}" -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/sim SWIFT_ACTIVE_COMPILATION_CONDITIONS=SELFTEST build

# What went into the app, for the record
{
  echo "Territory Control iPhone app, build $BUILD_NUMBER"
  echo "commit: ${GITHUB_SHA:-local}"
  echo "built: $(date -u '+%Y-%m-%d %H:%M UTC') with $(xcodebuild -version | tr '\n' ' ')"
  echo
  echo "Info.plist (device build):"
  plutil -p "$APP/Info.plist"
  echo
  echo "binary: $(lipo -info "$APP/TerritoryControl")"
  echo "minimum iOS: $(otool -l "$APP/TerritoryControl" | awk '/LC_BUILD_VERSION/{f=1} f&&/minos/{print $2; exit}')"
  echo
  echo "app contents:"
  (cd "$APP" && find . -type f -exec ls -l {} \; | awk '{printf "%10d  %s\n", $5, $9}' | sort -k2)
  echo
  echo "ipa: $(ls -l out/TerritoryControl.ipa | awk '{print $5}') bytes, sha256 $(shasum -a 256 out/TerritoryControl.ipa | cut -d' ' -f1)"
} > out/build-info.txt
cat out/build-info.txt
