# Territory Control: v15 build

Drive a car, leave your land to draw a trail, loop back to claim everything inside, and cut rivals' trails to take their land. The most land after 2 minutes wins.

## New in v15
- **A white snow world.** The whole map is snow: fine grain, wind-packed drifts, ice cracks, soft shadows. Each island sits in dark water with broken ice floes at the shore, and your land is a raised, tinted slab of snow with a bevelled edge. Three lighting moods (Day, Golden hour, Dusk) are picked from the match seed, so everyone in a match sees the same one.
- **Vehicles built like real models.** Sport, Muscle and Formula are drawn as layered 3D shapes (body panels, glass, wheels, splitters, spoilers), lit on the phone's graphics chip with proper reflections, shadows and ambient occlusion. Each car has its own shape, wheel layout and lights.
- **Trails that look like objects.** Glow is a glossy gel tube, Neon is a dark casing with a bright core and running pulses, Fire is flames and embers. Every trail casts a shadow on the snow and fits the road exactly, and cars leave tyre tracks that fade with distance.
- **New player markers and HUD.** Your own car has a pilot ring with direction chevrons, rivals get name plates (the leader wears a crown), rivals who are off screen get edge pointers, and a home pointer shows the way back to your land when you are far out. The top bar, minimap, leaderboard and event feed are rebuilt in a graphite glass style with fine grain. A small chip under the clock shows your connection (round-trip time to the server).
- **Surface detail everywhere.** The menu, panels and buttons carry the same fine grain as the ground, previews show lit cars on snow plates, and the boot screen is a top-down asphalt road with worn lane paint and snow banks.
- **Faster.** Base speed is 50% higher (12 to 18 units per second), steering is 50% quicker, boost is x1.45 and dash x2.5. The camera sits closer so the speed reads on screen.
- **Smoother online play.**
  - The server sends 30 snapshots a second (a tick every 1/30 s, stepped by a 4 ms timer) and every message is numbered by tick.
  - Your car moves the instant you steer (the phone runs the server's own movement code), and is quietly corrected when the server's answer arrives. Other cars are drawn a few ticks in the past between two real positions, so they glide instead of jumping.
  - **Closing a loop fills in at once.** The phone runs the server's capture rule on your predicted path, so the land you just enclosed appears immediately instead of one network trip later (about 170 ms sooner on a 190 ms connection). The server's answer replaces it; if the server disagrees (for example you were cut at the same moment), the land is put back the way the server has it.
  - Bots no longer get pinned against the shore.
- **Faster first load.** The server compresses the page once (290 KB becomes about 105 KB) and the browser checks an ETag on later visits, so a repeat visit downloads nothing.
- **Graphics setting: Auto (default), High, Low.** Auto drops detail by itself if a phone cannot hold a steady frame rate. On a phone without WebGL2 the game falls back to a flatter 2D picture and everything still works.

Replays recorded before v15 cannot be played (the engine changed: speeds and bots), and the app says so.

## Game rules in short
- Seize on kill: eliminate a rival (trail cut, trap, blast) and all of their land becomes yours. Crashing into your own trail leaves your land neutral.
- Power zones (6 per island, placed from the match seed): own half of a zone to use its power.
  - Armory: Cannon. Bastion: Fortify (8 s shield on all your land). Missile Silo: Airstrike on the leader. Nitro Station: 15% faster while you hold it.
- Fair eliminations: you only die if a rival touches your trail, your trail is enclosed by a rival's capture, you cross your own trail, or you lose all your land. The screen says which and who.
- Islands are generated per match (101 x 177 world). Cars cannot drive into water.
- Follow camera that zooms out as your land grows, plus a minimap. Final Rush warning at 30 s.
- Server-authoritative: the server runs the same engine as the app. Everything the phone shows ahead of the server (your car, a closed loop) is a prediction that the server's answer replaces.
- In-game rewards are XP, coins and achievements only. No cash payouts.

## Menu, choices and replays (unchanged from v14)
- Main menu: PLAY, Practice (vs bots), Play with friends, Replays, Garage, How to play, Settings. Ranked, City War, player stats and rewards are built but switched off (`FEAT` in `src/44_screens.js`).
- 3 cars (Sport, Muscle, Formula), 3 trails (Glow, Neon, Fire), 4 abilities with 2 picked (Boost, Dash, Shield, Recall). The other four (Ghost, Mine, EMP, Grab) are in the code; set `ALL_ABILITIES=1` on the server to bring them back.
- Every match is recorded exactly (the engine is deterministic). Online matches are kept on the server for 7 days, practice matches on the device. Share a replay with `?replay=ID`.
- Music is generated live in the browser; no audio files are downloaded.
- If nobody else joins an online lobby within 12 seconds, bots fill the match.

## Update your Render site (from an iPhone)
1. Files app: tap the zip to unzip it.
2. github.com > your repository > Add file > Upload files > select ALL the files in the folder > Commit.
3. Render redeploys by itself in a couple of minutes.

## Permanent saving (free)
Without a database, stats and replays live on temporary storage and disappear when Render restarts.
1. neon.com: create a project, copy the connection string.
2. Render > your service > Environment > add `DATABASE_URL` = that string > Save. Render redeploys.
3. Open your-site/healthz. It should say `"db":"postgres"`.
Tables (including `replays` and `replay_players`) are created automatically; an older database is upgraded in place.

## Run on a computer
`node server.js`, then open http://localhost:3000. Without `DATABASE_URL` it saves to a local `data.db` file.
Rebuild the page from the parts in `src/` with `node build.js` (writes `index.html`). `node build.js --server=none --out=file.html` writes a standalone single file with no server (Practice and local replays only).

## Environment variables
| Name | Default | What it does |
|---|---|---|
| `PORT` | 3000 | HTTP and WebSocket port |
| `DATABASE_URL` | none | Postgres connection string (otherwise a local SQLite file) |
| `CD` / `RCD` | 10 / 3 | Lobby countdown seconds (quick and private / ranked) |
| `MATCH` / `RES` | 120 / 20 | Match length and results screen length, seconds |
| `FILL_S` | 12 | Seconds a quick-match lobby waits for people before bots fill in |
| `REPLAY_DAYS` | 7 | How long replays are kept |
| `REPLAY_MAX` | 4000 | Most replays kept at once (oldest are removed first) |
| `REPLAY_MB` | 250 | Most megabytes of replays kept at once |
| `PURGE_MS` | 3600000 | How often expired replays are deleted |
| `ALL_ABILITIES` | off | Set to any value to offer all 8 abilities |

## Honest notes
- **Distance matters more than code for lag.** Everything above removes the delay the game itself added, but a phone in California talking to a server in Singapore still has a round trip of about 170 to 200 ms. Your own car and loop captures now feel instant, yet other players are always seen about 200 ms in the past and a rival's trail cut is judged by the server. The real cure is a server near the players: on Render, create the service in the Oregon region (or run one per region) and the chip under the clock will drop to roughly 30 ms.
- The graphics were built and checked in a software renderer on a computer, not on a physical phone. The frame rate on real iPhones and Android phones has not been measured; Auto quality is there to protect against a slow GPU, and the first check on a real device should be: Settings > Graphics > High, play a match, and watch the frame rate.
- The music and sound effects were built and checked by measurement; they have not been listened to by a person yet. Levels are single numbers in `src/45_audio.js` (`mlev`, `SFXDB`).
- Browsers only start sound after a first tap, so the boot sequence asks for one.
- Cars, trails and abilities are cosmetic or equal-footing; nothing gives a competitive edge.

## Not in this build yet
Store billing and ads, ad-free subscription, paid cosmetics, cash-prize payouts and KYC (get Indian gaming-law review first), referrals, college boards, seasons and divisions, native iOS and Android wrappers. Ranked, City War, stats and rewards exist in the code but are hidden.

Runs on Node 22 (pinned in package.json, the version all tests ran on).
