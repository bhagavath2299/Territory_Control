# Territory Control: Unity client (3D, daytime Indian city)

A 3D top-down client for the existing Territory Control server. The server (`server.js` on Render) keeps running the match, bots, rewards and database. This client only draws the match and sends steering input, using the same WebSocket messages as the browser game. Both clients can play on the same server at the same time.

**Status: first playable slice. It has not been compiled or run in the Unity editor yet.** The server side was tested (see below). Expect a first pass of small compile or shader fixes when you open it in Unity. Send me the console errors and I will fix them.

## What is in this slice

| Area | What it does |
|---|---|
| Networking | Connects to the Render server, waking-server handling, reconnect, ping, same `hello / quick / bots / in / use / leave` messages |
| Match mirror | Decodes the server's snapshots: cars, trails, ownership (run-length), land mask, timer, kill events |
| Look | Procedural aerial city (street grid, rooftops with sun shadows, parks and trees), water and sand shore, raised conquered land with a real edge, a shadow on the street beside it and owner-tinted rooftops |
| Cars | Placeholder 3D cars (sport, muscle, formula) with local steering prediction. Drop CC0 car prefabs into `GameAssets` to replace them |
| Camera | Tilted top-down chase camera that zooms out as your land grows |
| Input | Touch drag to steer anywhere (free angle), hold or tap two ability buttons. Mouse and keyboard in the editor |
| Quality | `High` (shadows, bloom, vignette, tone mapping, raised land, 60 fps) and `Low` (no shadows, flat ground, 30 fps, smaller textures). Auto-picks from the device and steps down if the frame rate stays low |
| UI | Placeholder menu, lobby, HUD and result screen so it is playable end to end. To be replaced by designed screens |

Not in this slice yet: power zones (cannon, fort, airstrike), garage and skins screens, replays, ranked and City War screens, audio and haptics. The browser game still has all of these and the server already supports them.

## Set up (once)

1. Install **Unity Hub** and **Unity 6 LTS** (6000.0.x). Add the **Android Build Support** module. For iPhone builds see "Build for iPhone" below.
2. Create a project from the **Universal 3D** template (this includes URP).
3. Window > Package Manager > `+` > **Add package from git URL** and add:
   - `https://github.com/endel/NativeWebSocket.git#upm`
   - `com.unity.nuget.newtonsoft-json` (if it is not already listed)
4. Copy `unity-client/Assets/TerritoryControl` from this repo into the new project's `Assets` folder.
5. In Unity run **Territory > Create Game Scene**. It builds the materials, post-processing, camera, sun, game objects and mobile player settings, and saves `Scenes/Main.unity`.
6. Press **Play**. Click **PLAY ONLINE** or **PRACTICE VS BOTS**. In the editor: mouse steers, Space boosts, E uses ability 2.

The client talks to `wss://territory-control.onrender.com`. Change it on the `NetClient` component to test against a local server (`ws://localhost:3000` after `node server.js`).

## Server change needed (small, backward compatible)

The server must send the land mask in the `start` message so the 3D map matches where cars can drive. This branch adds that (`land`, run-length pairs over the 303 x 531 grid). The browser game ignores the extra field. Merge this branch into `main` and Render redeploys on its own. Tested locally: the `start` message carries 160,893 cells (303 x 531) of which 96,397 are land, and snapshots decode to the same size.

## Art: free CC0 packs to download

Everything below is CC0 (free for commercial use, no credit needed). Download the files and drop them in `Assets/TerritoryControl/Art/CC0/`, then tell me which you chose and I will wire them in.

| Need | Where | Use for |
|---|---|---|
| Ground and roof PBR textures (asphalt, concrete, roof tiles, grass) | ambientcg.com, polyhaven.com | Replace or blend the procedural city map |
| Low-poly cars | kenney.nl (Car Kit), quaternius.com | Sport, muscle and formula car prefabs |
| Buildings and props | kenney.nl (City Kit), quaternius.com | Skyline outside the play area, menu backdrop |
| Skybox / HDRI (sunny Indian city sky) | polyhaven.com HDRIs | Reflections on cars |

For a more scanned, PUBG-like finish later: Quixel Megascans (free through Fab with an Epic account), but check each asset's license for mobile release.

## Build for Android (Play Store)

1. File > Build Profiles > Android > set **Build App Bundle (Google Play)**.
2. Project Settings > Player: set a unique **Package Name** (for example `com.yourname.territorycontrol`), a version, and an icon. Create a keystore under Publishing Settings and keep it safe. You cannot update the app without it.
3. Build the `.aab`. Upload it in Google Play Console (a one-time developer account fee applies) to the **Internal testing** track first, then Closed, then Production.
4. Target: ARM64, Android 7.0 or newer (API 24), IL2CPP. These are set by the Territory menu.

## Build for iPhone (App Store)

Apple only allows iOS builds from macOS with Xcode. If you do not have a Mac, use a cloud Mac service (Unity Build Automation, Codemagic, or GitHub Actions macOS runners) and I can set that up.

1. Install the **iOS Build Support** module. Build Profiles > iOS > Build to get an Xcode project.
2. In Xcode set your Team, Bundle Identifier and signing, then Product > Archive.
3. Upload to App Store Connect (Apple Developer Program membership applies) and test through **TestFlight** before submitting for review.

## Performance notes for 4 GB Android phones

- Low tier: no real-time shadows, no vertex displacement, 4 pixels per world unit for the city texture, MSAA off, render scale 0.8, 30 fps.
- Keep the first download small. The planned next step is Addressables so heavy art (high-quality car models, HD textures) downloads after install.
- Test on a real mid-range Android phone before tuning anything else. The editor is not a reliable guide.

## Where things are

- `Scripts/Net` WebSocket client. `Scripts/Game` match mirror, cars, trails, camera, input. `Scripts/Render` ground, city texture, quality. `Scripts/UI` placeholder screens. `Scripts/Editor` the one-click scene builder.
- `Shaders/TerritoryGround.shader` the ground shader (water, shore, raised land, edge shading, street shadow).
