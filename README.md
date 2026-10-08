# Territory Control: v14 build

Drive a car, leave your land to draw a trail, loop back to claim everything inside, and cut rivals' trails to take their land. The most land after 2 minutes wins.

## New in v14
- **Boot sequence and looping menu.** The game starts with a short animated boot (logo, loading steps, sound unlock) and lands on a main menu that loops over a live showreel: bots really playing a match behind the buttons. After a match, Play again, Menu and Replays all return to the same loop.
- **Short option list.** Main menu: PLAY, Practice (vs bots, online only), Play with friends, Replays, Garage, How to play, Settings. Ranked, City War, player stats and rewards are built but switched off (`FEAT` in `src/44_screens.js`) until you want them.
- **Limited player choices.**
  - 3 cars: Sport, Muscle, Formula.
  - 3 trails: Glow, Neon, Fire.
  - 4 abilities, pick 2: Boost, Dash, Shield, Recall. The other four (Ghost, Mine, EMP, Grab) are still in the code; set `ALL_ABILITIES=1` on the server to bring them back.
  - An old profile that saved a car, trail or ability that is no longer offered falls back to the default (Sport, Glow, Boost + Dash). Nothing is lost.
- **More detailed graphics.** Cars are re-drawn as high-resolution sprites (body panels, glass canopy, wheels that steer, lights with glow, underglow in your colour), with a richer island (water, foam, shoreline, rocks, bushes, palms, flowers and grass detail), three lighting moods (Day, Golden hour, Dusk) picked from the match seed so every player sees the same one, a glow pass, glassy HUD, and a leaderboard that sizes itself to the names in it.
  - Graphics setting: Auto (default), High, Low. Auto drops detail by itself if a phone cannot hold a steady frame rate.
- **Music that follows what you are watching.** The soundtrack is generated live in the browser (no audio files are downloaded) and changes with the scene: boot, menu, lobby, match, replay, win, lose. In a match it gets busier as the action builds, tenses up when you are in danger or have a trail out, and lifts for the Final Rush. Each lighting mood has its own tune. Sound effects cover turns, captures, kills, power-ups, abilities, countdown and results.
  - Settings: Music on/off, Music volume, Sound effects on/off, Vibration.
- **Replays, kept for 7 days.** Every match is recorded exactly (the engine is deterministic, so a replay is the real match, not a video). After a match tap Watch replay. The Replays screen lists recent matches with time left. The viewer has pause, 1x/2x/4x speed, restart, a seek bar, and a switch to watch from any player's car. Online matches are stored on the server for 7 days and then deleted automatically; practice matches are stored on the device (last 6, 7 days). Share a replay link (`?replay=ID`) with anyone.
- **Bots fill empty lobbies.** In Play online, if nobody else joins within 12 seconds, bots fill the match so you are never waiting alone. The lobby shows the countdown.

## Game rules in short
- Seize on kill: eliminate a rival (trail cut, trap, blast) and all of their land becomes yours. Crashing into your own trail leaves your land neutral.
- Power zones (6 per island, placed from the match seed): own half of a zone to use its power.
  - Armory: Cannon. Bastion: Fortify (8 s shield on all your land). Missile Silo: Airstrike on the leader. Nitro Station: 15% faster while you hold it.
- Fair eliminations: you only die if a rival touches your trail, your trail is enclosed by a rival's capture, you cross your own trail, or you lose all your land. The screen says which and who.
- Islands are generated per match (101 x 177 world) with beaches, grass, lakes and animated sea. Cars cannot drive into water.
- Follow camera that zooms out as your land grows, plus a minimap. Final Rush warning at 30 s.
- Server-authoritative: the server runs the same engine as the app, and your own car is predicted on the phone so steering feels instant.
- In-game rewards are XP, coins and achievements only. No cash payouts.

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
- The music and sound effects were built and checked by measurement (rendering the audio offline and analysing loudness, balance, pitch and timing, plus a live browser test that the music follows the scene). They have not been listened to by a person yet. Expect to tune the mix after a first listen: Settings has the volume sliders, and levels are single numbers in `src/45_audio.js` (`mlev`, `SFXDB`).
- Browsers only start sound after a first tap, so the boot sequence asks for one.
- Cars, trails and abilities are cosmetic or equal-footing; nothing gives a competitive edge.

## Not in this build yet
Store billing and ads, ad-free subscription, paid cosmetics, cash-prize payouts and KYC (get Indian gaming-law review first), referrals, college boards, seasons and divisions, native iOS and Android wrappers. Ranked, City War, stats and rewards exist in the code but are hidden.

Runs on Node 22 (pinned in package.json, the version all tests ran on).
