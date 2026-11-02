# Territory Control world test: iPhone app (TC World)

This branch puts the **world test** (step 5, "World Test 5": the cable trail, barricades with towers, turrets, artillery, demolition charges and craters, three cars, one rival bot) inside an iPhone app, so it can be played on a phone at full screen and, on iPhones with a 120 Hz screen, at up to 120 frames a second. It is built from the `ios-app` branch (the v20 app) and changes only what the world test needs.

- Name on the home screen: **TC World**. Bundle ID: `com.bhagavath2299.territoryworld`, so it installs **next to** the Territory app (v20), not over it. iOS 16 or later.
- `main`, the live game on Render, `ios-app`, `ios-build`, `app-test` and the `unity-client` branch are not touched by this branch.

## What the app does

- Opens straight into the world test: no address bar, no status bar, home bar hidden. Portrait and landscape.
- Every file is inside the app (served at `app://localhost`), so it needs no connection (the page's font falls back to the system font offline).
- Frame rate: the app asks iOS for the full rate (`CADisableMinimumFrameDurationOnPhone`) and switches off WebKit's 60 fps hold (`GameViewController.allowFullFrameRate`, a private WebKit setting: fine for a sideloaded test app, to be revisited before the App Store). The page learns the screen's refresh rate and trades resolution to stay inside it. Settings > Show frame rate shows frames per second against the screen's rate, CPU time per frame, resolution, draw calls and triangles.

## How it is built

Every push to this branch runs `.github/workflows/ios.yml` ("iPhone world app") on GitHub's macOS machines:

1. `ci/build.sh` builds an unsigned `.ipa` for the phone and a simulator copy with the self-test compiled in.
2. `ci/selftest.sh` runs the world test in the iPhone simulator: loading, your car on autopilot against the rival in portrait, landscape, an artillery salvo and a charge (craters), the frame rate over 15 s, the close chase view, back to portrait; then closes and reopens the app. A screenshot at every step. `ci/check_report.py` fails the run if a step is missing, 3D did not start, the safe areas were not read, no crater appeared or the page reported errors.
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
- `www/`: the world test as the app serves it (World Test 5, world-test commit 40ef4b1).
- `ci/`: build, simulator test, report check, saving the build. `tools/`: `sync_world.sh`, `make_icon.py`.
