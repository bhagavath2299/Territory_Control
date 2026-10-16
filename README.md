# Territory Control: iPhone app (offline test build)

This branch turns the offline phone build (branch `app-test`) into a real iPhone app. The game runs full screen in its own app, not in Safari, and needs no connection, not even on the first launch: every file is inside the app.

`main` and the live game on Render are not touched by this branch.

## What the app does

- Opens straight into the game: no address bar, no status bar, home bar hidden. Portrait and landscape.
- The game's files are served from inside the app at `app://localhost`, so settings, best score and replays are kept between launches.
- The screen stays on while the app is in front. Leaving the app pauses a practice match.
- Swiping in from a screen edge needs a second swipe to leave the game, so steering near the edge does not throw you out.
- The game's Vibration setting now works: it plays iPhone haptics (iPhone browsers have no vibration).
- Sound plays even with the side switch on silent, as the web build asks, and mixes with music from other apps.

Name on the home screen: **Territory**. Bundle ID: `com.bhagavath2299.territorycontrol`. Needs iOS 16 or later. On iPhones with a 120 Hz screen the game can run at 120 frames a second.

## How it is built

An iPhone app can only be compiled on a Mac, so GitHub builds it: every push to this branch runs `.github/workflows/ios.yml` on GitHub's macOS machines.

1. `ci/build.sh` builds the app twice with Xcode: an unsigned `.ipa` for the phone, and a simulator copy with the self-test compiled in.
2. `ci/selftest.sh` plays through the game in the iPhone simulator: boot screen, menu, a match against bots in portrait, landscape, pause and resume, back to portrait, results; then closes and reopens the app to check that saved data is still there. It takes a screenshot at every step. `ci/check_report.py` fails the run if any step is missing, 3D did not start or the page reported errors.
3. `ci/publish.sh` saves the `.ipa`, screenshots, test report and build logs to the branch `ios-build` (rewritten on each build).

The self-test code (`TerritoryControl/SelfTest.swift`) is compiled only into the simulator copy; the `.ipa` contains none of it.

Pushes build on an Apple silicon Mac (`macos-26`). When GitHub has none free, the run fails after 15 minutes with "The job was not acquired by Runner"; the workflow can then be started by hand on an Intel Mac: Actions > iPhone app > Run workflow > `macos-26-intel` (or `gh workflow run ios.yml --ref ios-app -f runner=macos-26-intel`). `build-info.txt` says which Mac made a build.

## Installing on an iPhone from a Windows PC (free Apple ID)

1. On the PC, install **iTunes** and **iCloud** from Apple's website (not the Microsoft Store versions; uninstall those first), then install **Sideloadly** from sideloadly.io.
2. Plug the iPhone in with a cable, unlock it and tap **Trust This Computer**.
3. Open Sideloadly, drag `TerritoryControl.ipa` into it, pick your iPhone, type your Apple ID and press **Start**. Enter your Apple ID password and, if asked, the code Apple sends you. A spare Apple ID works just as well.
4. On the iPhone: **Settings > General > VPN & Device Management**, tap your Apple ID under Developer App, then **Trust**.
5. Turn on **Settings > Privacy & Security > Developer Mode**, restart when asked, then confirm **Turn On**.
6. Open **Territory** from the home screen.

With a free Apple ID the app stops opening after 7 days. Run Sideloadly again (or turn on its automatic refresh) to renew it. A paid Apple Developer account ($99 a year) gives 1-year installs and TestFlight, and is needed for the App Store.

## The game (v20, "asphalt")

The game's source is in `game/`, one part per file (the page was split from app-test 8861220 and grown from there):

- `engine.js`: the match itself (fixed 30 steps a second, seeded, so a recorded match replays exactly). Classes and abilities (`CLS`), their numbers (`BAL`), land, scorched land, bots.
- `gfx_core.js`, `gfx_world.js`: the 3D picture (three.js): the looks (`GTH`), the floor (`gwFloorMat`), cars, trails, effects, camera, garage.
- `ui.js`: HUD, buttons, menus, kill feed, sound. `main.js`: the frame loop, picture quality, loading screen.
- `page_head.html`, `page_tail.html`: the page and its styles. `vendor/three.r180.min.js`.

```
python3 tools/build_game.py                         # dist/index.html: the web page (as on app-test)
python3 tools/build_game.py --app --label="v20 ..." # also refreshes www/index.html for the app
```

v20: the floor is real-looking asphalt made entirely in code (no image files, no asset packs, no grid): a generated surface picture with grain, mottling and little stones, lit by a low sun, with land as raised colour with a soft bevel and a shadow. Every ability is easy to see and does something on screen (barrages land on rival land near you, longer-lived blades, beams, cracks, wires and bigger mines), a press that cannot fire shakes its button, and the ultimate charges faster. Buttons are icons with a thin ring that fills as they recharge. Two other floor looks stay in the code for comparison (`?look=2` Obsidian, `?look=3` Concrete in the page address).

v19 in short: the arena is twice the area; cars are 20% quicker; every weapon clears twice the land; land a weapon destroys stays scorched for 15 seconds (a loop round it does not refill it); new abilities for all four classes; holographic power zones; a cleaner HUD; the camera further back; up to 120 frames a second on ProMotion iPhones.

Frame rate: the app asks iOS for the full rate (`CADisableMinimumFrameDurationOnPhone`) and switches off WebKit's 60 fps hold through WebKit's feature list (`GameViewController.allowFullFrameRate`, a private setting: fine for a sideloaded app, to be revisited before the App Store). Every shader is built behind the loading screen, in the variant the picture uses, so nothing is built during a match (`gfxWarm`, `gfxCompile`). Trails and sparks send only the part of their buffers in use. iPhones and iPads start on the middle quality tier (glow on); a device that cannot keep up shrinks the picture and drops a tier for the next match.

## Putting a new game build inside the app

The app's copy of the game is `www/index.html`: the built page with the web-app-only parts taken out (manifest, home-screen icon link, service worker). `build_game.py --app` makes it; for a page built elsewhere:

```
python3 tools/sync_web.py <folder with the new index.html> "<where it came from>"
python3 tools/make_icon.py <icon-512.png>     # only if the icon changed
```

Commit and push to `ios-app`; GitHub builds and tests the new app.

## Files

- `TerritoryControl/`: the app (Swift). `GameViewController.swift` shows the game; `BundleSchemeHandler.swift` serves the files; `Haptics.swift`; `SelfTest.swift` (simulator test only); `Info.plist`; `Assets.xcassets` (icon, launch colour).
- `TerritoryControl.xcodeproj`: the Xcode project. It opens in Xcode on any Mac.
- `game/`: the game's source (see above). `dist/` (not kept in git): the built web page.
- `www/`: the game as the app serves it.
- `tools/`: building the game, copying a web build into the app, making the icon.
- `ci/`: build, simulator test, report check, saving the build.
