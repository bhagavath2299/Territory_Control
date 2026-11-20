// Territory Control World: the online server (World Test 15).
//
// What it does:
//  - Serves the game page (public/) to browsers and to anyone with the link.
//  - Matchmaking over WebSocket for three modes, six craft each: everyone for themselves ("ffa"), three teams
//    of two ("t3", 2v2v2) and two teams of three ("t2", 3v3). Whoever is searching for a mode at the same time
//    is put in the same match. Seats nobody takes get computer drivers: a match starts when all six seats are
//    real players, or PAIR_WAIT seconds after a second real player joined, or SOLO_WAIT seconds after a lone
//    player started searching.
//  - A relay between the players of a match. One of them, the host, runs the match's rules on their own device
//    (see the s15 layer of the page); everyone's craft moves on their own device and its position is sent to the
//    others. If the host leaves or goes quiet, another player takes over as host.
//  - A record of everything in a database: players, sessions, searches, matches, every seat's result, and each
//    match's event log (kills, cut lines, claims, abilities, pads, players leaving and coming back).
//    Postgres when DATABASE_URL is set (through the optional `pg` package; the tables in a schema of their own,
//    `world`), else a local SQLite file (Node's node:sqlite), else memory only.
//
// No required dependencies. Run: node server.js   (PORT, DATABASE_URL and the numbers in CFG can be set in the
// environment).
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');

const ENV = process.env;
const num = (v, d) => (v === undefined || v === '' || isNaN(+v) ? d : +v);
const CFG = {
  port: num(ENV.PORT, 8120),
  pub: ENV.PUBLIC_DIR || path.join(__dirname, 'public'),
  soloWait: num(ENV.SOLO_WAIT, 30),        // s: a lone searcher gets a match with computer drivers after this
  pairWait: num(ENV.PAIR_WAIT, 20),        // s: with two or more real players, the match starts this long after the second joined
  countdown: num(ENV.COUNTDOWN, 4),        // s between "match found" and the start
  length: num(ENV.MATCH_LEN, 180),         // s, one match
  hostSilent: num(ENV.HOST_SILENT, 5000),  // ms without a word from the host before another player takes over
  seatKeep: num(ENV.SEAT_KEEP, 90),        // s a player who dropped out can come back to their seat (a computer drives it meanwhile)
  maxMsg: 4 << 20,                         // bytes, the largest message a client may send (a host's full state is the biggest)
  proto: 1,
};
const SELF = ENV.RENDER_EXTERNAL_URL || '';

const MODES = {
  ffa: { name: 'Free for all', seats: 6, teams: 0 },
  t3: { name: '2v2v2', seats: 6, teams: 3 },
  t2: { name: '3v3', seats: 6, teams: 2 },
};
// the team a seat belongs to (in "ffa" every seat is its own team)
const teamOf = (mode, slot) => (mode === 't3' ? slot >> 1 : mode === 't2' ? (slot < 3 ? 0 : 1) : slot);
const BOT_NAMES = ['Kestrel', 'Viper', 'Nomad', 'Mirage', 'Rook', 'Blaze', 'Zephyr', 'Onyx', 'Sable', 'Comet', 'Falcon', 'Ember'];

const now = () => Date.now();
const uid = () => crypto.randomUUID();
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const cleanName = (s) => String(s == null ? '' : s).normalize('NFKC').replace(/[^\p{L}\p{N} ._\-']/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// =============================================================================================== the database
// One set of statements for both: tables are written W.name, which becomes world.name in Postgres and name in
// SQLite; parameters are $1, $2, ... (SQLite gets ?1, ?2, ...).
let DB = null;
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS W.players(id TEXT PRIMARY KEY, token_hash TEXT UNIQUE, name TEXT, created BIGINT, seen BIGINT,
     client TEXT DEFAULT '', games INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, team_wins INTEGER DEFAULT 0,
     kills INTEGER DEFAULT 0, deaths INTEGER DEFAULT 0, claims INTEGER DEFAULT 0, best_share REAL DEFAULT 0, play_seconds REAL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS W.sessions(id TEXT PRIMARY KEY, player_id TEXT, started BIGINT, ended BIGINT, client TEXT, build TEXT)`,
  `CREATE TABLE IF NOT EXISTS W.searches(id TEXT PRIMARY KEY, player_id TEXT, mode TEXT, started BIGINT, ended BIGINT, outcome TEXT, match_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS W.matches(id TEXT PRIMARY KEY, mode TEXT, created BIGINT, started BIGINT, ended BIGINT, end_reason TEXT,
     humans INTEGER, bots INTEGER, length_s INTEGER, played_s REAL, host_changes INTEGER DEFAULT 0,
     winner_slot INTEGER, winner_team INTEGER, winner_name TEXT, summary TEXT)`,
  `CREATE TABLE IF NOT EXISTS W.match_players(match_id TEXT, slot INTEGER, player_id TEXT, kind TEXT, name TEXT, team INTEGER,
     place INTEGER, team_place INTEGER, share REAL, kills INTEGER, deaths INTEGER, claims INTEGER, left_early INTEGER DEFAULT 0,
     PRIMARY KEY(match_id, slot))`,
  `CREATE INDEX IF NOT EXISTS mp_player ON W.match_players(player_id)`,
  `CREATE INDEX IF NOT EXISTS m_started ON W.matches(started)`,
  `CREATE TABLE IF NOT EXISTS W.match_events(match_id TEXT, seq INTEGER, created BIGINT, data TEXT, PRIMARY KEY(match_id, seq))`,
];
async function initDB() {
  const url = ENV.DATABASE_URL;
  if (url) {
    try {
      const { Pool } = require('pg');
      const local = /localhost|127\.0\.0\.1/.test(url);
      const pool = new Pool({ connectionString: url, max: 4, ...(/sslmode=/.test(url) || local ? {} : { ssl: { rejectUnauthorized: false } }) });
      pool.on('error', (e) => console.error('pg pool', e.message));
      await pool.query('select 1');
      await pool.query('CREATE SCHEMA IF NOT EXISTS world');
      const W = (q) => q.replace(/\bW\./g, 'world.');
      DB = { kind: 'postgres', all: async (q, a = []) => (await pool.query(W(q), a)).rows, run: async (q, a = []) => { await pool.query(W(q), a); } };
    } catch (e) { console.error('Postgres unavailable:', e.message); }
  }
  if (!DB && ENV.NO_SQLITE !== '1') {
    try {
      const { DatabaseSync } = require('node:sqlite');
      const f = new DatabaseSync(ENV.DB_FILE || path.join(__dirname, 'world.db'));
      const W = (q) => q.replace(/\bW\./g, '').replace(/\$(\d+)/g, '?$1');
      const cache = new Map(), prep = (q) => { let s = cache.get(q); if (!s) { s = f.prepare(W(q)); cache.set(q, s); } return s; };
      DB = { kind: 'sqlite', all: async (q, a = []) => prep(q).all(...a), run: async (q, a = []) => { prep(q).run(...a); } };
    } catch (e) { console.error('No database: nothing will be kept.', e.message); }
  }
  if (DB) {
    try { for (const q of SCHEMA) await DB.run(q); }
    catch (e) { console.error('Schema error:', e.message); DB = null; }
  }
  log('Database:', DB ? DB.kind : 'none');
}
// every write goes through here: a database hiccup is logged, never thrown at the game
function dbRun(q, a) { if (DB) DB.run(q, a).catch((e) => console.error('db', e.message, q.slice(0, 60))); }
async function dbAll(q, a) { if (!DB) return []; try { return await DB.all(q, a); } catch (e) { console.error('db', e.message); return []; } }

// =============================================================================================== players
const players = new Map();      // id -> player (also those whose connection dropped, for a while)
const byToken = new Map();      // token hash -> player
function stats0() { return { games: 0, wins: 0, team_wins: 0, kills: 0, deaths: 0, claims: 0, best_share: 0, play_seconds: 0 }; }
async function playerFor(token, name, client) {
  const h = sha('tc-world:' + token);
  let p = byToken.get(h);
  if (!p) {
    const rows = await dbAll('SELECT * FROM W.players WHERE token_hash=$1', [h]);
    const row = rows[0];
    p = {
      id: row ? row.id : uid(), h, name: (row && row.name) || name || 'Player', created: row ? +row.created : now(),
      stats: row ? { games: +row.games, wins: +row.wins, team_wins: +row.team_wins, kills: +row.kills, deaths: +row.deaths, claims: +row.claims, best_share: +row.best_share, play_seconds: +row.play_seconds } : stats0(),
      conn: null, lobby: null, room: null, slot: -1, offAt: 0, search: null, session: null,
    };
    if (!row) dbRun('INSERT INTO W.players(id, token_hash, name, created, seen, client) VALUES($1,$2,$3,$4,$5,$6)', [p.id, h, p.name, p.created, now(), client || '']);
    byToken.set(h, p); players.set(p.id, p);
  }
  if (name && name !== p.name) { p.name = name; dbRun('UPDATE W.players SET name=$2 WHERE id=$1', [p.id, name]); }
  dbRun('UPDATE W.players SET seen=$2, client=$3 WHERE id=$1', [p.id, now(), client || '']);
  return p;
}

// =============================================================================================== sending
function frameOf(str) {
  const b = Buffer.from(str), n = b.length;
  let h;
  if (n < 126) h = Buffer.from([129, n]);
  else if (n < 65536) h = Buffer.from([129, 126, n >> 8, n & 255]);
  else { h = Buffer.alloc(10); h[0] = 129; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([h, b]);
}
function sendRaw(c, buf) { const s = c && c.s; if (!s || s.destroyed) return; try { s.write(buf); } catch (e) {} }
function send(p, o) { if (p && p.conn) sendRaw(p.conn, frameOf(typeof o === 'string' ? o : JSON.stringify(o))); }

// =============================================================================================== matchmaking
const lobbies = { ffa: [], t3: [], t2: [] };   // the searchers of each mode, in the order they joined: { p, at }
const rooms = new Map();                        // match id -> room
function lobbyStart(mode) {
  const L = lobbies[mode];
  if (!L.length) return 0;
  if (L.length >= MODES[mode].seats) return now();
  if (L.length >= 2) return L[1].at + CFG.pairWait * 1000;
  return L[0].at + CFG.soloWait * 1000;
}
function lobbyStatus(mode) {
  const L = lobbies[mode], at = lobbyStart(mode);
  return { t: 'q', mode, n: L.length, seats: MODES[mode].seats, wait: L.length ? Math.max(0, Math.ceil((at - now()) / 1000)) : -1, names: L.map((x) => x.p.name) };
}
function lobbyBroadcast(mode) { const st = JSON.stringify(lobbyStatus(mode)); for (const x of lobbies[mode]) send(x.p, st); }
function unqueue(p, outcome, matchId) {
  if (!p.lobby) return;
  const mode = p.lobby, L = lobbies[mode], i = L.findIndex((x) => x.p === p);
  if (i >= 0) L.splice(i, 1);
  p.lobby = null;
  if (p.search) { dbRun('UPDATE W.searches SET ended=$2, outcome=$3, match_id=$4 WHERE id=$1', [p.search, now(), outcome, matchId || null]); p.search = null; }
  lobbyBroadcast(mode);
}
function queue(p, mode) {
  if (!MODES[mode] || (p.room && p.room.state === 'play')) return;
  if (p.room) { p.room = null; p.slot = -1; }
  if (p.lobby === mode) { send(p, lobbyStatus(mode)); return; }
  if (p.lobby) unqueue(p, 'switched');
  lobbies[mode].push({ p, at: now() });
  p.lobby = mode; p.search = uid();
  dbRun('INSERT INTO W.searches(id, player_id, mode, started) VALUES($1,$2,$3,$4)', [p.search, p.id, mode, now()]);
  lobbyBroadcast(mode);
}

function startMatch(mode) {
  const L = lobbies[mode], M = MODES[mode];
  const take = L.splice(0, M.seats);
  if (!take.length) return;
  const room = { id: uid(), mode, seats: [], host: -1, created: now(), startAt: now() + CFG.countdown * 1000, length: CFG.length, state: 'play', lastHost: now(), hostChanges: 0, evSeq: 0, over: null, ended: 0 };
  // seats: real players spread over the teams, computer drivers in the rest
  const free = Array.from({ length: M.seats }, (_, i) => i);
  const nT = M.teams || M.seats;
  take.forEach(({ p }, i) => {
    const want = i % nT;
    let k = free.findIndex((s) => teamOf(mode, s) === want);
    if (k < 0) k = 0;
    const slot = free.splice(k, 1)[0];
    room.seats[slot] = { slot, team: teamOf(mode, slot), kind: 'human', name: p.name, pid: p.id, p, gone: false, goneAt: 0, left: false };
  });
  const taken = new Set(take.map((x) => x.p.name.toLowerCase()));
  const names = BOT_NAMES.filter((n) => !taken.has(n.toLowerCase()));
  for (const slot of free) room.seats[slot] = { slot, team: teamOf(mode, slot), kind: 'bot', name: names.shift() || 'Bot ' + (slot + 1), pid: null, p: null, gone: false, left: false };
  room.host = take[0] ? room.seats.find((s) => s.p === take[0].p).slot : -1;
  rooms.set(room.id, room);
  for (const { p } of take) {
    const seat = room.seats.find((s) => s.p === p);
    p.lobby = null; p.room = room; p.slot = seat.slot;
    if (p.search) { dbRun('UPDATE W.searches SET ended=$2, outcome=$3, match_id=$4 WHERE id=$1', [p.search, now(), 'matched', room.id]); p.search = null; }
  }
  lobbyBroadcast(mode);
  for (const s of room.seats) if (s.p) send(s.p, startMsg(room, s.slot, false));
  const humans = room.seats.filter((s) => s.kind === 'human').length;
  log('match', room.id.slice(0, 8), mode, humans + ' players', (M.seats - humans) + ' bots');
  dbRun('INSERT INTO W.matches(id, mode, created, started, humans, bots, length_s) VALUES($1,$2,$3,$4,$5,$6,$7)', [room.id, mode, room.created, room.startAt, humans, M.seats - humans, room.length]);
  for (const s of room.seats) dbRun('INSERT INTO W.match_players(match_id, slot, player_id, kind, name, team) VALUES($1,$2,$3,$4,$5,$6)', [room.id, s.slot, s.pid, s.kind, s.name, s.team]);
  roomEvent(room, { type: 'start', humans, host: room.host });
}
function startMsg(room, slot, rejoin) {
  return {
    t: 'start', match: room.id, mode: room.mode, you: slot, host: room.host, rejoin: !!rejoin,
    startIn: Math.max(0, room.startAt - now()), length: room.length, now: now(),
    seats: room.seats.map((s) => ({ slot: s.slot, team: s.team, kind: s.kind, name: s.name, gone: s.gone || s.left })),
  };
}
// the server's own entries in a match's log (who joined, left, took over as host)
function roomEvent(room, e) {
  e.at = now();
  room.evSeq++;
  dbRun('INSERT INTO W.match_events(match_id, seq, created, data) VALUES($1,$2,$3,$4)', [room.id, room.evSeq, now(), JSON.stringify([Object.assign({ src: 'server' }, e)])]);
}

// =============================================================================================== a match in play
const live = (s) => s && s.kind === 'human' && !s.gone && !s.left && s.p && s.p.conn;
function roomSend(room, o, except) {
  const buf = frameOf(typeof o === 'string' ? o : JSON.stringify(o));
  for (const s of room.seats) if (live(s) && s.slot !== except) sendRaw(s.p.conn, buf);
}
function pickHost(room, reason) {
  const old = room.host;
  const cand = room.seats.filter((s) => live(s) && s.slot !== old);
  if (!cand.length) {
    if (!room.seats.some(live)) endRoom(room, 'abandoned');
    return;
  }
  // the player who has been quiet the shortest time (the steadiest connection), lowest seat on a tie
  cand.sort((a, b) => (b.p.conn.lastIn || 0) - (a.p.conn.lastIn || 0) || a.slot - b.slot);
  room.host = cand[0].slot; room.hostChanges++; room.lastHost = now();
  log('match', room.id.slice(0, 8), 'host', old, '->', room.host, reason);
  roomSend(room, { t: 'host', slot: room.host, from: old, why: reason });
  roomEvent(room, { type: 'host', from: old, to: room.host, why: reason });
}
function seatGone(room, s, why) {
  if (!s || s.gone || s.left) return;
  if (why === 'left') s.left = true; else { s.gone = true; s.goneAt = now(); }
  roomSend(room, { t: 'gone', slot: s.slot, why });
  roomEvent(room, { type: 'gone', slot: s.slot, why });
  if (room.host === s.slot) pickHost(room, why);
  else if (!room.seats.some(live)) endRoom(room, 'abandoned');
}
function rejoin(p) {
  const room = p.room;
  if (!room || room.state !== 'play') { p.room = null; p.slot = -1; return false; }
  const s = room.seats[p.slot];
  if (!s || s.p !== p || s.left) { p.room = null; p.slot = -1; return false; }
  s.gone = false; s.goneAt = 0;
  send(p, startMsg(room, s.slot, true));
  if (!room.seats.some((x) => x.slot === room.host && live(x))) pickHost(room, 'host away');
  else if (room.host !== s.slot) roomSend(room, { t: 'back', slot: s.slot }, s.slot);
  roomEvent(room, { type: 'back', slot: s.slot });
  return true;
}
// the host's results: the record of the match and every seat, and each player's totals
function endRoom(room, reason, res) {
  if (room.state !== 'play') return;
  room.state = 'over'; room.ended = now(); room.over = res || null;
  const played = Math.max(0, (room.ended - room.startAt) / 1000);
  const rank = res && Array.isArray(res.ranking) ? res.ranking : [];
  const teams = res && Array.isArray(res.teams) ? res.teams : [];
  const bySlot = new Map(rank.map((r) => [r.slot | 0, r]));
  const win = rank.find((r) => r.place === 1), wteam = teams.find((t) => t.place === 1);
  const W = win ? room.seats[win.slot] : null;
  log('match', room.id.slice(0, 8), 'over', reason, W ? 'winner ' + W.name : '');
  dbRun('UPDATE W.matches SET ended=$2, end_reason=$3, played_s=$4, host_changes=$5, winner_slot=$6, winner_team=$7, winner_name=$8, summary=$9 WHERE id=$1',
    [room.id, room.ended, reason, played, room.hostChanges, win ? win.slot : null, wteam ? wteam.team : null, W ? W.name : null, JSON.stringify(res || {}).slice(0, 20000)]);
  for (const s of room.seats) {
    const r = bySlot.get(s.slot) || {};
    const tp = teams.find((t) => t.team === s.team);
    dbRun('UPDATE W.match_players SET place=$3, team_place=$4, share=$5, kills=$6, deaths=$7, claims=$8, left_early=$9 WHERE match_id=$1 AND slot=$2',
      [room.id, s.slot, r.place || null, tp ? tp.place : null, +r.share || 0, r.kills | 0, r.deaths | 0, r.claims | 0, s.left || s.gone ? 1 : 0]);
    if (s.kind !== 'human' || !s.p) continue;
    const st = s.p.stats;
    if (reason === 'over') {
      st.games++; st.kills += r.kills | 0; st.deaths += r.deaths | 0; st.claims += r.claims | 0;
      if (r.place === 1 && !MODES[room.mode].teams) st.wins++;
      if (tp && tp.place === 1 && MODES[room.mode].teams) st.team_wins++;
      st.best_share = Math.max(st.best_share, +r.share || 0);
    }
    st.play_seconds += played;
    dbRun('UPDATE W.players SET games=$2, wins=$3, team_wins=$4, kills=$5, deaths=$6, claims=$7, best_share=$8, play_seconds=$9 WHERE id=$1',
      [s.p.id, st.games, st.wins, st.team_wins, st.kills, st.deaths, st.claims, st.best_share, st.play_seconds]);
  }
  if (res) roomSend(room, Object.assign({}, res, { t: 'over', reason }), room.host);
  else roomSend(room, { t: 'over', reason, ranking: [], teams: [] });
  setTimeout(() => {
    for (const s of room.seats) if (s.p && s.p.room === room) { s.p.room = null; s.p.slot = -1; }
    rooms.delete(room.id);
  }, 30000);
}

// =============================================================================================== messages
const RELAY_HOST = new Set(['snap', 'land', 'ev', 'full', 'pose', 'clock']);
const RELAY_GUEST = new Set(['pose']);
async function onMsg(c, text) {
  let m;
  try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m.t !== 'string') return;
  c.lastIn = now();
  const p = c.p;
  if (!p) {
    if (m.t !== 'hello') return;
    if (c.helloing) return;
    c.helloing = true;
    const token = String(m.token || '');
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) { sendRaw(c, frameOf(JSON.stringify({ t: 'err', m: 'bad token' }))); return; }
    const q = await playerFor(token, cleanName(m.name), String(m.client || '').slice(0, 16));
    if (q.conn && q.conn !== c) { try { sendRaw(q.conn, frameOf('{"t":"err","m":"signed in elsewhere"}')); q.conn.s.destroy(); } catch (e) {} }
    q.conn = c; c.p = q; q.offAt = 0;
    q.session = uid();
    dbRun('INSERT INTO W.sessions(id, player_id, started, client, build) VALUES($1,$2,$3,$4,$5)', [q.session, q.id, now(), String(m.client || '').slice(0, 16), String(m.build || '').slice(0, 40)]);
    send(q, { t: 'welcome', id: q.id, name: q.name, proto: CFG.proto, now: now(), stats: q.stats, online: onlineCounts(), modes: Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, v.name])) });
    if (q.room) rejoin(q);
    return;
  }
  const room = p.room;
  if (room && room.state === 'play' && m.t !== 'ping' && m.t !== 'stats' && m.t !== 'name') {
    const s = room.seats[p.slot];
    if (!s || s.p !== p || s.left) return;
    // a player marked gone (a phone that slept, a host that went quiet) is talking again: their seat back, in step
    if (s.gone) {
      s.gone = false; s.goneAt = 0;
      send(p, startMsg(room, s.slot, true));
      if (!room.seats.some((x) => x.slot === room.host && live(x))) pickHost(room, 'host away');
      else if (room.host !== s.slot) roomSend(room, { t: 'back', slot: s.slot }, s.slot);
      roomEvent(room, { type: 'back', slot: s.slot, how: 'woke' });
      return;
    }
    const isHost = room.host === s.slot;
    if (isHost) room.lastHost = now();
    if (m.t === 'leave') { seatGone(room, s, 'left'); p.room = null; p.slot = -1; return; }
    if (m.t === 'over') { if (isHost) endRoom(room, 'over', { ranking: m.ranking, teams: m.teams, len: m.len, mode: room.mode }); return; }
    if (m.t === 'log') {
      if (isHost && Array.isArray(m.list) && m.list.length) {
        room.evSeq++;
        dbRun('INSERT INTO W.match_events(match_id, seq, created, data) VALUES($1,$2,$3,$4)', [room.id, room.evSeq, now(), JSON.stringify(m.list).slice(0, 200000)]);
      }
      return;
    }
    m.s = s.slot;
    if (isHost && RELAY_HOST.has(m.t)) {
      if (m.t === 'full' && typeof m.to === 'number') { const d = room.seats[m.to]; if (live(d)) send(d.p, m); }
      else roomSend(room, m, s.slot);
    } else if (!isHost && RELAY_GUEST.has(m.t)) roomSend(room, m, s.slot);
    else if (!isHost && m.t === 'want') { const h = room.seats[room.host]; if (live(h)) send(h.p, m); }
    else if (!isHost && m.t === 'need') { const h = room.seats[room.host]; if (live(h)) send(h.p, { t: 'need', slot: s.slot }); }
    return;
  }
  switch (m.t) {
    case 'ping': send(p, { t: 'pong', c: m.c, now: now() }); break;
    case 'name': { const n = cleanName(m.name); if (n && n !== p.name) { p.name = n; dbRun('UPDATE W.players SET name=$2 WHERE id=$1', [p.id, n]); } send(p, { t: 'name', name: p.name }); break; }
    case 'queue': queue(p, String(m.mode)); break;
    case 'unqueue': unqueue(p, 'cancelled'); send(p, { t: 'q', mode: null, n: 0, wait: -1 }); break;
    case 'stats': stats(p).catch((e) => console.error(e.message)); break;
    case 'leave': if (p.room) { p.room = null; p.slot = -1; } break;
  }
}
function onlineCounts() {
  let on = 0, playing = 0;
  for (const p of players.values()) if (p.conn) { on++; if (p.room) playing++; }
  return { players: on, playing, searching: { ffa: lobbies.ffa.length, t3: lobbies.t3.length, t2: lobbies.t2.length }, matches: [...rooms.values()].filter((r) => r.state === 'play').length };
}
async function stats(p) {
  const top = await dbAll('SELECT name, games, wins, team_wins, kills, best_share FROM W.players WHERE games > 0 ORDER BY wins + team_wins DESC, kills DESC LIMIT 10', []);
  const mine = await dbAll(`SELECT m.mode, m.ended, mp.place, mp.team_place, mp.share, mp.kills, mp.deaths FROM W.match_players mp JOIN W.matches m ON m.id = mp.match_id
     WHERE mp.player_id=$1 AND m.ended IS NOT NULL ORDER BY m.ended DESC LIMIT 8`, [p.id]);
  send(p, { t: 'stats', me: p.stats, name: p.name, top, recent: mine, online: onlineCounts() });
}

// =============================================================================================== WebSocket plumbing
function readFrames(c) {
  for (;;) {
    const b = c.buf;
    if (b.length < 2) return;
    let n = b[1] & 127, o = 2;
    if (n === 126) { if (b.length < 4) return; n = b.readUInt16BE(2); o = 4; }
    else if (n === 127) { if (b.length < 10) return; n = Number(b.readBigUInt64BE(2)); o = 10; }
    if (n > CFG.maxMsg) { c.s.destroy(); return; }
    const mk = b[1] & 128 ? 4 : 0;
    if (b.length < o + mk + n) return;
    const fin = b[0] & 128, op = b[0] & 15, data = Buffer.from(b.subarray(o + mk, o + mk + n));
    if (mk) for (let i = 0; i < n; i++) data[i] ^= b[o + (i & 3)];
    c.buf = b.subarray(o + mk + n);
    if (op === 8) { try { c.s.end(Buffer.from([136, 0])); } catch (e) {} return; }
    if (op === 9) { sendRaw(c, Buffer.concat([Buffer.from([138, data.length]), data.subarray(0, 125)])); continue; }
    if (op === 10) { c.lastIn = now(); continue; }
    if (op === 1 || op === 2) c.frag = [data];
    else if (op === 0 && c.frag) c.frag.push(data);
    else continue;
    if (!fin) { if (c.frag.reduce((a, x) => a + x.length, 0) > CFG.maxMsg) c.s.destroy(); continue; }
    const whole = c.frag.length === 1 ? c.frag[0] : Buffer.concat(c.frag);
    c.frag = null;
    // a few hundred messages a second at most (a host sends poses, its state and the land 20 to 30 times a second)
    const t = now();
    if (t - c.win > 1000) { c.win = t; c.cnt = 0; }
    if (++c.cnt > 600) continue;
    onMsg(c, whole.toString()).catch((e) => console.error('msg', e));
  }
}
function closed(c) {
  const p = c.p;
  if (!p || p.conn !== c) return;
  p.conn = null; p.offAt = now();
  if (p.session) { dbRun('UPDATE W.sessions SET ended=$2 WHERE id=$1', [p.session, now()]); p.session = null; }
  if (p.lobby) unqueue(p, 'disconnected');
  const room = p.room;
  if (room && room.state === 'play') seatGone(room, room.seats[p.slot], 'disconnected');
}

// =============================================================================================== HTTP
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.bin': 'application/octet-stream',
};
const FILES = new Map();
function fileEntry(f) {
  const st = fs.statSync(f);
  let e = FILES.get(f);
  if (!e || e.mt !== st.mtimeMs || e.size !== st.size) {
    const raw = fs.readFileSync(f);
    const text = /\.(html|js|json|css|svg|webmanifest)$/.test(f);
    e = { mt: st.mtimeMs, size: st.size, raw, gz: text ? zlib.gzipSync(raw, { level: 9 }) : null, etag: '"' + crypto.createHash('sha1').update(raw).digest('base64url').slice(0, 22) + '"' };
    FILES.set(f, e);
  }
  return e;
}
function json(res, code, o) {
  const b = Buffer.from(JSON.stringify(o));
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Length': b.length, 'Access-Control-Allow-Origin': '*' });
  res.end(b);
}
const srv = http.createServer((req, res) => {
  let u = '/';
  try { u = decodeURIComponent(req.url.split('?')[0]); } catch (e) {}
  if (u === '/healthz') return json(res, 200, { ok: 1, db: DB ? DB.kind : 'none', online: onlineCounts(), up: Math.round(process.uptime()) });
  if (u === '/api/online') return json(res, 200, onlineCounts());
  if (u === '/api/leaderboard') {
    dbAll('SELECT name, games, wins, team_wins, kills, deaths, best_share FROM W.players WHERE games > 0 ORDER BY wins + team_wins DESC, kills DESC LIMIT 25', [])
      .then((rows) => json(res, 200, rows));
    return;
  }
  if (u === '/api/recent') {
    (async () => {
      const ms = await dbAll('SELECT id, mode, started, ended, end_reason, humans, bots, played_s, host_changes, winner_name, winner_team FROM W.matches ORDER BY started DESC LIMIT 20', []);
      for (const m of ms) m.players = await dbAll('SELECT slot, kind, name, team, place, team_place, share, kills, deaths, left_early FROM W.match_players WHERE match_id=$1 ORDER BY slot', [m.id]);
      json(res, 200, ms);
    })().catch(() => json(res, 500, { err: 1 }));
    return;
  }
  if (u === '/' || u === '') u = '/index.html';
  const f = path.join(CFG.pub, path.normalize(u));
  if (!f.startsWith(CFG.pub + path.sep) || !MIME[path.extname(f).toLowerCase()]) { res.writeHead(404); return res.end('Not found'); }
  let e;
  try { if (!fs.statSync(f).isFile()) throw 0; e = fileEntry(f); } catch (x) { res.writeHead(404); return res.end('Not found'); }
  const h = { 'Content-Type': MIME[path.extname(f).toLowerCase()], 'ETag': e.etag, 'Vary': 'Accept-Encoding', 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': u === '/index.html' ? 'no-cache' : 'public, max-age=3600' };
  if (String(req.headers['if-none-match'] || '').includes(e.etag)) { res.writeHead(304, h); return res.end(); }
  if (e.gz && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) { h['Content-Encoding'] = 'gzip'; h['Content-Length'] = e.gz.length; res.writeHead(200, h); return res.end(req.method === 'HEAD' ? undefined : e.gz); }
  h['Content-Length'] = e.raw.length; res.writeHead(200, h); res.end(req.method === 'HEAD' ? undefined : e.raw);
});
srv.on('upgrade', (req, s, head) => {
  const k = req.headers['sec-websocket-key'];
  if (!k || !/^\/ws\b/.test(req.url || '')) { s.destroy(); return; }
  s.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' +
    crypto.createHash('sha1').update(k + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64') + '\r\n\r\n');
  s.setNoDelay(true); s.setKeepAlive(true, 20000);
  const c = { s, buf: head && head.length ? Buffer.from(head) : Buffer.alloc(0), p: null, frag: null, lastIn: now(), win: 0, cnt: 0 };
  s.on('data', (d) => { c.buf = c.buf.length ? Buffer.concat([c.buf, d]) : d; try { readFrames(c); } catch (e) { console.error(e); s.destroy(); } });
  s.on('close', () => closed(c));
  s.on('error', () => s.destroy());
  readFrames(c);
});

// =============================================================================================== the clock
setInterval(() => {
  const t = now();
  // searches: start the matches that are due, tell the searchers how long is left
  for (const mode of Object.keys(lobbies)) {
    const L = lobbies[mode];
    for (const x of L.slice()) if (!x.p.conn) unqueue(x.p, 'disconnected');
    if (L.length && t >= lobbyStart(mode)) startMatch(mode);
    else if (L.length) lobbyBroadcast(mode);
  }
  for (const room of rooms.values()) {
    if (room.state !== 'play') continue;
    // a host that has gone quiet (a phone that locked, a lost connection): another player takes over
    if (t > room.startAt && t - room.lastHost > CFG.hostSilent && room.seats.some((s) => live(s) && s.slot !== room.host)) {
      const h = room.seats[room.host];
      if (h) { h.gone = true; h.goneAt = t; roomSend(room, { t: 'gone', slot: h.slot, why: 'quiet' }); }
      pickHost(room, 'quiet');
    }
    // seats whose players did not come back: given up for good
    for (const s of room.seats) if (s.gone && t - s.goneAt > CFG.seatKeep * 1000) { s.gone = false; s.left = true; if (s.p && s.p.room === room) { s.p.room = null; s.p.slot = -1; } }
    // a match that ran far past its end without a result (no host left to report it)
    if (t > room.startAt + (room.length + 90) * 1000) endRoom(room, 'timeout');
  }
  // players gone for good
  for (const p of players.values()) if (!p.conn && p.offAt && t - p.offAt > 30 * 60 * 1000 && !p.room) { players.delete(p.id); byToken.delete(p.h); }
}, 1000);
// a dead connection is found by pinging it
setInterval(() => {
  const t = now();
  for (const p of players.values()) {
    const c = p.conn;
    if (!c) continue;
    if (t - c.lastIn > 45000) { try { c.s.destroy(); } catch (e) {} continue; }
    sendRaw(c, Buffer.from([137, 0]));
  }
}, 15000);
// a free Render service sleeps after 15 minutes without a request: while anyone is connected, it asks itself
if (SELF) setInterval(() => { if ([...players.values()].some((p) => p.conn)) fetch(SELF + '/healthz').catch(() => {}); }, 240000);
process.on('uncaughtException', (e) => console.error('uncaught', e));
process.on('unhandledRejection', (e) => console.error('unhandled', e));

Promise.race([initDB(), new Promise((r) => setTimeout(r, 10000))])
  .catch((e) => console.error(e.message))
  .then(() => srv.listen(CFG.port, () => log('Territory Control World online on http://localhost:' + CFG.port)));

module.exports = { CFG, MODES, teamOf };
