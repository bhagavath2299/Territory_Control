// Territory Control server v15: menu, lobbies, bot games, database, rewards, 7-day match replays. No required dependencies.
// Run: node server.js   (set DATABASE_URL to a Postgres database to keep stats permanently)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm'),zlib=require('zlib');
const PORT=+process.env.PORT||3000,CD=+process.env.CD||10,RCD=+process.env.RCD||3,MATCH=+process.env.MATCH||120,RES=+process.env.RES||20,FILL=+process.env.FILL_S||12,GW=101,GH=177;
const DIR=__dirname,SELF=process.env.RENDER_EXTERNAL_URL,PROTO=15;
// a phone whose connection backs up gets fresh snapshots instead of a growing queue of old ones (it is then resynced in one go)
const BACKLOG=+process.env.BACKLOG||24000;
// match replays are kept for a few days, then deleted (REPLAY_DAYS), with hard caps so the free database never fills up
const STEPS=1/30,REPLAY_DAYS=+process.env.REPLAY_DAYS||7,REPLAY_MAX=+process.env.REPLAY_MAX||4000,REPLAY_MB=+process.env.REPLAY_MB||250,REPLAY_BYTES=300000,PURGE_MS=+process.env.PURGE_MS||3600e3;
const SRC=fs.readFileSync(path.join(DIR,'index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\/\/@@client[\s\S]*?\/\/@@end/g,'');
const PRE='const Math=globalThis.Math,JSON=globalThis.JSON,Uint8Array=globalThis.Uint8Array,Int16Array=globalThis.Int16Array,Int32Array=globalThis.Int32Array,Float32Array=globalThis.Float32Array;';
const MT={'.html':'text/html; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json'};
const D=new Proxy(function(){},{get:(t,k)=>k==='clientWidth'?400:k==='clientHeight'?700:k===Symbol.toPrimitive?()=>0:D,apply:()=>D,set:()=>true});
const BOTN=['Blaze','Mira','Kabir','Nova','Zed'];
const CITIES={Hyderabad:'Telangana',Bengaluru:'Karnataka',Chennai:'Tamil Nadu',Mumbai:'Maharashtra',Delhi:'Delhi',Pune:'Maharashtra',Kolkata:'West Bengal',Ahmedabad:'Gujarat',Jaipur:'Rajasthan',Lucknow:'Uttar Pradesh',Kochi:'Kerala',Visakhapatnam:'Andhra Pradesh',Vijayawada:'Andhra Pradesh',Coimbatore:'Tamil Nadu',Indore:'Madhya Pradesh',Chandigarh:'Chandigarh',Surat:'Gujarat',Nagpur:'Maharashtra',Patna:'Bihar',Bhubaneswar:'Odisha',Guwahati:'Assam',Warangal:'Telangana',Mysuru:'Karnataka',Thiruvananthapuram:'Kerala'};
const TIERS=[[2200,'Legend'],[2000,'Grandmaster'],[1800,'Master'],[1600,'Diamond'],[1400,'Platinum'],[1200,'Gold'],[1000,'Silver'],[0,'Bronze']];
const ABIL=['boost','dash','shield','recall','ghost','trap','emp','grab'],ABIL_OPEN=process.env.ALL_ABILITIES?ABIL:['boost','dash','shield','recall'],SKINS={sport:1,muscle:1,f1:1},TRAILS={glow:1,neon:1,fire:1};
const okAb=v=>{const a=String(v||'').split(',');return a.length===2&&a[0]!==a[1]&&a.every(x=>ABIL_OPEN.includes(x))?a:['boost','dash']};

// ---------- match engine: the same game rules as the client, driven by real players and optional bots ----------
function mk(){const sb={document:{getElementById:()=>D,documentElement:D,addEventListener(){},hidden:false},addEventListener(){},getComputedStyle:()=>D,requestAnimationFrame(){},setTimeout(){},clearTimeout(){},setInterval(){},devicePixelRatio:1,navigator:{},CanvasRenderingContext2D:{prototype:{roundRect:1}},IN:[],AL:[],DT:0,TL:MATCH,SRV:true};
 vm.createContext(sb);vm.runInContext(PRE,sb);vm.runInContext(SRC,sb,{timeout:3000});return sb}

// ---------- database: Postgres when DATABASE_URL is set, otherwise a local SQLite file ----------
let DB=null;
const SCHEMA=[
 "CREATE TABLE IF NOT EXISTS replays(id TEXT PRIMARY KEY,created BIGINT,expires BIGINT,kind TEXT,humans INTEGER,size INTEGER,data TEXT)",
 "CREATE TABLE IF NOT EXISTS replay_players(replay_id TEXT,pid TEXT,name TEXT,slot INTEGER,place INTEGER,pct REAL,PRIMARY KEY(replay_id,pid))",
 "CREATE INDEX IF NOT EXISTS rp_pid ON replay_players(pid)",
 "CREATE INDEX IF NOT EXISTS rep_exp ON replays(expires)",
 "CREATE TABLE IF NOT EXISTS players(pid TEXT PRIMARY KEY,name TEXT,created BIGINT,seen BIGINT,games INTEGER DEFAULT 0,wins INTEGER DEFAULT 0,kills INTEGER DEFAULT 0,deaths INTEGER DEFAULT 0,best INTEGER DEFAULT 0,streak INTEGER DEFAULT 0,bstreak INTEGER DEFAULT 0,xp INTEGER DEFAULT 0,coins INTEGER DEFAULT 0,daily TEXT DEFAULT '',dstreak INTEGER DEFAULT 0,ach TEXT DEFAULT '')",
 "CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY,mode TEXT,room TEXT,started BIGINT,ended BIGINT,humans INTEGER,total INTEGER)",
 "CREATE TABLE IF NOT EXISTS match_players(match_id TEXT,pid TEXT,name TEXT,place INTEGER,pct REAL,kills INTEGER,deaths INTEGER,xp INTEGER,coins INTEGER,PRIMARY KEY(match_id,pid))",
 "CREATE INDEX IF NOT EXISTS mp_pid ON match_players(pid)",
 "CREATE TABLE IF NOT EXISTS city_points(season TEXT,city TEXT,pts INTEGER DEFAULT 0,PRIMARY KEY(season,city))"];
const ADDCOLS=["city TEXT DEFAULT ''","clock TEXT DEFAULT ''","rating INTEGER DEFAULT 800","rgames INTEGER DEFAULT 0","peak INTEGER DEFAULT 800","ab TEXT DEFAULT 'boost,dash'","skin TEXT DEFAULT 'sport'","trail TEXT DEFAULT 'glow'","dtop TEXT DEFAULT ''"];
async function initDB(){
 const url=process.env.DATABASE_URL;
 if(url){try{const {Pool}=require('pg');const pool=new Pool({connectionString:url,max:4,...(/sslmode=/.test(url)||/localhost|127\.0\.0\.1/.test(url)?{}:{ssl:{rejectUnauthorized:false}})});
   pool.on('error',e=>console.error('pg pool',e.message));await pool.query('select 1');
   DB={kind:'postgres',all:async(q,a)=>(await pool.query(q,a)).rows,run:async(q,a)=>{await pool.query(q,a)}}}
  catch(e){console.error('Postgres unavailable:',e.message)}}
 if(!DB){try{const {DatabaseSync}=require('node:sqlite');const f=new DatabaseSync(process.env.DB_FILE||path.join(__dirname,'data.db')),cv=q=>q.replace(/\$(\d+)/g,'?$1');
   DB={kind:'sqlite',all:async(q,a=[])=>f.prepare(cv(q)).all(...a),run:async(q,a=[])=>{f.prepare(cv(q)).run(...a)}}}
  catch(e){console.error('No database available, stats will not be saved:',e.message)}}
 if(DB){try{for(const q of SCHEMA)await DB.run(q,[]);for(const c of ADDCOLS){try{await DB.run('ALTER TABLE players ADD COLUMN '+c,[])}catch(e){}}}catch(e){console.error('Schema error:',e.message);DB=null}}
 console.log('Database:',DB?DB.kind:'none')}

// ---------- players, rewards ----------
const players=new Map(),rooms=new Map();
const clean=(s,n)=>String(s==null?'':s).replace(/[<>&"'`\\\u0000-\u001f]/g,'').trim().slice(0,n);
const lvl=xp=>1+Math.floor(Math.sqrt((xp||0)/100));
const today=()=>new Date().toISOString().slice(0,10),yest=()=>new Date(Date.now()-864e5).toISOString().slice(0,10),season=()=>today().slice(0,7);
const tier=r=>TIERS.find(t=>r>=t[0])[1];
function eloPair(a,b,sa){const ea=1/(1+Math.pow(10,(b.rating-a.rating)/400)),ka=a.rgames<10?40:24,kb=b.rgames<10?40:24;
 const da=Math.round(ka*(sa-ea)),db=Math.round(kb*((1-sa)-(1-ea)));
 a.rating=Math.max(0,a.rating+da);b.rating=Math.max(0,b.rating+db);a.rgames++;b.rgames++;a.peak=Math.max(a.peak,a.rating);b.peak=Math.max(b.peak,b.rating);return [da,db]}
function contrib(w,pts){const d=today();let top=String(w.dtop||'').startsWith(d+':')?w.dtop.slice(11).split(',').filter(Boolean).map(Number):[],delta=0;
 if(top.length<5){top.push(pts);delta=pts}else{const mi=top.indexOf(Math.min(...top));if(pts>top[mi]){delta=pts-top[mi];top[mi]=pts}}
 w.dtop=d+':'+top.join(',');return delta}
if(require.main!==module){module.exports={mk,CITIES,tier,eloPair,contrib,lvl};return}
const ACH=[['first',w=>w.wins>=1],['m10',w=>w.games>=10],['w10',w=>w.wins>=10],['k25',w=>w.kills>=25],['h50',w=>w.best>=50],['s3',w=>w.bstreak>=3]];
const blank=p=>({pid:p.pid,name:p.name,games:0,wins:0,kills:0,deaths:0,best:0,streak:0,bstreak:0,xp:0,coins:0,daily:'',dstreak:0,ach:'',city:'',clock:'',rating:800,rgames:0,peak:800,ab:'boost,dash',skin:'sport',trail:'glow',dtop:''});
function meMsg(p){const w=p.row||blank(p),xp=w.xp|0,lv=lvl(xp),lo=100*(lv-1)*(lv-1),hi=100*lv*lv,rt=w.rating|0;
 return {t:'me',name:p.name,lv,pr:Math.round((xp-lo)*100/(hi-lo)),xp,coins:w.coins|0,games:w.games|0,wins:w.wins|0,kills:w.kills|0,deaths:w.deaths|0,best:w.best|0,streak:w.streak|0,bstreak:w.bstreak|0,dst:w.dstreak|0,dok:w.daily!==today(),ach:String(w.ach||'').split(',').filter(Boolean),db:DB?DB.kind:'none',
  city:w.city||'',state:CITIES[w.city]||'',locked:!!w.city&&w.clock===season(),rating:rt,tier:tier(rt),rgames:w.rgames|0,peak:w.peak|0,ab:okAb(w.ab),abl:ABIL_OPEN,rdays:REPLAY_DAYS,skin:SKINS[w.skin]?w.skin:'sport',trail:TRAILS[w.trail]?w.trail:'glow'}}
async function loadRow(p){
 let r=null;
 if(DB)try{r=(await DB.all('SELECT * FROM players WHERE pid=$1',[p.pid]))[0];
  if(!r)await DB.run('INSERT INTO players(pid,name,created,seen) VALUES($1,$2,$3,$4)',[p.pid,p.name,Date.now(),Date.now()]);
  else await DB.run('UPDATE players SET name=$2,seen=$3 WHERE pid=$1',[p.pid,p.name,Date.now()])}
 catch(e){console.error('db load',e.message);r=null}
 p.row=Object.assign(blank(p),r||{},{name:p.name});
 for(const k of ['games','wins','kills','deaths','best','streak','bstreak','xp','coins','dstreak','rating','rgames','peak'])p.row[k]=Number(p.row[k])||0;
 send(p,meMsg(p))}
async function daily(p){const w=p.row;if(!w||w.daily===today())return send(p,meMsg(p));
 w.dstreak=w.daily===yest()?w.dstreak+1:1;const bonus=50+Math.min(w.dstreak,7)*10;w.coins+=bonus;w.daily=today();
 send(p,{t:'rew',daily:bonus,xp:0,coins:bonus,ach:[]});send(p,meMsg(p));
 if(DB)try{await DB.run('UPDATE players SET daily=$2,dstreak=$3,coins=$4 WHERE pid=$1',[p.pid,w.daily,w.dstreak,w.coins])}catch(e){console.error(e.message)}}
async function rename(p,nm){const n=clean(nm,12);if(!n||n===p.name)return;p.name=n;if(p.row)p.row.name=n;if(p.room&&p.room.st==='lobby')lobby(p.room);
 if(DB)try{await DB.run('UPDATE players SET name=$2 WHERE pid=$1',[p.pid,n])}catch(e){console.error(e.message)}}
async function stats(p){let recent=[],top=[];
 if(DB)try{recent=(await DB.all('SELECT m.ended AS ended,m.mode AS mode,m.total AS total,x.place AS place,x.pct AS pct,x.kills AS kills FROM match_players x JOIN matches m ON m.id=x.match_id WHERE x.pid=$1 ORDER BY m.ended DESC LIMIT 8',[p.pid])).map(r=>[Number(r.ended),r.mode,Number(r.place),Number(r.total),Number(r.pct),Number(r.kills)]);
  top=(await DB.all('SELECT name,xp,wins,games FROM players WHERE games>0 ORDER BY xp DESC LIMIT 10',[])).map(r=>[r.name,lvl(Number(r.xp)),Number(r.wins),Number(r.games)])}
 catch(e){console.error(e.message)}
 send(p,{t:'stats',recent,top})}
const save=p=>{const w=p.row;return DB.run('UPDATE players SET name=$2,seen=$3,games=$4,wins=$5,kills=$6,deaths=$7,best=$8,streak=$9,bstreak=$10,xp=$11,coins=$12,ach=$13,rating=$14,rgames=$15,peak=$16,clock=$17,dtop=$18 WHERE pid=$1',[p.pid,p.name,Date.now(),w.games,w.wins,w.kills,w.deaths,w.best,w.streak,w.bstreak,w.xp,w.coins,w.ach,w.rating,w.rgames,w.peak,w.clock,w.dtop])};
async function settle(r){
 const res=JSON.parse(vm.runInContext('RESU()',r.sb)),N=res.N||GW*GH,S=season();
 const slots=r.mode==='bots'?[1,2,3,4,5]:Array.from({length:r.h0},(_,i)=>i+1);
 const order=slots.slice().sort((a,b)=>res.cn[b]-res.cn[a]),mult=r.mode==='bots'?.5:1,out=[],hum=r.cl.filter(x=>x.slot&&x.row),rd={};
 let duo=[];
 if(r.kind==='ranked'&&r.mode==='pvp'){duo=[...hum];if(r.forf&&r.forf.row&&!duo.includes(r.forf))duo.push(r.forf);
  if(duo.length===2){const [a,b]=duo,ca=res.cn[a.slot]||0,cb=r.forf===b?0:(res.cn[b.slot]||0);
   const sa=r.forf===b?1:r.forf===a?0:(ca===cb?.5:ca>cb?1:0);const [da,db]=eloPair(a.row,b.row,sa);rd[a.pid]=da;rd[b.pid]=db}}
 for(const p of hum){const i=p.slot,w=p.row,place=order.indexOf(i)+1,k=res.k[i],d=res.d[i],pct=Math.round(res.cn[i]*1000/N)/10;
  const xp=Math.round((20+pct*1.5+k*10+(place===1?60:place===2?25:0))*mult);let coins=Math.round((10+k*5+(place===1?50:0))*mult);
  const lv0=lvl(w.xp);w.games++;w.kills+=k;w.deaths+=d;w.best=Math.max(w.best,Math.round(pct));
  if(r.mode==='pvp'){if(place===1){w.wins++;w.streak++;w.bstreak=Math.max(w.bstreak,w.streak)}else w.streak=0}
  w.xp+=xp;const have=new Set(String(w.ach||'').split(',').filter(Boolean)),fresh=[];
  for(const [id,f] of ACH)if(!have.has(id)&&f(w)){have.add(id);fresh.push(id);coins+=100}
  w.coins+=coins;w.ach=[...have].join(',');
  let cpts=0;if((r.kind==='quick'||r.kind==='ranked')&&r.mode==='pvp'&&r.h0>=2&&w.city){cpts=contrib(w,Math.round(pct*10)+k*25+(place===1?100:0));w.clock=S}
  out.push({p,place,k,d,pct,xp,coins,cpts});
  send(p,{t:'rew',xp,coins,place,total:slots.length,lv0,lv1:lvl(w.xp),ach:fresh,rd:rd[p.pid]||0,rating:w.rating,tier:tier(w.rating),cpts,city:w.city});send(p,meMsg(p))}
 if(!DB)return;
 try{const id=crypto.randomBytes(6).toString('hex');
  await DB.run('INSERT INTO matches(id,mode,room,started,ended,humans,total) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,r.kind,r.code,r.t0,Date.now(),r.h0,slots.length]);
  for(const o of out){
   await DB.run('INSERT INTO match_players(match_id,pid,name,place,pct,kills,deaths,xp,coins) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,o.p.pid,o.p.name,o.place,o.pct,o.k,o.d,o.xp,o.coins]);
   if(o.cpts>0)await DB.run('INSERT INTO city_points(season,city,pts) VALUES($1,$2,$3) ON CONFLICT(season,city) DO UPDATE SET pts=city_points.pts+EXCLUDED.pts',[S,o.p.row.city,o.cpts])}
  for(const p of [...out.map(o=>o.p),...duo.filter(x=>!out.some(o=>o.p===x))])await save(p)}
 catch(e){console.error('db save',e.message)}}
async function setField(p,col,val){p.row[col]=val;if(DB)try{await DB.run('UPDATE players SET '+col+'=$2 WHERE pid=$1',[p.pid,val])}catch(e){console.error(e.message)}}
async function setCity(p,city){const w=p.row;if(!w)return;
 if(city&&!CITIES[city])return send(p,{t:'err',msg:'Unknown city.'});
 if(w.city&&city!==w.city&&w.clock===season())return send(p,{t:'err',msg:'Your city is locked for this season. You can change it next month.'});
 await setField(p,'city',city);send(p,meMsg(p))}
async function setAb(p,a){if(!p.row)return;a=Array.isArray(a)?a.map(String).slice(0,2):[];if(a.length!==2||a[0]===a[1]||!a.every(x=>ABIL_OPEN.includes(x)))return;await setField(p,'ab',a.join(','));send(p,meMsg(p))}
async function setCos(p,col,v,tab){const w=p.row;if(!w||!tab[v]||lvl(w.xp)<tab[v])return;await setField(p,col,v);send(p,meMsg(p))}
async function war(p){const w=p.row||blank(p),S=season();let cities=[],states=[],top=[];const my={india:0,state:0,city:0};
 if(DB)try{
  const rows=await DB.all('SELECT city,pts FROM city_points WHERE season=$1 ORDER BY pts DESC',[S]);
  cities=rows.slice(0,10).map(r=>[r.city,CITIES[r.city]||'',Number(r.pts)]);
  const st={};for(const r of rows){const s=CITIES[r.city];if(s)st[s]=(st[s]||0)+Number(r.pts)}
  states=Object.entries(st).sort((a,b)=>b[1]-a[1]).slice(0,8);
  top=(await DB.all('SELECT name,rating,city FROM players WHERE rgames>0 ORDER BY rating DESC LIMIT 10',[])).map(r=>[r.name,Number(r.rating),r.city||'']);
  if(w.rgames>0){
   my.india=1+Number((await DB.all('SELECT COUNT(*) AS c FROM players WHERE rgames>0 AND rating>$1',[w.rating]))[0].c);
   if(w.city){my.city=1+Number((await DB.all('SELECT COUNT(*) AS c FROM players WHERE rgames>0 AND city=$1 AND rating>$2',[w.city,w.rating]))[0].c);
    const cs=Object.keys(CITIES).filter(c=>CITIES[c]===CITIES[w.city]);
    my.state=1+Number((await DB.all('SELECT COUNT(*) AS c FROM players WHERE rgames>0 AND rating>$1 AND city IN ('+cs.map((_,i)=>'$'+(i+2)).join(',')+')',[w.rating,...cs]))[0].c)}}
 }catch(e){console.error(e.message)}
 send(p,{t:'war',season:S,cities,states,top,my})}

// ---------- replays: the seed, the roster and every input of a match. Played back by the same engine, so they are tiny. ----------
async function saveReplay(r){
 const e=r.eng;if(!e||!DB||!r.hum||!r.hum.length)return;
 try{const now=Date.now(),exp=now+REPLAY_DAYS*864e5,id=crypto.randomBytes(9).toString('base64url');
  const rec={v:e.v,id,seed:e.seed,h:e.h,bots:e.bots,tl:e.tl,al:e.al,names:r.names,cos:r.cos,kind:r.kind,mode:r.mode,t0:r.t0,t1:now,exp,ops:e.ops,chk:e.chk,ticks:e.ticks,fin:e.fin,hum:r.hum.map(h=>[h.slot,h.name])};
  const gz=zlib.gzipSync(Buffer.from(JSON.stringify(rec)),{level:9});
  if(gz.length>REPLAY_BYTES){console.error('replay too large, not saved',gz.length);return}
  const N=e.fin.N||GW*GH,slots=r.mode==='bots'?[1,2,3,4,5]:Array.from({length:r.h0},(_,i)=>i+1),order=slots.slice().sort((a,b)=>e.fin.cn[b]-e.fin.cn[a]);
  await DB.run('INSERT INTO replays(id,created,expires,kind,humans,size,data) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,now,exp,r.kind,r.hum.length,gz.length,gz.toString('base64')]);
  for(const h of r.hum)await DB.run('INSERT INTO replay_players(replay_id,pid,name,slot,place,pct) VALUES($1,$2,$3,$4,$5,$6)',[id,h.pid,h.name,h.slot,order.indexOf(h.slot)+1,Math.round(e.fin.cn[h.slot]*1000/N)/10]);
  for(const h of r.hum){const p=players.get(h.pid);if(p)send(p,{t:'rep',id,exp,days:REPLAY_DAYS,slot:h.slot})}
 }catch(err){console.error('replay save',err.message)}}
async function listReplays(p){let list=[];
 if(DB)try{list=(await DB.all('SELECT r.id AS id,r.created AS created,r.expires AS expires,r.kind AS kind,x.place AS place,x.pct AS pct,x.slot AS slot,r.humans AS humans FROM replay_players x JOIN replays r ON r.id=x.replay_id WHERE x.pid=$1 AND r.expires>$2 ORDER BY r.created DESC LIMIT 12',[p.pid,Date.now()])).map(r=>[r.id,Number(r.created),Number(r.expires),r.kind,Number(r.place),Number(r.pct),Number(r.slot),Number(r.humans)])}catch(e){console.error(e.message)}
 send(p,{t:'replays',days:REPLAY_DAYS,list})}
async function purgeReplays(){if(!DB)return;
 try{const now=Date.now();
  await DB.run('DELETE FROM replay_players WHERE replay_id IN (SELECT id FROM replays WHERE expires<$1)',[now]);await DB.run('DELETE FROM replays WHERE expires<$1',[now]);
  const t=(await DB.all('SELECT COUNT(*) AS c,COALESCE(SUM(size),0) AS b FROM replays',[]))[0];let over=Number(t.c)-REPLAY_MAX,bytes=Number(t.b)-REPLAY_MB*1048576;
  if(over>0||bytes>0){const rows=await DB.all('SELECT id,size FROM replays ORDER BY created ASC LIMIT 500',[]);
   for(const w of rows){if(over<=0&&bytes<=0)break;await DB.run('DELETE FROM replay_players WHERE replay_id=$1',[w.id]);await DB.run('DELETE FROM replays WHERE id=$1',[w.id]);over--;bytes-=Number(w.size)}}}
 catch(e){console.error('replay purge',e.message)}}

// ---------- rooms and lobbies ----------
function send(p,o){const s=p.s;if(!s||s.destroyed)return;const b=Buffer.from(typeof o==='string'?o:JSON.stringify(o)),n=b.length;let h;
 if(n<126)h=Buffer.from([129,n]);else if(n<65536)h=Buffer.from([129,126,n>>8,n&255]);else{h=Buffer.alloc(10);h[0]=129;h[1]=127;h.writeBigUInt64BE(BigInt(n),2)}
 try{s.write(Buffer.concat([h,b]))}catch(e){}}
const fillLeft=r=>r.kind==='quick'&&r.pub&&r.st==='lobby'&&!r.played&&r.aloneAt?Math.max(0,Math.ceil(FILL-(Date.now()-r.aloneAt)/1000)):0;
// a lone player in the public quick queue is not left waiting: after FILL seconds the match starts with bots
function fillWatch(r,now){const alone=r.kind==='quick'&&r.pub&&r.st==='lobby'&&!r.played&&r.cl.filter(x=>x.s).length===1;if(!alone)r.aloneAt=0;else if(!r.aloneAt)r.aloneAt=now;return alone&&now-r.aloneAt>=FILL*1000}
const LM=(r,p)=>({t:'lobby',room:r.code,kind:r.kind,n:r.cl.filter(x=>x.s).length,cd:r.cd,fl:fillLeft(r),host:r.cl[0]===p&&r.kind!=='ranked',pub:r.pub,pl:r.cl.map(x=>[x.name,lvl(x.row?x.row.xp:0),x.s?1:0,x.row?x.row.rating:800])});
function lobby(r){for(const p of r.cl)send(p,LM(r,p))}
function codeGen(){const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';for(;;){let c='';for(let i=0;i<4;i++)c+=A[crypto.randomInt(A.length)];if(!rooms.has(c))return c}}
function mkRoom(code,pub,kind){kind=kind||'quick';const r={code,pub,kind,max:kind==='ranked'?2:5,st:'lobby',cl:[],cd:-1,sb:null,last:0,acc:0,tk:0,until:0,names:[],cos:[],mode:'pvp',h0:0,t0:0,created:Date.now(),forf:null,hum:[],eng:null,aloneAt:0};rooms.set(code,r);return r}
function sync(p){const r=p.room;
 if(r.st!=='play')return send(p,LM(r,p));
 if(p.slot){send(p,{t:'start',W:GW,H:GH,you:p.slot,names:r.names,cos:r.cos,kind:r.kind,seed:r.seed,v:PROTO});p.ack=null;sendSnap(p,fullMsg(r,p))}
 else send(p,{t:'wait',room:r.code,left:Math.ceil(vm.runInContext('tl',r.sb))})}
function joinRoom(p,r){
 if(r.cl.length>=r.max){send(p,{t:'full'});return}
 p.room=r;p.slot=0;r.cl.push(p);fillWatch(r,Date.now());
 if(r.st==='lobby')lobby(r);else sync(p)}
function quick(p){joinRoom(p,[...rooms.values()].find(x=>x.kind==='quick'&&x.pub&&x.cl.length<5&&x.st!=='play')||mkRoom(codeGen(),1,'quick'))}
function ranked(p){const rt=p.row?p.row.rating:800,now=Date.now();
 joinRoom(p,[...rooms.values()].find(x=>x.kind==='ranked'&&x.st==='lobby'&&x.cl.length===1&&Math.abs((x.cl[0].row?x.cl[0].row.rating:800)-rt)<=150+30*((now-x.created)/1000))||mkRoom(codeGen(),1,'ranked'))}
function leaveRoom(p){const r=p.room;if(!r)return;p.room=null;r.cl=r.cl.filter(x=>x!==p);
 if(r.st==='play'&&p.slot){if(r.kind==='ranked')r.forf=p;try{r.sb.DRP(p.slot)}catch(e){}p.slot=0;if(r.mode==='pvp'&&r.cl.filter(x=>x.slot).length<2)end(r);else if(!r.cl.some(x=>x.slot))end(r)}
 p.slot=0;
 if(!r.cl.length){if(rooms.get(r.code)===r)rooms.delete(r.code)}else if(r.st==='lobby')lobby(r)}
function start(r,bots){
 const act=r.cl.filter(p=>p.s).slice(0,5),h=act.length,sb=mk();
 sb.AL=[null,...act.map(p=>okAb(p.row&&p.row.ab))];
 const seed=crypto.randomInt(1,2e9);vm.runInContext('MPS('+h+','+(bots?1:0)+',undefined,'+seed+');recStart()',sb);r.seed=seed;
 r.sb=sb;r.st='play';r.played=1;r.last=performance.now();r.acc=0;r.eng=null;r.tk=0;r.t0=Date.now();r.mode=bots?'bots':'pvp';r.h0=h;r.forf=null;
 r.names=['',...act.map(p=>p.name)];r.hum=act.map((p,i)=>({pid:p.pid,name:p.name,slot:i+1}));
 const cs=(p,k,tab,d)=>{const v=p.row&&p.row[k];return tab[v]&&lvl(p.row.xp)>=tab[v]?v:d};
 r.cos=[null,...act.map(p=>[cs(p,'skin',SKINS,'sport'),cs(p,'trail',TRAILS,'glow')])];
 if(bots)for(let i=h+1;i<=5;i++){r.names.push('\u{1F916} '+BOTN[i-1]);r.cos.push([['muscle','f1','sport','muscle'][(i-2)%4],['glow','neon','fire','neon'][(i-2)%4]])}
 for(const p of r.cl)p.slot=0;
 act.forEach((p,i)=>{p.slot=i+1});
 for(const p of act){p.ack=null;p.resync=0;send(p,{t:'start',W:GW,H:GH,you:p.slot,names:r.names,cos:r.cos,kind:r.kind,seed:r.seed,v:PROTO})}
 broadcast(r)}
// One snapshot per 1/30 s step. Everyone gets the shared part; each player's own part and input acknowledgement are added on the end.
const ackTxt=(p,now)=>p.ack?p.ack.s+','+p.ack.c+','+(now-p.ack.t):'0,0,0';
const ownMsg=(sn,p,now)=>sn.s+',"m":'+(sn.m[p.slot]||'null')+',"a":['+ackTxt(p,now)+']}';
function fullMsg(r,p){const sn=vm.runInContext('SNAPF()',r.sb);return ownMsg(sn,p,Date.now())}
function sendSnap(p,msg){const s=p.s;if(!s||s.destroyed)return;if(s.writableLength>BACKLOG){p.resync=1;return}send(p,msg)}
function broadcast(r){const sn=vm.runInContext('SNAP()',r.sb),now=Date.now();
 for(const p of r.cl){if(!p.slot||!p.s)continue;
  if(p.resync){if(p.s.writableLength>BACKLOG/3)continue;p.resync=0;p.ack=p.ack||null;sendSnap(p,fullMsg(r,p));continue}
  sendSnap(p,ownMsg(sn,p,now))}}
function end(r){if(r.st!=='play')return;try{broadcast(r)}catch(e){}r.st='done';r.until=Date.now()+RES*1000;
 try{r.eng=JSON.parse(vm.runInContext('recEnd()',r.sb))}catch(e){console.error('record',e.message)}
 for(const p of r.cl)if(p.slot)send(p,{t:'end'});
 settle(r).catch(e=>console.error('settle',e.message)).then(()=>saveReplay(r))}

// ---------- messages ----------
function onMsg(conn,t){let m;try{m=JSON.parse(t)}catch(e){return}
 if(!m||typeof m!=='object')return;
 const now=Date.now();if(now-conn.t0>1000){conn.t0=now;conn.n=0}if(++conn.n>150)return;
 if(m.t==='hello'){const pid=clean(m.pid,64);if(!pid)return;
  if((+m.v||0)!==PROTO){const o=Buffer.from(JSON.stringify({t:'old',v:PROTO}));try{conn.s.write(Buffer.concat([Buffer.from([129,o.length]),o]))}catch(e){}return}
  let p=players.get(pid);if(!p){p={pid,name:'',s:null,room:null,slot:0,off:0,row:null};players.set(pid,p)}
  if(p.s&&p.s!==conn.s){try{p.s.destroy()}catch(e){}}
  p.s=conn.s;conn.p=p;p.off=0;p.name=clean(m.name,12)||p.name||'Player'+(100+crypto.randomInt(900));
  loadRow(p).then(()=>{const r=p.room;if(r&&rooms.get(r.code)===r){sync(p);if(r.st==='lobby')lobby(r)}}).catch(e=>console.error(e.message));return}
 const p=conn.p;if(!p||p.s!==conn.s)return;
 switch(m.t){
  case 'p':send(p,'{"t":"p","c":'+(Number(m.c)||0)+'}');break;
  case 'in':{const r=p.room;if(r&&r.st==='play'&&p.slot&&Number.isFinite(m.a)){
   try{r.sb.INP(p.slot,Math.round(Math.max(-7,Math.min(7,m.a))*50),m.b?1:0);if(m.u===1||m.u===2)r.sb.ABU(p.slot,m.u)}catch(e){}
   p.ack={s:(+m.s||0)>>>0,c:(+m.c||0)>>>0,t:now}}break}
  case 'quick':leaveRoom(p);quick(p);break;
  case 'ranked':leaveRoom(p);ranked(p);break;
  case 'create':leaveRoom(p);joinRoom(p,mkRoom(codeGen(),0,'private'));break;
  case 'join':{const c=clean(m.room,8).toUpperCase().replace(/[^A-Z0-9]/g,'');if(!c||(p.room&&p.room.code===c))break;
   let r=rooms.get(c);if(!r){if(m.make)r=mkRoom(c,0,'private');else{send(p,{t:'err',msg:'Room not found. Check the code and try again.'});break}}
   if(r.kind==='ranked'){send(p,{t:'err',msg:'Ranked matches are found through the Ranked button.'});break}
   leaveRoom(p);joinRoom(p,r);break}
  case 'leave':leaveRoom(p);send(p,meMsg(p));break;
  case 'bots':{leaveRoom(p);const r=mkRoom(codeGen(),0,'bots');joinRoom(p,r);start(r,1);break}
  case 'go':{const r=p.room;if(r&&r.st==='lobby'&&r.kind!=='ranked'&&r.cl[0]===p&&(m.bots||r.cl.filter(x=>x.s).length>1))start(r,m.bots?1:0);break}
  case 'use':{const r=p.room;if(r&&r.st==='play'&&p.slot){try{r.sb.ABU(p.slot,m.s===2?2:1)}catch(e){}}break}
  case 'pw':{const r=p.room,k=String(m.k||'');if(r&&r.st==='play'&&p.slot&&(k==='cannon'||k==='fort'||k==='strike')){try{r.sb.PWU(p.slot,k)}catch(e){}}break}
  case 'challenge':{leaveRoom(p);const r=mkRoom(codeGen(),0,'private');joinRoom(p,r);send(p,{t:'ch',room:r.code});break}
  case 'city':setCity(p,String(m.city||'')).catch(e=>console.error(e.message));break;
  case 'ab':setAb(p,m.a).catch(e=>console.error(e.message));break;
  case 'skin':setCos(p,'skin',String(m.v||''),SKINS).catch(e=>console.error(e.message));break;
  case 'trail':setCos(p,'trail',String(m.v||''),TRAILS).catch(e=>console.error(e.message));break;
  case 'war':war(p).catch(e=>console.error(e.message));break;
  case 'daily':daily(p).catch(e=>console.error(e.message));break;
  case 'name':rename(p,m.name).catch(e=>console.error(e.message));break;
  case 'stats':stats(p).catch(e=>console.error(e.message));break;
  case 'replays':listReplays(p).catch(e=>console.error(e.message));break;
 }}
function frame(c){const b=c.buf;if(b.length<2)return null;
 let n=b[1]&127,o=2;
 if(n===126){if(b.length<4)return null;n=b.readUInt16BE(2);o=4}
 else if(n===127){if(b.length<10)return null;n=Number(b.readBigUInt64BE(2));o=10}
 if(n>65536){c.s.destroy();return null}
 const mk=(b[1]&128)?4:0;if(b.length<o+mk+n)return null;
 const op=b[0]&15,p=Buffer.from(b.subarray(o+mk,o+mk+n));
 if(mk)for(let i=0;i<n;i++)p[i]^=b[o+(i&3)];
 c.buf=b.subarray(o+mk+n);
 if(op===8){try{c.s.end()}catch(e){}return ''}
 if(op===9){if(n<126)try{c.s.write(Buffer.concat([Buffer.from([138,n]),p]))}catch(e){}return ''}
 return op===1?p.toString():''}

// ---------- http + websocket plumbing ----------
const srv=http.createServer((q,r)=>{
 let u='/';try{u=decodeURIComponent(q.url.split('?')[0])}catch(e){}
 if(u==='/healthz'){r.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return r.end(JSON.stringify({ok:1,db:DB?DB.kind:'none',rooms:rooms.size,players:players.size,replayDays:REPLAY_DAYS}))}
 if(u.startsWith('/r/')){const id=u.slice(3),gone=()=>{r.writeHead(404,{'Content-Type':'application/json'});r.end('{"gone":1}')};
  if(!/^[A-Za-z0-9_-]{6,24}$/.test(id)||!DB)return gone();
  DB.all('SELECT data,expires FROM replays WHERE id=$1',[id]).then(rows=>{const w=rows[0];if(!w||Number(w.expires)<Date.now())return gone();
   const b=Buffer.from(w.data,'base64');r.writeHead(200,{'Content-Type':'application/json','Content-Encoding':'gzip','Content-Length':b.length,'Cache-Control':'private, max-age=600','X-Content-Type-Options':'nosniff'});r.end(b)}).catch(()=>{r.writeHead(500);r.end('{"err":1}')});return}
 if(u==='/')u='/index.html';
 const f=path.join(DIR,path.normalize(u));
 if(!f.startsWith(DIR+path.sep)||!MT[path.extname(f)]||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('Not found')}
 // text files are compressed once and kept; the browser revalidates with an ETag, so a repeat visit downloads nothing
 let e;try{e=fileEntry(f)}catch(x){r.writeHead(500);return r.end('Error')}
 const h={'Content-Type':MT[path.extname(f)],'Cache-Control':'no-cache','ETag':e.etag,'Vary':'Accept-Encoding','X-Content-Type-Options':'nosniff'};
 if(String(q.headers['if-none-match']||'').includes(e.etag)){r.writeHead(304,h);return r.end()}
 if(e.gz&&/\bgzip\b/.test(String(q.headers['accept-encoding']||''))){h['Content-Encoding']='gzip';h['Content-Length']=e.gz.length;r.writeHead(200,h);return r.end(e.gz)}
 h['Content-Length']=e.raw.length;r.writeHead(200,h);r.end(e.raw)});
const FILES=new Map();
function fileEntry(f){const s=fs.statSync(f);let e=FILES.get(f);
 if(!e||e.mt!==s.mtimeMs||e.size!==s.size){const raw=fs.readFileSync(f);
  e={mt:s.mtimeMs,size:s.size,raw,gz:/\.(html|js|json|webmanifest|svg|css)$/.test(f)?zlib.gzipSync(raw,{level:9}):null,etag:'W/"'+crypto.createHash('sha1').update(raw).digest('base64').slice(0,20)+'"'};FILES.set(f,e)}
 return e}
srv.on('upgrade',(q,s,head)=>{
 const k=q.headers['sec-websocket-key'];if(!k){s.destroy();return}
 s.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+crypto.createHash('sha1').update(k+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');
 s.setNoDelay(true);s.setKeepAlive(true,30000);
 const conn={s,buf:head&&head.length?Buffer.from(head):Buffer.alloc(0),p:null,t0:0,n:0};
 const pump=()=>{let m;while((m=frame(conn))!==null)if(m)onMsg(conn,m)};
 s.on('data',d=>{conn.buf=Buffer.concat([conn.buf,d]);try{pump()}catch(e){console.error(e)}});
 s.on('close',()=>{const p=conn.p;if(p&&p.s===s){p.s=null;p.off=Date.now()}});
 s.on('error',()=>s.destroy());
 pump()});
setInterval(()=>{const now=Date.now();
 for(const p of [...players.values()])if(p.off&&now-p.off>(p.room&&p.room.st==='play'&&p.slot?60000:20000)){leaveRoom(p);players.delete(p.pid)}
 for(const r of [...rooms.values()]){
  if(r.st==='done'){if(now>=r.until){if(r.kind==='ranked'){for(const p of r.cl){p.room=null;p.slot=0;send(p,meMsg(p))}rooms.delete(r.code);continue}r.st='lobby';r.sb=null;r.cd=-1;for(const p of r.cl)p.slot=0;lobby(r)}continue}
  if(r.st==='play'){const left=Math.ceil(vm.runInContext('tl',r.sb));for(const p of r.cl)if(p.s&&!p.slot)send(p,{t:'wait',room:r.code,left});continue}
  const n=r.cl.filter(p=>p.s).length;
  if(fillWatch(r,now)){r.aloneAt=0;try{start(r,1)}catch(e){console.error(e)}continue}
  if(n<2)r.cd=-1;else if(r.cd<0)r.cd=r.kind==='ranked'?RCD:n>=5?3:CD;else if(n>=5&&r.cd>3)r.cd=3;else if(--r.cd<=0){try{start(r,0)}catch(e){console.error(e);r.cd=-1}continue}
  lobby(r)}},1000);
// Every match advances in exact 1/30 s steps (never a variable time), so a recorded match can be replayed identically.
function stepRoom(r){vm.runInContext('STEPF()',r.sb,{timeout:500});r.tk++;broadcast(r);if(vm.runInContext('tl<=0',r.sb))end(r)}
// A short timer and a precise clock: a step starts within a few milliseconds of when it is due, so every player gets snapshots at an even 30 per second.
setInterval(()=>{const now=performance.now();
 for(const r of [...rooms.values()]){if(r.st!=='play')continue;
  try{r.acc=Math.min(.25,r.acc+(now-r.last)/1000);r.last=now;for(let n=0;n<8&&r.acc>=STEPS&&r.st==='play';n++){r.acc-=STEPS;stepRoom(r)}}
  catch(e){console.error('room error',e);end(r)}}},4);
if(SELF)setInterval(()=>{if(players.size)fetch(SELF+'/healthz').catch(()=>{})},240000);
process.on('uncaughtException',e=>console.error('uncaught',e));
Promise.race([initDB(),new Promise(r=>setTimeout(r,8000))]).catch(e=>console.error(e.message)).then(()=>{purgeReplays();setInterval(purgeReplays,PURGE_MS);srv.listen(PORT,()=>console.log('Territory Control on http://localhost:'+PORT))});
