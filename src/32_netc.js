// ---------- online play: the server decides everything, the phone predicts your own car and smooths everyone else ----------
// Your car: it moves the instant you steer, using the same movement code as the server (turnTo / moveSub). Each snapshot carries the server's version of
// your car and says which of your inputs it had seen; the phone replays the rest on top, so a tiny error is all that is ever corrected, and it is eased away.
// Other cars: shown a few snapshots in the past, between two real server positions, so their motion is smooth whatever the connection does.
const TKMS=1000/30,now=()=>performance.now();
const NC={
 hasSnap:0,off:0,offw:[],jit:0,dly:2.6,        // clock: local ms minus server ms (best of the last 4 s), arrival jitter, delay of the picture in ticks
 buf:[],ai:0,                                    // snapshots waiting to be shown, and how many of them have been shown
 seq:0,sent:[],lastAck:null,curSent:{a:9,b:9},lastSend:0,pendU:0,
 S:null,k:0,qi:0,base:{a:0,b:0},ph:0,phw:[],hasPh:0,havePh:0,O:{x:0,y:0,a:0},alive:0,hasBoost:1,nitro:0,
 tail:[],out:0,lx:0,ly:0,tb:null,                // predicted end of your own trail
 rtt:0,ping:0,pingT:0,
 st:{n:0,rec:0,errSum:0,errMax:0,big:0,dMax:0,drop:0}};
function ncReset(you){
 NC.hasSnap=0;NC.off=0;NC.offw=[];NC.jit=0;NC.dly=2.6;NC.buf=[];NC.ai=0;NC.seq=0;NC.sent=[];NC.lastAck=null;NC.curSent={a:9,b:9};NC.lastSend=0;NC.pendU=0;NC.phw=[];NC.hasPh=0;NC.havePh=0;NC.ph=0;NC.k=0;NC.qi=0;NC.base={a:0,b:0};
 OWNS=new Uint8Array(own.length);PC.q=[];
 NC.S=null;NC.O={x:0,y:0,a:0};NC.alive=0;NC.hasBoost=AB_.includes('boost')?1:0;NC.nitro=0;NC.tail=[];NC.out=0;NC.tb=null;NC.rtt=NC.rtt||0;
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
 MNV=(m.mn||[]).map(v=>[v[0],v[1],MAP[v[2]],v[3]]);if(m.z)ZOWN=m.z.map(o2=>MAP[o2]||0);
 SHV=(m.sh||[]).map(v=>[v[0],v[1],v[2],v[3],MAP[v[4]]]);STV=(m.sk||[]).map(v=>[v[0],v[1],v[2],MAP[v[3]]]);
 if(m.e)for(const [ty,s,x,y] of m.e){if(ty==='ko'){koMsg(MAP[s],x?MAP[x]:0,y);continue}if(ty==='zone'){zoneEv(s,MAP[x]||0,MAP[y]||0);continue}if(ty==='seize'){seizeEv(MAP[s],MAP[x],y);continue}if(ty==='strike'){strikeEv(MAP[s],MAP[x]);continue}const p=P[MAP[s]];if(p)evFx(ty,p===me,x,y)}
 // everybody's latest numbers; your own car is handled right away, the others wait in line to be shown in the past
 const pl=m.p.map((a,i)=>({id:MAP[i+1],x:a[0]/20,y:a[1]/20,a:a[2]/100,f:a[3],rs:a[4],nw:a[5]}));
 for(const a of pl){const p=P[a.id];if(!p)continue;p.x=a.x;p.y=a.y;p.a=a.a;p.st2=a.f;
  if(a.id===1)ncApplyMe(a,m,t);else{p.sx=a.x;p.sy=a.y}}
 NC.buf.push({k:m.k,t,pl});if(NC.buf.length>60){NC.buf.shift();NC.ai=Math.max(0,NC.ai-1)}
 ncReconcile(m,t);ncPcapCheck(m.k)}
// flags every car carries: 1 alive, 2 slowed, 4 ghost, 8 dashing, 16 shield, 32 spawn protection, bits 6-9 fortify seconds, bits 10-13 held zones
function ncFlags(p,f){p.fl=(f&2?1:0)|(f&4?2:0)|(f&8?4:0);p.shd=(f&16)?1:0;p.sh=(f&32)?1:0;PRV[p.id]=(f>>6)&15;HOLDV[p.id]=(f>>10)&15}
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
function ncStep(S,inp,rec){ // one server tick of your car
 const h=STEP;S.cd[0]=Math.max(0,S.cd[0]-h);S.cd[1]=Math.max(0,S.cd[1]-h);
 const b=inp.b&&S.en>0&&NC.hasBoost;S.en=b?Math.max(0,S.en-h*.5):Math.min(1,S.en+h*.2);
 const ds=S.dash>0;if(ds)S.dash-=h;
 const spd=SPD*(b?BSTM:1)*(ds?DSHM:1)*(NC.nitro?NITM:1);
 turnTo(S,inp.a,h);
 const dist=spd*h,n=Math.max(1,Math.ceil(dist/.35)),st=dist/n,c=dcos(S.a),sn=dsin(S.a);
 for(let i=0;i<n;i++){moveSub(S,c,sn,st);if(rec)ncTail(S)}}
// the trail rule of the server, run on the predicted path: a point every TSP units while you are off your own land
function ncTail(S){
 if(ownAt(S.x,S.y)===1){if(NC.out){NC.tail.push(S.x,S.y);NC.out=0;NC.closed=1;NC.cap=1;NC.capK=NC.sk}NC.lx=S.x;NC.ly=S.y;return}
 if(!NC.out){NC.out=1;NC.closed=0;NC.tail=[NC.lx,NC.ly];NC.tb=null}
 const t=NC.tail,L=t.length;let ex,ey;
 if(L){ex=t[L-2];ey=t[L-1]}else if(NC.tb){ex=NC.tb[0];ey=NC.tb[1]}else{t.push(S.x,S.y);return}
 if(dhyp(S.x-ex,S.y-ey)>=TSP)t.push(S.x,S.y)}
function ncUseIn(S,i){const a=AB_[i.u-1];if(a==='dash'&&S.cd[i.u-1]<=0){S.dash=DSHT;S.cd[i.u-1]=CDM.dash}}
// whole ticks that have passed by time t (on this phone's clock, with the input delay taken out), each using the steering that had been sent by its end
function ncAdvance(t){const kNow=Math.min(NC.k+24,Math.floor((t-NC.ph)/TKMS)),q=NC.sent;
 while(NC.k<kNow){NC.k++;const T=NC.ph+NC.k*TKMS;while(NC.qi<q.length&&q[NC.qi].c<=T){NC.base=q[NC.qi];if(NC.base.u)ncUseIn(NC.S,NC.base);NC.qi++}NC.sk=NC.k;ncStep(NC.S,NC.base,true);if(NC.cap){NC.cap=0;ncPredCap()}}}
function ncShown(t){const S=NC.S,q=NC.sent,Sx={x:S.x,y:S.y,a:S.a,en:S.en,cd:[S.cd[0],S.cd[1]],dash:S.dash};let cur=NC.base;
 for(let i=NC.qi;i<q.length;i++){cur=q[i];if(cur.u)ncUseIn(Sx,cur)}
 ncStep(Sx,cur,false);
 const al=Math.max(0,Math.min(1,(t-(NC.ph+NC.k*TKMS))/TKMS));
 return{x:S.x+(Sx.x-S.x)*al,y:S.y+(Sx.y-S.y)*al,a:S.a+angd(S.a,Sx.a)*al}}
function ncReconcile(m,t){
 const mm=m.m;if(!mm||!P[1])return;
 const p=P[1],alive=!!(p.st2&1),k=m.k;
 const S={x:mm[0]/1000,y:mm[1]/1000,a:mm[2]/1000,en:mm[3]/100,cd:[mm[4]/10,mm[5]/10],dash:mm[6]/100};
 MYPW=[mm[7]/100,mm[8]/100,mm[9]/100];NC.nitro=(HOLDV[1]&8)?1:0;
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
// ability buttons and the boost bar follow the predicted timers
function ncHud(){const S=NC.S;if(!S)return;const R=[1,1];for(let k=0;k<2;k++){const a=AB_[k];R[k]=a==='boost'?S.en:a?1-S.cd[k]/(CDM[a]||10):1}
 RDY=R;en=AB_[0]==='boost'?R[0]:AB_[1]==='boost'?R[1]:1}
function ncUse(s){const a=AB_[s-1];if(!a||a==='boost'||!NC.S||!NC.alive)return;if(a==='dash'&&NC.S.cd[s-1]>0)return;NC.pendU=s}

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
  p.rx=sh.x+NC.O.x;p.ry=sh.y+NC.O.y;p.ra=sh.a+NC.O.a;ncHud()}
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
 // old snapshots are not needed any more
 if(NC.ai>4){const n=NC.ai-3;NC.buf.splice(0,n);NC.ai-=n}}
// the trail to draw for a car: the server's points, and for your own car the predicted end as well
function ncTrail(p){if(p.id!==1||!MP||!NC.alive)return p.tr;if(PC.q.length)return NC.out?NC.tail:[];if(!NC.tail.length)return p.tr;return p.tr.concat(NC.tail)}
