// ---------- match engine: free movement at any angle, territory on a fine mask, trails as polylines ----------
var IN=[],AL=[],BOTS=false,HN=0,KL=[0,0,0,0,0,0],DE=[0,0,0,0,0,0],EV=[],SHD=[0,0,0,0,0,0],CDM={dash:7,shield:18,recall:14,ghost:15,trap:12,emp:15,grab:16};
if(typeof TL==='undefined')var TL=120;
const gx=x=>Math.min(MW-1,Math.max(0,x*MC|0)),gy=y=>Math.min(MH-1,Math.max(0,y*MC|0));
const ownAt=(x,y)=>own[gy(y)*MW+gx(x)];
const rr=(a,b)=>a+GR()*(b-a);
function angd(a,b){let d=b-a;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;return d}
function newP(i){return{id:i,alive:false,sh:0,x:0,y:0,a:0,da:0,tr:[],sent:0,rs:0,out:false,lx:0,ly:0,rt:0,hx:0,hy:0,plan:null,ht:0,hunt:null,rx:0,ry:0,ra:0,st:0,shd:0}}
function stamp(x,y,r,id,pr){const cx=x*MC,cy=y*MC,rc=r*MC,r2=rc*rc;
 for(let Y=Math.max(0,Math.floor(cy-rc));Y<=Math.min(MH-1,Math.ceil(cy+rc));Y++)for(let X=Math.max(0,Math.floor(cx-rc));X<=Math.min(MW-1,Math.ceil(cx+rc));X++){const dx=X+.5-cx,dy=Y+.5-cy;if(dx*dx+dy*dy<=r2&&ISL[Y*MW+X]){const i=Y*MW+X,v=own[i];if(!(pr&&v&&v!==id&&PROT[v]>0))own[i]=id}}}
const FL=new Uint8Array(MW*MH),STK=new Int32Array(MW*MH);
let ISL=new Uint8Array(MW*MH).fill(1),LANDN=MW*MH,LANDI=null,SEED=1,MCX=WW/2,MCY=WH/2,MINES=[],GHO=[0,0,0,0,0,0],SLOW=[0,0,0,0,0,0];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// ---------- deterministic helpers: the same numbers on every device, so a recorded match replays exactly ----------
// The match uses its own seeded random numbers (GR) and arithmetic-only trig (dsin, dcos, dat2, dhyp). Browsers differ in the
// last digits of Math.sin, Math.cos, Math.atan2 and Math.hypot; those tiny differences could otherwise split a replay from the real match.
const STEP=1/30,EVER=15,CAPT=[];let GRS=1,TK=0,REC=null;
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
// ---------- power zones: own half of a zone to unlock its power ----------
let ZN=[],SHL=[],STR=[],ZT=0;const PROT=[0,0,0,0,0,0],HOLD=[0,0,0,0,0,0],PWC=[null,[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
const SHS=45,ZR=3.2,PK=['cannon','fort','strike'],ZBIT={cannon:1,fort:2,strike:4,nitro:8},ZCD={cannon:3.5,fort:25,strike:22},
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
function POW(i,k){const p=P[i],j=PK.indexOf(k);if(!p||!p.alive||j<0||!(HOLD[i]&ZBIT[k])||PWC[i][j]>0)return false;
 if(k==='cannon'){const c=dcos(p.a),s=dsin(p.a);SHL.push({x:p.x+c*1.4,y:p.y+s*1.4,vx:c*SHS,vy:s*SHS,o:i,d:0});EV.push(['fire',i,+p.x.toFixed(1),+p.y.toFixed(1)])}
 else if(k==='fort'){PROT[i]=8;EV.push(['fort',i,+p.x.toFixed(1),+p.y.toFixed(1)])}
 else{const cn=[0,0,0,0,0,0];for(let q=0;q<own.length;q++)cn[own[q]]++;let tg=0;for(let q=1;q<=5;q++)if(q!==i&&P[q].alive&&cn[q]>0&&(!tg||cn[q]>cn[tg]))tg=q;if(!tg)return false;
  const cells=[];for(let q=0;q<own.length;q++)if(own[q]===tg)cells.push(q);const pts=[];
  for(let n=0;n<60&&pts.length<3;n++){const ce=cells[(GR()*cells.length)|0],x=(ce%MW+.5)/MC,y=(((ce/MW)|0)+.5)/MC;if(!pts.some(v=>dhyp(v[0]-x,v[1]-y)<3.5))pts.push([x,y])}
  for(const v of pts)STR.push({x:v[0],y:v[1],t:1.4,o:i});EV.push(['strike',i,tg,0])}
 PWC[i][j]=ZCD[k];return true}
function blast(x,y,r,o){const cx=x*MC,cy=y*MC,rc=r*MC,r2=rc*rc,hit=[];let n=0;
 for(let Y=Math.max(0,Math.floor(cy-rc));Y<=Math.min(MH-1,Math.ceil(cy+rc));Y++)for(let X=Math.max(0,Math.floor(cx-rc));X<=Math.min(MW-1,Math.ceil(cx+rc));X++){const i=Y*MW+X,dx=X+.5-cx,dy=Y+.5-cy,v=own[i];
  if(v&&v!==o&&dx*dx+dy*dy<=r2&&!(PROT[v]>0)){own[i]=0;n++;if(!hit.includes(v))hit.push(v)}}
 EV.push(['boom2',o,+x.toFixed(1),+y.toFixed(1)]);
 if(n){MDIRTY=true;for(const v of hit){let has=false;for(let i=0;i<own.length;i++)if(own[i]===v){has=true;break}if(!has&&P[v].alive)kill(P[v],o,'blast')}}
 return n}
function shellTick(dt){
 for(let k=SHL.length-1;k>=0;k--){const s=SHL[k];let hit=false;for(let j=0;j<4&&!hit;j++){s.x+=s.vx*dt/4;s.y+=s.vy*dt/4;s.d+=SHS*dt/4;
   if(s.x<0||s.y<0||s.x>=WW||s.y>=WH||s.d>=11)hit=true;else if(s.pen!==undefined){s.pen-=SHS*dt/4;if(s.pen<=0)hit=true}else if(s.d>1.2){const o=ownAt(s.x,s.y);if(o&&o!==s.o)s.pen=1.5}}
  if(hit){SHL.splice(k,1);blast(s.x,s.y,2.1,s.o)}}
 for(let k=STR.length-1;k>=0;k--){const s=STR[k];s.t-=dt;if(s.t<=0){STR.splice(k,1);blast(s.x,s.y,2.6,s.o)}}}

function genMap(seed){SEED=(seed>>>0)||1;const R=mulberry32(SEED);
 const lat=n=>{const a=new Float32Array((n+1)*(n+1));for(let i=0;i<a.length;i++)a[i]=R();return a},n1=7,n2=27,A=lat(n1),B=lat(n2);
 const smp=(L,n,u,v)=>{const fx=u*n,fy=v*n,x0=Math.min(n-1,Math.floor(fx)),y0=Math.min(n-1,Math.floor(fy)),tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),w=n+1,a=L[y0*w+x0],b=L[y0*w+x0+1],c=L[(y0+1)*w+x0],d=L[(y0+1)*w+x0+1];return(a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy};
 const val=new Float32Array(MW*MH),LK=[],lakes=(R()<.9?1:0)+(R()<.65?1:0)+(R()<.4?1:0)+(R()<.25?1:0);for(let k=0;k<lakes;k++)LK.push([.25+R()*.5,.25+R()*.5,(.035+R()*.03)*112/WH]);
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const u=(x+.5)/MW,v=(y+.5)/MH,ex=(u-.5)*2,ey=(v-.5)*2,d=Math.sqrt(ex*ex+ey*ey);let s=1-d*d*.95+(smp(A,n1,u,v)-.5)*.75+(smp(B,n2,u,v)-.5)*.17;
  for(const l of LK){const dx=(u-l[0])*WW/WH,dy=v-l[1],r2=dx*dx+dy*dy;if(r2<l[2]*l[2])s-=1.2*(1-r2/(l[2]*l[2]))}val[y*MW+x]=s}
 let lo=-1,hi=1;for(let it=0;it<18;it++){const th=(lo+hi)/2;let c=0;for(let i=0;i<val.length;i++)if(val[i]>th)c++;if(c/val.length>.6)lo=th;else hi=th}
 const th=(lo+hi)/2;for(let i=0;i<val.length;i++)ISL[i]=val[i]>th?1:0;
 for(let x=0;x<MW;x++){ISL[x]=0;ISL[(MH-1)*MW+x]=0}for(let y=0;y<MH;y++){ISL[y*MW]=0;ISL[y*MW+MW-1]=0}
 const lab=new Int32Array(MW*MH),q=new Int32Array(MW*MH);let best=0,bestN=0,cur=0;
 for(let s=0;s<ISL.length;s++)if(ISL[s]&&!lab[s]){cur++;let h=0,t=0;q[t++]=s;lab[s]=cur;
  while(h<t){const i=q[h++],x=i%MW;if(x>0&&ISL[i-1]&&!lab[i-1]){lab[i-1]=cur;q[t++]=i-1}if(x<MW-1&&ISL[i+1]&&!lab[i+1]){lab[i+1]=cur;q[t++]=i+1}if(i>=MW&&ISL[i-MW]&&!lab[i-MW]){lab[i-MW]=cur;q[t++]=i-MW}if(i+MW<ISL.length&&ISL[i+MW]&&!lab[i+MW]){lab[i+MW]=cur;q[t++]=i+MW}}
  if(t>bestN){bestN=t;best=cur}}
 LANDN=0;let sx=0,sy=0;const li=[];for(let i=0;i<ISL.length;i++){ISL[i]=lab[i]===best?1:0;if(ISL[i]){LANDN++;sx+=i%MW;sy+=(i/MW)|0;li.push(i)}}
 LANDI=Int32Array.from(li);MCX=(sx/LANDN+.5)/MC;MCY=(sy/LANDN+.5)/MC;placeZones()}
function nearOwn(p){if(ownAt(p.x,p.y)===p.id)return true;for(let k=0;k<8;k++){const a=k/8*6.283;if(ownAt(p.x+dcos(a)*1.6,p.y+dsin(a)*1.6)===p.id)return true}return false}
function grabAt(p){const id=p.id,cx=p.x*MC,cy=p.y*MC,rc=3*MC,r2=rc*rc;FL.fill(0);let g=0;
 for(let Y=Math.max(0,Math.floor(cy-rc));Y<=Math.min(MH-1,Math.ceil(cy+rc));Y++)for(let X=Math.max(0,Math.floor(cx-rc));X<=Math.min(MW-1,Math.ceil(cx+rc));X++){const i=Y*MW+X,dx=X+.5-cx,dy=Y+.5-cy;if(dx*dx+dy*dy<=r2&&ISL[i]&&own[i]!==id&&!(PROT[own[i]]>0)){own[i]=id;FL[i]=2;g++}}
 MDIRTY=true;const cnt=[0,0,0,0,0,0];for(let i=0;i<own.length;i++)cnt[own[i]]++;
 for(const q of P)if(q&&q!==p&&q.alive&&!(GHO[q.id]>0)){const t=q.tr;let hit=false;for(let i=2;i+1<t.length;i+=2)if(FL[gy(t[i+1])*MW+gx(t[i])]===2){hit=true;break}if(hit)kill(q,id,'enclosed');else if(!cnt[q.id])kill(q,id,'noland')}
 return g}

function newGame(){own.fill(0);MDIRTY=true;P=[null];for(let i=1;i<=5;i++)P.push(newP(i));
 me=P[1];FX=[];PO=[];FD=[];tl=120;score=kills=streak=0;en=1;boost=0;for(let i=1;i<=5;i++)spawn(P[i]);
 tg.x=ptr.x=me.x;tg.y=ptr.y=me.y;tg.a=me.a;ptr.down=0;state='play';tally()}
function spawn(p){
 for(let k=0;k<80;k++){const ci=LANDI?LANDI[rnd(LANDI.length)]:rnd(own.length),x=(ci%MW+.5)/MC,y=(((ci/MW)|0)+.5)/MC;let ok=1;const cx=Math.round(x*MC),cy=Math.round(y*MC);
  for(let dy=-18;dy<=18&&ok;dy+=2)for(let dx=-18;dx<=18;dx+=2){if(dx*dx+dy*dy>324)continue;const X=cx+dx,Y=cy+dy;if(X<0||Y<0||X>=MW||Y>=MH||!ISL[Y*MW+X]||own[Y*MW+X]){ok=0;break}}
  if(ok&&ZN.some(z=>dhyp(z.x-x,z.y-y)<8))ok=0;if(ok)for(const q of P)if(q&&q!==p&&q.alive&&q.tr.length){for(let i=0;i<q.tr.length;i+=2)if(dhyp(q.tr[i]-x,q.tr[i+1]-y)<5){ok=0;break}}
  if(ok){stamp(x,y,2.6,p.id);p.x=p.lx=p.rx=x;p.y=p.ly=p.ry=y;p.hx=x;p.hy=y;p.a=p.da=p.ra=rr(-3.14,3.14);p.alive=true;p.sh=2;p.born=clk;p.tr=[];p.sent=0;p.rs++;p.out=false;p.plan=null;MDIRTY=true;return}}
 p.rt=1}
function kill(p,by,why){
 if(!p.alive||p.sh>0)return;
 if(by&&SHD[p.id]>0){SHD[p.id]=0;p.sh=1;EV.push(['pop',p.id,+p.x.toFixed(1),+p.y.toFixed(1)]);return}
 if(!IS_SRV){p.wreck={x:p.x,y:p.y,a:p.a,t0:clk};if(p.tr.length>3)p.ghost={tr:p.tr.slice(),t0:clk}}p.alive=false;SHD[p.id]=0;DE[p.id]++;if(by&&by!==p.id)KL[by]++;
 if(!IS_SRV&&!FF){burst(p.x,p.y,COLS[p.id],p===me?60:34,11);shake=Math.max(shake,p===me?16:7);
  if(p===me){snd('die');buzz(200)}else snd('ko')}
 if(by===VS&&!IS_SRV)credit(p);
 const heir=(by&&by!==p.id&&P[by]&&P[by].alive)?by:0;let tn=0;for(let i=0;i<own.length;i++)if(own[i]===p.id){own[i]=heir;tn++}MDIRTY=true;PROT[p.id]=0;
 p.tr=[];p.sent=0;p.rs++;p.out=false;p.rt=p===me?1.8:1.5;
 EV.push(['ko',p.id,by||0,why||'']);if(heir&&tn)EV.push(['seize',heir,p.id,tn]);if(p===me)streak=0}
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
 for(const q of P)if(q&&q!==p&&q.alive){const t=q.tr;let hit=false;for(let i=2;i+1<t.length;i+=2)if(FL[gy(t[i+1])*MW+gx(t[i])]===2){hit=true;break}
  if(hit&&!(GHO[q.id]>0))kill(q,id,'enclosed');else if(!cnt[q.id])kill(q,id,'noland')}
 if(p===me&&g>8&&!IS_SRV){score+=Math.round(g*.6);if(!FF){burst(p.x,p.y,COLS[p.id],22,9);burst(p.x,p.y,'#ffffff',10,7);pop(p.x,p.y-1.5,'+'+Math.round(g*1000/LANDN)/10+'%',COLS[p.id]);shake=Math.max(shake,Math.min(10,g/70));snd('capture',g);buzz(25);CAPT.push([clk,g])}}
 return g}
function segD2(px,py,x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,l=dx*dx+dy*dy;let t=l?((px-x0)*dx+(py-y0)*dy)/l:0;t=t<0?0:t>1?1:t;const ex=x0+dx*t-px,ey=y0+dy*t-py;return ex*ex+ey*ey}
function pointStep(p){
 if(ownAt(p.x,p.y)===p.id){if(p.out){p.tr.push(p.x,p.y);p.out=false;capture(p)}p.lx=p.x;p.ly=p.y}
 else{if(!p.out){p.out=true;p.tr=[p.lx,p.ly];p.sent=0;p.rs++}
  const t=p.tr,L=t.length;if(dhyp(p.x-t[L-2],p.y-t[L-1])>=TSP)t.push(p.x,p.y);
  if(!(GHO[p.id]>0))for(let i=2;i+3<L-12;i+=2)if(Math.abs(p.x-t[i])<1.5&&Math.abs(p.y-t[i+1])<1.5&&segD2(p.x,p.y,t[i],t[i+1],t[i+2],t[i+3])<.09){kill(p,0,'self');return}}
 if(!(GHO[p.id]>0))for(const q of P)if(q&&q!==p&&q.alive&&q.tr.length>=4&&!(GHO[q.id]>0)){const t=q.tr;for(let i=0;i+3<t.length;i+=2)if(Math.abs(p.x-t[i])<2&&Math.abs(p.y-t[i+1])<2&&segD2(p.x,p.y,t[i],t[i+1],t[i+2],t[i+3])<.64){kill(q,p.id,'cut');break}}}
// How a car moves. The server's step and the phone's prediction of your own car both use these two functions, so they agree exactly.
function turnTo(s,da,dt){const d=angd(s.a,da),m=TURN*dt;s.a+=Math.abs(d)<m?d:(d<0?-m:m);if(s.a>Math.PI)s.a-=6.2832;else if(s.a<-Math.PI)s.a+=6.2832}
function moveSub(s,c,sn,st){let nx=Math.min(WW-HR,Math.max(HR,s.x+c*st)),ny=Math.min(WH-HR,Math.max(HR,s.y+sn*st));
 if(!isLand(nx,ny)){if(isLand(nx,s.y))ny=s.y;else if(isLand(s.x,ny))nx=s.x;else{nx=s.x;ny=s.y}}
 s.x=nx;s.y=ny}
function stepP(p,dt,spd){turnTo(p,p.da,dt);
 const dist=spd*dt,n=Math.max(1,Math.ceil(dist/.35)),st=dist/n,c=dcos(p.a),s=dsin(p.a);
 for(let k=0;k<n&&p.alive;k++){moveSub(p,c,s,st);pointStep(p)}}
function rayOut(p,ph){let d=0;while(d<30&&ownAt(p.x+dcos(ph)*d,p.y+dsin(ph)*d)===p.id)d+=.5;return d}
// How many of the next n ticks would the car stay on land if it steered toward heading c? (same speed and turning as the real thing, so tight shores are judged right)
function landRun(p,c,n){let x=p.x,y=p.y,a=p.a;const m=TURN*STEP,st=SPD*.92*STEP;
 for(let i=0;i<n;i++){const d=angd(a,c);a+=Math.abs(d)<m?d:(d<0?-m:m);x+=dcos(a)*st;y+=dsin(a)*st;if(!isLand(x,y))return i}
 return n}
// Keep the wanted heading if it is safe, otherwise the nearest heading that is (fanning out to the side it chose last time, so it does not dither at a shore)
function botAvoid(p,da){const N=15;let bn=landRun(p,da,N);if(bn>=N)return da;
 const sg0=p.avs||1;let best=da;
 for(let k=1;k<=10;k++)for(let j=0;j<2;j++){const sg=j?-sg0:sg0,c=da+sg*k*.3,r=landRun(p,c,N);if(r>=N){p.avs=sg;return c}if(r>bn){bn=r;best=c}}
 return best}
function botCtl(p,dt){
 const inside=ownAt(p.x,p.y)===p.id;
 if(!p.plan&&inside){const base=dat2(WH/2-p.y,WW/2-p.x),ph=GR()<.6?base+rr(-1.3,1.3):rr(-3.14,3.14),sg=GR()<.5?1:-1,R1=rayOut(p,ph)+rr(2.5,6),R2=rr(3,7),pa=ph+sg*1.5708;
  const ax=p.x+dcos(ph)*R1,ay=p.y+dsin(ph)*R1,cl=(x,y)=>{x=Math.min(WW-2,Math.max(2,x));y=Math.min(WH-2,Math.max(2,y));for(let t=1;t>0&&!isLand(x,y);t-=.1){x=p.x+(x-p.x)*.9;y=p.y+(y-p.y)*.9}return[x,y]};
  let zt=null;if(ZN.length&&GR()<.45){let bd=18;for(const z of ZN){if(z.own===p.id)continue;const d=dhyp(z.x-p.x,z.y-p.y);if(d<bd){bd=d;zt=z}}}
  if(zt){const za=dat2(zt.y-p.y,zt.x-p.x),zr=ZR+2.4,zp=an=>cl(zt.x+dcos(an)*zr,zt.y+dsin(an)*zr);p.plan={w:[zp(za-1.9),zp(za),zp(za+1.9),[p.x,p.y]],i:0}}
  else p.plan={w:[cl(ax,ay),cl(ax+dcos(pa)*R2,ay+dsin(pa)*R2),cl(p.x+dcos(pa)*R2*.9,p.y+dsin(pa)*R2*.9),[p.x,p.y]],i:0}}
 let tx=p.hx,ty=p.hy;
 if(p.plan){const w=p.plan.w[p.plan.i];tx=w[0];ty=w[1];if(dhyp(tx-p.x,ty-p.y)<1.3&&++p.plan.i>=p.plan.w.length)p.plan=null}
 if(p.out&&p.tr.length>260){tx=p.hx;ty=p.hy;p.plan=null}
 let da=dat2(ty-p.y,tx-p.x);
 p.ht-=dt;if(p.ht<=0){p.ht=.25;let bd=10,hx=0,hy=0,f=0;
  for(const q of P)if(q&&q!==p&&q.alive&&q.tr.length)for(let i=0;i<q.tr.length;i+=2){const d=dhyp(q.tr[i]-p.x,q.tr[i+1]-p.y);if(d<bd&&Math.abs(angd(p.a,dat2(q.tr[i+1]-p.y,q.tr[i]-p.x)))<1.6){bd=d;hx=q.tr[i];hy=q.tr[i+1];f=1}}
  p.hunt=f?[hx,hy]:null}
 if(p.hunt)da=dat2(p.hunt[1]-p.y,p.hunt[0]-p.x);
 const lx=p.x+dcos(p.a)*1.8,ly=p.y+dsin(p.a)*1.8;
 if(p.out)for(let i=0;i+1<p.tr.length-14;i+=2)if(dhyp(lx-p.tr[i],ly-p.tr[i+1])<1.5){da=p.a+(GR()<.5?1.3:-1.3);break}
 da=botAvoid(p,da);
 // pinned or sliding along a shore (the car turns in place but cannot move): pivot toward the most open direction for a moment and drop the plan that led here
 {const mv=p.qx===undefined?9:dhyp(p.x-p.qx,p.y-p.qy);p.qx=p.x;p.qy=p.y;p.pin=(mv<.25&&!(SLOW[p.id]>0))?(p.pin||0)+1:0;
  if(p.pvt>0){p.pvt-=dt;da=p.pv}
  else if(p.pin>=4){let bk=-99,ba=da;for(let k=0;k<24;k++){const an=-3.1416+k*.2618;let d=0;while(d<7&&isLand(p.x+dcos(an)*d,p.y+dsin(an)*d))d+=.35;const sc=d-.4*Math.abs(angd(an,da));if(sc>bk){bk=sc;ba=an}}
   p.pv=ba;p.pvt=.7;p.pin=0;p.plan=null;da=ba}}
 p.bc=(p.bc||0)-dt;if(p.hunt&&p.bc<=0&&dhyp(p.hunt[0]-p.x,p.hunt[1]-p.y)<5){p.bd=DSHT;p.bc=7;EV.push(['dash',p.id,+p.x.toFixed(1),+p.y.toFixed(1)])}
 p.bm=(p.bm||0)-dt;if(p.out&&p.bm<=0&&p.tr.length>50&&GR()<.02){p.bm=12;const mx=p.x-dcos(p.a)*1.5,my=p.y-dsin(p.a)*1.5;MINES.push({x:mx,y:my,o:p.id,t:14,arm:.5});EV.push(['mine',p.id,+mx.toFixed(1),+my.toFixed(1)])}
 const hb=HOLD[p.id];if(hb){const pc=PWC[p.id];
  if((hb&1)&&pc[0]<=0)for(let d=2;d<=10;d++){const o=ownAt(p.x+dcos(p.a)*d,p.y+dsin(p.a)*d);if(o&&o!==p.id&&!(PROT[o]>0)){POW(p.id,'cannon');break}}
  if((hb&2)&&pc[1]<=0&&GR()<.01)POW(p.id,'fort');
  if((hb&4)&&pc[2]<=0&&GR()<.03)POW(p.id,'strike')}
 p.da=da}
function MPS(n,bots,nb,seed){genMap(seed===undefined?(Math.random()*1e9|0):seed);GRS=(SEED^0x9E3779B9)|0;TK=0;REC=null;MINES.length=0;GHO.fill(0);SLOW.fill(0);SHL.length=0;STR.length=0;PROT.fill(0);HOLD.fill(0);for(let i=1;i<=5;i++)PWC[i]=[0,0,0];ZT=0;newGame();state='play';tl=TL;HN=n;BOTS=!!bots;KL.fill(0);DE.fill(0);SHD.fill(0);EV.length=0;IN.length=0;
 for(let i=n+1;i<=5;i++){const p=P[i];if(bots&&i<=n+(nb===undefined?5:nb))continue;for(let k=0;k<own.length;k++)if(own[k]===i)own[k]=0;p.alive=false;p.rt=1e9;p.tr=[]}
 MDIRTY=true;
 for(let i=1;i<=n;i++)IN[i]={a:P[i].a,b:0,en:1,ab:(AL[i]&&AL[i].length===2)?AL[i]:['boost','dash'],cd:[0,0],dash:0,sd:0}}
function DROP(i){const p=P[i];for(let k=0;k<own.length;k++)if(own[k]===i)own[k]=0;MDIRTY=true;p.alive=false;p.tr=[];p.sent=0;p.rs++;p.out=false;p.rt=1e9;SHD[i]=0;PROT[i]=0;IN[i]=null}
function recallTo(p,t){p.tr=[];p.sent=0;p.rs++;p.out=false;let b=-1,bd=1e9;const cx=p.x*MC,cy=p.y*MC;
 for(let k=0;k<own.length;k++)if(own[k]===p.id){const dx=(k%MW)+.5-cx,dy=((k/MW)|0)+.5-cy,d=dx*dx+dy*dy;if(d<bd){bd=d;b=k}}
 if(b>=0){p.x=p.lx=((b%MW)+.5)/MC;p.y=p.ly=(((b/MW)|0)+.5)/MC}}
function USE(i,s){const t=IN[i],p=P[i];if(!t||!p||!p.alive||s<1||s>2)return;const k=s-1,a=t.ab[k];if(t.cd[k]>0)return;
 const ev=n=>EV.push([n,i,+p.x.toFixed(1),+p.y.toFixed(1)]);
 if(a==='dash'){t.cd[k]=CDM.dash;t.dash=DSHT;ev('dash')}
 else if(a==='shield'&&!SHD[i]){t.cd[k]=CDM.shield;SHD[i]=1;t.sd=8;ev('shield')}
 else if(a==='recall'&&p.tr.length){t.cd[k]=CDM.recall;recallTo(p,t);ev('recall')}
 else if(a==='ghost'){t.cd[k]=CDM.ghost;GHO[i]=2.5;ev('ghost')}
 else if(a==='trap'){t.cd[k]=CDM.trap;const mx=p.x-dcos(p.a)*1.5,my=p.y-dsin(p.a)*1.5;MINES.push({x:mx,y:my,o:i,t:14,arm:.5});const ms=MINES.filter(m=>m.o===i);if(ms.length>2)MINES.splice(MINES.indexOf(ms[0]),1);EV.push(['mine',i,+mx.toFixed(1),+my.toFixed(1)])}
 else if(a==='emp'){t.cd[k]=CDM.emp;for(let j=1;j<=5;j++){const q=P[j];if(j!==i&&q.alive&&dhyp(q.x-p.x,q.y-p.y)<7)SLOW[j]=2.2}ev('emp')}
 else if(a==='grab'&&nearOwn(p)){t.cd[k]=CDM.grab;grabAt(p);ev('grab')}}
// ---------- one fixed step, recorded inputs and checksums (used by the server, by practice matches and by replays) ----------
function INP(i,ai,b){const t=IN[i];if(!t)return;const a=ai/50,bb=b?1:0;if(t.a===a&&t.b===bb)return;t.a=a;t.b=bb;
 if(REC){const L=REC.ops[REC.ops.length-1];if(L&&L[0]===TK&&L[1]===i&&L[2]===0){L[3]=ai;L[4]=bb}else REC.ops.push([TK,i,0,ai,bb])}}
function ABU(i,s){USE(i,s);if(REC)REC.ops.push([TK,i,1,s])}
function PWU(i,k){POW(i,k);if(REC)REC.ops.push([TK,i,2,PK.indexOf(k)])}
function DRP(i){DROP(i);if(REC)REC.ops.push([TK,i,3])}
function APPLY(o){const i=o[1],k=o[2];if(k===0){const t=IN[i];if(t){t.a=o[3]/50;t.b=o[4]?1:0}}else if(k===1)USE(i,o[3]);else if(k===2)POW(i,PK[o[3]]);else if(k===3)DROP(i)}
function CHK(){let h=-2128831035;for(let i=0;i<own.length;i++)h=Math.imul(h^own[i],16777619);
 for(let i=1;i<=5;i++){const p=P[i];h=Math.imul(h^Math.round(p.x*1000),16777619);h=Math.imul(h^Math.round(p.y*1000),16777619);h=Math.imul(h^(p.alive?1:0),16777619)}return h>>>0}
function tally(){CN=[0,0,0,0,0,0];for(let i=0;i<own.length;i++)CN[own[i]]++}
function STEPF(){upd(STEP);TK++;if(TK%8===0)hud();if(REC&&TK%150===0)REC.chk.push([TK,CHK()])}
function recStart(){REC={v:EVER,seed:SEED,h:HN,bots:BOTS?1:0,tl:TL,al:AL.map(a=>a?a.slice():null),ops:[],chk:[]}}
function recEnd(){const r=REC;REC=null;if(!r)return null;tally();r.ticks=TK;r.fin={cn:CN.slice(),k:KL.slice(),d:DE.slice(),N:LANDN};return JSON.stringify(r)}
function rdyOf(t){return t?t.ab.map((a,k)=>a==='boost'?+t.en.toFixed(2):+(1-t.cd[k]/CDM[a]).toFixed(2)):[1,1]}
function upd(dt){tl-=dt;streakT-=dt;if(IS_SRV){FX.length=0;PO.length=0;FD.length=0}
 for(let i=1;i<=5;i++){if(GHO[i]>0)GHO[i]-=dt;if(SLOW[i]>0)SLOW[i]-=dt;if(PROT[i]>0)PROT[i]-=dt;const c=PWC[i];for(let j=0;j<3;j++)if(c[j]>0)c[j]-=dt}
 zoneTick(dt);shellTick(dt);
 for(let k=MINES.length-1;k>=0;k--){const m=MINES[k];m.t-=dt;m.arm-=dt;if(m.t<=0){MINES.splice(k,1);continue}if(m.arm>0)continue;
  for(let j=1;j<=5;j++){const q=P[j];if(j===m.o||!q.alive||q.sh>0)continue;if(dhyp(q.x-m.x,q.y-m.y)<.95){EV.push(['boom',m.o,+m.x.toFixed(1),+m.y.toFixed(1)]);kill(q,m.o,'mine');MINES.splice(k,1);break}}}
 for(let i=1;i<=5;i++){const p=P[i],t=IN[i];p.sh-=dt;
  if(!p.alive){if((p.rt-=dt)<=0){spawn(p);if(t&&p.alive)t.a=p.a}continue}
  if(!t){if(BOTS&&i>HN){botCtl(p,dt);if(p.bd>0)p.bd-=dt;stepP(p,dt,SPD*.92*(p.bd>0?DSHM:1)*(SLOW[i]>0?SLWM:1)*((HOLD[i]&8)?NITM:1))}continue}
  t.cd[0]=Math.max(0,t.cd[0]-dt);t.cd[1]=Math.max(0,t.cd[1]-dt);
  if(SHD[i]>0&&(t.sd-=dt)<=0)SHD[i]=0;
  const b=t.b&&t.en>0&&t.ab.includes('boost'),slw=SLOW[i]>0?SLWM:1;t.en=b?Math.max(0,t.en-dt*.5):Math.min(1,t.en+dt*.2);
  const dsh=t.dash>0;if(dsh)t.dash-=dt;
  p.da=t.a;stepP(p,dt,SPD*(b?BSTM:1)*(dsh?DSHM:1)*slw*((HOLD[i]&8)?NITM:1))}}
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
function snapFlags(i,p){return(p.alive?1:0)|(SLOW[i]>0?2:0)|(GHO[i]>0?4:0)|(((IN[i]&&IN[i].dash>0)||p.bd>0)?8:0)|(SHD[i]?16:0)|(p.sh>0?32:0)|(Math.min(15,Math.ceil(Math.max(0,PROT[i])))<<6)|(HOLD[i]<<10)}
function snapMe(i){const p=P[i],t=IN[i];return JSON.stringify([Math.round(p.x*1000),Math.round(p.y*1000),Math.round(p.a*1000),Math.round(t.en*100),Math.round(t.cd[0]*10),Math.round(t.cd[1]*10),Math.round(Math.max(0,t.dash)*100),
 ...PWC[i].map((c,j)=>Math.round((1-c/ZCD[PK[j]])*100))])}
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
 const s=JSON.stringify({t:'s',k:TK,tl:+tl.toFixed(1),p:pl,o,f,mn:MINES.length?MINES.map(m=>[+m.x.toFixed(1),+m.y.toFixed(1),m.o,m.arm>0?0:1]):undefined,z:sendZ?ZN.map(z=>z.own):undefined,
  sh:SHL.length?SHL.map(q=>[+q.x.toFixed(1),+q.y.toFixed(1),+q.vx.toFixed(1),+q.vy.toFixed(1),q.o]):undefined,sk:STR.length?STR.map(q=>[+q.x.toFixed(1),+q.y.toFixed(1),+q.t.toFixed(2),q.o]):undefined,
  e:(full||!EV.length)?undefined:EV.splice(0)});
 return{s:s.slice(0,-1),m:me}}
function SNAP(){return snapBuild(false)}
function SNAPF(){return snapBuild(true)}
function RESU(){hud();return JSON.stringify({cn:CN,k:KL,d:DE,N:LANDN})}

function hud(nk){
 tally();
 if(!MP&&!nk)for(let i=1;i<=5;i++)if(P[i].alive&&!CN[i])kill(P[i],0,'noland')}
