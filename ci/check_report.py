#!/usr/bin/env python3
"""Read the simulator self-test results, print a short summary, and fail if the app did not play through."""
import json
import os
import pathlib
import sys

STEPS = ["01-boot", "02-drive", "03-abilities", "04-later", "05-chase", "06-portrait-refused", "99-done"]


def main(folder: str) -> int:
    out = pathlib.Path(folder)
    problems = []
    try:
        report = json.loads((out / "report.json").read_text())
    except (OSError, ValueError) as e:
        print(f"FAIL: no readable report.json ({e})")
        annotate("error", "Simulator test failed", f"no readable report.json ({e})")
        return 1
    steps = {s["step"]: s for s in report.get("steps", [])}
    for name in STEPS:
        if name not in steps:
            problems.append(f"step {name} never reached")
        elif not (out / "shots" / f"{name}.png").exists():
            problems.append(f"no screenshot for {name}")

    boot = steps.get("01-boot", {})
    if not boot.get("bootReady"):
        problems.append("the page never finished loading")
    if not (boot.get("page") or {}).get("webgl"):
        problems.append("3D (WebGL) did not start")
    drive = steps.get("02-drive", {}).get("page") or {}
    if not drive.get("ready"):
        problems.append("the world test was not running at the first drive step")
    if drive and not drive.get("width", 0) > drive.get("height", 0):
        problems.append("the app did not start in landscape")
    if drive and (drive.get("players") or 0) != 6:
        problems.append(f"expected six players, found {drive.get('players')}")
    # The test iPhone has a Dynamic Island and a home bar: held sideways they sit at the left/right and the bottom.
    safe = drive.get("envSafeArea") or {}
    if not (max(safe.get("l", 0), safe.get("r", 0)) >= 40 and safe.get("b", 0) >= 15):
        problems.append(f"landscape page read the safe areas as {safe} (island and home bar not cleared)")
    ab = steps.get("03-abilities", {}).get("page") or {}
    if not (ab.get("burns") or 0) >= 1:
        problems.append(f"no burnt ground after the strike (burns={ab.get('burns')})")
    if not (ab.get("abilities") or 0) >= 5:
        problems.append(f"too few abilities fired ({ab.get('abilities')})")
    upright = steps.get("06-portrait-refused", {}).get("page") or {}
    if upright and not upright.get("width", 0) > upright.get("height", 0):
        problems.append("the app turned to portrait (it should stay landscape)")
    if report.get("pageErrors"):
        problems.append(f"{len(report['pageErrors'])} page error(s)")

    env = report.get("environment", {})
    print("system:", report.get("system"), report.get("screen"))
    print("page:", env.get("href"), "| secure:", env.get("secureContext"), "| storage:", env.get("localStorage"),
          "| haptics bridge:", env.get("vibrateBridge"), "| service worker API:", env.get("serviceWorkerApi"))
    print("webgl:", env.get("webgl2Renderer"), "| game version:", env.get("gameVersion"), "| web build:", env.get("webSource"),
          "| cores:", env.get("cores"), "| starting tier:", env.get("startTier"))
    print("frame rate: screen max", env.get("screenMaxFPS"), "fps | WebKit 60 fps hold:", env.get("frameRateSwitch"))
    print("boot ready after", boot.get("bootSeconds"), "s")
    for s in report.get("steps", []):
        p = s.get("page") or {}
        print(f"  {s['step']:26s} t={s.get('seconds')}s {p.get('width')}x{p.get('height')} q={p.get('quality')} "
              f"res={p.get('scale')} hz={p.get('refreshHz')} cpu={p.get('cpuMs')}ms calls={p.get('drawCalls')} tris={p.get('triangles')} "
              f"view={p.get('camera')} burns={p.get('burns')} abilities={p.get('abilities')} land={p.get('land')} | {p.get('fpsText')} "
              + " ".join(f"{k}={v}" for k, v in s.items() if k not in ("step", "seconds", "page")))
    last = (steps.get("99-done") or steps.get("06-portrait-refused") or {}).get("page") or {}
    if last.get("programs") is not None:
        print("GPU programs built (while loading / while playing):", last.get("programs"))
    if last.get("timings"):
        print("time spent in the game's heavy functions (calls, total ms, longest ms):")
        for name, t in sorted(last["timings"].items(), key=lambda kv: -kv[1].get("max", 0)):
            print(f"    {name:12s} {t.get('n'):6d} {t.get('ms'):10.1f} {t.get('max'):8.1f}")
    cost = env.get("renderCost")
    if cost:
        print(f"what the picture costs (paused, {cost.get('canvas')} {cost.get('tier')} x{cost.get('scale')}, "
              f"{cost.get('trailPoints')} trail points on screen):")
        print("    frames per second:", " | ".join(f"{k} {v}" for k, v in (cost.get("fps") or {}).items()))
        print("    ms per 3D picture:", " | ".join(f"{k} {v}" for k, v in (cost.get("ms") or {}).items()))
        for n in cost.get("notes") or []:
            print("    note:", n)
    for s in report.get("steps", []):
        gaps = (s.get("page") or {}).get("frameGaps") or []
        long = [g for g in gaps if g[1] >= 500]
        if long:
            print(f"  long frames by {s['step']}: " + ", ".join(f"{g[1]} ms at {g[0] / 1000:.1f}s" for g in long[-6:]))
    for key in ("pageErrors", "consoleErrors", "resourceErrors", "notes"):
        items = report.get(key) or []
        if items:
            print(f"{key} ({len(items)}):")
            for line in items[:15]:
                print("   ", line[:300])

    try:
        persist = json.loads((out / "persist.json").read_text())
        print("after relaunch:", persist)
        if not persist.get("bootReady"):
            problems.append("the page did not load again after the app was closed and opened again")
    except (OSError, ValueError):
        problems.append("no result from the relaunch check")

    # the same verdict as a note on the run page, readable from the API when the logs are not
    fps = (steps.get("04-later") or {}).get("framesPerSecondOver15s")
    progs = last.get("programs")
    summary = (f"loaded after {boot.get('bootSeconds')} s; landscape {fps} fps (simulator); programs {progs}; "
               f"page errors {len(report.get('pageErrors') or [])}; console errors {len(report.get('consoleErrors') or [])}")
    if problems:
        print("FAIL:", "; ".join(problems))
        annotate("error", "Simulator test failed", "; ".join(problems) + " | " + summary)
        return 1
    print("PASS: the world test ran through in the simulator")
    annotate("notice", "Simulator test passed", summary)
    return 0


def annotate(level: str, title: str, msg: str) -> None:
    if os.environ.get("GITHUB_ACTIONS"):
        msg = msg.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::{level} title={title}::{msg}")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "out/simulator"))
