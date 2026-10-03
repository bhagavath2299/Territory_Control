# Cursor Territory: play with friends (v2)

What is new
- The connection stays open after a match. Results show for about 12 seconds, then the room goes back to the lobby and the next round starts by itself while 2 or more players are in the room.
- If a phone drops off Wi-Fi, locks, or you switch apps, the game reconnects by itself and puts you back in the same match, same spot.
- Your name, games played and wins are saved on your phone. The room shows everyone's wins in the lobby.
- Friends can join a room while a match is running and play from the next round.

Update an existing Render deployment from your iPhone
1. Files app: tap the zip to unzip it.
2. github.com > your repository > Add file > Upload files > choose server.js and index.html (same names replace the old ones) > Commit.
3. Render redeploys by itself in a couple of minutes.

First-time deploy (free)
1. github.com: new repository > Add file > Upload files > select every file in the folder > Commit.
2. render.com: sign in with GitHub > New > Web Service > pick the repo. Build command: npm install. Start command: node server.js. Instance type: Free.
3. Open the onrender.com link on your iPhone. Safari > Share > Add to Home Screen.

Play
- Tap Play online. "Share invite" sends a link (?room=CODE) so friends land in your room. Rooms hold up to 5 players.
- Play vs bots works offline.

Notes
- Render's free plan sleeps after 15 minutes without traffic. The server pings itself while players are connected, but if everyone leaves, the first load afterwards takes about 30 seconds. Rooms are kept in memory, so a restart clears them; phones reconnect and recreate the room by its code.
- Run on a computer instead: node server.js, then open http://localhost:3000 (iPhones on the same Wi-Fi: http://YOUR-COMPUTER-IP:3000).
- Optional environment variables: PORT, CD (lobby countdown seconds), MATCH (match seconds), RES (results seconds).
