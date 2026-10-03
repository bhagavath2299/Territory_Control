// Cursor Territory online server v2. No dependencies. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const PORT=+process.env.PORT||3000,CD=+process.env.CD||10,MATCH=+process.env.MATCH||120,RES=+process.env.RES||12,GW=39,GH=69;
const DIR=__dirname,SELF=process.env.RENDER_EXTERNAL_URL;
const SRC=fs.readFileSync(path.join(DIR,'index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const MT={'.html':'text/html; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json'};
const D=new Proxy(function(){},{get:(t,k)=>k==='clientWidth'?400:k==='clientHeight'?700:k===Symbol.toPrimitive?()=>0:D,apply:()=>D,set:()=>true});
// Runs inside each match: the same game rules as the client, driven by real players.
const OV=`
LASTO='';
layout=function(){W=39;H=69};
MPS=function(n){newGame();state='play';tl=TL;
 for(let i=n+1;i<=5;i++){const p=P[i];for(let k=0;k<own.length;k++)if(own[k]===i)own[k]=0;p.alive=false;p.rt=1e9}
 for(let i=1;i<=n;i++)IN[i]={x:P[i].x,y:P[i].y,b:0,en:1}};
DROP=function(i){const p=P[i];for(let k=0;k<own.length;k++){if(own[k]===i)own[k]=0;if(tr[k]===i)tr[k]=0}p.alive=false;p.trail=[];p.rt=1e9;IN[i]=null};
upd=function(dt){tl-=dt;FX.length=0;PO.length=0;FD.length=0;
 for(let i=1;i<=5;i++){const p=P[i],t=IN[i];p.sh-=dt;
  if(!p.alive){if((p.rt-=dt)<=0){spawn(p);if(t){t.x=p.x;t.y=p.y}}continue}
  if(!t)continue;
  const b=t.b&&t.en>0;t.en=b?Math.max(0,t.en-dt*.5):Math.min(1,t.en+dt*.2);
  const dx=t.x-p.x,dy=t.y-p.y,d=Math.hypot(dx,dy);
  if(d>.2){const m=Math.min(11*(b?1.6:1)*dt,d),n=Math.ceil(m/.4);for(let k=0;k<n&&p.alive;k++)move(p,p.x+dx/d*m/n,p.y+dy/d*m/n)}}};
SNAP=function(f){const o=own.join('');const s=JSON.stringify({t:'s',tl:+tl.toFixed(1),p:P.slice(1).map((p,i)=>[+p.x.toFixed(2),+p.y.toFixed(2),p.alive?1:0,+Math.max(0,p.sh).toFixed(1),p.trail,IN[i+1]?+IN[i+1].en.toFixed(2):1]),o:(f||o!==LASTO)?o:undefined});if(!f)LASTO=o;return s};
`;
function mk(){const sb={document:{getElementById:()=>D,documentElement:D,addEventListener(){},hidden:false},addEventListener(){},getComputedStyle:()=>D,requestAnimationFrame(){},setTimeout(){},clearTimeout(){},setInterval(){},devicePixelRatio:1,navigator:{},CanvasRenderingContext2D:{prototype:{roundRect:1}},IN:[],DT:0,TL:MATCH};
 vm.createContext(sb);vm.runInContext(SRC,sb,{timeout:3000});vm.runInContext(OV,sb);return sb}

const players=new Map(),rooms=new Map();let pn=0;
const clean=(s,n)=>String(s==null?'':s).replace(/[<>&"'`\\\u0000-\u001f]/g,'').trim().slice(0,n);
function send(p,o){const s=p.s;if(!s||s.destroyed)return;const b=Buffer.from(typeof o==='string'?o:JSON.stringify(o)),n=b.length;let h;
 if(n<126)h=Buffer.from([129,n]);else if(n<65536)h=Buffer.from([129,126,n>>8,n&255]);else{h=Buffer.alloc(10);h[0]=129;h[1]=127;h.writeBigUInt64BE(BigInt(n),2)}
 try{s.write(Buffer.concat([h,b]))}catch(e){}}
const LM=r=>({t:'lobby',room:r.code,n:r.cl.filter(p=>p.s).length,cd:r.cd,pl:r.cl.map(p=>[p.name,p.w,p.g])});
function lobby(r){const m=LM(r);for(const p of r.cl)send(p,m)}
function mkRoom(code,pub){const r={code,pub,st:'lobby',cl:[],cd:-1,sb:null,last:0,tk:0,until:0,names:[]};rooms.set(code,r);return r}
function sync(p){const r=p.room;
 if(r.st!=='play')return send(p,LM(r));
 if(p.slot){send(p,{t:'start',W:GW,H:GH,you:p.slot,names:r.names});send(p,vm.runInContext('SNAP(1)',r.sb))}
 else send(p,{t:'wait',room:r.code,left:Math.ceil(vm.runInContext('tl',r.sb))})}
function snap(r){const m=vm.runInContext('SNAP()',r.sb);for(const p of r.cl)if(p.slot)send(p,m)}
function end(r){if(r.st!=='play')return;try{snap(r)}catch(e){}r.st='done';r.until=Date.now()+RES*1000;for(const p of r.cl)if(p.slot)send(p,{t:'end'})}
function leaveRoom(p){const r=p.room;if(!r)return;p.room=null;r.cl=r.cl.filter(x=>x!==p);
 if(r.st==='play'&&p.slot){try{vm.runInContext('DROP('+p.slot+')',r.sb)}catch(e){}p.slot=0;if(r.cl.filter(x=>x.slot).length<2)end(r)}
 p.slot=0;
 if(!r.cl.length){if(rooms.get(r.code)===r)rooms.delete(r.code)}else if(r.st==='lobby')lobby(r)}
function join(conn,m){
 const pid=clean(m.pid,64);if(!pid)return;
 let p=players.get(pid);
 if(!p){p={pid,name:'',g:0,w:0,s:null,room:null,slot:0,off:0};players.set(pid,p)}
 if(p.s&&p.s!==conn.s){try{p.s.destroy()}catch(e){}}
 p.s=conn.s;conn.p=p;p.off=0;
 p.name=clean(m.name,12)||p.name||'Player';
 if(m.st&&typeof m.st==='object'){p.g=Math.max(0,m.st.g|0);p.w=Math.max(0,m.st.w|0)}
 const code=clean(m.room,8).toUpperCase().replace(/[^A-Z0-9]/g,'');
 const cur=p.room&&rooms.get(p.room.code)===p.room?p.room:null;
 if(cur&&(!code||code===cur.code)){sync(p);if(cur.st==='lobby')lobby(cur);return}
 if(cur)leaveRoom(p);
 let r=code?rooms.get(code):[...rooms.values()].find(x=>x.pub&&x.cl.length<5&&x.st!=='play');
 if(!r)r=code?mkRoom(code,0):mkRoom('P'+(++pn),1);
 if(r.cl.length>=5){send(p,{t:'full'});return}
 p.room=r;p.slot=0;r.cl.push(p);
 if(r.st==='lobby')lobby(r);else sync(p)}
function start(r){
 const act=r.cl.filter(p=>p.s).slice(0,5),sb=mk();vm.runInContext('MPS('+act.length+')',sb);
 r.sb=sb;r.st='play';r.last=Date.now();r.tk=0;r.names=['',...act.map(p=>p.name)];
 for(const p of r.cl)p.slot=0;
 act.forEach((p,i)=>{p.slot=i+1});
 for(const p of act)send(p,{t:'start',W:GW,H:GH,you:p.slot,names:r.names});
 snap(r)}
function onMsg(conn,t){let m;try{m=JSON.parse(t)}catch(e){return}
 if(!m||typeof m!=='object')return;
 if(m.t==='join')return join(conn,m);
 const p=conn.p;if(!p||p.s!==conn.s)return;
 if(m.t==='p')send(p,'{"t":"p"}');
 else if(m.t==='st'){p.g=Math.max(0,m.g|0);p.w=Math.max(0,m.w|0)}
 else if(m.t==='x'){leaveRoom(p);players.delete(p.pid)}
 else if(m.t==='in'&&p.room&&p.room.st==='play'&&p.slot){const i=p.room.sb.IN[p.slot];
  if(i&&Number.isFinite(m.x)&&Number.isFinite(m.y)){i.x=Math.max(0,Math.min(GW,m.x));i.y=Math.max(0,Math.min(GH,m.y));i.b=m.b?1:0}}}
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

const srv=http.createServer((q,r)=>{
 let u='/';try{u=decodeURIComponent(q.url.split('?')[0])}catch(e){}
 if(u==='/healthz'){r.writeHead(200);return r.end('ok')}
 if(u==='/')u='/index.html';
 const f=path.join(DIR,path.normalize(u));
 if(!f.startsWith(DIR+path.sep)||!MT[path.extname(f)]||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('Not found')}
 r.writeHead(200,{'Content-Type':MT[path.extname(f)],'Cache-Control':'no-cache'});fs.createReadStream(f).pipe(r)});
srv.on('upgrade',(q,s,head)=>{
 const k=q.headers['sec-websocket-key'];if(!k){s.destroy();return}
 s.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+crypto.createHash('sha1').update(k+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');
 s.setNoDelay(true);s.setKeepAlive(true,30000);
 const conn={s,buf:head&&head.length?Buffer.from(head):Buffer.alloc(0),p:null};
 const pump=()=>{let m;while((m=frame(conn))!==null)if(m)onMsg(conn,m)};
 s.on('data',d=>{conn.buf=Buffer.concat([conn.buf,d]);try{pump()}catch(e){console.error(e)}});
 s.on('close',()=>{const p=conn.p;if(p&&p.s===s){p.s=null;p.off=Date.now()}});
 s.on('error',()=>s.destroy());
 pump()});
setInterval(()=>{const now=Date.now();
 for(const p of [...players.values()])if(p.off&&now-p.off>(p.room&&p.room.st==='play'&&p.slot?60000:20000)){leaveRoom(p);players.delete(p.pid)}
 for(const r of [...rooms.values()]){
  if(r.st==='done'){if(now>=r.until){r.st='lobby';r.sb=null;r.cd=-1;for(const p of r.cl)p.slot=0;lobby(r)}continue}
  if(r.st==='play'){const left=Math.ceil(vm.runInContext('tl',r.sb));for(const p of r.cl)if(p.s&&!p.slot)send(p,{t:'wait',room:r.code,left});continue}
  const n=r.cl.filter(p=>p.s).length;
  if(n<2)r.cd=-1;else if(r.cd<0)r.cd=n>=5?3:CD;else if(n>=5&&r.cd>3)r.cd=3;else if(--r.cd<=0){try{start(r)}catch(e){console.error(e);r.cd=-1}continue}
  lobby(r)}},1000);
setInterval(()=>{const now=Date.now();
 for(const r of [...rooms.values()]){if(r.st!=='play')continue;
  try{const dt=Math.min(.1,(now-r.last)/1000);r.last=now;r.sb.DT=dt;
   vm.runInContext('upd(DT)',r.sb,{timeout:500});
   if(++r.tk%8===0)vm.runInContext('hud()',r.sb,{timeout:500});
   if(r.tk%2===0)snap(r);
   if(vm.runInContext('tl<=0',r.sb))end(r)}catch(e){console.error('room error',e);end(r)}}},33);
if(SELF)setInterval(()=>{if(players.size)fetch(SELF+'/healthz').catch(()=>{})},240000);
process.on('uncaughtException',e=>console.error('uncaught',e));
srv.listen(PORT,()=>console.log('Cursor Territory on http://localhost:'+PORT));
