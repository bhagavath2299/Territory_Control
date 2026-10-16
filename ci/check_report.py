#!/usr/bin/env python3
"""Read the simulator self-test results, print a short summary, and fail if the app did not play through."""
import json
import os
import pathlib
import sys

STEPS = ["01-boot", "02-menu", "03-match-portrait", "04-match-landscape", "05-paused-landscape",
         "06-match-landscape-later", "07-match-portrait-again", "08-results", "99-done"]


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
        problems.append("the boot screen never became ready")
    if not (boot.get("page") or {}).get("webgl"):
        problems.append("3D (WebGL) did not start")
    match = steps.get("03-match-portrait", {}).get("page") or {}
    if match.get("state") != "play":
        problems.append(f"no match running after PLAY (state={match.get('state')})")
    land = steps.get("04-match-landscape", {}).get("page") or {}
    if land and not land.get("width", 0) > land.get("height", 0):
        problems.append("the screen did not turn to landscape")
    # The test iPhone has a Dynamic Island and a home bar: the game must keep its controls clear of them
    # from the first match, not only after the phone has been turned.
    safe = match.get("safeArea") or {}
    if not (safe.get("t", 0) >= 40 and safe.get("b", 0) >= 20):
        problems.append(f"portrait match read the safe areas as {safe} (island and home bar not cleared)")
    lsafe = land.get("safeArea") or {}
    if land and not (max(lsafe.get("l", 0), lsafe.get("r", 0)) >= 40):
        problems.append(f"landscape match read the safe areas as {lsafe}")
    paused = steps.get("05-paused-landscape", {}).get("page") or {}
    if paused and paused.get("paused") != 1:
        problems.append("pause did not pause the match")
    if not steps.get("08-results", {}).get("matchEnded"):
        problems.append("the match did not reach the results screen")
    if report.get("pageErrors"):
        problems.append(f"{len(report['pageErrors'])} page error(s)")
    # a loading step that failed (the game carries on, but something did not get built)
    failed = [e for e in report.get("consoleErrors") or [] if "loading step" in e or "reflections not made" in e or "showreel failed" in e]
    if failed:
        problems.append(f"{len(failed)} loading step(s) failed")

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
        print(f"  {s['step']:26s} t={s.get('seconds')}s state={p.get('state')} screen={p.get('screen')} "
              f"{p.get('width')}x{p.get('height')} q={p.get('quality')} hz={p.get('refreshHz')} calls={p.get('drawCalls')} "
              + " ".join(f"{k}={v}" for k, v in s.items() if k not in ("step", "seconds", "page")))
    last = (steps.get("99-done") or steps.get("08-results") or {}).get("page") or {}
    if last.get("programs") is not None:
        print("GPU programs built (by what the game was doing), at the paused step:",
              (steps.get("05-paused-landscape", {}).get("page") or {}).get("programs"),
              "| at the end (the cost test builds 4 floor variants):", last.get("programs"))
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
        if not persist.get("probe"):
            problems.append("saved data was gone after the app was closed and opened again")
        if persist.get("frameRateSetting") != 1:
            problems.append("a changed setting did not survive a relaunch")
    except (OSError, ValueError):
        problems.append("no result from the relaunch check")

    # the same verdict as a note on the run page, readable from the API when the logs are not
    fps = (steps.get("06-match-landscape-later") or {}).get("framesPerSecondOver15s")
    progs = (steps.get("05-paused-landscape", {}).get("page") or {}).get("programs")
    summary = (f"boot ready after {boot.get('bootSeconds')} s; landscape match {fps} fps; programs at pause {progs}; "
               f"page errors {len(report.get('pageErrors') or [])}; console errors {len(report.get('consoleErrors') or [])}")
    if problems:
        print("FAIL:", "; ".join(problems))
        annotate("error", "Simulator test failed", "; ".join(problems) + " | " + summary)
        return 1
    print("PASS: played through in the simulator")
    annotate("notice", "Simulator test passed", summary)
    return 0


def annotate(level: str, title: str, msg: str) -> None:
    if os.environ.get("GITHUB_ACTIONS"):
        msg = msg.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::{level} title={title}::{msg}")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "out/simulator"))
