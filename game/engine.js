if(!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h){this.rect(x,y,w,h)};
document.addEventListener('gesturestart',e=>e.preventDefault());
const $=id=>document.getElementById(id),cv=$('cv'),ctx=cv.getContext('2d');
const IS_SRV=typeof SRV!=='undefined',VER='16';
const GOAL=35,COLS=['','#2f6bff','#ff4d5e','#1fbf75','#ffb020','#9b5cff'],DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
// speed and handling. The turning circle stays tight (SPD/TURN = 1.6 units) while the cars are now very quick.
const WW=101,WH=177,MC=3,MW=WW*MC,MH=WH*MC,HR=.9,SPD=26,TURN=16.25,TSP=.7,SPRM=1.4,SPRD=.45,SPRR=.22,NITM=1.15,SLWM=.55;
// ---------- classes ----------
// Every car is one of four classes. spd / trn: how quick and how sharp it is. ab: the three abilities. Number 1 and 2 recharge by themselves; number 3 is the
// ultimate: it charges while you play (time, land you capture, rivals you take out) and is ready at 100.
// mk: a movement ability (see MVK). ut: how long the ultimate lasts (0 = a one-off). off: switched off (the dash-type moves are gone; Boost is the one movement power). All of it is shared by the server and the phones, so every device agrees.
const MVK=[null,{t:.24,m:2.3,r:.45,rad:1.7,w:'blade'},{t:.4,m:1.85,r:.35,rad:1.9,w:'ram'}];
const CLS=[
 {id:'striker',n:'Striker',role:'Assassin',spd:1.06,trn:1.12,um:1.12,col:'#ff4d5e',st:[5,2,4,3],
  d:'Quick and fragile. Boost past rivals who are out in the open and cut their trails from a distance.',
  ab:[{id:'blade',n:'Blade Dash',cd:5,mk:1,off:1,d:'Lunge forward. Any rival caught outside their land is slashed.'},
      {id:'fan',n:'Shuriken Fan',cd:7.8,d:'Throw three spinning blades. They cut trails and slice exposed rivals.'},
      {id:'storm',n:'Bladestorm',ut:3.2,d:'A ring of blades whirls around you and cuts down everything outside its own land.'}]},
 {id:'titan',n:'Titan',role:'Tank',spd:.92,trn:.88,um:1,col:'#ffb020',st:[2,5,3,4],
  d:'Slow and heavy with regenerating armour. Shake rivals off and break their land.',
  ab:[{id:'ram',n:'Ram',cd:7,mk:2,off:1,d:'An armoured charge. Rivals outside their land are crushed.'},
      {id:'shock',n:'Shockwave',cd:10.5,d:'A burst that slows nearby rivals, tears up their land and crushes anyone close who is off their own land.'},
      {id:'fort',n:'Fortress',ut:4,d:'For 4 seconds nothing can kill you. Pulses wreck land and slow rivals around you.'}]},
 {id:'gunner',n:'Gunner',role:'Artillery',spd:.97,trn:1,um:1,col:'#2f6bff',st:[3,2,5,4],
  d:'Long range. Shells fly far and fast, mortars land where you point and the ultimate rains on the leader.',
  ab:[{id:'cannon',n:'Cannon',cd:3.8,d:'A fast shell. Hits exposed rivals, trails and enemy land.'},
      {id:'mortar',n:'Mortar Barrage',cd:9.5,d:'Three shells land one after another in front of you.'},
      {id:'orbital',n:'Orbital Strike',ut:0,d:'A barrage from orbit on the player with the most land.'}]},
 {id:'sapper',n:'Sapper',role:'Trapper',spd:1.03,trn:1.06,um:1,col:'#1fbf75',st:[4,3,3,5],
  d:'Sets traps and hunts with a homing drone. Deadly to anyone who follows you.',
  ab:[{id:'mine',n:'Mines',cd:3.8,d:'Drop a mine behind you. Rivals outside their land trigger it.'},
      {id:'drone',n:'Hunter Drone',cd:9,d:'Launch a missile that homes in on the nearest exposed rival.'},
      {id:'field',n:'Minefield',ut:0,d:'A ring of mines around you and a pulse that slows nearby rivals.'}]}];
// numbers that decide how strong the abilities are (tuned by playing many bot matches against each other)
const BAL={ucs:1,ucLand:1.2,ucKill:22,shellV:52,shellR:20,bladeV:44,bladeR:13,missV:30,missT:3.6,missTurn:5,stormR:3.0,shockR:6.6,shockBlast:3.4,shockKill:2.6,fortR:2.6,fortPulse:1.25,plateRegen:22,
 mortarR:2.3,orbitalR:3.2,mineMax:4,fieldN:8,fieldR:3.4,strikeR:2.6};
// MP: 1 while an online match is shown (the server decides). VS: the player whose view this is (1 in play, any slot in a replay). FF: 1 while a replay is being fast-forwarded (no sound or effects).
let MP=0,VS=1,FF=0,PAUSED=0;
let FX=[],PO=[],shake=0,score=0,kills=0,streak=0,streakT=0,en=1,boost=0,tl=120,CN=[0,0,0,0,0,0],FD=[],NM=['','You','Blaze','Mira','Kabir','Nova'],W=WW,H=WH,cs=10,dpr=1,own=new Uint8Array(MW*MH),P=[null],me=null,state='menu',T={},ptr={type:(()=>{try{return matchMedia('(pointer:coarse)').matches?'touch':'mouse'}catch(e){return'mouse'}})(),x:0,y:0,px:0,py:0,ax:0,ay:0,down:0,id:null},tg={x:0,y:0,a:0},last=0,hudT=0,fr=0,best=0,MDIRTY=true,clk=0;
let CAM={x:WW/2,y:WH/2,z:15,vz:26,oy:0},vw=400,vh=700,MINI=null,PREV=null,FLASH=null,RINGS=[],MNV=[],SCORCH=[],ZMY=[],ZOWN=[],SHV=[],STV=[],BLV=[],MSV=[],MYHOLD=0,MYPW=[0,0,0],DOCKV='',DOCKS='';const SHP=4,PRV=[0,0,0,0,0,0],HOLDV=[0,0,0,0,0,0];

// ---------- settings and picture quality (saved on the phone) ----------
const SET={music:1,sfx:1,vib:1,q:'auto',mvol:.8,svol:.9,fps:0};
// post: HDR picture, glow and finishing pass. msaa: edge smoothing samples. shadow: shadow map size (0 = off). pr: highest pixel ratio. fx: how many sparks and smoke puffs. tex: size of the ground textures.
// mesh: spacing of the ground mesh in map units (the lighting comes from a baked picture, so a coarser mesh mostly changes the outline of the cliffs).
// Phones start on med (no glow pass, cheaper shadows); weak phones start on low. Auto then moves between tiers only between matches.
const QLV={high:{fx:1,post:1,glow:1,msaa:4,shadow:2048,pr:2.25,hi:1,tex:1024,mesh:.5},
 med:{fx:.7,post:1,glow:0,msaa:0,shadow:1024,pr:1.6,hi:1,tex:512,mesh:.5},
 low:{fx:.4,post:0,glow:0,msaa:0,shadow:0,pr:1.1,hi:0,tex:512,mesh:1}};
const PHONE=(()=>{try{return matchMedia('(pointer:coarse)').matches&&Math.max(screen.width,screen.height)<1100}catch(e){return false}})();
let QL=QLV.high,QNAME='high';
function lsGet(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function setQuality(n){QNAME=QLV[n]?n:'high';QL=QLV[QNAME]}
try{best=+localStorage.getItem('ct-best')||0}catch(e){}

// gameplay random numbers: seeded by the engine (GR). rnd() is for the match only.
const rnd=n=>GR()*n|0;
// sound and haptics: the audio engine (client only) is created on the first tap
let AUD=null;
function au(){if(AUD)AUD.wake();else if(typeof audInit==='function')audInit()}
function sfx(f,d,ty,v,f2){if(AUD&&!FF&&!QUIET)AUD.tone(f,d,ty,v,f2)}
function snd(n,a,b){if(AUD&&!FF&&!QUIET)AUD.sfx(n,a,b)}
function buzz(n){if(SET.vib&&!FF&&!QUIET)try{navigator.vibrate&&navigator.vibrate(n)}catch(e){}}
// kinds of sparks (k): 0 dot, 1 glowing streak, 2 smoke, 3 tumbling chip, 4 ember. h / vh: height above the ground and how fast it rises. Phones on high quality get the full mix.
function burst(x,y,c,n,s,h0){if(FF||IS_SRV)return;n=Math.ceil(n*QL.fx);const hi=QL.hi;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=(.3+Math.random())*(s||8),l=.5+Math.random()*.6;let k=0;if(hi){const r=Math.random();k=r<.34?1:r<.5?3:r<.62?2:0}
 FX.push({x,y,h:(h0||.4)+Math.random()*.3,vh:(Math.random()*.6+.1)*(s||8)*.55,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l,l0:l,c,k,s:k===3?.1+Math.random()*.12:k===2?.35+Math.random()*.3:undefined,r:Math.random()*6.28,vr:(Math.random()-.5)*14})}}
function pop(x,y,t,c,l){if(FF||state==='menu')return;const n=PO.filter(q=>q.l>.5&&Math.abs(q.x-x)<6&&Math.abs(q.y-y)<6).length;PO.push({x,y:y-n*1.7,t,c,l:l||1.1,l0:l||1.1})}
function credit(p){if(state!=='play')return;kills++;streak=streakT>0?streak+1:1;streakT=4;score+=500*streak;
 pop(p.x,p.y,streak>1?['','','Double kill','Triple kill','Rampage'][Math.min(streak,4)]:'Eliminated',COLS[VS]);snd('kill');buzz(40)}
function setBoost(v){if(v&&!boost&&en>.05)snd('boost');boost=v}
function theme(){const s=getComputedStyle(document.documentElement);T.board=s.getPropertyValue('--board').trim();T.grid=s.getPropertyValue('--grid').trim()}
// ---------- match engine: free movement at any angle, territory on a fine mask, trails as polylines, four classes with attack abilities ----------
var IN=[],CLSI=[],BOTS=false,HN=0,KL=[0,0,0,0,0,0],DE=[0,0,0,0,0,0],EV=[];
if(typeof TL==='undefined')var TL=120;
const gx=x=>Math.min(MW-1,Math.max(0,x*MC|0)),gy=y=>Math.min(MH-1,Math.max(0,y*MC|0));
const ownAt=(x,y)=>own[gy(y)*MW+gx(x)];
const rr=(a,b)=>a+GR()*(b-a);
function angd(a,b){let d=b-a;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;return d}
function newP(i){return{id:i,alive:false,sh:0,x:0,y:0,a:0,da:0,tr:[],sent:0,rs:0,out:false,lx:0,ly:0,rt:0,hx:0,hy:0,plan:null,ht:0,hunt:null,rx:0,ry:0,ra:0,st:0,mr:0,mw:''}}
function stamp(x,y,r,id,pr){const cx=x*MC,cy=y*MC,rc=r*MC,r2=rc*rc;
 for(let Y=Math.max(0,Math.floor(cy-rc));Y<=Math.min(MH-1,Math.ceil(cy+rc));Y++)for(let X=Math.max(0,Math.floor(cx-rc));X<=Math.min(MW-1,Math.ceil(cx+rc));X++){const dx=X+.5-cx,dy=Y+.5-cy;if(dx*dx+dy*dy<=r2&&ISL[Y*MW+X]){const i=Y*MW+X,v=own[i];if(!(pr&&v&&v!==id&&PROT[v]>0))own[i]=id}}}
const FL=new Uint8Array(MW*MH),STK=new Int32Array(MW*MH);
let ISL=new Uint8Array(MW*MH).fill(1),LANDN=MW*MH,LANDI=null,SEED=1,MCX=WW/2,MCY=WH/2,MINES=[],SLOW=[0,0,0,0,0,0];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// ---------- deterministic helpers: the same numbers on every device, so a recorded match replays exactly ----------
// The match uses its own seeded random numbers (GR) and arithmetic-only trig (dsin, dcos, dat2, dhyp). Browsers differ in the
// last digits of Math.sin, Math.cos, Math.atan2 and Math.hypot; those tiny differences could otherwise split a replay from the real match.
const STEP=1/30,EVER=18,CAPT=[];let GRS=1,TK=0,REC=null;
function GR(){GRS=GRS+0x6D2B79F5|0;let t=Math.imul(GRS^GRS>>>15,1|GRS);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
function ksin(r){const z=r*r;return r*(1+z*(-1/6+z*(1/120+z*(-1/5040+z*(1/362880+z*(-1/39916800+z*(1/6227020800+z*(-1/1307674368000))))))))}
function kcos(r){const z=r*r;return 1+z*(-1/2+z*(1/24+z*(-1/720+z*(1/40320+z*(-1/3628800+z*(1/479001600+z*(-1/87178291200+z*(1/20922789888000))))))))}
function dsin(x){const n=Math.round(x*0.6366197723675814),r=(x-n*1.5707963267341256)-n*6.077100506506192e-11,q=n&3;return q===0?ksin(r):q===1?kcos(r):q===2?-ksin(r):-kcos(r)}
function dcos(x){const n=Math.round(x*0.6366197723675814),r=(x-n*1.5707963267341256)-n*6.077100506506192e-11,q=n&3;return q===0?kcos(r):q===1?-ksin(r):q===2?-kcos(r):ksin(r)}
const ATC=[1,-1/3,1/5,-1/7,1/9,-1/11,1/13,-1/15,1/17,-1/19,1/21,-1/23,1/25];
function datn(t){let u=t/(1+Math.sqrt(1+t*t));u=u/(1+Math.sqrt(1+u*u));const z=u*u;let s=0;for(let i=12;i>=0;i--)s=s*z+ATC[i];return 4*u*s}
function dat2(y,x){const ax=x<0?-x:x,ay=y<0?-y:y;if(ax===0&&ay===0)return 0;let a=ay<=ax?datn(ay/ax):1.5707963267948966-datn(ax/ay);if(x<0)a=3.141592653589793-a;return y<0?-a:a}
const dhyp=(x,y)=>Math.sqrt(x*x+y*y);
const isLand=(x,y)=>ISL[gy(y)*MW+gx(x)]===1;
// a car is "exposed" when it is not standing on its own land. Attacks only hurt exposed cars; land is always safe ground.
const exposed=q=>ownAt(q.x,q.y)!==q.id;
const clampX=x=>x<1?1:x>WW-1?WW-1:x,clampY=y=>y<1?1:y>WH-1?WH-1:y;
// ---------- state of the abilities ----------
// INV: seconds a car cannot be killed. PLT: the Titan's armour plate is up. PLR: seconds until it grows back.
const INV=[0,0,0,0,0,0],PLT=[0,0,0,0,0,0],PLR=[0,0,0,0,0,0];
// ---------- power zones: own half of a zone to unlock its power ----------
let ZN=[],SHL=[],STR=[],BLD=[],MSL=[],ZT=0;const PROT=[0,0,0,0,0,0],HOLD=[0,0,0,0,0,0],PWC=[null,[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
const ZR=3.2,PK=['cannon','fort','strike'],ZBIT={cannon:1,fort:2,strike:4,nitro:8},ZCD={cannon:3.5,fort:25,strike:22},
 ZNAME={cannon:'Armory',fort:'Bastion',strike:'Missile Silo',nitro:'Nitro Station'},ZPOW={cannon:'Cannon',fort:'Fortify',strike:'Airstrike',nitro:'Nitro'};
function placeZones(){const R=mulberry32((SEED^0x2545F491)>>>0),types=['cannon','fort','strike','nitro','cannon','fort'];ZN=[];
 for(const gap of [22,16,11])for(let k=0;k<3000&&ZN.length<types.length;k++){const ci=LANDI[(R()*LANDI.length)|0],x=(ci%MW+.5)/MC,y=(((ci/MW)|0)+.5)/MC;
  let ok=true;for(let j=0;j<16&&ok;j++){const a=j/16*6.2832;if(!isLand(x+dcos(a)*5.5,y+dsin(a)*5.5))ok=false}
  if(!ok||ZN.some(z=>dhyp(z.x-x,z.y-y)<gap))continue;
  const cl=[],cx=x*MC,cy=y*MC,rc=ZR*MC;for(let Y=Math.floor(cy-rc);Y<=Math.ceil(cy+rc);Y++)for(let X=Math.floor(cx-rc);X<=Math.ceil(cx+rc);X++){if(X<0||Y<0||X>=MW||Y>=MH)continue;const dx=X+.5-cx,dy=Y+.5-cy;if(dx*dx+dy*dy<=rc*rc&&ISL[Y*MW+X])cl.push(Y*MW+X)}
  ZN.push({x,y,t:types[ZN.length],c:Int32Array.from(cl),own:0})}}
function zoneTick(dt){ZT-=dt;if(ZT>0)return;ZT=.2;HOLD.fill(0);
 for(let zi=0;zi<ZN.length;zi++){const z=ZN[zi],cn=[0,0,0,0,0,0];for(let k=0;k<z.c.length;k++)cn[own[z.c[k]]]++;
  let o=0;for(let i=1;i<=5;i++)if(cn[i]*2>=z.c.length&&P[i]&&P[i].alive){o=i;break}
  if(o!==z.own){EV.push(['zone',zi,o,z.own]);z.own=o}if(o)HOLD[o]|=ZBIT[z.t]}}
// the rival with the most land (not counting i), or 0
function bigRival(i){const cn=[0,0,0,0,0,0];for(let q=0;q<own.length;q++)cn[own[q]]++;let tg=0;for(let q=1;q<=5;q++)if(q!==i&&P[q].alive&&cn[q]>0&&(!tg||cn[q]>cn[tg]))tg=q;return tg}
// n separated spots on the land of player tg
function landSpots(tg,n,gap){const cells=[];for(let q=0;q<own.length;q++)if(own[q]===tg)cells.push(q);const pts=[];
 for(let k=0;k<n*8&&pts.length<n&&cells.length;k++){const ce=cells[(GR()*cells.length)|0],x=(ce%MW+.5)/MC,y=(((ce/MW)|0)+.5)/MC;if(!pts.some(v=>dhyp(v[0]-x,v[1]-y)<gap))pts.push([x,y])}return pts}
function POW(i,k){const p=P[i],j=PK.indexOf(k);if(!p||!p.alive||j<0||!(HOLD[i]&ZBIT[k])||PWC[i][j]>0)return false;
 if(k==='cannon'){const c=dcos(p.a),s=dsin(p.a);SHL.push({x:p.x+c*1.4,y:p.y+s*1.4,vx:c*BAL.shellV,vy:s*BAL.shellV,o:i,d:0});EV.push(['fire',i,+p.x.toFixed(1),+p.y.toFixed(1)])}
 else if(k==='fort'){PROT[i]=8;EV.push(['fort',i,+p.x.toFixed(1),+p.y.toFixed(1)])}
 else{const tg=bigRival(i);if(!tg)return false;
  for(const v of landSpots(tg,3,3.5))STR.push({x:v[0],y:v[1],t:1.4,o:i,r:BAL.strikeR});EV.push(['strike',i,tg,0])}
 PWC[i][j]=ZCD[k];return true}

// ---------- hitting things ----------
// Every rival that is outside their own land and within r of (x,y) is taken out. first: stop after one. Returns how many fell.
// ex: who was exposed a moment ago (a blast decides this before it blows land away)
function carHit(x,y,r,o,why,first,ex){let n=0;const r2=r*r;
 for(let j=1;j<=5;j++){if(j===o)continue;const q=P[j];if(!q.alive||q.sh>0)continue;const dx=q.x-x,dy=q.y-y;if(dx*dx+dy*dy<r2&&(ex?ex[j]:exposed(q))){if(kill(q,o,why)){n++;if(first)break}}}
 return n}
// Rival trails touched by a circle at (x,y) are cut: the owner is out.
function trailHit(x,y,r,o){let n=0;const r2=r*r;
 for(let j=1;j<=5;j++){if(j===o)continue;const q=P[j];if(!q.alive||q.sh>0||q.tr.length<4)continue;const t=q.tr;
  for(let i=0;i+3<t.length;i+=2){if(Math.abs(x-t[i])>r+2||Math.abs(y-t[i+1])>r+2)continue;if(segD2(x,y,t[i],t[i+1],t[i+2],t[i+3])<r2){if(kill(q,o,'cut'))n++;break}}}
 return n}
// a car with a lunge, ram or blade ring active hurts exposed rivals it touches (checked at every small step of its movement)
function meleeHit(p){const r2=p.mr*p.mr;
 for(let j=1;j<=5;j++){if(j===p.id)continue;const q=P[j];if(!q.alive||q.sh>0)continue;const dx=q.x-p.x,dy=q.y-p.y;if(dx*dx+dy*dy<r2&&exposed(q))kill(q,p.id,p.mw)}}
// qt: no "boom" event (used for the Titan's pulses). kr: radius in which exposed cars are taken out.
function blast(x,y,r,o,kr,qt){const cx=x*MC,cy=y*MC,rc=r*MC,r2=rc*rc,hit=[],ex=[false];let n=0;
 for(let j=1;j<=5;j++){const q=P[j];ex.push(!!(q&&q.alive&&exposed(q)))}
 for(let Y=Math.max(0,Math.floor(cy-rc));Y<=Math.min(MH-1,Math.ceil(cy+rc));Y++)for(let X=Math.max(0,Math.floor(cx-rc));X<=Math.min(MW-1,Math.ceil(cx+rc));X++){const i=Y*MW+X,dx=X+.5-cx,dy=Y+.5-cy,v=own[i];
  if(v&&v!==o&&dx*dx+dy*dy<=r2&&!(PROT[v]>0)&&!(P[v].sh>0)){own[i]=0;n++;if(!hit.includes(v))hit.push(v)}}
 if(!qt)EV.push(['boom2',o,+x.toFixed(1),+y.toFixed(1)]);
 if(n){MDIRTY=true;for(const v of hit){let has=false;for(let i=0;i<own.length;i++)if(own[i]===v){has=true;break}if(!has&&P[v].alive)kill(P[v],o,'blast')}}
 carHit(x,y,kr===undefined?r*.85:kr,o,'bomb',false,ex);trailHit(x,y,r*.75,o);
 return n}
// shells, blades, drones and delayed strikes
function projTick(dt){
 for(let k=SHL.length-1;k>=0;k--){const s=SHL[k],V=BAL.shellV;let hit=false;
  for(let j=0;j<4&&!hit;j++){s.x+=s.vx*dt/4;s.y+=s.vy*dt/4;s.d+=V*dt/4;
   if(s.x<0||s.y<0||s.x>=WW||s.y>=WH||s.d>=BAL.shellR)hit=true;
   else if(s.pen!==undefined){s.pen-=V*dt/4;if(s.pen<=0)hit=true}
   else if(carHit(s.x,s.y,1.0,s.o,'shell',true)||trailHit(s.x,s.y,.6,s.o))hit=true;
   else if(s.d>1.2){const o=ownAt(s.x,s.y);if(o&&o!==s.o)s.pen=1.5}}
  if(hit){SHL.splice(k,1);blast(s.x,s.y,2.1,s.o)}}
 for(let k=BLD.length-1;k>=0;k--){const b=BLD[k];let end=false,hit=false;
  for(let j=0;j<4&&!end;j++){b.x+=b.vx*dt/4;b.y+=b.vy*dt/4;b.d+=BAL.bladeV*dt/4;
   if(b.x<0||b.y<0||b.x>=WW||b.y>=WH||b.d>=BAL.bladeR)end=true;
   else if(carHit(b.x,b.y,.85,b.o,'blade',true)||trailHit(b.x,b.y,.55,b.o)){end=true;hit=true}}
  if(end){BLD.splice(k,1);if(hit)EV.push(['bhit',b.o,+b.x.toFixed(1),+b.y.toFixed(1)])}}
 for(let k=MSL.length-1;k>=0;k--){const m=MSL[k];m.t-=dt;
  let tg=m.tg?P[m.tg]:null;if(tg&&(!tg.alive||!exposed(tg)))tg=null;
  if(!tg){let bd=9;for(let j=1;j<=5;j++){const q=P[j];if(j===m.o||!q.alive||q.sh>0||!exposed(q))continue;const d=dhyp(q.x-m.x,q.y-m.y);if(d<bd){bd=d;tg=q}}m.tg=tg?tg.id:0}
  if(tg){const d=angd(m.a,dat2(tg.y-m.y,tg.x-m.x)),mx=BAL.missTurn*dt;m.a+=Math.abs(d)<mx?d:(d<0?-mx:mx);if(m.a>Math.PI)m.a-=6.2832;else if(m.a<-Math.PI)m.a+=6.2832}
  let boom=false;const c=dcos(m.a),s=dsin(m.a);
  for(let j=0;j<4&&!boom;j++){m.x+=c*BAL.missV*dt/4;m.y+=s*BAL.missV*dt/4;
   if(m.x<0||m.y<0||m.x>=WW||m.y>=WH)boom=true;
   else if(carHit(m.x,m.y,1.15,m.o,'missile',true)||trailHit(m.x,m.y,.7,m.o))boom=true;
   else{const o=ownAt(m.x,m.y);if(o&&o!==m.o&&m.t<BAL.missT-.25)boom=true}}
  if(boom){MSL.splice(k,1);blast(m.x,m.y,1.9,m.o)}else if(m.t<=0){MSL.splice(k,1);EV.push(['fizz',m.o,+m.x.toFixed(1),+m.y.toFixed(1)])}}
 for(let k=STR.length-1;k>=0;k--){const s=STR[k];s.t-=dt;if(s.t<=0){STR.splice(k,1);blast(s.x,s.y,s.r,s.o)}}}

function genMap(seed){SEED=(seed>>>0)||1;const R=mulberry32(SEED);
 const lat=n=>{const a=new Float32Array((n+1)*(n+1));for(let i=0;i<a.length;i++)a[i]=R();return a},n1=7,n2=27,A=lat(n1),B=lat(n2);
 const smp=(L,n,u,v)=>{const fx=u*n,fy=v*n,x0=Math.min(n-1,Math.floor(fx)),y0=Math.min(n-1,Math.floor(fy)),tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),w=n+1,a=L[y0*w+x0],b=L[y0*w+x0+1],c=L[(y0+1)*w+x0],d=L[(y0+1)*w+x0+1];return(a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy};
 // the playable land is one dry plateau: a rounded outline (no lakes, no holes) that takes up most of the map
 const val=new Float32Array(MW*MH);
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const u=(x+.5)/MW,v=(y+.5)/MH,ex=(u-.5)*2,ey=(v-.5)*2,ax=ex<0?-ex:ex,ay=ey<0?-ey:ey,d3=ax*ax*ax+ay*ay*ay;
  val[y*MW+x]=1-d3*.95+(smp(A,n1,u,v)-.5)*.5+(smp(B,n2,u,v)-.5)*.1}
 let lo=-1,hi=1;for(let it=0;it<18;it++){const th=(lo+hi)/2;let c=0;for(let i=0;i<val.length;i++)if(val[i]>th)c++;if(c/val.length>.8)lo=th;else hi=th}
 const th=(lo+hi)/2;for(let i=0;i<val.length;i++)ISL[i]=val[i]>th?1:0;
 for(let x=0;x<MW;x++){ISL[x]=0;ISL[(MH-1)*MW+x]=0}for(let y=0;y<MH;y++){ISL[y*MW]=0;ISL[y*MW+MW-1]=0}
 const lab=new Int32Array(MW*MH),q=new Int32Array(MW*MH);let best=0,bestN=0,cur=0;
 for(let s=0;s<ISL.length;s++)if(ISL[s]&&!lab[s]){cur++;let h=0,t=0;q[t++]=s;lab[s]=cur;
  while(h<t){const i=q[h++],x=i%MW;if(x>0&&ISL[i-1]&&!lab[i-1]){lab[i-1]=cur;q[t++]=i-1}if(x<MW-1&&ISL[i+1]&&!lab[i+1]){lab[i+1]=cur;q[t++]=i+1}if(i>=MW&&ISL[i-MW]&&!lab[i-MW]){lab[i-MW]=cur;q[t++]=i-MW}if(i+MW<ISL.length&&ISL[i+MW]&&!lab[i+MW]){lab[i+MW]=cur;q[t++]=i+MW}}
  if(t>bestN){bestN=t;best=cur}}
 for(let i=0;i<ISL.length;i++)ISL[i]=lab[i]===best?1:0;
 // anything that is not land and cannot be reached from the edge of the map is a hole: fill it in
 {lab.fill(0);let h=0,t=0;const put=i=>{if(!ISL[i]&&!lab[i]){lab[i]=1;q[t++]=i}};
  for(let x=0;x<MW;x++){put(x);put((MH-1)*MW+x)}for(let y=0;y<MH;y++){put(y*MW);put(y*MW+MW-1)}
  while(h<t){const i=q[h++],x=i%MW;if(x>0)put(i-1);if(x<MW-1)put(i+1);if(i>=MW)put(i-MW);if(i+MW<ISL.length)put(i+MW)}
  for(let i=0;i<ISL.length;i++)if(!ISL[i]&&!lab[i])ISL[i]=1}
 LANDN=0;let sx=0,sy=0;const li=[];for(let i=0;i<ISL.length;i++){if(ISL[i]){LANDN++;sx+=i%MW;sy+=(i/MW)|0;li.push(i)}}
 LANDI=Int32Array.from(li);MCX=(sx/LANDN+.5)/MC;MCY=(sy/LANDN+.5)/MC;placeZones()}

function newGame(){own.fill(0);MDIRTY=true;P=[null];for(let i=1;i<=5;i++)P.push(newP(i));
 me=P[1];FX=[];PO=[];FD=[];tl=120;score=kills=streak=0;en=1;boost=0;for(let i=1;i<=5;i++)spawn(P[i]);
 tg.x=ptr.x=me.x;tg.y=ptr.y=me.y;tg.a=me.a;ptr.down=0;state='play';tally()}
// a fresh kit: abilities ready, the Titan's plate up. The ultimate keeps part of its charge.
function kitReset(i){PLT[i]=(CLSI[i]===1)?1:0;PLR[i]=0;INV[i]=0;SLOW[i]=0;const t=IN[i];if(!t)return;t.cd[0]=t.cd[1]=0;t.mv=0;t.mk=0;t.ut=0;t.pt=0;t.en=1;t.uc=Math.min(t.uc,35)}
function spawn(p){
 for(let k=0;k<80;k++){const ci=LANDI?LANDI[rnd(LANDI.length)]:rnd(own.length),x=(ci%MW+.5)/MC,y=(((ci/MW)|0)+.5)/MC;let ok=1;const cx=Math.round(x*MC),cy=Math.round(y*MC);
  for(let dy=-18;dy<=18&&ok;dy+=2)for(let dx=-18;dx<=18;dx+=2){if(dx*dx+dy*dy>324)continue;const X=cx+dx,Y=cy+dy;if(X<0||Y<0||X>=MW||Y>=MH||!ISL[Y*MW+X]||own[Y*MW+X]){ok=0;break}}
  if(ok&&ZN.some(z=>dhyp(z.x-x,z.y-y)<8))ok=0;if(ok)for(const q of P)if(q&&q!==p&&q.alive&&q.tr.length){for(let i=0;i<q.tr.length;i+=2)if(dhyp(q.tr[i]-x,q.tr[i+1]-y)<5){ok=0;break}}
  if(ok){stamp(x,y,2.6,p.id);p.x=p.lx=p.rx=x;p.y=p.ly=p.ry=y;p.hx=x;p.hy=y;p.a=p.da=p.ra=rr(-3.14,3.14);p.alive=true;p.sh=2;p.born=clk;p.tr=[];p.sent=0;p.rs++;p.out=false;p.plan=null;p.mr=0;kitReset(p.id);MDIRTY=true;return}}
 p.rt=1}
function ucAdd(i,v){const t=IN[i];if(t&&t.ut<=0)t.uc=Math.min(100,t.uc+v)}
function kill(p,by,why){
 if(!p.alive||p.sh>0)return false;
 const id=p.id;
 if(INV[id]>0&&why!=='self'&&why!=='noland')return false;
 // the Titan's armour plate takes one hit and then grows back
 if(by&&by!==id&&PLT[id]>0&&why!=='cut'&&why!=='enclosed'){PLT[id]=0;PLR[id]=BAL.plateRegen;p.sh=.8;EV.push(['pop',id,+p.x.toFixed(1),+p.y.toFixed(1)]);return false}
 if(!IS_SRV){p.wreck={x:p.x,y:p.y,a:p.a,t0:clk};if(p.tr.length>3)p.ghost={tr:p.tr.slice(),t0:clk}}p.alive=false;DE[id]++;if(by&&by!==id){KL[by]++;ucAdd(by,BAL.ucKill)}
 if(!IS_SRV&&!FF){burst(p.x,p.y,COLS[id],p===me?60:34,11);shake=Math.max(shake,p===me?16:7);
  if(p===me){snd('die');buzz(200)}else snd('ko')}
 if(by===VS&&!IS_SRV)credit(p);
 const heir=(by&&by!==id&&P[by]&&P[by].alive)?by:0;let tn=0;for(let i=0;i<own.length;i++)if(own[i]===id){own[i]=heir;tn++}MDIRTY=true;PROT[id]=0;INV[id]=0;PLT[id]=0;p.mr=0;
 const t=IN[id];if(t){t.uc=Math.min(t.uc,50);t.mv=0;t.ut=0}
 p.tr=[];p.sent=0;p.rs++;p.out=false;p.rt=p.id<=HN?1.8:1.5;
 EV.push(['ko',id,by||0,why||'']);if(heir&&tn)EV.push(['seize',heir,id,tn]);if(p===me)streak=0;
 return true}
function capture(p){const id=p.id,t=p.tr;
 for(let i=0;i+1<t.length;i+=2){const x0=t[i],y0=t[i+1];stamp(x0,y0,.55,id,1);
  if(i+3<t.length){const x1=t[i+2],y1=t[i+3],n=Math.ceil(dhyp(x1-x0,y1-y0)/.25);for(let k=1;k<n;k++)stamp(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,.55,id,1)}}
 FL.fill(0);let sp=0,g=0,bx0=MW,by0=MH,bx1=-1,by1=-1;const cnt=[0,0,0,0,0,0];
 for(let y=0;y<MH;y++){const r=y*MW;for(let x=0;x<MW;x++)if(own[r+x]===id){if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y}}
 if(bx1>=0){bx0=Math.max(0,bx0-1);by0=Math.max(0,by0-1);bx1=Math.min(MW-1,bx1+1);by1=Math.min(MH-1,by1+1);
  const push=i=>{if(!FL[i]&&own[i]!==id){FL[i]=1;STK[sp++]=i}};
  for(let x=bx0;x<=bx1;x++){push(by0*MW+x);push(by1*MW+x)}for(let y=by0;y<=by1;y++){push(y*MW+bx0);push(y*MW+bx1)}
  while(sp){const i=STK[--sp],x=i%MW,y=(i/MW)|0;if(x>bx0)push(i-1);if(x<bx1)push(i+1);if(y>by0)push(i-MW);if(y<by1)push(i+MW)}
  for(let y=by0;y<=by1;y++){const r=y*MW;for(let x=bx0;x<=bx1;x++){const i=r+x;if(!FL[i]&&own[i]!==id&&ISL[i]&&!(PROT[own[i]]>0)){own[i]=id;FL[i]=2;g++}}}}
 for(let i=0;i<own.length;i++)cnt[own[i]]++;
 if(!IS_SRV&&t.length>3)p.ghost={tr:t.slice(),t0:clk};MDIRTY=true;p.tr=[];p.sent=0;p.rs++;
 if(g>0)ucAdd(id,g/LANDN*100*BAL.ucLand);
 for(const q of P)if(q&&q!==p&&q.alive){const t=q.tr;let hit=false;for(let i=2;i+1<t.length;i+=2)if(FL[gy(t[i+1])*MW+gx(t[i])]===2){hit=true;break}
  if(hit)kill(q,id,'enclosed');else if(!cnt[q.id])kill(q,id,'noland')}
 if(p===me&&g>8&&!IS_SRV){score+=Math.round(g*.6);if(!FF){burst(p.x,p.y,COLS[p.id],22,9);burst(p.x,p.y,'#ffffff',10,7);pop(p.x,p.y-1.5,'+'+Math.round(g*1000/LANDN)/10+'%',COLS[p.id]);shake=Math.max(shake,Math.min(10,g/70));snd('capture',g);buzz(25);CAPT.push([clk,g])}}
 return g}
function segD2(px,py,x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,l=dx*dx+dy*dy;let t=l?((px-x0)*dx+(py-y0)*dy)/l:0;t=t<0?0:t>1?1:t;const ex=x0+dx*t-px,ey=y0+dy*t-py;return ex*ex+ey*ey}
function pointStep(p){
 if(ownAt(p.x,p.y)===p.id){if(p.out){p.tr.push(p.x,p.y);p.out=false;capture(p)}p.lx=p.x;p.ly=p.y}
 else{if(!p.out){p.out=true;p.tr=[p.lx,p.ly];p.sent=0;p.rs++}
  // your own trail is safe to cross (it used to take you out); only rivals can cut it
  const t=p.tr,L=t.length;if(dhyp(p.x-t[L-2],p.y-t[L-1])>=TSP)t.push(p.x,p.y)}
 for(const q of P)if(q&&q!==p&&q.alive&&q.tr.length>=4){const t=q.tr;for(let i=0;i+3<t.length;i+=2)if(Math.abs(p.x-t[i])<2&&Math.abs(p.y-t[i+1])<2&&segD2(p.x,p.y,t[i],t[i+1],t[i+2],t[i+3])<.64){kill(q,p.id,'cut');break}}}
// ---------- how a car moves ----------
// The server's step and the phone's prediction of your own car both use these functions, so they agree exactly.
// cl: class number; sprint: Sprint held with energy; mk / mvOn: a lunge or ram is running; utOn: the ultimate is running; slow: slowed; nitro: holding a Nitro Station.
function spdOf(cl,sprint,mk,mvOn,utOn,slow,nitro){const C=CLS[cl];let s=SPD*C.spd;if(sprint)s*=SPRM;if(mvOn)s*=MVK[mk].m;if(utOn)s*=C.um;if(slow)s*=SLWM;if(nitro)s*=NITM;return s}
function trnOf(cl,mvOn,mk){return TURN*CLS[cl].trn*(mvOn?MVK[mk].r:1)}
function turnTo(s,da,dt,trn){const d=angd(s.a,da),m=(trn||TURN)*dt;s.a+=Math.abs(d)<m?d:(d<0?-m:m);if(s.a>Math.PI)s.a-=6.2832;else if(s.a<-Math.PI)s.a+=6.2832}
function moveSub(s,c,sn,st){let nx=Math.min(WW-HR,Math.max(HR,s.x+c*st)),ny=Math.min(WH-HR,Math.max(HR,s.y+sn*st));
 if(!isLand(nx,ny)){if(isLand(nx,s.y))ny=s.y;else if(isLand(s.x,ny))nx=s.x;else{nx=s.x;ny=s.y}}
 s.x=nx;s.y=ny}
function stepP(p,dt,spd,trn){turnTo(p,p.da,dt,trn);
 const dist=spd*dt,n=Math.max(1,Math.ceil(dist/.35)),st=dist/n,c=dcos(p.a),s=dsin(p.a);
 for(let k=0;k<n&&p.alive;k++){moveSub(p,c,s,st);pointStep(p);if(p.alive&&p.mr>0)meleeHit(p);if(p.alive&&MINES.length)mineStep(p)}}
// an armed rival mine under a car that is outside its own land goes off
function mineStep(q){if(q.sh>0||!exposed(q))return;
 for(let k=MINES.length-1;k>=0;k--){const m=MINES[k];if(m.arm>0||m.o===q.id)continue;const dx=q.x-m.x,dy=q.y-m.y;
  if(dx*dx+dy*dy<.9025){EV.push(['boom',m.o,+m.x.toFixed(1),+m.y.toFixed(1)]);const dead=kill(q,m.o,'mine');MINES.splice(k,1);if(!dead&&q.alive)q.sh=Math.max(q.sh,.8);return}}}

// ---------- bots ----------
function rayOut(p,ph){let d=0;while(d<30&&ownAt(p.x+dcos(ph)*d,p.y+dsin(ph)*d)===p.id)d+=.5;return d}
// How many of the next n ticks could the car steer toward heading c without leaving the land or running into its own trail? (same speed and turning as the real thing, so tight shores are judged right)
// own: points of the car's own trail near it (flat list), already without the newest ones.
function landRun(p,c,n,own2){let x=p.x,y=p.y,a=p.a;const C=CLS[CLSI[p.id]||0],m=TURN*C.trn*STEP,st=SPD*C.spd*.92*STEP;
 for(let i=0;i<n;i++){const d=angd(a,c);a+=Math.abs(d)<m?d:(d<0?-m:m);x+=dcos(a)*st;y+=dsin(a)*st;if(!isLand(x,y))return i;
  if(own2)for(let k=0;k<own2.length;k+=2){const dx=own2[k]-x,dy=own2[k+1]-y;if(dx*dx+dy*dy<.81)return i}}
 return n}
// Keep the wanted heading if it is safe, otherwise the nearest heading that is (fanning out to the side it chose last time, so it does not dither)
function botAvoid(p,da){const N=11;let own2=null;
 // (bots used to steer round their own trail; it is harmless now, so they only watch the edge of the land)
 let bn=landRun(p,da,N,own2);if(bn>=N)return da;
 const sg0=p.avs||1;let best=da;
 for(let k=1;k<=10;k++)for(let j=0;j<2;j++){const sg=j?-sg0:sg0,c=da+sg*k*.3,r=landRun(p,c,N,own2);if(r>=N){p.avs=sg;return c}if(r>bn){bn=r;best=c}}
 return best}
function botCtl(p,dt,t){
 const inside=ownAt(p.x,p.y)===p.id;
 if(!p.plan&&inside){const base=dat2(WH/2-p.y,WW/2-p.x),ph=GR()<.6?base+rr(-1.3,1.3):rr(-3.14,3.14),sg=GR()<.5?1:-1,R1=rayOut(p,ph)+rr(2.5,6),R2=rr(3,7),pa=ph+sg*1.5708;
  const ax=p.x+dcos(ph)*R1,ay=p.y+dsin(ph)*R1,cl=(x,y)=>{x=Math.min(WW-2,Math.max(2,x));y=Math.min(WH-2,Math.max(2,y));for(let t=1;t>0&&!isLand(x,y);t-=.1){x=p.x+(x-p.x)*.9;y=p.y+(y-p.y)*.9}return[x,y]};
  let zt=null;if(ZN.length&&GR()<.45){let bd=18;for(const z of ZN){if(z.own===p.id)continue;const d=dhyp(z.x-p.x,z.y-p.y);if(d<bd){bd=d;zt=z}}}
  if(zt){const za=dat2(zt.y-p.y,zt.x-p.x),zr=ZR+2.4,zp=an=>cl(zt.x+dcos(an)*zr,zt.y+dsin(an)*zr);p.plan={w:[zp(za-1.9),zp(za),zp(za+1.9),[p.x,p.y]],i:0}}
  else p.plan={w:[cl(ax,ay),cl(ax+dcos(pa)*R2,ay+dsin(pa)*R2),cl(p.x+dcos(pa)*R2*.9,p.y+dsin(pa)*R2*.9),[p.x,p.y]],i:0}}
 let tx=p.hx,ty=p.hy;
 if(p.plan){const w=p.plan.w[p.plan.i];tx=w[0];ty=w[1];if(dhyp(tx-p.x,ty-p.y)<2.7&&++p.plan.i>=p.plan.w.length)p.plan=null}
 if(p.out&&p.tr.length>260){tx=p.hx;ty=p.hy;p.plan=null}
 let da=dat2(ty-p.y,tx-p.x);
 p.ht-=dt;if(p.ht<=0){p.ht=.25;let bd=10,hx=0,hy=0,f=0;
  for(const q of P)if(q&&q!==p&&q.alive&&q.tr.length)for(let i=0;i<q.tr.length;i+=2){const d=dhyp(q.tr[i]-p.x,q.tr[i+1]-p.y);if(d<bd&&Math.abs(angd(p.a,dat2(q.tr[i+1]-p.y,q.tr[i]-p.x)))<1.6){bd=d;hx=q.tr[i];hy=q.tr[i+1];f=1}}
  p.hunt=f?[hx,hy]:null}
 if(p.hunt)da=dat2(p.hunt[1]-p.y,p.hunt[0]-p.x);
 // prey: a rival caught out in the open. Some classes love the chase (the aggression numbers), but never for long and never with a long trail behind.
 p.pr=(p.pr||0)-dt;
 if(p.pr<=0){p.pr=.3;let bd=22,pq=0;const cl0=CLSI[p.id]||0;
  if(p.pcd>0)p.pcd-=.3;
  else if(p.tr.length<100&&GR()<[.68,.7,.5,.55][cl0]){for(let j=1;j<=5;j++){const q=P[j];if(j===p.id||!q.alive||q.sh>0||!exposed(q))continue;const d=dhyp(q.x-p.x,q.y-p.y);if(d<bd){bd=d;pq=j}}}
  if(pq){if(p.prey!==pq)p.pu=0;p.prey=pq}else p.prey=0}
 if(p.prey){const q=P[p.prey];
  if(!q||!q.alive||!exposed(q)||(p.pu=(p.pu||0)+dt)>5){p.prey=0;p.pcd=6}
  else{const d=dhyp(q.x-p.x,q.y-p.y),lead=Math.min(.5,d/(SPD*1.4)),ax=q.x+dcos(q.a)*SPD*lead,ay=q.y+dsin(q.a)*SPD*lead;
   if(!((CLSI[p.id]||0)===2&&d<8))da=dat2(ay-p.y,ax-p.x);p.plan=null}}
  da=botAvoid(p,da);
 // pinned or sliding along a shore (the car turns in place but cannot move): pivot toward the most open direction for a moment and drop the plan that led here
 {const mv=p.qx===undefined?9:dhyp(p.x-p.qx,p.y-p.qy);p.qx=p.x;p.qy=p.y;p.pin=(mv<.25&&!(SLOW[p.id]>0))?(p.pin||0)+1:0;
  if(p.pvt>0){p.pvt-=dt;da=p.pv}
  else if(p.pin>=4){let bk=-99,ba=da;for(let k=0;k<24;k++){const an=-3.1416+k*.2618;let d=0;while(d<7&&isLand(p.x+dcos(an)*d,p.y+dsin(an)*d))d+=.35;const sc=d-.4*Math.abs(angd(an,da));if(sc>bk){bk=sc;ba=an}}
   p.pv=ba;p.pvt=.7;p.pin=0;p.plan=null;da=ba}}
 // sprint while chasing a trail that is close
 const hd=p.hunt?dhyp(p.hunt[0]-p.x,p.hunt[1]-p.y):99;t.b=(p.hunt&&hd<7&&t.en>.25)?1:(t.b&&t.en>.05&&hd<9&&p.hunt)?1:0;
 const hb=HOLD[p.id];if(hb){const pc=PWC[p.id];
  if((hb&1)&&pc[0]<=0)for(let d=2;d<=10;d++){const o=ownAt(p.x+dcos(p.a)*d,p.y+dsin(p.a)*d);if(o&&o!==p.id&&!(PROT[o]>0)){POW(p.id,'cannon');break}}
  if((hb&2)&&pc[1]<=0&&GR()<.01)POW(p.id,'fort');
  if((hb&4)&&pc[2]<=0&&GR()<.03)POW(p.id,'strike')}
 p.da=da}
// what a bot does with its abilities: a few quick looks around per second, then the class's habits
function botAbil(p,t,dt){
 p.at=(p.at||0)-dt;if(p.at>0)return;p.at=.2+GR()*.22;
 const i=p.id,cl=CLSI[i]||0,out=!!p.out;
 let ft=null,fd=99,nt=null,nd=99,nn=0;
 for(let j=1;j<=5;j++){const q=P[j];if(j===i||!q.alive||q.sh>0)continue;const d=dhyp(q.x-p.x,q.y-p.y);if(d<7&&!exposed(q))nn++;if(!exposed(q))continue;
  if(d<nd){nd=d;nt=q}const ang=Math.abs(angd(p.a,dat2(q.y-p.y,q.x-p.x)));if(ang<.42&&d<fd){fd=d;ft=q}}
 // does an enemy trail lie ahead of the nose?
 let tfd=99;for(let j=1;j<=5;j++){const q=P[j];if(j===i||!q.alive||q.tr.length<4)continue;const tr=q.tr;
  for(let k=0;k<tr.length;k+=4){const d=dhyp(tr[k]-p.x,tr[k+1]-p.y);if(d<tfd&&d>1.5&&Math.abs(angd(p.a,dat2(tr[k+1]-p.y,tr[k]-p.x)))<.35)tfd=d}}
 const r1=t.cd[0]<=0&&!CLS[cl].ab[0].off,r2=t.cd[1]<=0&&!CLS[cl].ab[1].off,ur=t.uc>=100&&t.ut<=0;
 if(cl===0){ // Striker: lunge at exposed rivals, throw blades down trails, ultimate when rivals are close
  if(r1&&ft&&fd<8.5&&GR()<.8)USE(i,1);
  else if(r2&&((ft&&fd<12)||tfd<10)&&GR()<.7)USE(i,2);
  if(ur&&nt&&nd<5&&GR()<.7)USE(i,3)}
 else if(cl===1){ // Titan: ram, pulse when someone is close or you stand on enemy land, fortress when threatened
  if(r1&&ft&&fd<7.5&&GR()<.8)USE(i,1);
  else if(r2&&((nt&&nd<4.6)||(!out&&ownAt(p.x,p.y)!==i&&ownAt(p.x,p.y)!==0&&GR()<.2))&&GR()<.7)USE(i,2);
  if(ur&&((nt&&nd<8)||(out&&p.tr.length>120))&&GR()<.5)USE(i,3)}
 else if(cl===2){ // Gunner: shells at exposed rivals, trails and enemy land ahead, mortars for targets further off, orbital strike on the leader
  let land=false;for(let d=3;d<=13;d+=2){const o=ownAt(p.x+dcos(p.a)*d,p.y+dsin(p.a)*d);if(o&&o!==i&&!(PROT[o]>0)){land=true;break}}
  if(r1&&((ft&&fd<17)||tfd<14||(land&&GR()<.25))&&GR()<.75)USE(i,1);
  if(r2&&nt&&nd>7&&nd<17&&Math.abs(angd(p.a,dat2(nt.y-p.y,nt.x-p.x)))<.7&&GR()<.55)USE(i,2);
  if(ur&&GR()<.25)USE(i,3)}
 else { // Sapper: mines when someone follows or a long trail is out, drone at exposed rivals, minefield when cornered
  if(r1&&((out&&p.tr.length>60&&GR()<.12)||(nt&&nd<9&&Math.abs(angd(p.a,dat2(nt.y-p.y,nt.x-p.x)))>2&&GR()<.6)))USE(i,1);
  if(r2&&nt&&nd<14&&GR()<.7)USE(i,2);
  if(ur&&((nt&&nd<6)||(out&&p.tr.length>150&&GR()<.2)))USE(i,3)}}

// ---------- a match ----------
// classes: humans pick theirs (CLSI), bots get a spread of the four decided by the seed
function assignClasses(n,fc){const R=mulberry32((SEED^0xC1A55)>>>0),perm=[0,1,2,3];for(let k=3;k>0;k--){const j=(R()*(k+1))|0,tm=perm[k];perm[k]=perm[j];perm[j]=tm}
 for(let i=1;i<=5;i++){const v=CLSI[i];CLSI[i]=(fc&&fc[i]>=0&&fc[i]<=3)?fc[i]:(i<=n&&v>=0&&v<=3&&v===(v|0))?v:perm[i&3]}}
function newIN(i){return{a:P[i].a,b:0,en:1,cd:[0,0],uc:0,mv:0,mk:0,ut:0,pt:0}}
let NBOT;
function MPS(n,bots,nb,seed,fc){NBOT=nb;genMap(seed===undefined?(Math.random()*1e9|0):seed);GRS=(SEED^0x9E3779B9)|0;TK=0;REC=null;MINES.length=0;SLOW.fill(0);SHL.length=0;STR.length=0;BLD.length=0;MSL.length=0;PROT.fill(0);HOLD.fill(0);INV.fill(0);PLT.fill(0);PLR.fill(0);for(let i=1;i<=5;i++)PWC[i]=[0,0,0];ZT=0;
 IN.length=0;assignClasses(n,fc);newGame();state='play';tl=TL;HN=n;BOTS=!!bots;KL.fill(0);DE.fill(0);EV.length=0;
 for(let i=n+1;i<=5;i++){const p=P[i];if(bots&&i<=n+(nb===undefined?5:nb))continue;for(let k=0;k<own.length;k++)if(own[k]===i)own[k]=0;p.alive=false;p.rt=1e9;p.tr=[]}
 MDIRTY=true;
 for(let i=1;i<=5;i++)if(i<=n||P[i].alive||(bots&&i<=n+(nb===undefined?5:nb))){IN[i]=newIN(i);PLT[i]=(CLSI[i]===1)?1:0}}
function DROP(i){const p=P[i];for(let k=0;k<own.length;k++)if(own[k]===i)own[k]=0;for(const L of [MINES,SHL,BLD,MSL,STR])for(let k=L.length-1;k>=0;k--)if(L[k].o===i)L.splice(k,1);MDIRTY=true;p.alive=false;p.tr=[];p.sent=0;p.rs++;p.out=false;p.rt=1e9;PROT[i]=0;INV[i]=0;PLT[i]=0;IN[i]=null}

// ---------- abilities ----------
// s: 1 and 2 are the two quick abilities, 3 is the ultimate. Returns true when it fired.
function USE(i,s){const t=IN[i],p=P[i];if(!t||!p||!p.alive||s<1||s>3)return false;
 const cl=CLSI[i]||0,A=CLS[cl].ab[s-1];
 if(A.off)return false;
 if(s<3){if(t.cd[s-1]>0)return false}else if(t.uc<100||t.ut>0)return false;
 const c=dcos(p.a),sn=dsin(p.a),X=p.x,Y=p.y,ev=n=>EV.push([n,i,+X.toFixed(1),+Y.toFixed(1)]);
 switch(A.id){
  case 'blade':case 'ram':t.mv=MVK[A.mk].t;t.mk=A.mk;if(A.mk===2)INV[i]=Math.max(INV[i],MVK[2].t+.08);ev(A.id);break;
  case 'fan':for(const da of [-.2,0,.2]){const a=p.a+da;BLD.push({x:X+dcos(a)*1.2,y:Y+dsin(a)*1.2,vx:dcos(a)*BAL.bladeV,vy:dsin(a)*BAL.bladeV,o:i,d:0})}ev('fan');break;
  case 'storm':t.ut=A.ut;ev('storm');break;
  case 'shock':for(let j=1;j<=5;j++)if(j!==i&&P[j].alive&&dhyp(P[j].x-X,P[j].y-Y)<BAL.shockR)SLOW[j]=Math.max(SLOW[j],2.2);
   ev('shock');blast(X,Y,BAL.shockBlast,i,BAL.shockKill);break;
  case 'fort':t.ut=A.ut;t.pt=BAL.fortPulse*.5;INV[i]=Math.max(INV[i],A.ut);ev('fortress');break;
  case 'cannon':SHL.push({x:X+c*1.5,y:Y+sn*1.5,vx:c*BAL.shellV,vy:sn*BAL.shellV,o:i,d:0});ev('fire');break;
  case 'mortar':for(let k=0;k<3;k++){const d=7+k*4.2,lat=rr(-1.1,1.1);STR.push({x:clampX(X+c*d-sn*lat),y:clampY(Y+sn*d+c*lat),t:.9+k*.28,o:i,r:BAL.mortarR})}ev('mortar');break;
  case 'orbital':{const tg=bigRival(i);if(!tg)return false;const pts=landSpots(tg,8,3.6);if(!pts.length)return false;
   pts.forEach((v,k)=>STR.push({x:v[0],y:v[1],t:.9+k*.3,o:i,r:BAL.orbitalR}));EV.push(['orbital',i,tg,0]);break}
  case 'mine':{const mx=X-c*1.5,my=Y-sn*1.5;MINES.push({x:mx,y:my,o:i,t:16,arm:.6,k:0});const ms=MINES.filter(m=>m.o===i&&!m.k);if(ms.length>BAL.mineMax)MINES.splice(MINES.indexOf(ms[0]),1);EV.push(['mine',i,+mx.toFixed(1),+my.toFixed(1)]);break}
  case 'drone':{let tg=0,bd=16;for(let j=1;j<=5;j++){const q=P[j];if(j===i||!q.alive||!exposed(q))continue;const d=dhyp(q.x-X,q.y-Y);if(d<bd&&Math.abs(angd(p.a,dat2(q.y-Y,q.x-X)))<1.2){bd=d;tg=j}}
   MSL.push({x:X+c*1.4,y:Y+sn*1.4,a:p.a,o:i,t:BAL.missT,tg});ev('drone');break}
  case 'field':for(let k=0;k<BAL.fieldN;k++){const a=p.a+k/BAL.fieldN*6.2832;MINES.push({x:clampX(X+dcos(a)*BAL.fieldR),y:clampY(Y+dsin(a)*BAL.fieldR),o:i,t:12,arm:.8,k:1})}
   for(let j=1;j<=5;j++)if(j!==i&&P[j].alive&&dhyp(P[j].x-X,P[j].y-Y)<BAL.shockR)SLOW[j]=Math.max(SLOW[j],1.6);ev('field');break;
  default:return false}
 if(s<3)t.cd[s-1]=A.cd;else t.uc=0;
 return true}
// things the running ultimates do every step
function ultTick(i,p,t,dt){const cl=CLSI[i]||0;
 if(cl===0)trailHit(p.x,p.y,BAL.stormR*.8,i);
 else if(cl===1){t.pt-=dt;if(t.pt<=0){t.pt+=BAL.fortPulse;
   for(let j=1;j<=5;j++)if(j!==i&&P[j].alive&&dhyp(P[j].x-p.x,P[j].y-p.y)<BAL.fortR*2)SLOW[j]=Math.max(SLOW[j],1.4);
   EV.push(['fpulse',i,+p.x.toFixed(1),+p.y.toFixed(1)]);blast(p.x,p.y,BAL.fortR,i,BAL.fortR*.9,1)}}}

// ---------- one fixed step, recorded inputs and checksums (used by the server, by practice matches and by replays) ----------
function INP(i,ai,b){const t=IN[i];if(!t)return;const a=ai/50,bb=b?1:0;if(t.a===a&&t.b===bb)return;t.a=a;t.b=bb;
 if(REC){const L=REC.ops[REC.ops.length-1];if(L&&L[0]===TK&&L[1]===i&&L[2]===0){L[3]=ai;L[4]=bb}else REC.ops.push([TK,i,0,ai,bb])}}
function ABU(i,s){const r=USE(i,s);if(REC)REC.ops.push([TK,i,1,s]);return r}
function PWU(i,k){POW(i,k);if(REC)REC.ops.push([TK,i,2,PK.indexOf(k)])}
function DRP(i){DROP(i);if(REC)REC.ops.push([TK,i,3])}
function APPLY(o){const i=o[1],k=o[2];if(k===0){const t=IN[i];if(t){t.a=o[3]/50;t.b=o[4]?1:0}}else if(k===1)USE(i,o[3]);else if(k===2)POW(i,PK[o[3]]);else if(k===3)DROP(i)}
function CHK(){let h=-2128831035;for(let i=0;i<own.length;i++)h=Math.imul(h^own[i],16777619);
 for(let i=1;i<=5;i++){const p=P[i];h=Math.imul(h^Math.round(p.x*1000),16777619);h=Math.imul(h^Math.round(p.y*1000),16777619);h=Math.imul(h^(p.alive?1:0),16777619);const t=IN[i];if(t){h=Math.imul(h^Math.round(t.uc*10),16777619);h=Math.imul(h^Math.round((t.cd[0]+t.cd[1])*10),16777619)}}return h>>>0}
function tally(){CN=[0,0,0,0,0,0];for(let i=0;i<own.length;i++)CN[own[i]]++}
function STEPF(){upd(STEP);TK++;if(TK%8===0)hud();if(REC&&TK%150===0)REC.chk.push([TK,CHK()])}
function recStart(){REC={v:EVER,seed:SEED,h:HN,bots:BOTS?1:0,tl:TL,cl:CLSI.slice(),ops:[],chk:[]};if(NBOT!==undefined)REC.nb=NBOT}
function recEnd(){const r=REC;REC=null;if(!r)return null;tally();r.ticks=TK;r.fin={cn:CN.slice(),k:KL.slice(),d:DE.slice(),N:LANDN};return JSON.stringify(r)}
// how ready each button is, 0..1: ability 1, ability 2, ultimate, sprint energy
function rdyOf(i){const t=IN[i];if(!t)return[1,1,0,1];const C=CLS[CLSI[i]||0];return[+(1-t.cd[0]/C.ab[0].cd).toFixed(2),+(1-t.cd[1]/C.ab[1].cd).toFixed(2),+(t.uc/100).toFixed(2),+t.en.toFixed(2)]}
function upd(dt){tl-=dt;streakT-=dt;if(IS_SRV){FX.length=0;PO.length=0;FD.length=0}
 for(let i=1;i<=5;i++){if(SLOW[i]>0)SLOW[i]-=dt;if(PROT[i]>0)PROT[i]-=dt;if(INV[i]>0)INV[i]-=dt;const c=PWC[i];for(let j=0;j<3;j++)if(c[j]>0)c[j]-=dt}
 zoneTick(dt);projTick(dt);
 for(let k=MINES.length-1;k>=0;k--){const m=MINES[k];m.t-=dt;m.arm-=dt;if(m.t<=0){MINES.splice(k,1);continue}if(m.arm>0)continue;
  for(let j=1;j<=5;j++){const q=P[j];if(j===m.o||!q.alive||q.sh>0||!exposed(q))continue;if(dhyp(q.x-m.x,q.y-m.y)<.95){EV.push(['boom',m.o,+m.x.toFixed(1),+m.y.toFixed(1)]);const dead=kill(q,m.o,'mine');MINES.splice(k,1);if(!dead&&q.alive)q.sh=Math.max(q.sh,.8);break}}}
 for(let i=1;i<=5;i++){const p=P[i],t=IN[i];p.sh-=dt;
  if(!p.alive){if((p.rt-=dt)<=0){spawn(p);if(t&&p.alive)t.a=p.a}continue}
  if(!t)continue;
  const bot=BOTS&&i>HN,cl=CLSI[i]||0;
  if(bot){botCtl(p,dt,t);t.a=p.da;botAbil(p,t,dt)}
  t.cd[0]=Math.max(0,t.cd[0]-dt);t.cd[1]=Math.max(0,t.cd[1]-dt);
  if(cl===1&&PLT[i]<1&&(PLR[i]-=dt)<=0){PLT[i]=1;EV.push(['plate',i,+p.x.toFixed(1),+p.y.toFixed(1)])}
  if(t.ut<=0)t.uc=Math.min(100,t.uc+BAL.ucs*dt);
  const b=t.b&&t.en>0,mvOn=t.mv>0,utOn=t.ut>0;
  t.en=b?Math.max(0,t.en-dt*SPRD):Math.min(1,t.en+dt*SPRR);
  if(mvOn)t.mv-=dt;
  if(utOn){t.ut-=dt;ultTick(i,p,t,dt)}
  p.mr=Math.max(mvOn?MVK[t.mk].rad:0,(utOn&&cl===0)?BAL.stormR:0);p.mw=mvOn?MVK[t.mk].w:'blade';
  p.da=t.a;
  stepP(p,dt,spdOf(cl,b,t.mk,mvOn,utOn,SLOW[i]>0,HOLD[i]&8)*(bot?.92:1),trnOf(cl,mvOn,t.mk))}}
function rle(){const r=[];let c=own[0],n=0;for(let i=0;i<own.length;i++){if(own[i]===c)n++;else{r.push(c,n);c=own[i];n=1}}r.push(c,n);return r}
// ---------- snapshots (server only) ----------
// Every 1/30 s step produces one snapshot. Its first part is the same for every player (positions, trail points, land changes, events);
// each player also gets a private part: the exact state of their own car plus the ability timers, so their phone can predict it.
let OPREV=null,ZSENT='';
// land that changed since the last snapshot, as [gap, length, owner, gap, length, owner, ...]
function ODIFF(){
 const n=own.length,w=n>>2,A=new Uint32Array(own.buffer,own.byteOffset,w),B=new Uint32Array(OPREV.buffer,OPREV.byteOffset,w),out=[];
 let rs=0,rv=0,rl=0,end=0;
 const flush=()=>{if(rl){out.push(rs-end,rl,rv);end=rs+rl;rl=0}},cell=j=>{const v=own[j];if(v===OPREV[j])return;if(rl&&j===rs+rl&&v===rv)rl++;else{flush();rs=j;rv=v;rl=1}};
 for(let k=0;k<w;k++){if(A[k]===B[k])continue;const j=k<<2;cell(j);cell(j+1);cell(j+2);cell(j+3)}
 for(let j=w<<2;j<n;j++)cell(j);
 flush();OPREV.set(own);return out}
// flags every car carries: bit 0 alive, 1 slowed, 2 lunge or ram running, 3 sprinting, 4 armour plate up, 5 spawn protection, 6-9 fortify seconds, 10-13 held zones,
// 14 ultimate running, 15 cannot be killed, 16-17 which lunge (1 blade, 2 ram)
function snapFlags(i,p){const t=IN[i],mv=t&&t.mv>0,sp=t&&t.b&&t.en>0;
 return(p.alive?1:0)|(SLOW[i]>0?2:0)|(mv?4:0)|(sp?8:0)|(PLT[i]>0?16:0)|(p.sh>0?32:0)|(Math.min(15,Math.ceil(Math.max(0,PROT[i])))<<6)|(HOLD[i]<<10)|((t&&t.ut>0)?16384:0)|(INV[i]>0?32768:0)|((mv?t.mk:0)<<16)}
// your own car, exactly: x y a, sprint energy, the two cooldowns, lunge time left and kind, ultimate time left, ultimate charge, slow time left, the three zone powers, plate
function snapMe(i){const p=P[i],t=IN[i];return JSON.stringify([Math.round(p.x*1000),Math.round(p.y*1000),Math.round(p.a*1000),Math.round(t.en*100),Math.round(t.cd[0]*10),Math.round(t.cd[1]*10),Math.round(Math.max(0,t.mv)*100),t.mk,Math.round(Math.max(0,t.ut)*100),Math.round(t.uc*10),Math.round(Math.max(0,SLOW[i])*100),
 ...PWC[i].map((c,j)=>Math.round((1-c/ZCD[PK[j]])*100)),PLT[i]>0?1:0])}
// full: everything for one player who joins or resyncs (does not disturb what the others are sent). Otherwise: what changed this step.
function snapBuild(full){
 const first=!OPREV;let o,f;
 if(full||first){o=rle();f=1;if(!full){OPREV=new Uint8Array(own.length);OPREV.set(own);MDIRTY=false}}
 else if(MDIRTY){o=ODIFF();MDIRTY=false}
 const pl=[];
 for(let i=1;i<=5;i++){const p=P[i],tr=p.tr,nw=[];for(let k=full?0:p.sent;k<tr.length;k++)nw.push(Math.round(tr[k]*20));if(!full)p.sent=tr.length;
  pl.push([Math.round(p.x*20),Math.round(p.y*20),Math.round(p.a*100),snapFlags(i,p),p.rs,nw])}
 const zs=JSON.stringify(ZN.map(z=>z.own)),sendZ=full||zs!==ZSENT||TK%30===0;if(!full&&sendZ)ZSENT=zs;
 const me=[null];for(let i=1;i<=5;i++)me.push(IN[i]?snapMe(i):null);
 const r1=v=>+v.toFixed(1);
 const s=JSON.stringify({t:'s',k:TK,tl:+tl.toFixed(1),p:pl,o,f,mn:MINES.length?MINES.map(m=>[r1(m.x),r1(m.y),m.o,m.arm>0?0:1,m.k]):undefined,z:sendZ?ZN.map(z=>z.own):undefined,
  sh:SHL.length?SHL.map(q=>[r1(q.x),r1(q.y),r1(q.vx),r1(q.vy),q.o]):undefined,bl:BLD.length?BLD.map(q=>[r1(q.x),r1(q.y),r1(q.vx),r1(q.vy),q.o]):undefined,
  ms:MSL.length?MSL.map(q=>[r1(q.x),r1(q.y),+q.a.toFixed(2),q.o]):undefined,sk:STR.length?STR.map(q=>[r1(q.x),r1(q.y),+q.t.toFixed(2),q.o,q.r]):undefined,
  e:(full||!EV.length)?undefined:EV.splice(0)});
 return{s:s.slice(0,-1),m:me}}
function SNAP(){return snapBuild(false)}
function SNAPF(){return snapBuild(true)}
function RESU(){hud();return JSON.stringify({cn:CN,k:KL,d:DE,N:LANDN})}

function hud(nk){
 tally();
 if(!MP&&!nk)for(let i=1;i<=5;i++)if(P[i].alive&&!CN[i])kill(P[i],0,'noland')}