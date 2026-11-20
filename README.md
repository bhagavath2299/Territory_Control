# Territory Control world test: iPhone app (TC World)

This branch puts the **world test** inside an iPhone app, so it can be played on a phone at full screen and, on iPhones with a 120 Hz screen, at up to 120 frames a second. It now carries **World Test 14** (19 Nov 2026): World Test 13 made much faster (a cheaper ground, the Smooth setting drawn straight to the screen by default on a phone, no shader built during play, steady pacing at 60 or up to 120 frames a second), with sharper turns, ramp jumps that grow with the run-up and the speed, a cut line that burns as a short fuse (0.7 to 1.3 s: close to home and heading there you can still make it back), a stronger EMP slow and bigger ability effects. World Test 14's first app (build 25, commit `7f6747e`) gave the fuse 2 to 3.5 s; this one has the shorter fuse, aims for the screen's own rate where the first aimed for the rate it first measured (30 in the simulator), and builds the ramps' shadow shader while loading. World Test 13 (16 Nov 2026): six hover craft at 195 km/h in a 240 m cartoon arena, land claimed with a plain line in your colour, a kill hands you the victim's land, five ability pads (missiles, mines, shield, EMP, strike) taken by holding them under your colour, two a craft at most, a repair pad in the middle (health no longer comes back by itself), three ramps (a trial), a soundtrack, sound effects and an announcer, three-minute matches; and it plays **upright as well as sideways**. From 14 Nov it carried World Test 12 (build 24, commit `3e907cb`), before that World Test 6 (build 22, commit `68b8968`; the web copy of World Test 6 stays live at https://territory-control-world.onrender.com). It is built from the `ios-app` branch (the v20 app) and changes only what the world test needs.

- Name on the home screen: **TC World**. Bundle ID: `com.bhagavath2299.territoryworld`, so it installs **next to** the Territory app (v20), not over it. iOS 16 or later.
- `main`, the live game on Render, `ios-app`, `ios-build`, `app-test` and the `unity-client` branch are not touched by this branch.

## What the app does

- Opens straight into the world test: no address bar, no status bar, home bar hidden. Sideways (either way round) or upright; the page lays its HUD out again when the phone is turned (World Tests 6 to 12 were sideways only).
- Every file is inside the app (served at `app://localhost`), so it needs no connection (the page's font falls back to the system font offline).
- Frame rate: the app asks iOS for the full rate (`CADisableMinimumFrameDurationOnPhone`) and switches off WebKit's 60 fps hold and its 30 fps hold in Low Power Mode (`GameViewController.allowFullFrameRate`, private WebKit settings looked up at run time: fine for a sideloaded test app, to be revisited before the App Store). The page measures the screen's refresh rate; with Settings > Frame rate on Auto it runs at the screen's rate, and if a 120 Hz screen's rate cannot be held even at the lowest resolution allowed for it, it holds a steady 60 instead (Steady 60 and Up to 120 force one or the other). Settings > Show frame rate shows frames per second, the target, the screen's rate, the 1% low, dropped frames, CPU time per frame, resolution and draw calls.

## How it is built

Every push to this branch runs `.github/workflows/ios.yml` ("iPhone world app") on GitHub's macOS machines:

1. `ci/build.sh` builds an unsigned `.ipa` for the phone and a simulator copy with the self-test compiled in.
2. `ci/selftest.sh` runs the world test in the iPhone simulator: loading, your craft on autopilot against the five rival drivers, the five ability pads handed to you and every ability used, the frame rate over 15 s, the close chase view, the phone turned upright (the game must carry on in its upright layout; the frame rate over 8 s) and sideways again; then closes and reopens the app. Each step also records the game's own frame times (median and 99th percentile), the screen's rate and the frame-rate setting, and the report notes any shader built during play. A screenshot at every step. `ci/check_report.py` fails the run if a step is missing, 3D did not start, the app did not start sideways, there were not six players or six pads (five abilities and the repair pad), the safe areas were not read (sideways and upright), your craft used fewer than four kinds of ability, the app did not turn upright or the game paused or stood still there, it did not turn back, the sound (effects, announcer, music) did not load, or the page reported errors.
3. `ci/publish.sh` saves the `.ipa`, screenshots, test report and logs to the branch `ios-world-build` (rewritten on each build; `ios-build` keeps the v20 app).

When GitHub has no Apple silicon Mac free, a run fails after 15 minutes ("not acquired by Runner"); start it again by hand on an Intel Mac: Actions > iPhone world app > Run workflow > `macos-26-intel`.

## Installing on an iPhone (Windows PC, free Apple ID)

Same as the v20 app: Sideloadly with your Apple ID, iPhone on a cable; then Settings > General > VPN & Device Management > your Apple ID > Trust, and Developer Mode on. Your Apple ID password and codes go to Apple only. With a free Apple ID the app opens for 7 days, then run Sideloadly again. A free Apple ID can have up to three sideloaded apps at a time.

## Putting a new world test build inside the app

```
bash tools/sync_world.sh /path/to/world/dist     # the world-test project's built dist/ folder
```

Then commit and push to `ios-world`: GitHub builds and tests the new app.

## Files

- `TerritoryControl/`: the app (Swift). `GameViewController.swift` shows the page; `BundleSchemeHandler.swift` serves the files; `SelfTest.swift` (simulator test only, rewritten for the world test); `Info.plist`.
- `www/`: the world test as the app serves it (World Test 14, world-test branch `release/world-14`: `index.html`, `terrain/`, `tex/` the baked ground textures, `snd/` the music, effects and announcer as base64 MP3 inside JSON).
- Sound: `AppDelegate` sets the audio session to "playback" mixed with other apps, so the game is heard even with the side switch on silent; the page starts its sound on the first touch.
- `ci/`: build, simulator test, report check, saving the build. `tools/`: `sync_world.sh`, `make_icon.py`.
