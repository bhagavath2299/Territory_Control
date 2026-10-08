# Territory Control: v13 build

## What is in this build
- Seize on kill: eliminate a rival (trail cut, trap, mine or blast) and all of their land becomes yours. Crashing into your own trail still leaves your land neutral.
- Power zones: six per island (2 Armory, 2 Bastion, 1 Missile Silo, 1 Nitro Station), placed from the match seed so every player sees the same map. Own half of a zone to hold it.
  - Armory: Cannon (button or F). Shells punch into enemy land and blast a crater. 3.5 s reload.
  - Bastion: Fortify (button or Q). All your land is shielded for 8 s: it cannot be captured, shelled or grabbed. 25 s cooldown.
  - Missile Silo: Airstrike (button or R). Three bombs hit the leader's land after a 1.4 s warning. 22 s cooldown.
  - Nitro Station: your car is 15% faster while you hold it.
  - Bots go after nearby zones and use the powers.
- Islands are 2.5x bigger: the world is 101 x 177 (was 64 x 112). Coastline detail, lakes, palms, rocks and clouds keep the same density, so the bigger island looks and drives the same up close. Everything else is unchanged.
- Faster server: matches start in under 0.1 s and each server tick costs less than in v11, even on the bigger map.
- Island maps: every match is a new island (shared seed, identical for all players) with beaches, grass, lakes, animated sea and foam, swaying palms, rocks and bushes, drifting cloud shadows and birds. Cars cannot drive into water and captures never claim it.
- Faster action: 12 units per second (was 9.5) with sharper turning. Bots now dash at your trail and drop mines.
- Eight abilities, pick any two: Boost, Dash, Shield, Recall, plus new Ghost (trail cannot be cut for 2.5s), Mine (wrecks rivals who touch it), EMP (slows nearby rivals) and Grab (claims land around you at your border).
- Sleeker cars: curved bodies, glass canopy, side mirrors, LED lights with glow and a neon underglow in your colour.
- Top-quality graphics: generated high-resolution textures (concrete arena, a material texture per player colour), conquered land raised as 3D blocks with bevelled edges, two-tone side walls and soft ambient shadows, a racing-curb border, glossy cars with reflections and headlight glow, ribbon trails with moving shine, capture shockwaves and menu icons.
- Every player is a car: Sport, Muscle, Rally, Hypercar and Formula models (unlock in the Garage). Front wheels steer, drift smoke on hard turns, exhaust flames on boost, spin-out on elimination, pop-in on respawn.
- Paper.io-style look: clean light arena, solid land with a 3D side wall and soft shadow, flat trail bands that fade into land on capture, full-screen arena with a floating timer, score and rank, smooth menu fades and a zoom-in at match start.
- Fair eliminations: you only die if a rival touches your trail line, your trail is enclosed by a rival's capture, you really cross your own trail, or you lose all your land. The screen tells you which one happened and who did it.
- Open world with a follow camera: the view tracks you and zooms out as your land grows. Minimap in the corner.
- Premium graphics: textured ground with soft lighting, glossy patterned land with raised edges and drop shadows, tube-style trails, detailed avatars (cars with wheels and lights, UFO, drone, rocket, ninja), capture flash animation, vignette and glass-style HUD.
- Free movement at any angle with smooth turning. No grid: trails are smooth curves and territory has rounded edges.
- New look: paper-textured arena, patterned territory colours with raised 3D edges, outlined trails and shadows under players.
- Your own player is predicted on your phone, so steering feels instant even on a slow connection.
- One match engine shared by the server and the app, so Practice vs bots works offline with all four abilities, avatars, trails and Final Rush. No server needed for practice.
- Main menu, waiting lobbies, Quick match, Ranked 1v1, Play with friends (invite links), Practice vs bots.
- Four abilities with a 2-slot loadout: Boost, Dash, Shield, Recall. Server-run, cooldown based, no pay-to-win.
- Ranked ladder with Elo rating and tiers Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster, Legend. Leaving a ranked match counts as a loss.
- City and State War: pick a city in the Garage. Quick and ranked matches score points for your city and its state. Only your best 5 matches each day count. City locks for the season once you score. India, state and city ranks plus an India top-players board.
- Final Rush: warning at 30 seconds, countdown from 10, pulsing screen, sound and haptics.
- Garage: 7 avatars and 4 trails (cosmetic only), unlocked by level.
- "Challenge friends" after a match shares a WhatsApp-ready message and a private room link.
- Database: profiles, XP, coins, ratings, matches, achievements and city points are saved.
- In-game rewards are XP, coins and achievements only. There are no cash payouts in this build.

## Update your Render site (from an iPhone)
1. Files app: tap the zip to unzip it.
2. github.com > your repository > Add file > Upload files > select ALL the files in the folder > Commit.
3. Render redeploys by itself in a couple of minutes.

## Turn on permanent saving (free)
Without a database, stats live on temporary storage and disappear when Render restarts.
1. neon.com: sign up, create a project, copy the connection string.
2. Render > your service > Environment > add DATABASE_URL = that string > Save. Render redeploys.
3. Open your-site/healthz. It should say "db":"postgres".
The tables are created automatically. An older database is upgraded in place.

## Run on a computer
node server.js, then open http://localhost:3000. Without DATABASE_URL it saves to a local data.db file.

## Environment variables
PORT, DATABASE_URL, CD (lobby countdown), RCD (ranked countdown), MATCH (match seconds), RES (results seconds).

## Not in this build yet
Store billing and ads, ad-free subscription, paid cosmetics, cash-prize payouts and KYC (get Indian gaming-law review first), referrals, college boards, seasons and divisions, music, native iOS and Android wrappers.
