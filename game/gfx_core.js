
// ---------- small helpers shared by the 3D scene, the HUD and the menus (phone only) ----------
function mkc(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
const rgbOf=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const shade=(h,f)=>{const c=rgbOf(h);return'rgb('+(c[0]*f|0)+','+(c[1]*f|0)+','+(c[2]*f|0)+')'};
const tint=(h,f)=>{const c=rgbOf(h);return'rgb('+(c[0]+(255-c[0])*f|0)+','+(c[1]+(255-c[1])*f|0)+','+(c[2]+(255-c[2])*f|0)+')'};
const rgba=(h,a)=>{const c=rgbOf(h);return'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'};
const lg=(g,x0,y0,x1,y1,st)=>{const r=g.createLinearGradient(x0,y0,x1,y1);for(const s of st)r.addColorStop(s[0],s[1]);return r};
const rg=(g,x0,y0,r0,x1,y1,r1,st)=>{const r=g.createRadialGradient(x0,y0,r0,x1,y1,r1);for(const s of st)r.addColorStop(s[0],s[1]);return r};
// sRGB hex -> linear rgb (what the 3D scene works in)
const lin=v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);
const linOf=h=>{const c=rgbOf(h);return[lin(c[0]/255),lin(c[1]/255),lin(c[2]/255)]};
const COLLIN=COLS.map(c=>c?linOf(c):[1,1,1]);
const nmClean=n=>(n||'').replace(/^\u{1F916}\s*/u,''),nmBot=n=>!!n&&n.codePointAt(0)===0x1F916;
// fine film grain used behind panels and buttons (also handed to the page styles as --grain / --grain2)
let GRAIN=null;
function grainTile(){if(GRAIN)return GRAIN;const N=128,c=mkc(N,N),g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data,cl=new Float32Array(N*N/4);
 for(let i=0;i<cl.length;i++)cl[i]=Math.random();
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=(y*N+x)*4,v=Math.random()*.6+cl[(y>>1)*(N>>1)+(x>>1)]*.4,a=Math.abs(v-.5)*2;d[i]=d[i+1]=d[i+2]=v>.5?255:0;d[i+3]=Math.round(a*a*58)}
 g.putImageData(im,0,0);return GRAIN=c}
function grainCss(){try{const t=grainTile(),c=mkc(96,96),g=c.getContext('2d');g.drawImage(t,0,0,96,96,0,0,96,96);
 const root=document.documentElement.style;root.setProperty('--grain','url('+c.toDataURL('image/png')+')');
 const c2=mkc(96,96),g2=c2.getContext('2d');g2.globalAlpha=.5;g2.drawImage(c,0,0);root.setProperty('--grain2','url('+c2.toDataURL('image/png')+')')}catch(e){}}
// a small car seen from above, nose to the right (loading screen logo and plain fallback view)
function carChip(x,y,s,col,a,gg){const g=gg;g.save();g.translate(x,y);if(a)g.rotate(a);
 g.fillStyle='rgba(0,0,0,.30)';g.beginPath();g.roundRect(-s*1.08,-s*.5,s*2.2,s*1.14,s*.42);g.fill();
 g.fillStyle=col;g.beginPath();g.roundRect(-s*1.1,-s*.58,s*2.2,s*1.16,s*.42);g.fill();
 g.fillStyle='rgba(255,255,255,.30)';g.beginPath();g.roundRect(-s*.98,-s*.5,s*1.96,s*.36,s*.3);g.fill();
 g.fillStyle='rgba(8,12,22,.84)';g.beginPath();g.roundRect(-s*.28,-s*.38,s*.72,s*.76,s*.18);g.fill();
 g.fillStyle='rgba(255,255,255,.9)';g.fillRect(s*.66,-s*.44,s*.2,s*.2);g.fillRect(s*.66,s*.24,s*.2,s*.2);g.restore()}
// ---------- online play: the server decides everything, the phone predicts your own car and smooths everyone else ----------
// Your car: it moves the instant you steer, using the same movement code as the server (turnTo / moveSub). Each snapshot carries the server's version of
// your car and says which of your inputs it had seen; the phone replays the rest on top, so a tiny error is all that is ever corrected, and it is eased away.
// Other cars: shown a few snapshots in the past, between two real server positions, so their motion is smooth whatever the connection does.
const TKMS=1000/30,now=()=>performance.now();
const NC={
 hasSnap:0,off:0,offw:[],jit:0,dly:2.6,        // clock: local ms minus server ms (best of the last 4 s), arrival jitter, delay of the picture in ticks
 buf:[],ai:0,                                    // snapshots waiting to be shown, and how many of them have been shown
 seq:0,sent:[],lastAck:null,curSent:{a:9,b:9},lastSend:0,pendU:0,
 S:null,k:0,qi:0,base:{a:0,b:0},ph:0,phw:[],hasPh:0,havePh:0,O:{x:0,y:0,a:0},alive:0,cl:0,nitro:0,
 tail:[],out:0,lx:0,ly:0,tb:null,                // predicted end of your own trail
 rtt:0,ping:0,pingT:0,
 st:{n:0,rec:0,errSum:0,errMax:0,big:0,dMax:0,drop:0}};
function ncReset(you){
 NC.hasSnap=0;NC.off=0;NC.offw=[];NC.jit=0;NC.dly=2.6;NC.buf=[];NC.ai=0;NC.seq=0;NC.sent=[];NC.lastAck=null;NC.curSent={a:9,b:9};NC.lastSend=0;NC.pendU=0;NC.phw=[];NC.hasPh=0;NC.havePh=0;NC.ph=0;NC.k=0;NC.qi=0;NC.base={a:0,b:0};
 OWNS=new Uint8Array(own.length);PC.q=[];
 NC.S=null;NC.O={x:0,y:0,a:0};NC.alive=0;NC.cl=CLSI[1]|0;NC.nitro=0;NC.tail=[];NC.out=0;NC.tb=null;NC.rtt=NC.rtt||0;
 NC.st={n:0,rec:0,errSum:0,errMax:0,big:0,dMax:0,drop:0}}

// ---------- reading a snapshot ----------
function diffApply(d){let k=0;for(let i=0;i+2<d.length;i+=3){k+=d[i];const n=d[i+1],v=MAP[d[i+2]]||0;own.fill(v,k,k+n);if(OWNS)OWNS.fill(v,k,k+n);k+=n}MDIRTY=true}
function ncOnSnap(m){
 const t=now();NC.st.n++;
 // clock: the fastest arrivals of the last 4 seconds tell when a given server tick "should" show up
 const o=t-m.k*TKMS;NC.offw.push([t,o]);while(NC.offw.length&&t-NC.offw[0][0]>4000)NC.offw.shift();
 let mn=1e18;for(const w of NC.offw)if(w[1]<mn)mn=w[1];
 if(!NC.hasSnap){NC.off=mn;NC.hasSnap=1}else NC.off+=(mn-NC.off)*.06;
 NC.jit+=(Math.max(0,o-mn)-NC.jit)*.08;
 const want=Math.max(2.2,Math.min(7,2.2+NC.jit*2.2/TKMS));NC.dly+=(want-NC.dly)*.04;
 // full picture (joining, or catching up after a bad connection) or just what changed
 if(m.f){for(const q of P)if(q){q.tr=[];q.trk=[]}NC.buf=[];NC.ai=0}
 if(m.o){if(m.f)unrle(m.o);else diffApply(m.o)}
 tl=m.tl;
 MNV=(m.mn||[]).map(v=>[v[0],v[1],MAP[v[2]],v[3],v[4]|0]);if(m.z)ZOWN=m.z.map(o2=>MAP[o2]||0);
 STV=(m.sk||[]).map(v=>[v[0],v[1],v[2],MAP[v[3]],v[4]]);
 if(m.e)for(const [ty,s,x,y] of m.e){if(ty==='ko'){koMsg(MAP[s],x?MAP[x]:0,y);continue}if(ty==='zone'){zoneEv(s,MAP[x]||0,MAP[y]||0);continue}if(ty==='seize'){seizeEv(MAP[s],MAP[x],y);continue}if(ty==='strike'||ty==='orbital'){strikeEv(ty,MAP[s],MAP[x]);continue}evFx(ty,MAP[s],x,y)}
 // everybody's latest numbers; your own car is handled right away, the others wait in line to be shown in the past
 const pl=m.p.map((a,i)=>({id:MAP[i+1],x:a[0]/20,y:a[1]/20,a:a[2]/100,f:a[3],rs:a[4],nw:a[5]}));
 for(const a of pl){const p=P[a.id];if(!p)continue;p.x=a.x;p.y=a.y;p.a=a.a;p.st2=a.f;
  if(a.id===1)ncApplyMe(a,m,t);else{p.sx=a.x;p.sy=a.y}}
 NC.buf.push({k:m.k,t,pl,sh:m.sh,bl:m.bl,ms:m.ms});if(NC.buf.length>60){NC.buf.shift();NC.ai=Math.max(0,NC.ai-1)}
 ncReconcile(m,t);ncPcapCheck(m.k)}
// flags every car carries (see snapFlags in the engine): the picture of the car, its effects and the held zone powers all come from them
function ncFlags(p,f){visFlags(p,f);PRV[p.id]=(f>>6)&15;HOLDV[p.id]=(f>>10)&15;p.sh=(f&32)?1:0;p.shd=(f&16)?1:0}
// your own trail (as the server has it) and your own life/death take effect at once
function ncApplyMe(a,m,t){const p=P[1],was=p.alive;
 const alive=!!(a.f&1);ncFlags(p,a.f);
 if(a.rs!==p.rs){if(p.tr.length>3&&!PC.q.length)p.ghost={tr:p.tr,t0:clk};p.tr=[];p.trk=[];p.rs=a.rs}
 for(let k=0;k+1<a.nw.length;k+=2){p.tr.push(a.nw[k]/20,a.nw[k+1]/20);p.trk.push(m.k)}
 p.alive=alive;if(was&&!alive)ncPcapAll();
 if(!was&&alive){p.born=clk;NC.alive=0}
 if(was&&!alive){p.wreck={x:p.rx,y:p.ry,a:p.ra,t0:clk};burst(p.rx,p.ry,COLS[1],60,11);shake=16;snd('die');buzz(200)}
 MYHOLD=HOLDV[1]}
function ncApplyOther(sn){
 for(const a of sn.pl){if(a.id===1)continue;const p=P[a.id];if(!p)continue;const was=p.alive,alive=!!(a.f&1);
  ncFlags(p,a.f);
  if(a.rs!==p.rs){if(p.tr.length>3)p.ghost={tr:p.tr,t0:clk};p.tr=[];p.trk=[];p.rs=a.rs}
  for(let k=0;k+1<a.nw.length;k+=2){p.tr.push(a.nw[k]/20,a.nw[k+1]/20);p.trk.push(sn.k)}
  p.alive=alive;
  if(!was&&alive){p.rx=a.x;p.ry=a.y;p.ra=a.a;p.born=clk}
  if(was&&!alive){p.wreck={x:p.rx,y:p.ry,a:p.ra,t0:clk};burst(p.rx,p.ry,COLS[p.id],34,11);snd('ko')}}}

// ---------- a loop you just closed fills in at once ----------
// The phone applies the server's own capture rule (the trail becomes land, then everything it encloses) to the picture of the land the moment your predicted car
// closes the loop. The server's answer arrives a moment later and says the same thing; if it does not, every cell that was touched is put back as the server has it.
let OWNS=null;const PC={q:[]};   // one entry per loop closed ahead of the server: {cells, kc (the tick that closed it), t, cx, cy}. While any is waiting, your old trail stays hidden.
// the server's capture rule on the picture of the land: the trail becomes land, then everything it encloses. Returns the cells that changed.
function ncFill(id,t){
 const ch=[];
 const put=i=>{if(own[i]!==id){ch.push(i);own[i]=id}};
 const st=(x,y)=>{const cx=x*MC,cy=y*MC,rc=.55*MC,r2=rc*rc;
  for(let Y=Math.max(0,Math.floor(cy-rc));Y<=Math.min(MH-1,Math.ceil(cy+rc));Y++)for(let X=Math.max(0,Math.floor(cx-rc));X<=Math.min(MW-1,Math.ceil(cx+rc));X++){const dx=X+.5-cx,dy=Y+.5-cy,i=Y*MW+X;
   if(dx*dx+dy*dy<=r2&&ISL[i]){const v=own[i];if(!(v&&v!==id&&PRV[v]>0))put(i)}}};
 for(let i=0;i+1<t.length;i+=2){const x0=t[i],y0=t[i+1];st(x0,y0);
  if(i+3<t.length){const x1=t[i+2],y1=t[i+3],n=Math.ceil(dhyp(x1-x0,y1-y0)/.25);for(let k=1;k<n;k++)st(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n)}}
 FL.fill(0);let sp=0,bx0=MW,by0=MH,bx1=-1,by1=-1;
 for(let y=0;y<MH;y++){const r=y*MW;for(let x=0;x<MW;x++)if(own[r+x]===id){if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y}}
 if(bx1>=0){bx0=Math.max(0,bx0-1);by0=Math.max(0,by0-1);bx1=Math.min(MW-1,bx1+1);by1=Math.min(MH-1,by1+1);
  const push=i=>{if(!FL[i]&&own[i]!==id){FL[i]=1;STK[sp++]=i}};
  for(let x=bx0;x<=bx1;x++){push(by0*MW+x);push(by1*MW+x)}for(let y=by0;y<=by1;y++){push(y*MW+bx0);push(y*MW+bx1)}
  while(sp){const i=STK[--sp],x=i%MW,y=(i/MW)|0;if(x>bx0)push(i-1);if(x<bx1)push(i+1);if(y>by0)push(i-MW);if(y<by1)push(i+MW)}
  for(let y=by0;y<=by1;y++){const r=y*MW;for(let x=bx0;x<=bx1;x++){const i=r+x;if(!FL[i]&&own[i]!==id&&ISL[i]&&!(PRV[own[i]]>0))put(i)}}}
 return ch}
function ncPredCap(){
 const p=P[1];if(!OWNS||!p||!p.alive||!NC.alive)return;
 const t=p.tr.length?p.tr.concat(NC.tail):NC.tail;if(t.length<8)return;
 const ex=t[t.length-2],ey=t[t.length-1];
 for(const c of PC.q)if(Math.abs(ex-c.cx)<1&&Math.abs(ey-c.cy)<1)return;   // this closing was done already (the phone replays the last ticks after every snapshot)
 if(!p.sh&&ncSelfCross(t))return;                                           // crossing your own trail kills you instead of capturing
 const ch=ncFill(1,t);
 if(!ch.length)return;
 PC.q.push({cells:ch,kc:NC.capK,t:clk,cx:ex,cy:ey});NC.st.pc=(NC.st.pc||0)+1;
 if(t.length>3)p.ghost={tr:t,t0:clk};
 MDIRTY=true;LASTRB=-9}
// the server's rule for running into your own trail (a point of the path within .3 of an older piece of it), checked on the last part of the path
function ncSelfCross(t){const L=t.length;
 for(let j=Math.max(2,L-82);j<L-2;j+=2){const px=t[j],py=t[j+1];                   // (the closing point itself is on your own land, where the rule does not apply)
  for(let i=2;i+3<j-12;i+=2)if(Math.abs(px-t[i])<1.5&&Math.abs(py-t[i+1])<1.5&&segD2(px,py,t[i],t[i+1],t[i+2],t[i+3])<.09)return true}
 return false}
// every cell a prediction touched goes back to what the server says (when the server agrees that is the same thing, so nothing moves)
function ncPcapSync(c){const l=c.cells;let n=0;for(let k=0;k<l.length;k++){const i=l[k];if(own[i]!==OWNS[i]){own[i]=OWNS[i];n++}}
 if(n)NC.st.pcBack=(NC.st.pcBack||0)+1;MDIRTY=true}
// after each snapshot (k = its tick): a prediction is settled when the server shows (nearly) the same land, when the server has had time to simulate the closing and did not agree, or after 1.6 s
function ncPcapCheck(k){const q=PC.q;
 for(let e=q.length-1;e>=0;e--){const c=q[e];let done=clk-c.t>1.6;
  if(!done&&k>=0){if(k>=c.kc+4)done=true;else{const l=c.cells;let ok=0;for(let j=0;j<l.length;j++)if(OWNS[l[j]]===1)ok++;done=ok>=l.length*.9}}
  if(done){ncPcapSync(c);q.splice(e,1)}}}
function ncPcapAll(){for(const c of PC.q)ncPcapSync(c);PC.q.length=0}

// ---------- your own car: predict, then reconcile ----------
// The prediction runs in the server's own ticks (exact 1/30 s steps, lined up with the server's clock), so given the same steering it lands on exactly the
// same spot. The picture is drawn between the last whole tick and the next one, using your newest steering, so there is no delay at all.
function ncStep(S,inp,rec){ // one server tick of your car (the same order of things as the engine's upd)
 const h=STEP,cl=NC.cl;
 if(S.slow>0)S.slow-=h;
 S.cd[0]=Math.max(0,S.cd[0]-h);S.cd[1]=Math.max(0,S.cd[1]-h);
 if(S.ut<=0)S.uc=Math.min(100,S.uc+BAL.ucs*h);
 const b=inp.b&&S.en>0,mvOn=S.mv>0,utOn=S.ut>0;
 S.en=b?Math.max(0,S.en-h*SPRD):Math.min(1,S.en+h*SPRR);
 if(mvOn)S.mv-=h;if(utOn)S.ut-=h;
 turnTo(S,inp.a,h,trnOf(cl,mvOn,S.mk));
 const spd=spdOf(cl,b,S.mk,mvOn,utOn,S.slow>0,NC.nitro);
 const dist=spd*h,n=Math.max(1,Math.ceil(dist/.35)),st=dist/n,c=dcos(S.a),sn=dsin(S.a);
 for(let i=0;i<n;i++){moveSub(S,c,sn,st);if(rec)ncTail(S)}}
// the trail rule of the server, run on the predicted path: a point every TSP units while you are off your own land
function ncTail(S){
 if(ownAt(S.x,S.y)===1){if(NC.out){NC.tail.push(S.x,S.y);NC.out=0;NC.closed=1;NC.cap=1;NC.capK=NC.sk}NC.lx=S.x;NC.ly=S.y;return}
 if(!NC.out){NC.out=1;NC.closed=0;NC.tail=[NC.lx,NC.ly];NC.tb=null}
 const t=NC.tail,L=t.length;let ex,ey;
 if(L){ex=t[L-2];ey=t[L-1]}else if(NC.tb){ex=NC.tb[0];ey=NC.tb[1]}else{t.push(S.x,S.y);return}
 if(dhyp(S.x-ex,S.y-ey)>=TSP)t.push(S.x,S.y)}
function ncUseIn(S,i){const u=i.u;if(!u)return;const A=CLS[NC.cl].ab[u-1];if(A.off)return;
 if(u<3){if(S.cd[u-1]>0)return;if(A.mk){S.mv=MVK[A.mk].t;S.mk=A.mk}S.cd[u-1]=A.cd}
 else{if(S.uc<100||S.ut>0)return;if(A.ut)S.ut=A.ut;S.uc=0}}
// whole ticks that have passed by time t (on this phone's clock, with the input delay taken out), each using the steering that had been sent by its end
function ncAdvance(t){const kNow=Math.min(NC.k+24,Math.floor((t-NC.ph)/TKMS)),q=NC.sent;
 while(NC.k<kNow){NC.k++;const T=NC.ph+NC.k*TKMS;while(NC.qi<q.length&&q[NC.qi].c<=T){NC.base=q[NC.qi];if(NC.base.u)ncUseIn(NC.S,NC.base);NC.qi++}NC.sk=NC.k;ncStep(NC.S,NC.base,true);if(NC.cap){NC.cap=0;ncPredCap()}}}
function ncShown(t){const S=NC.S,q=NC.sent,Sx={x:S.x,y:S.y,a:S.a,en:S.en,cd:[S.cd[0],S.cd[1]],mv:S.mv,mk:S.mk,ut:S.ut,uc:S.uc,slow:S.slow};let cur=NC.base;
 for(let i=NC.qi;i<q.length;i++){cur=q[i];if(cur.u)ncUseIn(Sx,cur)}
 ncStep(Sx,cur,false);
 const al=Math.max(0,Math.min(1,(t-(NC.ph+NC.k*TKMS))/TKMS));
 return{x:S.x+(Sx.x-S.x)*al,y:S.y+(Sx.y-S.y)*al,a:S.a+angd(S.a,Sx.a)*al}}
function ncReconcile(m,t){
 const mm=m.m;if(!mm||!P[1])return;
 const p=P[1],alive=!!(p.st2&1),k=m.k;
 const S={x:mm[0]/1000,y:mm[1]/1000,a:mm[2]/1000,en:mm[3]/100,cd:[mm[4]/10,mm[5]/10],mv:mm[6]/100,mk:mm[7]|0,ut:mm[8]/100,uc:mm[9]/10,slow:mm[10]/100};
 MYPW=[mm[11]/100,mm[12]/100,mm[13]/100];NC.nitro=(HOLDV[1]&8)?1:0;
 const seq=m.a[0],c=m.a[1],e=m.a[2];
 while(NC.sent.length&&NC.sent[0].s<=seq)NC.lastAck=NC.sent.shift();
 // where the server's clock stands: its tick k ended at c+e on the clock of the input it acknowledges (this takes the input's trip out of the picture)
 let obs;
 if(seq>0&&NC.lastAck&&NC.lastAck.s===seq){obs=c+e-k*TKMS;NC.rtt+=((t-(c+e))-NC.rtt)*.12;NC.phw.push([t,obs]);NC.havePh=1}
 else if(!NC.havePh){obs=t-(NC.rtt||90)-k*TKMS;NC.phw.push([t,obs])}
 while(NC.phw.length&&t-NC.phw[0][0]>3000)NC.phw.shift();
 if(NC.phw.length){const a=NC.phw.map(w=>w[1]).sort((x,y)=>x-y),md=a[a.length>>1];NC.ph=NC.hasPh?NC.ph+(md-NC.ph)*.12:md;NC.hasPh=1}
 const base=NC.lastAck?{a:NC.lastAck.a,b:NC.lastAck.b}:{a:Math.round(S.a*50)/50,b:0};
 if(!alive){NC.S=S;NC.k=k;NC.qi=0;NC.base=base;NC.alive=0;NC.O={x:0,y:0,a:0};p.rx=S.x;p.ry=S.y;p.ra=S.a;ncHud();return}
 if(!NC.alive||!NC.S){NC.S=S;NC.k=k;NC.qi=0;NC.base=base;NC.alive=1;NC.O={x:0,y:0,a:0};p.rx=S.x;p.ry=S.y;p.ra=S.a;tg.a=S.a;NC.tail=[];NC.out=p.tr.length>0?1:0;NC.lx=S.x;NC.ly=S.y;NC.tb=p.tr.length?[p.tr[p.tr.length-2],p.tr[p.tr.length-1]]:null;ncHud();return}
 ncAdvance(t);const was=ncShown(t);                       // what is on screen right now
 // rebuild from the server's state: every tick since then, with the steering the server has not seen yet
 NC.out=p.tr.length>0?1:0;NC.closed=0;NC.tail=[];NC.lx=S.x;NC.ly=S.y;NC.tb=p.tr.length?[p.tr[p.tr.length-2],p.tr[p.tr.length-1]]:null;
 let kNow=Math.floor((t-NC.ph)/TKMS);if(kNow<k)kNow=k;if(kNow>k+24)kNow=k+24;
 NC.st.dMax=Math.max(NC.st.dMax,(kNow-k)*TKMS);
 const q=NC.sent;let qi=0,cur=base;
 for(let kk=k+1;kk<=kNow;kk++){const T=NC.ph+kk*TKMS;while(qi<q.length&&q[qi].c<=T){cur=q[qi];if(cur.u)ncUseIn(S,cur);qi++}NC.sk=kk;ncStep(S,cur,true);if(NC.cap){NC.cap=0;ncPredCap()}}
 NC.S=S;NC.k=kNow;NC.qi=qi;NC.base=cur;
 const now2=ncShown(t),ex=now2.x-was.x,ey=now2.y-was.y,er=Math.sqrt(ex*ex+ey*ey);
 NC.st.rec++;NC.st.errSum+=er;if(er>NC.st.errMax)NC.st.errMax=er;if(NC.rec)NC.rec.push(er);
 if(er>5){NC.O={x:0,y:0,a:0};NC.st.big++}else{NC.O.x-=ex;NC.O.y-=ey;NC.O.a-=angd(was.a,now2.a)}
 ncHud()}
// the ability buttons follow the predicted timers
function ncHud(){const S=NC.S;if(!S)return;const C=CLS[NC.cl],cl=v=>v<0?0:v>1?1:v;
 RDY=[cl(1-S.cd[0]/C.ab[0].cd),cl(1-S.cd[1]/C.ab[1].cd),cl(S.uc/100),cl(S.en)];en=RDY[3];MYUT=Math.max(0,S.ut)}
function ncUse(s){const S=NC.S;if(!S||!NC.alive)return false;if(s<3){if(S.cd[s-1]>0)return false}else if(S.uc<100||S.ut>0)return false;NC.pendU=s;return true}

// ---------- each frame ----------
function ncFrame(dt){
 const t=now();
 // 1. read the steering and send it when it changes (and every 100 ms otherwise, so the server always has a fresh acknowledgement to send back)
 let aq=Math.round(Math.max(-7,Math.min(7,tg.a))*50)/50;if(!Number.isFinite(aq))aq=0;const b=boost?1:0;
 if(ws&&ws.readyState===1&&NC.hasSnap&&NC.hasPh&&((t-NC.lastSend>=16&&(aq!==NC.curSent.a||b!==NC.curSent.b||NC.pendU))||t-NC.lastSend>=100)){
  const u=NC.pendU;NC.pendU=0;const inp={s:++NC.seq,c:Math.round(t),a:aq,b,u};NC.sent.push(inp);if(NC.sent.length>240){NC.sent.shift();if(NC.qi>0)NC.qi--}
  ws.send('{"t":"in","s":'+inp.s+',"c":'+inp.c+',"a":'+aq+',"b":'+b+(u?',"u":'+u:'')+'}');NC.curSent.a=aq;NC.curSent.b=b;NC.lastSend=t}
 // 2. your car moves at once
 const p=P[1];
 if(p&&NC.S&&NC.alive&&p.alive){ncAdvance(t);const sh=ncShown(t),k=Math.exp(-dt/.09);NC.O.x*=k;NC.O.y*=k;NC.O.a*=k;
  p.rx=sh.x+NC.O.x;p.ry=sh.y+NC.O.y;p.ra=sh.a+NC.O.a;ncHud();const S=NC.S;p.fSpr=(boost&&S.en>0)?8:0;p.fMv=S.mv>0?S.mk:0;p.fUlt=S.ut>0?16384:0}
 // 3. the others, a few ticks in the past
 ncRemote(t);
 if(PC.q.length)ncPcapCheck(-1);
 // 4. a ping every second
 if(ws&&ws.readyState===1&&t-NC.pingT>1000){NC.pingT=t;ws.send('{"t":"p","c":'+Math.round(t)+'}')}}
function ncRemote(t){
 const buf=NC.buf;if(!buf.length)return;
 const R=(t-NC.off)/TKMS-NC.dly;
 while(NC.ai<buf.length&&buf[NC.ai].k<=R){ncApplyOther(buf[NC.ai]);NC.ai++}
 const s0=NC.ai>0?buf[NC.ai-1]:null,s1=NC.ai<buf.length?buf[NC.ai]:null;
 for(let i=2;i<=5;i++){const p=P[i];if(!p)continue;
  const a0=s0&&s0.pl.find(z=>z.id===i),a1=s1&&s1.pl.find(z=>z.id===i);
  if(!a0&&!a1)continue;
  if(a0&&a1&&(a0.f&1)&&(a1.f&1)){const f=Math.max(0,Math.min(1,(R-s0.k)/(s1.k-s0.k)));
   const dx=a1.x-a0.x,dy=a1.y-a0.y;
   if(dx*dx+dy*dy>9){p.rx=a1.x;p.ry=a1.y;p.ra=a1.a}else{p.rx=a0.x+dx*f;p.ry=a0.y+dy*f;p.ra=a0.a+angd(a0.a,a1.a)*f}}
  else if(a0&&(a0.f&1)){ // ran out of snapshots: carry on in a straight line for a moment
   const pv=NC.ai>1?buf[NC.ai-2].pl.find(z=>z.id===i):null,gap=Math.min(4,Math.max(0,R-s0.k));
   if(pv&&(pv.f&1)&&s0.k>buf[NC.ai-2].k){const kk=s0.k-buf[NC.ai-2].k;p.rx=a0.x+(a0.x-pv.x)/kk*gap;p.ry=a0.y+(a0.y-pv.y)/kk*gap}else{p.rx=a0.x;p.ry=a0.y}
   p.ra=a0.a}
  else if(a1&&(a1.f&1)&&!p.alive){p.rx=a1.x;p.ry=a1.y;p.ra=a1.a}}
 // shells, blades and drones: other players' ones on the same delayed timeline as the cars, your own at once (so your shots leave without waiting)
 const L=NC.ai>0?buf[NC.ai-1]:null,Ln=buf[buf.length-1];
 if(L){const dk=Math.max(0,Math.min(6,R-L.k))*STEP,dn=Math.max(0,Math.min(6,(t-NC.off)/TKMS-Ln.k))*STEP;SHV=[];BLV=[];MSV=[];
  const sh=(src,d,mineOnly)=>{for(const v of src||[]){const o=MAP[v[4]];if((o===1)!==mineOnly)continue;SHV.push([v[0]+v[2]*d,v[1]+v[3]*d,v[2],v[3],o])}},
   bl=(src,d,mineOnly)=>{for(const v of src||[]){const o=MAP[v[4]];if((o===1)!==mineOnly)continue;BLV.push([v[0]+v[2]*d,v[1]+v[3]*d,v[2],v[3],o])}},
   ms=(src,d,mineOnly)=>{for(const v of src||[]){const o=MAP[v[3]];if((o===1)!==mineOnly)continue;MSV.push([v[0]+Math.cos(v[2])*BAL.missV*d,v[1]+Math.sin(v[2])*BAL.missV*d,v[2],o])}};
  sh(L.sh,dk,false);sh(Ln.sh,dn,true);bl(L.bl,dk,false);bl(Ln.bl,dn,true);ms(L.ms,dk,false);ms(Ln.ms,dn,true)}
 // old snapshots are not needed any more
 if(NC.ai>4){const n=NC.ai-3;NC.buf.splice(0,n);NC.ai-=n}}
// the trail to draw for a car: the server's points, and for your own car the predicted end as well
function ncTrail(p){if(p.id!==1||!MP||!NC.alive)return p.tr;if(PC.q.length)return NC.out?NC.tail:[];if(!NC.tail.length)return p.tr;return p.tr.concat(NC.tail)}
// ---------- 3D renderer, part 1: the engine set-up, looks (themes), generated textures, glow and finishing passes ----------
// World units map to the scene as x -> x, y -> z (north is -z), height -> y. The camera looks down from the south with north at the top of the screen.
const GLOW=1;   // layer number of objects that also draw into the glow pass
const GFX={ok:0,R:null,S:null,cam:null,w:0,h:0,pr:1,scale:1,time:0,theme:null,thIdx:0,mode:'world',stats:{calls:0,tris:0,ms:0,fps:0},hdr:0,
 U:{time:{value:0},sunDir:{value:null},sunCol:{value:null},fogCol:{value:null},fogNear:{value:60},fogFar:{value:240},camPos:{value:null},
  skyTop:{value:null},skyHor:{value:null},cloud:{value:null}}};
// ---------- looks. Each is a complete place: its ground materials and where they lie, its light, its air and its finishing ----------
// az / el: where the sun is (degrees; az 225 = from the north-west). All colours are sRGB hex.
// lay: the four ground materials [name, size of one repeat in units, size of the second (turned) copy, how much of the second copy, strength of the fine relief, roughness, tint].
//      Number 0 is the base. 1 and 2 lie on top where their rule says so. 3 is the rock of the cliffs.
// msk: the rule of materials 1..3: weights for [slope, height, huge patches, large patches, small patches, hollows, rim of the plateau, cliff], then [offset, from, to, edge].
//      The rule adds up the weighted inputs; the material shows between "from" and "to". edge > 0: it comes through at its own high points first; edge < 0: it fills the hollows of what is below.
// rel: the shape of the land (big hills, ridges, dunes, depth of the cliffs). ter: how owned land is painted. mist: the valley round the plateau. trk: tyre tracks.
const TERDEF={solid:.92,tex:.14,slab:.55,rim:.2,emis:.05,rough:.62,det:.22,bevel:.9,hill:.5};
// ways to draw owned land that the player can choose between (set over the look's own values)
const TERSTY=[{},{slab:0,rim:.34,tex:0,det:0,hill:.12,bevel:.4},{slab:1.15,rim:.1,hill:.4}];
let TERSEL=0;
const GTH=[
 {n:'Glacier Plateau',key:'glacier',az:166,el:33,sun:'#fff2e0',sunI:4.7,sky:'#9cc2ff',gnd:'#c6d6ee',hemiI:.66,fog:'#cddff4',fogN:90,fogF:320,
  top:'#3a76dc',hor:'#cfe2f8',expo:.84,sat:1.06,con:1.08,vig:.16,glow:.26,tint:[1.01,1,.99],env:.55,night:0,
  lay:[['snow',13,41,.5,1.0,.78,[1.03,1.03,1.03]],['ice',21,49,.45,.8,.2,[.92,1.0,1.08]],['gravel',10,27,.5,1.2,.9,[.42,.44,.5]],['rock',13,13,0,1,.88,[.56,.6,.7]]],
  msk:[null,[-.9,-.5,1.0,.35, .15,.9,0,-3, 0,1.3,1.62,-.25],[1.3,0,0,.2, .25,0,.5,0, 0,.8,1.05,.15],[1.5,0,0,0, .12,0,0,.22, 0,.72,1.1,.1]],
  rel:{big:4.8,rid:1.0,dn:.3,df:.085,dw:3.4,ds:.62,cliff:13},relK:1.5,macro:.07,cav:.3,spark:1,wrap:1,cloud:.2,bnc:[.13,.17,.25],
  mist:{c:'#a9c2e6',s:'#7f9fcf',i:.95,y:-15.5,d:11,k:.62,n:0},trk:{c:[.74,.82,.95],k:.6,n:1.1},tread:[.13,.2,.34],dust:'#eef4ff',snowfall:.5,cap:['#f2f6fc',1],mini:[226,234,246],ter:{}},
 {n:'Highland Meadow',key:'highland',az:168,el:38,sun:'#fff1d8',sunI:4.6,sky:'#a4c4f0',gnd:'#8d9a70',hemiI:.86,fog:'#cfdcec',fogN:90,fogF:320,
  top:'#3f7fd8',hor:'#d6e6f6',expo:1.24,sat:1.06,con:1.05,vig:.16,glow:.22,tint:[1.01,1,.98],env:.5,night:0,
  lay:[['grass',9,31,.55,1.0,.86,[1,1,1]],['gravel',9,23,.5,1.1,.9,[1,.98,.95]],['mossrock',24,24,0,1.3,.86,[1,1,1]],['rock',13,13,0,1,.88,[.82,.8,.76]]],
  msk:[null,[0,0,.45,.9, .3,0,.4,0, 0,1.08,1.26,-.2],[1.7,.45,.35,0, .1,0,0,0, 0,.82,1.2,.3],[1.25,0,0,0, .12,0,0,.42, 0,.86,1.25,.1]],
  rel:{big:5.6,rid:1.4,dn:.12,cliff:13},relK:1.5,macro:.34,cav:.2,spark:0,wrap:0,cloud:.3,bnc:[.15,.17,.12],
  mist:{c:'#eef4fb',s:'#a3b7d4',i:1.0,y:-10,d:6.5,k:1,n:2.4},trk:{c:[.66,.62,.54],k:.5,n:.8},tread:[.11,.09,.06],dust:'#b9a888',snowfall:0,cap:null,mini:[132,152,92],ter:{}},
 {n:'Red Mesa',key:'mesa',az:170,el:32,sun:'#ffe2b8',sunI:5.0,sky:'#a9c4ee',gnd:'#c98f6a',hemiI:.72,fog:'#ecd2b6',fogN:90,fogF:320,
  top:'#4a7fd0',hor:'#f0d6b4',expo:1.04,sat:1.05,con:1.06,vig:.18,glow:.24,tint:[1.02,1,.97],env:.5,night:.05,
  lay:[['cracked',13,37,.5,1.1,.84,[1,1,1]],['sand',12,31,.5,.9,.9,[1.0,.8,.7]],['gravel',9,23,.5,1.1,.9,[1.1,.8,.62]],['rock',13,13,0,1,.88,[1.25,.78,.55]]],
  msk:[null,[-.7,-1.0,.8,.35, .06,.3,0,0, 1.0,1.42,1.7,-.25],[1.4,0,0,.25, .3,0,.4,0, 0,.8,1.05,.15],[1.5,0,0,0, .12,0,0,.22, 0,.72,1.1,.1]],
  rel:{big:4.6,rid:1.7,dn:.15,cliff:14},relK:1.5,macro:.16,cav:.2,spark:0,wrap:0,cloud:.22,bnc:[.24,.17,.12],
  mist:{c:'#e9cdb0',s:'#dcbf9f',i:.9,y:-16.5,d:11,k:.55,n:0},trk:{c:[.8,.74,.68],k:.5,n:.8},tread:[.2,.1,.06],dust:'#d9a67a',snowfall:0,cap:null,mini:[206,160,122],ter:{}},
 {n:'Dune Sea',key:'dunes',az:172,el:33,sun:'#ffe9c4',sunI:5.0,sky:'#a8c8f0',gnd:'#d8c09a',hemiI:.7,fog:'#eedcbc',fogN:90,fogF:320,
  top:'#4a82d6',hor:'#f2deb8',expo:.98,sat:1.04,con:1.06,vig:.18,glow:.24,tint:[1.02,1,.97],env:.5,night:.08,
  lay:[['sand',15,43,.55,.85,.92,[1,1,1]],['gravel',9,23,.5,1.0,.9,[1.25,1.12,.92]],['cracked',12,30,.5,1.0,.86,[.98,.95,.86]],['rock',13,13,0,1,.88,[1.15,.98,.76]]],
  msk:[null,[0,-.9,.5,.3, .1,0,0,0, .9,1.2,1.4,.15],[-1,0,.3,1.0, 0,.5,0,0, 0,1.14,1.26,-.15],[1.0,0,0,0, .1,0,0,.62, 0,1.02,1.4,.1]],
  rel:{big:3.2,rid:.2,dn:1.9,df:.06,dw:4.2,ds:.72,dk:1,cliff:12},relK:1.6,macro:.1,cav:.14,spark:0,wrap:0,cloud:.2,bnc:[.25,.21,.14],
  mist:{c:'#ecd9b8',s:'#e2cda8',i:.95,y:-14.5,d:10,k:.55,n:0},trk:{c:[.82,.78,.7],k:.5,n:1.0},tread:[.24,.18,.1],dust:'#dcc394',snowfall:0,cap:null,mini:[212,190,150],ter:{}}];
// which looks the match seed picks from. LOOKSEL >= 0 pins one look (the prototype's look picker).
let GTHSET=[0,1,2,3],LOOKSEL=-1;
function gfxThemeFor(seed){if(LOOKSEL>=0&&GTH[LOOKSEL])return LOOKSEL;const k=(seed>>>0)%GTHSET.length;return GTHSET[k]}
const sunVec=(az,el)=>{const a=az*Math.PI/180,e=el*Math.PI/180;return new THREE.Vector3(Math.cos(e)*Math.cos(a),Math.sin(e),Math.cos(e)*Math.sin(a))};
const cLin=h=>{const l=linOf(h);return new THREE.Color().setRGB(l[0],l[1],l[2],THREE.LinearSRGBColorSpace)};

// ---------- generated textures (tiling noise): snow grain and drifts, water ripples, clouds ----------
function ptile(N,cx,cy,rnd){const gx=new Float32Array(cx*cy),gy=new Float32Array(cx*cy);
 for(let i=0;i<cx*cy;i++){const a=rnd()*6.2832;gx[i]=Math.cos(a);gy[i]=Math.sin(a)}
 const o=new Float32Array(N*N);
 for(let y=0;y<N;y++){const fy=y/N*cy,iy=Math.floor(fy),ty=fy-iy,sy=ty*ty*ty*(ty*(ty*6-15)+10),y0=iy%cy,y1=(iy+1)%cy;
  for(let x=0;x<N;x++){const fx=x/N*cx,ix=Math.floor(fx),tx=fx-ix,sx=tx*tx*tx*(tx*(tx*6-15)+10),x0=ix%cx,x1=(ix+1)%cx,
   i00=y0*cx+x0,i10=y0*cx+x1,i01=y1*cx+x0,i11=y1*cx+x1,
   a=gx[i00]*tx+gy[i00]*ty,b=gx[i10]*(tx-1)+gy[i10]*ty,c=gx[i01]*tx+gy[i01]*(ty-1),d=gx[i11]*(tx-1)+gy[i11]*(ty-1),
   ab=a+(b-a)*sx,cd=c+(d-c)*sx;o[y*N+x]=ab+(cd-ab)*sy}}
 return o}
function pfbm(N,cx,cy,oct,gain,rnd){const o=new Float32Array(N*N);let amp=1,tot=0;
 for(let k=0;k<oct;k++){const t=ptile(N,cx<<k,cy<<k,rnd);for(let i=0;i<o.length;i++)o[i]+=t[i]*amp;tot+=amp;amp*=gain}
 const s=1/(tot*.7);for(let i=0;i<o.length;i++)o[i]*=s;return o}
// height field -> tangent normal (dx,dy as 0..255), wrapping at the edges so the tile joins up
function heightToNormal(h,N,k){const o=new Uint8Array(N*N*4);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const xm=(x+N-1)%N,xp=(x+1)%N,ym=(y+N-1)%N,yp=(y+1)%N,dx=(h[y*N+xp]-h[y*N+xm])*k,dy=(h[yp*N+x]-h[ym*N+x])*k,l=1/Math.sqrt(dx*dx+dy*dy+1),i=(y*N+x)*4;
  o[i]=Math.max(0,Math.min(255,Math.round((-dx*l*.5+.5)*255)));o[i+1]=Math.max(0,Math.min(255,Math.round((-dy*l*.5+.5)*255)));o[i+2]=Math.round(l*255);o[i+3]=255}
 return o}
function dtex(data,w,h,fmt,type,opt){const t=new THREE.DataTexture(data,w,h,fmt,type);t.unpackAlignment=1;opt=opt||{};
 t.wrapS=t.wrapT=opt.clamp?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;t.magFilter=opt.near?THREE.NearestFilter:THREE.LinearFilter;
 t.generateMipmaps=!!opt.mip;t.minFilter=opt.near?THREE.NearestFilter:opt.mip?THREE.LinearMipmapLinearFilter:THREE.LinearFilter;
 if(opt.mip&&GFX.R)t.anisotropy=Math.min(8,GFX.R.capabilities.getMaxAnisotropy());t.needsUpdate=true;return t}
function gfxTextures(){
 if(GFX.tex)return;const rnd=mulberry32(7771),T={};
 // patch noise: four separate layers of soft blobs in the four channels. Each is spread evenly over 0..1 (by rank), so a threshold of .8 means "the top fifth of the land"
 {const N=256,px=new Uint8Array(N*N*4),ord=new Uint32Array(N*N);
  [[3,3,4,.5],[4,4,4,.5],[5,5,4,.55],[3,3,3,.5]].forEach((q,c)=>{const f=pfbm(N,q[0],q[1],q[2],q[3],rnd);for(let i=0;i<ord.length;i++)ord[i]=i;ord.sort((x,y)=>f[x]-f[y]);for(let r=0;r<ord.length;r++)px[ord[r]*4+c]=Math.round(r/(ord.length-1)*255)});
  T.noise=dtex(px,N,N,THREE.RGBAFormat,THREE.UnsignedByteType,{mip:1})}
 // fine grit used on metal, rubber and paint
 const GN=128,gr=new Uint8Array(GN*GN*4),gh=pfbm(GN,8,8,3,.6,rnd);for(let i=0;i<GN*GN;i++){const v=Math.round((gh[i]*.35+.5+(rnd()-.5)*.25)*255);gr[i*4]=gr[i*4+1]=gr[i*4+2]=Math.max(0,Math.min(255,v));gr[i*4+3]=255}
 T.grit=dtex(gr,GN,GN,THREE.RGBAFormat,THREE.UnsignedByteType,{mip:1});
 T.gritN=dtex(heightToNormal(gh,GN,4),GN,GN,THREE.RGBAFormat,THREE.UnsignedByteType,{mip:1});
 T.cloud=T.noise;
 GFX.tex=T}

// ---------- ground materials: scanned textures (colour + height), decoded once at start-up and packed into two texture arrays ----------
// arrA: colour with the height in alpha. arrN: the fine normal made from the height (x, y), how hollow the spot is (z).
const LAY={N:0,names:[],arrA:null,arrN:null,ok:0};
function layImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('ground texture did not load'));im.src=src})}
function layArr(data,N,D,srgb){const t=new THREE.Texture();t.isDataArrayTexture=true;t.image={data,width:N,height:N,depth:D};t.format=THREE.RGBAFormat;t.type=THREE.UnsignedByteType;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.wrapR=THREE.ClampToEdgeWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.flipY=false;t.unpackAlignment=1;
 t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=Math.min(4,GFX.R.capabilities.getMaxAnisotropy());t.layerUpdates=new Set();t.needsUpdate=true;return t}
function layPack(A,B,d,N,pa,ph){const o=d*N*N*4,h=new Float32Array(N*N),bl=new Float32Array(N*N),tmp=new Float32Array(N*N),K=6*N/1024,R=Math.max(2,Math.round(N/170));
 for(let i=0;i<N*N;i++){h[i]=ph[i*4]/255;A[o+i*4]=pa[i*4];A[o+i*4+1]=pa[i*4+1];A[o+i*4+2]=pa[i*4+2];A[o+i*4+3]=ph[i*4]}
 // the surroundings of every point (a wrapped box blur, twice), to tell hollows from bumps
 const box=(src,dst,dx,dy)=>{for(let y=0;y<N;y++)for(let x=0;x<N;x++){let c=0;for(let k=-R;k<=R;k++)c+=src[((y+k*dy+N)%N)*N+((x+k*dx+N)%N)];dst[y*N+x]=c/(2*R+1)}};
 box(h,tmp,1,0);box(tmp,bl,0,1);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x,xm=(x+N-1)%N,xp=(x+1)%N,ym=(y+N-1)%N,yp=(y+1)%N,dx=(h[y*N+xp]-h[y*N+xm])*K,dy=(h[yp*N+x]-h[ym*N+x])*K,l=1/Math.sqrt(dx*dx+dy*dy+1),k=o+i*4;
  B[k]=Math.max(0,Math.min(255,Math.round((-dx*l*.5+.5)*255)));B[k+1]=Math.max(0,Math.min(255,Math.round((-dy*l*.5+.5)*255)));B[k+2]=Math.max(0,Math.min(255,Math.round((.5+(h[i]-bl[i])*2.2)*255)));B[k+3]=255}}
async function layLoad(onStep){
 if(LAY.ok||!GFX.ok)return;
 const N=TEXSIZE||texSizeAuto(),D=TEXNAMES.length,A=new Uint8Array(N*N*4*D),B=new Uint8Array(N*N*4*D),c=mkc(N,N),g=c.getContext('2d',{willReadFrequently:true});
 for(let d=0;d<D;d++){const n=TEXNAMES[d];
  // a picture that does not decode must not stop the game: that material becomes plain mid-grey ground, and the miss is counted
  const pic=async(k,f)=>{g.clearRect(0,0,N,N);try{g.drawImage(await layImg(TEXSRC[k]),0,0,N,N)}catch(e){LAY.miss=(LAY.miss|0)+1;g.fillStyle=f;g.fillRect(0,0,N,N)}return g.getImageData(0,0,N,N).data};
  const pa=await pic(n+'_a','#8a8680'),ph=await pic(n+'_h','#808080');
  layPack(A,B,d,N,pa,ph);if(onStep)await onStep(d+1,D)}
 LAY.arrA=layArr(A,N,D,true);LAY.arrN=layArr(B,N,D,false);LAY.N=N;LAY.names=TEXNAMES.slice();LAY.ok=1}
let TEXSIZE=0;
// phones: 512 (their screen cannot show more at the sizes the ground is drawn, and it keeps memory low); tablets and computers: 1024. ?tex=1024 forces it.
function texSizeAuto(){try{const q=new URLSearchParams(location.search).get('tex');if(q==='512'||q==='1024')return +q}catch(e){}
 let phone=false;try{phone=matchMedia('(pointer:coarse)').matches&&Math.max(screen.width,screen.height)<1100}catch(e){}
 return phone||!QL.hi?512:(QL.tex||1024)}

// ---------- sky for reflections: six small gradient pictures made into an environment map ----------
function gfxEnv(th){
 const key=th.n;GFX.envs=GFX.envs||{};if(GFX.envs[key])return GFX.envs[key];
 const S=128,faces=[],sv=sunVec(th.az,th.el),top=th.top,hor=th.hor,gnd=th.gnd;
 const mkf=(fn)=>{const c=mkc(S,S),g=c.getContext('2d');fn(g,S);return c};
 const R=mulberry32(4711);
 // sides: deep sky overhead, bright haze at the horizon, a lit snowfield below the horizon, a few clouds and a far ridge
 const side=(g,s,f)=>{g.fillStyle=lg(g,0,0,0,s,[[0,top],[.3,mixHex(top,hor,.5)],[.5,hor],[.5001,mixHex(hor,gnd,.4)],[.62,gnd],[1,mixHex(gnd,'#ffffff',.35)]]);g.fillRect(0,0,s,s);
  g.globalAlpha=.5;for(let k=0;k<7;k++){const cx=R()*s,cy=s*(.12+R()*.34),rx=s*(.1+R()*.22),ry=s*(.012+R()*.03);g.fillStyle=rg(g,cx,cy,0,cx,cy,rx,[[0,'rgba(255,255,255,.55)'],[1,'rgba(255,255,255,0)']]);g.save();g.translate(cx,cy);g.scale(1,ry/rx);g.translate(-cx,-cy);g.fillRect(cx-rx,cy-rx,rx*2,rx*2);g.restore()}g.globalAlpha=1;
  g.fillStyle='rgba(60,80,120,.35)';g.beginPath();g.moveTo(0,s*.5);for(let x=0;x<=s;x+=8)g.lineTo(x,s*(.5-.025-.03*Math.abs(Math.sin(x*.07+f*2)+.5*Math.sin(x*.19+f))));g.lineTo(s,s*.5);g.closePath();g.fill()};
 const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 for(let f=0;f<6;f++){const d=dirs[f];faces.push(mkf((g,s)=>{
  if(f===2){g.fillStyle=rg(g,s/2,s/2,0,s/2,s/2,s*.75,[[0,top],[1,mixHex(top,hor,.55)]]);g.fillRect(0,0,s,s)}
  else if(f===3){g.fillStyle=gnd;g.fillRect(0,0,s,s)}
  else side(g,s,f);
  const dp=d[0]*sv.x+d[1]*sv.y+d[2]*sv.z;
  if(dp>.1){ // where on this face is the sun?
   let u=.5,v=.5;if(f===0){u=.5-sv.z/sv.x*.5;v=.5-sv.y/sv.x*.5}else if(f===1){u=.5+sv.z/-sv.x*.5*-1;v=.5-sv.y/-sv.x*.5}
   else if(f===4){u=.5+sv.x/sv.z*.5;v=.5-sv.y/sv.z*.5}else if(f===5){u=.5-sv.x/-sv.z*.5;v=.5-sv.y/-sv.z*.5}else if(f===2){u=.5+sv.x/sv.y*.5;v=.5+sv.z/sv.y*.5}
   g.fillStyle=rg(g,u*s,v*s,0,u*s,v*s,s*.3,[[0,th.sun],[.12,th.sun],[.3,th.sun+'aa'],[.6,th.sun+'30'],[1,th.sun+'00']]);g.globalAlpha=Math.min(1,dp*1.4);g.fillRect(0,0,s,s);g.globalAlpha=1}
 }))}
 const cube=new THREE.CubeTexture(faces);cube.colorSpace=THREE.SRGBColorSpace;cube.needsUpdate=true;
 const pm=new THREE.PMREMGenerator(GFX.R),rt=pm.fromCubemap(cube);pm.dispose();cube.dispose();
 GFX.envs[key]=rt.texture;return rt.texture}
function mixHex(a,b,t){const x=rgbOf(a),y=rgbOf(b),h=v=>('0'+Math.round(v).toString(16)).slice(-2);return'#'+h(x[0]+(y[0]-x[0])*t)+h(x[1]+(y[1]-x[1])*t)+h(x[2]+(y[2]-x[2])*t)}

// ---------- start-up ----------
function gfxInit(canvas){
 if(GFX.ok)return true;
 let R;try{R=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,depth:true,stencil:false,powerPreference:'high-performance',preserveDrawingBuffer:false,failIfMajorPerformanceCaveat:false})}catch(e){console.warn('no WebGL2',e);return false}
 if(!R.capabilities.isWebGL2){return false}
 GFX.R=R;R.info.autoReset=false;R.setClearColor(0x0b1630,1);R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.NoToneMapping;R.autoClear=false;
 R.shadowMap.enabled=true;R.shadowMap.type=PHONE?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;R.shadowMap.autoUpdate=true;
 const gl=R.getContext();GFX.hdr=!!(gl.getExtension('EXT_color_buffer_half_float')||gl.getExtension('EXT_color_buffer_float'));
 GFX.S=new THREE.Scene();GFX.cam=new THREE.PerspectiveCamera(58,1,1,600);GFX.cam.up.set(0,0,-1);
 GFX.sun=new THREE.DirectionalLight(0xffffff,3);GFX.sun.castShadow=true;GFX.sun.shadow.mapSize.set(1024,1024);
 const sc=GFX.sun.shadow.camera;sc.near=1;sc.far=260;sc.left=-34;sc.right=34;sc.top=34;sc.bottom=-34;GFX.sun.shadow.bias=-.0004;GFX.sun.shadow.normalBias=.03;GFX.sun.shadow.radius=2.2;
 GFX.S.add(GFX.sun);GFX.S.add(GFX.sun.target);
 GFX.hemi=new THREE.HemisphereLight(0xaaccff,0xdde8f8,1.1);GFX.S.add(GFX.hemi);
 GFX.S.fog=new THREE.Fog(0xcfe2f6,70,260);
 GFX.U.camPos.value=GFX.cam.position;GFX.U.sunDir.value=new THREE.Vector3(0,1,0);GFX.U.sunCol.value=new THREE.Color(1,1,1);GFX.U.fogCol.value=new THREE.Color(1,1,1);
 for(const k of ['skyTop','skyHor'])GFX.U[k].value=new THREE.Color(1,1,1);
 gfxTextures();GFX.U.cloud.value=GFX.tex.cloud;
 // full-screen triangle for the glow and finishing passes
 const qg=new THREE.BufferGeometry();qg.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
 GFX.qm=new THREE.Mesh(qg,null);GFX.qm.frustumCulled=false;GFX.qs=new THREE.Scene();GFX.qs.add(GFX.qm);GFX.qc=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const VS='varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}';
 GFX.mBlur=new THREE.ShaderMaterial({uniforms:{t:{value:null},d:{value:new THREE.Vector2()}},vertexShader:VS,depthTest:false,depthWrite:false,
  fragmentShader:'uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.2270;c+=(texture2D(t,vUv+d*1.3846).rgb+texture2D(t,vUv-d*1.3846).rgb)*.3162;c+=(texture2D(t,vUv+d*3.2308).rgb+texture2D(t,vUv-d*3.2308).rgb)*.0703;gl_FragColor=vec4(c,1.);}'});
 GFX.mCopy=new THREE.ShaderMaterial({uniforms:{t:{value:null},d:{value:new THREE.Vector2()}},vertexShader:VS,depthTest:false,depthWrite:false,
  fragmentShader:'uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 c=(texture2D(t,vUv+d*vec2(-.5,-.5)).rgb+texture2D(t,vUv+d*vec2(.5,-.5)).rgb+texture2D(t,vUv+d*vec2(-.5,.5)).rgb+texture2D(t,vUv+d*vec2(.5,.5)).rgb)*.25;gl_FragColor=vec4(c,1.);}'});
 GFX.mComp=new THREE.ShaderMaterial({uniforms:{tA:{value:null},tG:{value:null},uExpo:{value:1},uSat:{value:1.1},uCon:{value:1.05},uVig:{value:.3},uGlow:{value:1},uTint:{value:new THREE.Vector3(1,1,1)},uTime:{value:0},uSpeed:{value:0},uHurt:{value:0},uGlowOn:{value:1},uAsp:{value:1.25}},vertexShader:VS,depthTest:false,depthWrite:false,
  fragmentShader:`uniform sampler2D tA,tG;uniform float uExpo,uSat,uCon,uVig,uGlow,uTime,uSpeed,uHurt,uGlowOn,uAsp;uniform vec3 uTint;varying vec2 vUv;
  vec3 aces(vec3 x){const float a=2.51,b=.03,c=2.43,d=.59,e=.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);}
  vec3 enc(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(.41666))-.055,step(.0031308,c));}
  float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec2 uv=vUv;vec3 col=texture2D(tA,uv).rgb;
   if(uSpeed>.01){vec2 d=(uv-.5)*uSpeed*.05;col=col*.46+(texture2D(tA,uv-d).rgb+texture2D(tA,uv-d*2.).rgb)*.27;}
   if(uGlowOn>.5)col+=texture2D(tG,uv).rgb*uGlow;
   col*=uExpo*uTint;col=aces(col);
   float l=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(l),col,uSat);col=(col-.5)*uCon+.5;
   float v=smoothstep(.42,1.1,length((uv-.5)*vec2(1.,uAsp)));col*=1.-v*uVig;col=mix(col,vec3(.75,.04,.1),clamp(uHurt,0.,1.)*v*.85);
   col=enc(max(col,0.));col+=(hash(gl_FragCoord.xy+fract(uTime)*91.)-.5)/255.;gl_FragColor=vec4(col,1.);}`});
 GFX.ok=1;return true}

// ---------- screen size and quality: render targets are rebuilt when the size or the quality tier changes ----------
function gfxFit(w,h){
 if(!GFX.ok)return;GFX.w=w;GFX.h=h;
 const q=QL,pr=Math.max(.5,Math.min(devicePixelRatio||1,q.pr||1.5)*GFX.scale);GFX.pr=pr;
 const R=GFX.R;R.setPixelRatio(1);R.setSize(Math.round(w*pr),Math.round(h*pr),false);
 const cvs=R.domElement;cvs.style.width=w+'px';cvs.style.height=h+'px';
 const W=Math.round(w*pr),H=Math.round(h*pr),type=GFX.hdr?THREE.HalfFloatType:THREE.UnsignedByteType;
 const dispose=r=>{if(r)r.dispose()};
 dispose(GFX.rtA);dispose(GFX.rtG);dispose(GFX.rtB1);dispose(GFX.rtB2);GFX.rtA=GFX.rtG=GFX.rtB1=GFX.rtB2=null;
 if(q.post){
  GFX.rtA=new THREE.WebGLRenderTarget(W,H,{type,format:THREE.RGBAFormat,depthBuffer:true,stencilBuffer:false,samples:q.msaa||0,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  GFX.rtA.texture.colorSpace=THREE.LinearSRGBColorSpace;
  if(q.glow){const gw=Math.max(8,W>>1),gh=Math.max(8,H>>1),bw=Math.max(8,W>>2),bh=Math.max(8,H>>2),o={type:GFX.hdr?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter};
   GFX.rtG=new THREE.WebGLRenderTarget(gw,gh,Object.assign({},o,{depthBuffer:true}));GFX.rtB1=new THREE.WebGLRenderTarget(bw,bh,o);GFX.rtB2=new THREE.WebGLRenderTarget(bw,bh,o)}}
 const sm=q.shadow||0;GFX.sun.castShadow=sm>0;if(sm>0&&GFX.sun.shadow.mapSize.x!==sm){GFX.sun.shadow.mapSize.set(sm,sm);if(GFX.sun.shadow.map){GFX.sun.shadow.map.dispose();GFX.sun.shadow.map=null}}
 GFX.cam.aspect=w/h;GFX.cam.updateProjectionMatrix();GFX.mComp.uniforms.uAsp.value=Math.max(1,h/w)}

// ---------- applying a look ----------
function gfxSetTheme(idx){
 const th=GTH[idx];GFX.theme=th;GFX.thIdx=idx;const U=GFX.U;
 U.sunDir.value.copy(sunVec(th.az,th.el));U.sunCol.value.copy(cLin(th.sun));U.fogCol.value.copy(cLin(th.fog));U.fogNear.value=th.fogN;U.fogFar.value=th.fogF;
 U.skyTop.value.copy(cLin(th.top));U.skyHor.value.copy(cLin(th.hor));
 GFX.sun.color.copy(cLin(th.sun));GFX.sun.intensity=th.sunI;GFX.hemi.color.copy(cLin(th.sky));GFX.hemi.groundColor.copy(cLin(th.gnd));GFX.hemi.intensity=th.hemiI;
 GFX.S.fog.color.copy(cLin(th.fog));GFX.S.fog.near=th.fogN;GFX.S.fog.far=th.fogF;GFX.R.setClearColor(cLin(th.fog),1);
 GFX.S.environment=gfxEnv(th);GFX.S.environmentIntensity=th.env;
 const c=GFX.mComp.uniforms;c.uExpo.value=th.expo;c.uSat.value=th.sat;c.uCon.value=th.con;c.uVig.value=th.vig;c.uGlow.value=th.glow;c.uTint.value.set(th.tint[0],th.tint[1],th.tint[2]);
 if(GFX.onTheme)GFX.onTheme(th)}

// ---------- one rendered picture: the scene, the glow of the bright things, then the finishing pass ----------
function gfxPass(mat,target){GFX.qm.material=mat;GFX.R.setRenderTarget(target);GFX.R.render(GFX.qs,GFX.qc)}
function gfxRender(scene,cam){GFX.R.info.reset();gfxRender0(scene,cam);const i=GFX.R.info.render;GFX.stats.calls=i.calls;GFX.stats.tris=i.triangles}
function gfxRender0(scene,cam){
 const R=GFX.R,q=QL;
 if(!q.post||!GFX.rtA){ // plain: straight to the screen with the engine's own tone mapping
  R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=GFX.theme?GFX.theme.expo:1;R.setRenderTarget(null);R.clear(true,true,false);R.render(scene,cam);R.toneMapping=THREE.NoToneMapping;return}
 R.setRenderTarget(GFX.rtA);R.clear(true,true,false);cam.layers.set(0);R.render(scene,cam);
 const C=GFX.mComp.uniforms;
 if(q.glow&&GFX.rtG){
  const bg=scene.background;scene.background=null;R.shadowMap.autoUpdate=false;
  cam.layers.set(GLOW);R.setRenderTarget(GFX.rtG);R.setClearColor(0x000000,1);R.clear(true,true,false);R.render(scene,cam);cam.layers.set(0);
  R.setClearColor(cLin(GFX.theme.fog),1);scene.background=bg;R.shadowMap.autoUpdate=true;
  const g=GFX.rtG,b1=GFX.rtB1,b2=GFX.rtB2;
  GFX.mCopy.uniforms.t.value=g.texture;GFX.mCopy.uniforms.d.value.set(1/g.width,1/g.height);gfxPass(GFX.mCopy,b1);
  GFX.mBlur.uniforms.t.value=b1.texture;GFX.mBlur.uniforms.d.value.set(1/b1.width,0);gfxPass(GFX.mBlur,b2);
  GFX.mBlur.uniforms.t.value=b2.texture;GFX.mBlur.uniforms.d.value.set(0,1/b1.height);gfxPass(GFX.mBlur,b1);
  GFX.mBlur.uniforms.t.value=b1.texture;GFX.mBlur.uniforms.d.value.set(1.6/b1.width,0);gfxPass(GFX.mBlur,b2);
  GFX.mBlur.uniforms.t.value=b2.texture;GFX.mBlur.uniforms.d.value.set(0,1.6/b1.height);gfxPass(GFX.mBlur,b1);
  C.tG.value=b1.texture;C.uGlowOn.value=1}
 else C.uGlowOn.value=0;
 C.tA.value=GFX.rtA.texture;C.uTime.value=GFX.time;gfxPass(GFX.mComp,null)}