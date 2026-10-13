#!/bin/bash
# Runs the self-test build in the iPhone simulator and takes a screenshot at every step it marks.
# Results: out/simulator/ (screenshots, report.json, persist.json, run.txt, device-errors.txt).
set -uo pipefail
cd "$(dirname "$0")/.."
APP=build/sim/Build/Products/Release-iphonesimulator/TerritoryControl.app
BUNDLE=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Info.plist")
OUT=out/simulator
mkdir -p "$OUT/shots"
exec > >(tee "$OUT/run.txt") 2>&1

T0=$SECONDS
say() { echo "[$((SECONDS - T0))s] $*"; }
# limit <seconds> <command...>: stop a command that hangs (macOS has no `timeout`)
limit() { local s=$1; shift; perl -e 'alarm shift @ARGV; exec @ARGV' "$s" "$@"; }

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
say "simulator: $DEVTYPE on $RUNTIME"
echo "$DEVTYPE / $RUNTIME" > "$OUT/simulator.txt"
UDID=$(xcrun simctl create tc-selftest "$DEVTYPE" "$RUNTIME")
limit 300 xcrun simctl boot "$UDID"
limit 600 xcrun simctl bootstatus "$UDID" -b > /dev/null
say "booted"
limit 180 xcrun simctl install "$UDID" "$APP"
say "installed; letting the new simulator settle"
sleep 60

shot() {  # shot <name>: full-screen screenshot; landscape steps are turned upright for reading
  local file="$OUT/shots/$1.png" t=$SECONDS
  limit 60 xcrun simctl io "$UDID" screenshot --type=png --mask=black "$file" > /dev/null 2>&1 \
    || limit 60 xcrun simctl io "$UDID" screenshot --type=png "$file" > /dev/null 2>&1 \
    || say "!! screenshot $1 failed"
  case "$1" in *landscape*) [ -f "$file" ] && sips -r 270 "$file" > /dev/null 2>&1 ;; esac
  say "screenshot $1 took $((SECONDS - t))s"
}

limit 60 xcrun simctl launch "$UDID" "$BUNDLE" -selftest
say "launched"
DATA=""
for _ in $(seq 1 60); do
  DATA=$(limit 30 xcrun simctl get_app_container "$UDID" "$BUNDLE" data 2>/dev/null) && [ -n "$DATA" ] && break
  sleep 1
done
ST="$DATA/Documents/selftest"
say "app data: $DATA"

# Take a screenshot each time the app marks a step, then answer so it carries on
last=""
gone=0
tick=0
deadline=$((SECONDS + 1800))
while [ $SECONDS -lt $deadline ]; do
  tick=$((tick + 1))
  if [ -f "$ST/state.txt" ]; then
    cur=$(cat "$ST/state.txt")
    if [ -n "$cur" ] && [ "$cur" != "$last" ]; then
      n=${cur%% *}; name=${cur#* }
      say "step $cur"
      sleep 1
      shot "$name"
      echo "$n" > "$ST/ack.txt"
      last="$cur"
      [ "$name" = "99-done" ] && break
    fi
  fi
  if [ $((tick % 40)) -eq 0 ]; then  # about every 20 s: is the app still running?
    if limit 20 xcrun simctl spawn "$UDID" launchctl list 2>/dev/null | grep -q "$BUNDLE"; then gone=0; else gone=$((gone + 1)); fi
    if [ $gone -ge 2 ]; then say "!! the app is no longer running"; break; fi
  fi
  sleep 0.5
done
cp "$ST"/report.json "$OUT/" 2>/dev/null || say "!! no report.json"

# Second launch: are the settings and the replay from the first run still there?
limit 60 xcrun simctl terminate "$UDID" "$BUNDLE" > /dev/null 2>&1
sleep 2
limit 120 xcrun simctl launch --terminate-running-process "$UDID" "$BUNDLE" -selftest-persist > /dev/null
say "relaunched"
for _ in $(seq 1 360); do
  [ -f "$ST/persist.json" ] && break
  sleep 0.5
done
sleep 1
cp "$ST"/persist.json "$OUT/" 2>/dev/null || say "!! no persist.json"
shot "10-relaunch"

# Errors and faults logged by the app and WebKit during the run, and any crash reports
limit 180 xcrun simctl spawn "$UDID" log show --last 30m --style compact \
  --predicate '(process == "TerritoryControl" OR process BEGINSWITH "com.apple.WebKit") AND (messageType == error OR messageType == fault)' \
  > "$OUT/device-errors.txt" 2>&1 || say "!! log show stopped"
find ~/Library/Logs/DiagnosticReports -name 'TerritoryControl*' -newer "$APP" -exec cp {} "$OUT/" \; 2>/dev/null
say "done"

python3 ci/check_report.py "$OUT"
