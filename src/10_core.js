if(!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h){this.rect(x,y,w,h)};
document.addEventListener('gesturestart',e=>e.preventDefault());
const $=id=>document.getElementById(id),cv=$('cv'),ctx=cv.getContext('2d');
const IS_SRV=typeof SRV!=='undefined',VER='15';
const GOAL=35,COLS=['','#2f6bff','#ff4d5e','#1fbf75','#ffb020','#9b5cff'],DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
// speed and handling. The turning circle stays the same as before (SPD/TURN = 1.6 units); the whole game is simply faster.
const WW=101,WH=177,MC=3,MW=WW*MC,MH=WH*MC,HR=.9,SPD=18,TURN=11.2,TSP=.55,BSTM=1.45,DSHM=2.5,DSHT=.28,NITM=1.15,SLWM=.55;
// MP: 1 while an online match is shown (the server decides). VS: the player whose view this is (1 in play, any slot in a replay). FF: 1 while a replay is being fast-forwarded (no sound or effects).
let MP=0,VS=1,FF=0;
let FX=[],PO=[],shake=0,score=0,kills=0,streak=0,streakT=0,en=1,boost=0,tl=120,CN=[0,0,0,0,0,0],FD=[],NM=['','You','Blaze','Mira','Kabir','Nova'],W=WW,H=WH,cs=10,dpr=1,own=new Uint8Array(MW*MH),P=[null],me=null,state='menu',T={},ptr={type:'mouse',x:0,y:0,px:0,py:0,ax:0,ay:0,down:0,id:null},tg={x:0,y:0,a:0},last=0,hudT=0,fr=0,best=0,MDIRTY=true,clk=0;
let CAM={x:WW/2,y:WH/2,z:15,vz:26,oy:0},vw=400,vh=700,MINI=null,PREV=null,FLASH=null,RINGS=[],MNV=[],SCORCH=[],ZMY=[],ZOWN=[],SHV=[],STV=[],MYHOLD=0,MYPW=[0,0,0],DOCKV='',DOCKS='';const SHP=4,PRV=[0,0,0,0,0,0],HOLDV=[0,0,0,0,0,0];

// ---------- settings and picture quality (saved on the phone) ----------
const SET={music:1,sfx:1,vib:1,q:'auto',mvol:.8,svol:.9};
// dpr: sharpness of cars and HUD. gls: sharpness of the ground. tier: 1 adds floes, glitter and cracks to the ground. hi: extra sparks and sprays.
const QLV={high:{fx:1,glow:1,dpr:2,gls:2,tier:1,hi:1},med:{fx:.65,glow:1,dpr:1.5,gls:1.4,tier:1,hi:0},low:{fx:.35,glow:0,dpr:1,gls:.9,tier:0,hi:0}};
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
// kinds of sparks (k): 0 dot, 1 glowing streak, 2 smoke, 3 tumbling chip, 4 ember. Phones on high quality get the full mix.
function burst(x,y,c,n,s){if(FF||IS_SRV)return;n=Math.ceil(n*QL.fx);const hi=QL.hi;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=(.3+Math.random())*(s||8),l=.5+Math.random()*.6;let k=0;if(hi){const r=Math.random();k=r<.34?1:r<.5?3:r<.62?2:0}
 FX.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l,l0:l,c,k,s:k===3?.1+Math.random()*.12:k===2?.35+Math.random()*.3:undefined,r:Math.random()*6.28,vr:(Math.random()-.5)*14})}}
function pop(x,y,t,c,l){if(FF||state==='menu')return;const n=PO.filter(q=>q.l>.5&&Math.abs(q.x-x)<6&&Math.abs(q.y-y)<6).length;PO.push({x,y:y-n*1.7,t,c,l:l||1.1,l0:l||1.1})}
function credit(p){if(state!=='play')return;kills++;streak=streakT>0?streak+1:1;streakT=4;score+=500*streak;
 pop(p.x,p.y,streak>1?['','','Double kill','Triple kill','Rampage'][Math.min(streak,4)]:'Eliminated',COLS[VS]);snd('kill');buzz(40)}
function setBoost(v){if(v&&!boost&&en>.05)snd('boost');boost=v}
function theme(){const s=getComputedStyle(document.documentElement);T.board=s.getPropertyValue('--board').trim();T.grid=s.getPropertyValue('--grid').trim()}
