// ---------- who you are, and the line to the server ----------
const BROWSER=typeof WebSocket!=='undefined'&&typeof location!=='undefined';
let pid='',myName='';
try{pid=localStorage.getItem('ct-pid')||'';if(!pid){pid=crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now();localStorage.setItem('ct-pid',pid)}myName=localStorage.getItem('ct-name')||''}catch(e){pid=pid||String(Math.random()).slice(2)+Date.now()}
const PROTO=15;
let ws,online=0,MAP=[0,1,2,3,4,5],rcode='',room0='',replay0='',SERVER='',lastMsg=0,tries=0,rcT=0,scr='',LB=null,ST2=null,NETSTAT='off',WARD=null,LASTPC=0,LASTREP=null,RPLIST=null,netT0=0;
let ME={name:'',lv:1,pr:0,coins:0,games:0,wins:0,kills:0,deaths:0,best:0,streak:0,bstreak:0,dst:0,dok:true,ach:[],db:'',city:'',state:'',locked:false,rating:800,tier:'Bronze',rgames:0,peak:800,ab:['boost','dash'],abl:['boost','dash','shield','recall'],rdays:7,skin:'sport',trail:'glow'};
let COS=[null,['sport','glow'],['muscle','neon'],['f1','fire'],['sport','neon'],['muscle','glow']];
// what you picked in the garage; kept on the phone too so it works offline
const LOAD={skin:'sport',trail:'glow',ab:['boost','dash'],dirty:0};
try{const o=JSON.parse(lsGet('ct-load','null'));if(o){if(CARS.includes(o.skin))LOAD.skin=o.skin;if(TRAILS.includes(o.trail))LOAD.trail=o.trail;if(Array.isArray(o.ab)&&o.ab.length===2&&o.ab[0]!==o.ab[1]&&o.ab.every(a=>OPEN_AB.includes(a)))LOAD.ab=o.ab}}catch(e){}
function saveLoad(){lsSet('ct-load',JSON.stringify({skin:LOAD.skin,trail:LOAD.trail,ab:LOAD.ab}))}
function resetCos(){COS=[null,[LOAD.skin,LOAD.trail],['muscle','neon'],['f1','fire'],['sport','neon'],['muscle','glow']]}
const tx=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
function httpBase(){if(SERVER==='none'||!BROWSER)return null;if(!SERVER)return location.origin;return SERVER.replace(/^ws/,'http').replace(/\/+$/,'')}
function wake(){try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}}
function setNet(s){NETSTAT=s;const e=document.getElementById('nst');if(e)e.innerHTML=netLine()}
function netLine(){return '<i class="dot '+(NETSTAT==='on'?'on':NETSTAT==='wake'?'wk':'off')+'"></i>'+(NETSTAT==='on'?'Online':NETSTAT==='wake'?'Waking the server...':SERVER==='none'?'Preview mode (offline)':'Offline')}
function conn(){
 if(SERVER==='none'){setNet('off');return}
 clearTimeout(rcT);if(!netT0)netT0=Date.now();
 try{if(ws){ws.onclose=ws.onmessage=ws.onopen=null;ws.close()}}catch(e){}
 try{const w=ws=new WebSocket(SERVER||((location.protocol==='https:'?'wss://':'ws://')+location.host));
  w.onopen=()=>{tries=0;lastMsg=Date.now();w.send(JSON.stringify({t:'hello',pid,name:myName.trim(),v:PROTO}))};
  w.onmessage=e=>{lastMsg=Date.now();try{net(JSON.parse(e.data))}catch(x){console.error(x)}};
  w.onclose=()=>{if(ws===w)lost()}}catch(e){lost()}}
function lost(){const was=online;online=0;setNet(Date.now()-netT0>3500?'wake':'off');if(was){$('rc').style.display='block';if(scr==='menu')menu()}clearTimeout(rcT);rcT=setTimeout(conn,Math.min(4000,400*(1<<Math.min(tries++,4))))}
setInterval(()=>{if(!ws||ws.readyState!==1)return;ws.send('{"t":"p","c":'+Math.round(now())+'}');if(Date.now()-lastMsg>9000){try{ws.onclose=null;ws.close()}catch(e){}lost()}},3000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;wake();if(SERVER!=='none'&&(!ws||ws.readyState!==1||Date.now()-lastMsg>6000)){tries=0;conn()}});
function unrle(r){let k=0;for(let i=0;i+1<r.length;i+=2){const n=r[i+1],v=MAP[r[i]]||0;own.fill(v,k,Math.min(own.length,k+n));if(OWNS)OWNS.fill(v,k,Math.min(own.length,k+n));k+=n}MDIRTY=true}
function net(m){
 $('rc').style.display='none';
 if(m.t==='me'){const first=!online;online=1;ME=m;setNet('on');
  if(LOAD.dirty){LOAD.dirty=0;tx({t:'skin',v:LOAD.skin});tx({t:'trail',v:LOAD.trail});tx({t:'ab',a:LOAD.ab})}
  else{if(CARS.includes(m.skin))LOAD.skin=m.skin;if(TRAILS.includes(m.trail))LOAD.trail=m.trail;if(m.ab&&m.ab.length===2)LOAD.ab=m.ab.slice();saveLoad()}
  if(m.name&&!myName){myName=m.name}
  if(first&&room0){const c=room0;room0='';try{history.replaceState(null,'',location.pathname)}catch(e){}tx({t:'join',room:c,make:1});waitUI()}
  else if(scr==='menu')menu();else if(scr==='rewards')rewardsUI();else if(scr==='stats')statsUI();else if(scr==='garage')garageUI(1)}
 else if(m.t==='p'){const d=now()-m.c;if(d>=0&&d<5000)NC.ping=NC.ping?NC.ping+(d-NC.ping)*.3:d}
 else if(m.t==='old'){online=0;setNet('off');try{ws.onclose=null;ws.close()}catch(e){}show('<div class="big-t">Update needed</div><p>A newer version of the game is available. Reload this page to get it.</p><button class="btn" data-a="reload">Reload</button>','old')}
 else if(m.t==='stats'){ST2=m;if(scr==='stats')statsUI()}
 else if(m.t==='war'){WARD=m;if(scr==='war')warUI()}
 else if(m.t==='ch'){rcode=m.room;shareChallenge()}
 else if(m.t==='replays'){RPLIST=m;if(scr==='replays')replaysUI()}
 else if(m.t==='rep'){LASTREP={id:m.id,exp:m.exp,days:m.days,slot:m.slot};if(scr==='result')resultReplay()}
 else if(m.t==='err'){show('<div class="big-t">Oops</div><p>'+esc(m.msg)+'</p><button class="btn ghost" data-a="menu">Back</button>','err')}
 else if(m.t==='full'){show('<div class="big-t">Room full</div><p>This room is full.</p><button class="btn ghost" data-a="menu">Back</button>','err')}
 else if(m.t==='rew'){const e=$('rw');if(scr==='result'&&e&&!m.daily)e.textContent='+'+m.xp+' XP, +'+m.coins+' coins'+(m.lv1>m.lv0?'. Level up! Level '+m.lv1:'')+(m.rd?'. Rating '+(m.rd>0?'+':'')+m.rd+' ('+m.tier+' '+m.rating+')':'')+(m.cpts?'. +'+m.cpts+' points for '+m.city:'')+(m.ach&&m.ach.length?'. Unlocked: '+m.ach.map(a=>ACHL[a]).join(', '):'')}
 else if(m.t==='lobby'){rcode=m.room;LB=m;if(!lobbyOK())return;lobbyUI()}
 else if(m.t==='wait'){rcode=m.room||rcode;if(!lobbyOK())return;show('<div class="big-t">Match in progress</div><p>You join the next round in about '+m.left+'s.</p><button class="btn ghost" data-a="leave">Leave room</button>','wait')}
 else if(m.t==='start'){
  if(RPL){RPL=null;FF=0;rpBar(null)}
  MP=1;VS=1;FF=0;QUIET=0;LASTREP=null;
  W=WW;H=WH;fit();genMap(m.seed||1);buildIsland();MINES.length=0;MNV=[];ZOWN=[];SHV=[];STV=[];SCORCH=[];RINGS=[];MYHOLD=0;PRV.fill(0);HOLDV.fill(0);own.fill(0);MDIRTY=true;P=[null];for(let i=1;i<=5;i++)P.push(newP(i));
  me=P[1];MAP=[0];let k=2;for(let s=1;s<=5;s++)MAP[s]=s===m.you?1:k++;
  NM=['','','','','',''];for(let s=1;s<=5;s++)NM[MAP[s]]=s===m.you?'You':(m.names[s]||'');
  COS=[null];for(let s=1;s<=5;s++)COS[MAP[s]]=(m.cos&&m.cos[s])||['sport','glow'];
  AB_=(ME.ab&&ME.ab.length===2)?ME.ab.slice():['boost','dash'];RDY=[1,1];setAbLabels();lastSec=99;ncReset(m.you);
  KIND=m.kind||'quick';DEATH='';CAM.vz=70;CAM.fy=.5;FX=[];PO=[];FD=[];score=kills=streak=0;en=1;boost=0;shake=0;state='play';scr='play';hideOv();snd('start');wake()}
 else if(m.t==='s'&&state==='play'){ncOnSnap(m)}
 else if(m.t==='end'&&state==='play'){tl=0;hud(1);finish()}}
