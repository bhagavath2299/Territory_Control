#!/bin/bash
# Runs the self-test build in the iPhone simulator and takes a screenshot at every step it marks.
# Results: out/simulator/ (screenshots, report.json, persist.json, device log).
set -uo pipefail
cd "$(dirname "$0")/.."
APP=build/sim/Build/Products/Release-iphonesimulator/TerritoryControl.app
BUNDLE=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Info.plist")
OUT=out/simulator
mkdir -p "$OUT/shots"

# Newest iOS runtime, and an iPhone with the Dynamic Island so the safe areas get tested
RUNTIME=$(xcrun simctl list runtimes -j | python3 -c '
import json, sys
r = [x for x in json.load(sys.stdin)["runtimes"] if x.get("platform") == "iOS" and x.get("isAvailable")]
r.sort(key=lambda x: [int(p) for p in x["version"].split(".")])
print(r[-1]["identifier"])')
DEVTYPE=$(xcrun simctl list devicetypes -j | python3 -c '
import json, sys
ids = [x["identifier"] for x in json.load(sys.stdin)["devicetypes"]]
want = ["iPhone-17", "iPhone-16", "iPhone-17-Pro", "iPhone-16-Pro", "iPhone-15"]
pre = "com.apple.CoreSimulator.SimDeviceType."
print(next((pre + w for w in want if pre + w in ids), [i for i in ids if "iPhone" in i][-1]))')
echo "simulator: $DEVTYPE on $RUNTIME"
UDID=$(xcrun simctl create tc-selftest "$DEVTYPE" "$RUNTIME")
cleanup() {
  [ -n "${LOGPID:-}" ] && kill "$LOGPID" 2>/dev/null
  xcrun simctl shutdown "$UDID" >/dev/null 2>&1
  xcrun simctl delete "$UDID" >/dev/null 2>&1
}
trap cleanup EXIT

xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b > /dev/null
xcrun simctl install "$UDID" "$APP"
echo "$DEVTYPE / $RUNTIME" > "$OUT/simulator.txt"
xcrun simctl spawn "$UDID" log stream --style compact --level debug \
  --predicate 'process == "TerritoryControl" OR process CONTAINS "WebContent" OR process CONTAINS "GPU"' \
  > "$OUT/device-log.txt" 2>&1 &
LOGPID=$!

xcrun simctl launch "$UDID" "$BUNDLE" -selftest
DATA=""
for _ in $(seq 1 60); do
  DATA=$(xcrun simctl get_app_container "$UDID" "$BUNDLE" data 2>/dev/null) && break
  sleep 1
done
ST="$DATA/Documents/selftest"

# Take a screenshot each time the app marks a step, then answer so it carries on
last=""
gone=0
tick=0
deadline=$((SECONDS + 720))
while [ $SECONDS -lt $deadline ]; do
  tick=$((tick + 1))
  if [ -f "$ST/state.txt" ]; then
    cur=$(cat "$ST/state.txt")
    if [ -n "$cur" ] && [ "$cur" != "$last" ]; then
      n=${cur%% *}; name=${cur#* }
      sleep 1
      xcrun simctl io "$UDID" screenshot --type=png --mask=black "$OUT/shots/$name.png" > /dev/null 2>&1 \
        || xcrun simctl io "$UDID" screenshot --type=png "$OUT/shots/$name.png" > /dev/null 2>&1
      echo "$n" > "$ST/ack.txt"
      echo "  step $cur (${SECONDS}s)"
      last="$cur"
      [ "$name" = "99-done" ] && break
    fi
  fi
  if [ $((tick % 20)) -eq 0 ]; then  # about every 10 s: is the app still running?
    if xcrun simctl spawn "$UDID" launchctl list 2>/dev/null | grep -q "$BUNDLE"; then gone=0; else gone=$((gone + 1)); fi
    if [ $gone -ge 2 ]; then echo "!! the app is no longer running"; break; fi
  fi
  sleep 0.5
done
cp "$ST"/report.json "$OUT/" 2>/dev/null || echo "!! no report.json"

# Second launch: are the settings and the replay from the first run still there?
xcrun simctl terminate "$UDID" "$BUNDLE" > /dev/null 2>&1
sleep 2
xcrun simctl launch "$UDID" "$BUNDLE" -selftest-persist > /dev/null
for _ in $(seq 1 240); do
  [ -f "$ST/persist.json" ] && break
  sleep 0.5
done
sleep 1
cp "$ST"/persist.json "$OUT/" 2>/dev/null || echo "!! no persist.json"
xcrun simctl io "$UDID" screenshot --type=png --mask=black "$OUT/shots/10-relaunch.png" > /dev/null 2>&1

# Any crash reports from the app
find ~/Library/Logs/DiagnosticReports -name 'TerritoryControl*' -newer "$APP" -exec cp {} "$OUT/" \; 2>/dev/null

python3 ci/check_report.py "$OUT"
