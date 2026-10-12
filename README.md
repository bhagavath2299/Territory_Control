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

Name on the home screen: **Territory**. Bundle ID: `com.bhagavath2299.territorycontrol`. Needs iOS 16 or later.

## How it is built

An iPhone app can only be compiled on a Mac, so GitHub builds it: every push to this branch runs `.github/workflows/ios.yml` on GitHub's macOS machines.

1. `ci/build.sh` builds the app twice with Xcode: an unsigned `.ipa` for the phone, and a simulator copy with the self-test compiled in.
2. `ci/selftest.sh` plays through the game in the iPhone simulator: boot screen, menu, a match against bots in portrait, landscape, pause and resume, back to portrait, results; then closes and reopens the app to check that saved data is still there. It takes a screenshot at every step. `ci/check_report.py` fails the run if any step is missing, 3D did not start or the page reported errors.
3. `ci/publish.sh` saves the `.ipa`, screenshots, test report and build logs to the branch `ios-build` (rewritten on each build).

The self-test code (`TerritoryControl/SelfTest.swift`) is compiled only into the simulator copy; the `.ipa` contains none of it.

## Installing on an iPhone from a Windows PC (free Apple ID)

1. On the PC, install **iTunes** and **iCloud** from Apple's website (not the Microsoft Store versions; uninstall those first), then install **Sideloadly** from sideloadly.io.
2. Plug the iPhone in with a cable, unlock it and tap **Trust This Computer**.
3. Open Sideloadly, drag `TerritoryControl.ipa` into it, pick your iPhone, type your Apple ID and press **Start**. Enter your Apple ID password and, if asked, the code Apple sends you. A spare Apple ID works just as well.
4. On the iPhone: **Settings > General > VPN & Device Management**, tap your Apple ID under Developer App, then **Trust**.
5. Turn on **Settings > Privacy & Security > Developer Mode**, restart when asked, then confirm **Turn On**.
6. Open **Territory** from the home screen.

With a free Apple ID the app stops opening after 7 days. Run Sideloadly again (or turn on its automatic refresh) to renew it. A paid Apple Developer account ($99 a year) gives 1-year installs and TestFlight, and is needed for the App Store.

## Putting a new game build inside the app

The game itself is `www/index.html`, a copy of the `app-test` build with the web-app-only parts taken out (manifest, home-screen icon link, service worker).

```
python3 tools/sync_web.py <folder with the new index.html> "app-test <commit>"
python3 tools/make_icon.py <icon-512.png>     # only if the icon changed
```

Commit and push to `ios-app`; GitHub builds and tests the new app.

## Files

- `TerritoryControl/`: the app (Swift). `GameViewController.swift` shows the game; `BundleSchemeHandler.swift` serves the files; `Haptics.swift`; `SelfTest.swift` (simulator test only); `Info.plist`; `Assets.xcassets` (icon, launch colour).
- `TerritoryControl.xcodeproj`: the Xcode project. It opens in Xcode on any Mac.
- `www/`: the game.
- `tools/`: copying in a new web build and making the icon.
- `ci/`: build, simulator test, report check, saving the build.
