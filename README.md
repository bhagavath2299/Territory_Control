# Territory Control World: online (World Test 15)

The online server and the game page of World Test 15. Deployed on Render from this branch (`world-online`).

- `server.js`: serves the page (`public/`), finds matches (free for all, 2v2v2, 3v3; computer drivers in the seats nobody takes), relays each match between its players (one player's device, the host, runs the match's rules; if it leaves another takes over), and keeps everything in the database.
- `public/`: the built page (World Test 15). Built from the world-test project (`python3 tools/build15.py`), not edited here.

Running it: `node server.js` (Node 22). Settings (environment):

| Setting | What it is |
|---|---|
| `DATABASE_URL` | Postgres. The tables go in their own schema, `world`. Without it the server keeps everything in a local SQLite file (`world.db`), which a free Render service loses whenever it restarts. |
| `PORT` | Set by Render. |
| `SOLO_WAIT`, `PAIR_WAIT` | Seconds before a lone searcher gets a match with computer drivers (30), and before a match starts once a second real player has joined (20). |
| `MATCH_LEN`, `COUNTDOWN` | Seconds of a match (180) and of the countdown (4). |
| `HOST_SILENT`, `SEAT_KEEP` | Milliseconds of silence before another player takes over as host (5000); seconds a player who dropped out can come back to their seat (90). |

What it keeps (schema `world`): `players` (a name and totals per player; players are known by a random token their device keeps, stored only as a hash), `sessions`, `searches` (who searched for which mode, how long, what came of it), `matches`, `match_players` (every seat's result) and `match_events` (each match's log: kills, cut lines, claims, abilities, pads, players leaving and coming back, host changes). No addresses or other personal details.

Other addresses: `/healthz`, `/api/online`, `/api/leaderboard`, `/api/recent`. The WebSocket is `/ws`.
