// ---------- input: finger, mouse and keys ----------
const pe=e=>{if(e.pointerType!=='mouse'&&ptr.id!=null&&e.pointerId!==ptr.id)return;ptr.type=e.pointerType==='mouse'?'mouse':'touch';
 if(ptr.type==='mouse'){const r=cv.getBoundingClientRect();ptr.sx=e.clientX-r.left;ptr.sy=e.clientY-r.top}
 else{ptr.px=e.clientX;ptr.py=e.clientY}};
document.addEventListener('pointerdown',e=>{au();if(e.pointerType==='mouse'){pe(e);abDown(1);return}
 if(ptr.id!=null)return;ptr.id=e.pointerId;pe(e);ptr.down=1;ptr.ax=ptr.px;ptr.ay=ptr.py});
document.addEventListener('pointermove',pe);
const up=e=>{if(e.pointerType==='mouse')abUp(1);else if(e.pointerId===ptr.id){ptr.down=0;ptr.id=null}};
document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
for(const [id,sl] of [['bst',1],['a2',2]]){const b=$(id);b.addEventListener('pointerdown',e=>{e.stopPropagation();au();abDown(sl)});['pointerup','pointercancel','pointerleave'].forEach(k=>b.addEventListener(k,()=>abUp(sl)))}
const PWB=[$('pw0'),$('pw1'),$('pw2')];PWB.forEach((b,j)=>b.addEventListener('pointerdown',e=>{e.stopPropagation();au();firePow(PK[j])}));
addEventListener('keydown',e=>{if(e.repeat||(e.target&&e.target.tagName==='INPUT'))return;if(RPL){if(e.code==='Space'){rpToggle();e.preventDefault()}return}
 if(e.code==='Space'||e.key==='Shift'){abDown(1);e.preventDefault()}else if(e.key==='e'||e.key==='E'||e.key==='2')abDown(2);else if(e.key==='f'||e.key==='F')firePow('cannon');else if(e.key==='q'||e.key==='Q')firePow('fort');else if(e.key==='r'||e.key==='R')firePow('strike')});
addEventListener('keyup',e=>{if(e.code==='Space'||e.key==='Shift')abUp(1);else if(e.key==='e'||e.key==='E'||e.key==='2')abUp(2)});
addEventListener('resize',()=>{if(P)fit()});
function abDown(s){if(state!=='play'||RPL)return;const a=AB_[s-1];if(a==='boost')setBoost(1);else if(a){if(MP)tx({t:'use',s});else if(IN[1])ABU(1,s)}}
function abUp(s){if(AB_[s-1]==='boost')setBoost(0)}
function firePow(k){if(state!=='play'||!me||!me.alive||RPL)return;if(MP)tx({t:'pw',k});else PWU(1,k)}
function aim(){if(!me)return;const hx=me.rx,hy=me.ry;
 if(ptr.type==='mouse'){if(ptr.sx===undefined)return;tg.x=CAM.x+(ptr.sx-vw/2)/CAM.z;tg.y=CAM.y+(ptr.sy-vh/2)/CAM.z;if(dhyp(tg.x-hx,tg.y-hy)>.8)tg.a=Math.atan2(tg.y-hy,tg.x-hx)}
 else if(ptr.down){const vx=ptr.px-ptr.ax,vy=ptr.py-ptr.ay,L=Math.hypot(vx,vy);if(L>40){ptr.ax+=vx*(1-40/L);ptr.ay+=vy*(1-40/L)}if(L>6)tg.a=Math.atan2(vy,vx)}}

// ---------- effects that live on the screen only ----------
function fxStep(dt){shake*=Math.pow(.88,dt*60);
 for(const f of FX){f.x+=f.vx*dt;f.y+=f.vy*dt;const k=Math.pow(.95,dt*60);f.vx*=k;f.vy*=k;f.l-=dt}
 if(FX.length){let j=0;for(let i=0;i<FX.length;i++)if(FX[i].l>0)FX[j++]=FX[i];FX.length=j}
 const cap=QL.fx>.5?500:240;if(FX.length>cap)FX.splice(0,FX.length-cap);
 for(const q of PO){q.y-=dt*1.6;q.l-=dt}PO=PO.filter(q=>q.l>0);for(const d of FD)d.l-=dt;FD=FD.filter(d=>d.l>0)}

// ---------- one shared fixed-step loop for practice, the menu showreel and replays ----------
// Every match advances in exact 1/30 s steps. What you see is drawn between two steps, so motion stays smooth at 60 or 120 Hz.
let ACC=0,ALPHA=0,wasAlive=true,DEATH='',RPL=null,QUIET=0;
function snapPrev(){for(let i=1;i<=5;i++){const p=P[i];p.ox=p.x;p.oy=p.y;p.oa=p.a}}
function interp(a){for(let i=1;i<=5;i++){const p=P[i];if(p.ox===undefined||!p.alive){p.rx=p.x;p.ry=p.y;p.ra=p.a;continue}
 const dx=p.x-p.ox,dy=p.y-p.oy;if(dx*dx+dy*dy>6.25){p.rx=p.x;p.ry=p.y;p.ra=p.a}else{p.rx=p.ox+dx*a;p.ry=p.oy+dy*a;p.ra=p.oa+angd(p.oa,p.a)*a}}}
function humanInput(){const t=IN[1];if(!t||!me)return;aim();if(me.alive&&!wasAlive)tg.a=me.a;wasAlive=me.alive;INP(1,Math.round(Math.max(-7,Math.min(7,tg.a))*50),boost?1:0)}
function drainEV(){while(EV.length){const e=EV.shift();if(e[0]==='ko')koMsg(e[1],e[2],e[3]);else if(e[0]==='zone')zoneEv(e[1],e[2],e[3]);else if(e[0]==='seize')seizeEv(e[1],e[2],e[3]);else if(e[0]==='strike')strikeEv(e[1],e[2]);else evFx(e[0],P[e[1]]===me,e[2],e[3])}}
function syncVisual(){
 for(let i=1;i<=5;i++){const p=P[i];p.fl=(SLOW[i]>0?1:0)|(GHO[i]>0?2:0)|(((IN[i]&&IN[i].dash>0)||p.bd>0)?4:0)}
 MNV=MINES.map(m=>[m.x,m.y,m.o,m.arm>0?0:1]);ZOWN=ZN.map(z=>z.own);for(let i=0;i<6;i++){PRV[i]=PROT[i];HOLDV[i]=HOLD[i]}
 const a=ACC;SHV=SHL.map(s=>[s.x+s.vx*a,s.y+s.vy*a,s.vx,s.vy,s.o]);STV=STR.map(s=>[s.x,s.y,s.t,s.o]);
 MYHOLD=HOLD[VS];MYPW=PWC[VS].map((c,j)=>1-c/ZCD[PK[j]]);
 if(IN[VS]&&!RPL){RDY=rdyOf(IN[VS]);en=AB_[0]==='boost'?RDY[0]:AB_[1]==='boost'?RDY[1]:1;$('bst').style.setProperty('--e',RDY[0]);$('a2').style.setProperty('--e',RDY[1])}}
function localFrame(dt){
 fxStep(dt);
 if(state!=='play'&&state!=='menu'&&state!=='replay')return;
 const rp=RPL;
 if(rp){if(rp.seek!=null){seekStep();return}if(rp.paused||rp.done){interp(ACC/STEP);syncVisual();return}}
 ACC+=dt*(rp?rp.speed:1);let n=0;const mx=rp?rp.speed*3+2:4;
 while(ACC>=STEP&&n<mx){ACC-=STEP;n++;snapPrev();
  if(rp){const o=rp.rec.ops;while(rp.oi<o.length&&o[rp.oi][0]<=TK)APPLY(o[rp.oi++])}else if(state==='play')humanInput();
  STEPF();if(EV.length)drainEV();
  if(rp){if(TK>=rp.rec.ticks){const o=rp.rec.ops;while(rp.oi<o.length)APPLY(o[rp.oi++]);hud(1);rp.done=true;rpEnded();break}}
  else if(state==='play'&&tl<=0){tl=0;hud(1);finish();break}}
 if(ACC>STEP*3)ACC=STEP*3;
 interp(ACC/STEP);syncVisual()}

// ---------- menu showreel: bots play on a live island behind the menu ----------
const SR={t0:0,tgt:2,tt:0,fading:0};
function bgStart(){MP=0;VS=1;FF=0;RPL=null;QUIET=1;NM=['','Zed','Blaze','Mira','Kabir','Nova'];AB_=['boost'];RDY=[1,1];resetCos();AL=[];MPS(0,true);buildIsland();me=P[1];state='menu';wasAlive=true;ACC=0;
 SR.t0=clk;SR.tt=0;SR.tgt=2;CAM.fy=.33;CAM.vz=44;FX=[];PO=[];FD=[];SCORCH=[];RINGS=[];snapPrev();interp(0);const t=P[SR.tgt];CAM.x=t.x;CAM.y=t.y+(.5-CAM.fy)*vh/Math.max(1,CAM.z)}
function srDirector(dt){SR.tt-=dt;
 const cur=P[SR.tgt];
 if(SR.tt<=0||!cur||!cur.alive){SR.tt=7+Math.random()*5;let b=-1,bs=-1;for(let i=1;i<=5;i++){const p=P[i];if(!p.alive)continue;const sc=(p.out?2:0)+CN[i]/LANDN*4+Math.random()*1.5+(i===SR.tgt?-1.2:0);if(sc>bs){bs=sc;b=i}}if(b>0)SR.tgt=b}
 if(!SR.fading&&(clk-SR.t0>80)){SR.fading=1;const f=$('fade');f.className='s';setTimeout(()=>{if(state==='menu')bgStart();f.className='';SR.fading=0},520)}}
function camTarget(){if(state==='menu')return P[SR.tgt];return me&&me.alive?me:null}

// ---------- practice match (offline, against bots) ----------
function localMatch(nb,kind){MP=0;VS=1;FF=0;RPL=null;QUIET=0;KIND=kind||'local';NM=['','You'];const bn=['Blaze','Mira','Kabir','Nova'];for(let i=0;i<nb;i++)NM.push('\u{1F916} '+bn[i]);while(NM.length<6)NM.push('');
 AB_=(LOAD.ab&&LOAD.ab.length===2)?LOAD.ab.slice():['boost','dash'];RDY=[1,1];resetCos();setAbLabels();au();AL=[null,AB_.slice()];
 DEATH='';SCORCH=[];RINGS=[];CAM.vz=70;CAM.fy=.5;MPS(1,true,nb);recStart();buildIsland();me=P[1];tg.x=ptr.x=me.x;tg.y=ptr.y=me.y;tg.a=me.a;boost=0;en=1;shake=0;lastSec=99;wasAlive=true;score=kills=streak=0;ACC=0;snapPrev();interp(0);
 CAM.x=me.x;CAM.y=me.y;hideOv();scr='play';snd('start')}

// ---------- online prediction: your own car reacts at once, the server's snapshots keep it honest ----------
let inT=0,sentA=0,sentB=0;
function mpStep(dt){
 fxStep(dt);
 if(state!=='play')return;
 aim();
 for(const s of SHV){s[0]+=s[2]*dt;s[1]+=s[3]*dt}for(const s of STV)s[2]-=dt;for(let i=1;i<=5;i++)if(PRV[i]>0)PRV[i]-=dt;
 for(let i=1;i<=5;i++){const p=P[i];if(!p.alive)continue;const age=Math.min(.12,clk-p.st);
  if(p===me){const d=angd(p.ra,tg.a),m=TURN*dt;p.ra+=Math.abs(d)<m?d:Math.sign(d)*m;const v=SPD*(boost&&en>0?1.6:1)*((MYHOLD&8)?1.15:1);
   p.rx=Math.min(WW-HR,Math.max(HR,p.rx+Math.cos(p.ra)*v*dt));p.ry=Math.min(WH-HR,Math.max(HR,p.ry+Math.sin(p.ra)*v*dt));
   const tx=p.x+Math.cos(p.a)*SPD*age,ty=p.y+Math.sin(p.a)*SPD*age,k=Math.min(1,dt*9);p.rx+=(tx-p.rx)*k;p.ry+=(ty-p.ry)*k;
   if(Math.hypot(tx-p.rx,ty-p.ry)>1.6){p.rx=tx;p.ry=ty}}
  else{const tx=p.x+Math.cos(p.a)*SPD*.92*age,ty=p.y+Math.sin(p.a)*SPD*.92*age,k=Math.min(1,dt*14);p.rx+=(tx-p.rx)*k;p.ry+=(ty-p.ry)*k;p.ra+=angd(p.ra,p.a)*Math.min(1,dt*14)}}
 inT+=dt;if(ws&&ws.readyState===1&&(inT>.1||(inT>.033&&(Math.abs(angd(sentA,tg.a))>.06||boost!==sentB)))){inT=0;sentA=tg.a;sentB=boost;ws.send(JSON.stringify({t:'in',a:+tg.a.toFixed(2),b:boost?1:0}))}
 $('bst').style.setProperty('--e',RDY[0]);$('a2').style.setProperty('--e',RDY[1])}

// ---------- replays: the same engine, fed the recorded seed and inputs ----------
function replayBase(rec,slot){MP=0;FF=0;QUIET=0;KIND=rec.kind||'replay';const S=slot>=1&&slot<=5?slot:((rec.hum&&rec.hum[0]&&rec.hum[0][0])||1);
 AL=(rec.al||[]).map(a=>a?a.slice():null);TL=rec.tl;MPS(rec.h,rec.bots,rec.nb,rec.seed);REC=null;VS=S;me=P[VS];
 NM=['','','','','',''];COS=[null];for(let i=1;i<=5;i++){NM[i]=(rec.names&&rec.names[i])||'';COS[i]=(rec.cos&&rec.cos[i])||['sport','glow']}
 SCORCH=[];RINGS=[];FX=[];PO=[];FD=[];DEATH='';MYHOLD=0;ACC=0;buildIsland();snapPrev();interp(0);syncVisual();CAM.fy=.5;CAM.x=me.x;CAM.y=me.y;CAM.vz=60;hideOv()}
function startReplay(rec,slot,meta){
 if(!rec||!rec.ops||!rec.seed||!rec.fin){toast('This replay cannot be played');return false}
 if(rec.v>EVER){toast('Update the game to watch this replay');return false}
 replayBase(rec,slot);RPL={rec,oi:0,speed:1,paused:false,done:false,seek:null,meta:meta||{},auto:false,evT:0};state='replay';scr='replay';
 AB_=[];$('qt').style.display=$('bst').style.display=$('a2').style.display='none';rpBar(true);return true}
function rpToggle(){if(!RPL)return;if(RPL.done){rpRestart();return}RPL.paused=!RPL.paused;rpUpd()}
function rpRestart(){if(!RPL)return;const r=RPL;replayBase(r.rec,VS);r.oi=0;r.done=false;r.paused=false;r.seek=null;hideOv();rpUpd()}
function rpSeek(frac){if(!RPL)return;const t=Math.max(0,Math.min(RPL.rec.ticks-1,Math.round(frac*RPL.rec.ticks)));
 if(t<TK){const r=RPL;replayBase(r.rec,VS);r.oi=0;r.done=false}
 RPL.seek=t;RPL.wasPaused=RPL.paused;FF=1}
function seekStep(){const r=RPL;let n=0;
 while(TK<r.seek&&n<400){n++;snapPrev();const o=r.rec.ops;while(r.oi<o.length&&o[r.oi][0]<=TK)APPLY(o[r.oi++]);STEPF();EV.length=0}
 if(TK>=r.seek){FF=0;r.seek=null;r.paused=r.wasPaused;FX=[];PO=[];FD=[];SCORCH=[];RINGS=[];ACC=0;snapPrev();interp(0);syncVisual();CAM.x=me.x;CAM.y=me.y;rpUpd()}else interp(0)}
function rpView(s){if(!RPL||s<1||s>5||!P[s])return;VS=s;me=P[s];PREV=null;MDIRTY=true;CAM.x=me.rx;CAM.y=me.ry;rpBar(false);syncVisual()}
function rpClose(){RPL=null;FF=0;rpBar(null);backToMenu()}
function rpSpeed(){if(!RPL)return;RPL.speed=RPL.speed===1?2:RPL.speed===2?4:1;rpUpd()}
function rpEnded(){rpUpd();const fin=RPL.rec.fin,N=fin.N||LANDN,rk=[1,2,3,4,5].filter(i=>(RPL.rec.names||[])[i]).sort((a,b)=>fin.cn[b]-fin.cn[a]);
 show('<div class="big-t">Replay finished</div><p class="hint">Final result of this match</p>'+rk.map((i,k)=>'<div class="rw'+(i===VS?' me':'')+'"><b>'+(k+1)+'</b><i class="d" style="--c:'+COLS[i]+'"></i><span>'+esc(NM[i])+'</span><em>'+Math.round(fin.cn[i]*1000/N)/10+'%</em></div>').join('')
  +'<button class="btn" data-a="rprestart">'+IC.replay+'Watch again</button><button class="btn ghost" data-a="rpclose">Back to menu</button>','rpend')}
