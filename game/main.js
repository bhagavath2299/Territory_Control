// ---------- the main loop ----------
let READY=0,BOOTED=0,rpT2=0;
const FP={n:0,t:0,cpu:0,at:0,total:0};
function loop(t){requestAnimationFrame(loop);
 const p0=performance.now(),raw=(t-last)/1000||0,dt=Math.min(.05,raw);last=t;clk+=dt;
 if(!READY)return;FP.total++;
 if(MP&&!RPL)mpStep(dt);else if(!PAUSED)localFrame(dt);
 if(state==='menu')srDirector(dt);
 rush();autoQuality(raw);musicTick(dt);
 if(MP&&state==='play'&&(hudT+=dt)>.25){hudT=0;hud(1)}
 draw();
 abHud();updatePowDock(state==='play');
 if(RPL&&(++rpT2%5===0))rpProg();
 if(SET.fps)fpsTick(raw,performance.now()-p0)}
// ---------- picture quality ----------
// A quality tier (high / med / low) sets the effects; on top of that, in Auto the picture size follows the frame rate: if frames start to slip the picture is
// drawn a little smaller (the HUD stays sharp), and if that is not enough the tier steps down. A phone that is held at 30 Hz by the system is left alone.
const QC={w:[],grace:90,press:0,good:0,upT:-99,hz:60,mf:0,ms:0,held:0};
function applyQuality(){setQuality(SET.q==='auto'?lsGet('ct-qa',tierGuess()):SET.q);GFX.scale=1;QC.w.length=0;QC.grace=120;if(typeof fit==='function'&&(BOOTED+READY))fit();if(typeof GW!=='undefined'&&GW.u)GW.u.uQ.value=QNAME==='high'?1:0}
function autoQuality(raw){
 if(SET.q!=='auto'||document.hidden||!GFX.ok||GFX.mode!=='world'||(state!=='play'&&state!=='replay'&&state!=='menu')||PAUSED){QC.w.length=0;return}
 if(raw>.25||raw<=0){QC.w.length=0;QC.grace=Math.max(QC.grace,30);return}
 // how this match is running, for the tier of the next one
 if(state==='play'&&!RPL){QC.mf++;if(raw>1.4/QC.hz)QC.ms++}
 if(QC.grace>0){QC.grace--;return}
 QC.w.push(raw);if(QC.w.length<60)return;
 const a=QC.w.slice().sort((x,y)=>x-y);QC.w.length=0;
 const p10=a[6],p90=a[54],hz=p10<.0078?144:p10<.0115?120:60,fT=1/hz;QC.hz=hz;
 if(p10>.028&&p90<.04)return;
 let slow=0;for(const v of a)if(v>fT*1.4)slow++;
 const bad=slow>=9,great=slow<=1&&p90<fT*1.2;
 if(bad){QC.good=0;if(++QC.press>=2){QC.press=0;qDown()}}
 else{QC.press=0;if(great){if(++QC.good>=7){QC.good=0;qUp()}}else QC.good=0}}
function qDown(){
 const sc=GFX.scale||1;
 if(sc>.58){ // trouble right after growing the picture means that size was too much
  if(clk-QC.upT<14){GFX.cap=Math.max(.6,sc-.07);GFX.scale=GFX.cap}else{GFX.cap=Math.min(GFX.cap||1,sc);GFX.scale=Math.max(.6,sc-.14)}
  fit()}
 // no tier change during a match: it would rebuild every shader, which is the very hitch this is meant to avoid. The next match starts a tier lower (tierApply).
 else if(state!=='play'&&QNAME!=='low'){const n=QNAME==='high'?'med':'low';lsSet('ct-qa',n);setQuality(n);if(typeof GW!=='undefined'&&GW.u)GW.u.uQ.value=0;GFX.scale=.85;GFX.cap=1;fit()}
 QC.grace=150}
// the tier a device starts on: weak phones low, other phones med, computers high. The GPU name is read when the 3D engine is up.
function tierGuess(){let weak=false;
 // Safari and the iPhone app's web view do not report the real number of cores (the simulator on a 3-core Mac said 4), so on iPhone and iPad
 // the count says nothing and phones start on the middle tier; one that cannot keep up shrinks the picture, and drops a tier for the next match
 const ios=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 try{const m=navigator.deviceMemory,c=navigator.hardwareConcurrency;if((m&&m<=3)||(!ios&&c&&c<=4))weak=true}catch(e){}
 try{const gl=GFX.R&&GFX.R.getContext(),ext=gl&&gl.getExtension('WEBGL_debug_renderer_info'),r=ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'';
  if(/Mali-(4|T|G3\d|G5[12]\b|G52|G57 MC[12])|Adreno \(TM\) ([2-5]\d\d|60\d|61\d)|PowerVR|SGX|Intel\(R\) HD Graphics [2-5]/i.test(r))weak=true}catch(e){}
 return weak?'low':PHONE?'med':'high'}
// at the start of each match (Auto only): the tier follows how the last match ran. Many slow frames even at the smallest picture: one tier down.
// A whole match of smooth frames at full size: one tier up (phones stop at med; high can be picked by hand in Settings).
function tierApply(){
 if(SET.q!=='auto'||!GFX.ok)return;
 let cur=lsGet('ct-qa','');if(!QLV[cur])cur=tierGuess();
 const n=QC.mf,slow=n?QC.ms/n:0;let next=cur;
 if(n>900){if(slow>.06&&(GFX.scale||1)<=.62)next=cur==='high'?'med':'low';
  else if(slow<.01&&(GFX.scale||1)>=.99&&!(QC.held>0))next=cur==='low'?'med':(cur==='med'&&!PHONE)?'high':cur}
 QC.mf=QC.ms=0;if(QC.held>0)QC.held--;
 if(next!==cur){lsSet('ct-qa',next);QC.held=2}
 if(next!==QNAME){setQuality(next);GFX.scale=next===cur?(GFX.scale||1):.9;GFX.cap=1;fit()}
 if(typeof GW!=='undefined'&&GW.u)GW.u.uQ.value=QNAME==='high'?1:0}
function qUp(){const cap=GFX.cap||1,sc=GFX.scale||1;if(sc<cap-.01){GFX.scale=Math.min(cap,sc+.07);QC.upT=clk;QC.grace=60;fit()}}
// frame-rate read-out (Settings > Show frame rate, or ?fps=1)
function fpsShow(){const e=$('fps');if(e)e.style.display=SET.fps?'block':'none'}
function fpsTick(raw,cpu){FP.n++;FP.t+=raw;FP.cpu+=cpu;if(FP.t<.5)return;
 const e=$('fps');if(e){const fps=FP.n/FP.t,R=GFX.R,s=GFX.stats,mp=R?(R.domElement.width*R.domElement.height/1e6).toFixed(2):'-';
  e.textContent=fps.toFixed(0)+' fps  '+(1000/fps).toFixed(1)+' ms  (cpu '+(FP.cpu/FP.n).toFixed(1)+')\n'+(GFX.ok?QNAME+' x'+(GFX.scale||1).toFixed(2)+'  '+mp+' MP  '+s.calls+' calls  '+Math.round(s.tris/1000)+'k tris':'2D mode')+(MP&&NC.ping?'\nping '+Math.round(NC.ping)+' ms':'')}
 FP.n=0;FP.t=0;FP.cpu=0}
// ---------- music follows what is on screen ----------
let musicKey='';
function musicScene(){musicKey='';musicTick(0)}
function musicTick(dt){if(!AUD||!AUD.music)return;
 let sc='menu',inten=0,danger=0,rush2=0;
 if(BOOTED<1)sc='boot';
 else if(state==='play'||state==='replay'){sc=state==='play'?'match':'replay';const m=me;rush2=tl<=30&&tl>0?1:0;
  // the music follows the game that is on screen, live or replayed: the clock, the land won, and how exposed the viewed car is
  inten=Math.min(1,(1-tl/TL)*.55+(CN[VS]/LANDN)*1.1+(rush2?.25:0));
  if(m&&m.alive){let near=40;for(let i=1;i<=5;i++){const p=P[i];if(!p||p===m||!p.alive)continue;const d=Math.hypot(p.rx-m.rx,p.ry-m.ry);if(d<near)near=d}
   const prox=near<14?1-near/14:0;danger=m.out?Math.min(1,.25+Math.min(.3,m.tr.length/500)+prox*.45):prox*.2}else danger=.12}
 else if(state==='over')sc='results';
 else if(scr==='lobby'||scr==='conn'||scr==='wait')sc='lobby';
 AUD.music.set(sc,inten,danger,rush2,SEEDMOOD())}
function SEEDMOOD(){return(SEED>>>0)%3}
// ---------- boot sequence ----------
const tick=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
const BSTEP=(p,t)=>{const b=document.querySelector('#bbar i');if(b)b.style.width=p+'%';$('bmsg').textContent=t};
async function bootRun(skip){
 grainCss();BSTEP(6,'Warming up the engines...');await tick();
 fit();readSafe();BSTEP(14,'Starting the 3D engine...');await tick();
 // a step that fails (for instance the 3D picture lost while it starts, as once in the simulator) is reported and the next one runs:
 // the game still starts, and three.js rebuilds the 3D picture when the system gives it back
 if(typeof buildTexSteps==='function'){const st=buildTexSteps();for(let i=0;i<st.length;i++){BSTEP(14+Math.round(i/st.length*52),st[i][0]);await tick();try{await st[i][1]()}catch(e){console.error('loading step "'+st[i][0]+'" failed: '+(e&&e.message||e))}}}
 BSTEP(72,'Rolling out the map...');await tick();
 try{bgStart()}catch(e){console.error('menu showreel failed: '+(e&&e.message||e))}READY=1;
 BSTEP(84,'Starting the engine...');await tick();
 if(SERVER!=='none'){BSTEP(88,'Connecting to the server...');const t0=Date.now();
  while(!online&&Date.now()-t0<4500){if(Date.now()-t0>1800)$('bmsg').textContent='Waking the server (first start can take a minute)...';await new Promise(r=>setTimeout(r,120))}}
 BSTEP(100,online?'Ready':SERVER==='none'?'Ready (offline preview)':'Ready (server is still waking)');await tick();
 $('boot').className='rdy';if(skip)bootStart()}
function bootStart(){if(BOOTED)return;BOOTED=1;au();$('boot').className='h';setTimeout(()=>{const b=$('boot');if(b&&b.className==='h'&&b.parentNode)b.style.display='none'},800);
 if(AUD&&AUD.music){AUD.music.start();AUD.sfx('logo')}
 if(replay0){const r=replay0;replay0='';openReplay(r,false,+(new URLSearchParams(location.search).get('s'))||0)}else menu();
 musicScene()}
// the animated logo behind the loading bar: a car drives out of its home, loops around and claims the land
const WF='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',WMS={};let WMU='';
// the wordmark as a picture for the menu. A canvas the system could not give memory to comes back as "data:," (seen in a loaded simulator):
// then nothing is kept, the menu shows the name as text, and the next menu tries again.
function wmURL(){if(!WMU){try{const u=bootWM(520,2).c.toDataURL('image/png');if(u&&u.length>100)WMU=u}catch(e){}}return WMU}
function bootWM(w,dp){const key=w+'@'+dp;if(WMS[key])return WMS[key];
 const mk2=(W2,H2)=>{const c=document.createElement('canvas');c.width=Math.round(W2*dp);c.height=Math.round(H2*dp);return c};
 const t=document.createElement('canvas').getContext('2d');
 const fit2=(txt,wt,tw)=>{t.font=wt+' 100px '+WF;return 100*tw/t.measureText(txt).width};
 const f1=Math.min(fit2('TERRITORY','900 italic',Math.min(w*.8,430)),74),f2=Math.min(fit2('CONTROL','900 italic',Math.min(w*.9,480)),92),H2=f1+f2*1.05+f2*.5,c=mk2(w,H2),g=c.getContext('2d');g.scale(dp,dp);
 g.textAlign='center';g.textBaseline='alphabetic';g.lineJoin='round';g.save();g.translate(w/2,0);g.transform(1,0,-.1,1,0,0);
 const y1=f1*.95,y2=y1+f2*.98;
 g.font='900 italic '+f1+'px '+WF;g.lineWidth=f1*.13;g.strokeStyle='#0a1030';g.strokeText('TERRITORY',0,y1);let gr=g.createLinearGradient(0,y1-f1*.8,0,y1);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#a9c6ff');g.fillStyle=gr;g.fillText('TERRITORY',0,y1);
 g.font='900 italic '+f2+'px '+WF;g.lineWidth=f2*.11;g.strokeStyle='#1a0a30';g.strokeText('CONTROL',0,y2);const tw=g.measureText('CONTROL').width;gr=g.createLinearGradient(-tw/2,0,tw/2,0);gr.addColorStop(0,'#ffbf4a');gr.addColorStop(.5,'#ff5d7b');gr.addColorStop(1,'#a56bff');g.fillStyle=gr;g.fillText('CONTROL',0,y2);g.restore();
 const c2=mk2(w,H2);return WMS[key]={w,dp,c,c2,H:H2,f1,f2,y2}}
// ---------- the loading screen (v20): dark asphalt under a soft light, no grid ----------
let BGC=null,BGK='',STARS=null;
// The grain is one 192 px tile made in memory and laid as a pattern: a single draw. (Thousands of tiny rectangles, as a first v20 build did, flood the
// phone's drawing process while the 3D engine starts, and in the simulator the 3D picture was lost.)
let BOOTTILE=null;
function bootTile(){if(BOOTTILE)return BOOTTILE;const N=192,c=mkc(N,N),g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data,R=mulberry32(4242);
 for(let i=0;i<N*N;i++){const v=R(),k=i*4;let a=0,l=0;if(v<.06){l=255;a=Math.round((.03+R()*.06)*255)}else if(v>.86){l=0;a=Math.round((.12+R()*.16)*255)}d[k]=d[k+1]=d[k+2]=l;d[k+3]=a}
 g.putImageData(im,0,0);return BOOTTILE=c}
function bootStatic(w,h,dp){const c=mkc(Math.round(w*dp),Math.round(h*dp)),g=c.getContext('2d');g.scale(dp,dp);
 g.fillStyle='#0b0c0f';g.fillRect(0,0,w,h);
 // the ground: fine grain, lighter where the light falls
 try{const pt=g.createPattern(bootTile(),'repeat');if(pt){g.save();g.scale(1/dp,1/dp);g.fillStyle=pt;g.fillRect(0,0,w*dp,h*dp);g.restore()}}catch(e){}
 g.fillStyle=rg(g,w/2,h*.36,0,w/2,h*.4,Math.max(w,h)*.75,[[0,'rgba(255,244,228,.16)'],[.4,'rgba(170,190,220,.05)'],[1,'rgba(0,0,0,0)']]);g.fillRect(0,0,w,h);
 STARS=[];
 return c}
// a slow sweep of light across the ground
function bootFloor(g,w,h,s){const x=((s*.12)%1.6-.3)*w;g.save();g.globalCompositeOperation='lighter';
 g.fillStyle=lg(g,x-w*.35,0,x+w*.35,h,[[0,'rgba(255,255,255,0)'],[.5,'rgba(255,248,236,.035)'],[1,'rgba(255,255,255,0)']]);g.fillRect(0,0,w,h);g.restore()}
function bootDraw(t){const c=$('bl');if(!c||$('boot').className==='h'){return}
 const dp=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;if(c.width!==Math.round(w*dp)||c.height!==Math.round(h*dp)){c.width=Math.round(w*dp);c.height=Math.round(h*dp)}
 const g=c.getContext('2d');g.setTransform(dp,0,0,dp,0,0);
 const bk=w+'x'+h+'@'+dp;if(!BGC||BGK!==bk){BGC=bootStatic(w,h,dp);BGK=bk}
 const s=t/1000;g.drawImage(BGC,0,0,w,h);
 for(const st of STARS){g.globalAlpha=.15+.45*(.5+.5*Math.sin(s*st[4]+st[3]));g.fillStyle='#9fd8ff';g.beginPath();g.arc(st[0],st[1],st[2],0,7);g.fill()}g.globalAlpha=1;
 bootFloor(g,w,h,s);
 const vg=g.createRadialGradient(w/2,h*.4,Math.min(w,h)*.14,w/2,h*.45,Math.max(w,h)*.74);vg.addColorStop(0,'rgba(0,0,0,.1)');vg.addColorStop(.55,'rgba(0,0,0,.05)');vg.addColorStop(1,'rgba(0,0,0,.7)');g.fillStyle=vg;g.fillRect(0,0,w,h);
 g.fillStyle=lg(g,0,h*.66,0,h,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.72)']]);g.fillRect(0,h*.66,w,h*.34);
 // emblem: the loop starts and ends at the home square
 const R=Math.min(w*.8,h*.5)*.27,cx=w/2,cy=h*.3,per=4.6,k=Math.floor(s/per),ph=(s%per)/per,col=COLS[k%5+1],run=Math.min(1,ph/.62);
 const rp=u=>{const a=1.5708+u*6.2832,rx=R*(1+.12*Math.sin(a*3+1)*Math.sin(u*3.1416)),ry=R*(1+.1*Math.cos(a*2)*Math.sin(u*3.1416));return[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]};
 const fill=ph<.62?0:Math.min(1,(ph-.62)/.12),fade=ph>.9?1-(ph-.9)/.1:1,hy=cy+R;
 g.save();g.globalAlpha=fade;
 const N=140,n=Math.floor(N*run);
 if(fill>0){g.beginPath();for(let i=0;i<=N;i++){const p=rp(i/N);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])}g.closePath();g.fillStyle=col;g.globalAlpha=fade*Math.min(.5,fill*.5);g.fill();g.globalAlpha=fade}
 g.fillStyle=fill>0?col:'rgba(255,255,255,.1)';g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=2;g.globalAlpha=fade*(fill>0?.85:1);g.beginPath();g.roundRect(cx-R*.5,hy-R*.2,R,R*.4,R*.12);g.fill();g.stroke();g.globalAlpha=fade;
 if(n>1){g.lineCap=g.lineJoin='round';g.beginPath();for(let i=0;i<=n;i++){const p=rp(i/N);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])}
  g.strokeStyle=col;g.globalAlpha=fade*.28;g.lineWidth=18;g.stroke();g.globalAlpha=fade*.55;g.lineWidth=9;g.stroke();g.globalAlpha=fade;g.lineWidth=4;g.strokeStyle='#fff';g.stroke()}
 if(run<1){const p=rp(run),p2=rp(Math.max(0,run-.012)),an=Math.atan2(p[1]-p2[1],p[0]-p2[0]);carChip(p[0],p[1],16,col,an,g)}
 g.restore();
 // wordmark with a moving shine
 const wm=bootWM(w,dp),wy=hy+R*.62;
 const g2=wm.c2.getContext('2d');g2.setTransform(1,0,0,1,0,0);g2.globalCompositeOperation='source-over';g2.clearRect(0,0,wm.c2.width,wm.c2.height);g2.drawImage(wm.c,0,0);
 const sx=(((s*.5)%1.8)-.4)*w*1.2*dp,sw=70*dp;g2.globalCompositeOperation='source-atop';const sg=g2.createLinearGradient(sx-sw,0,sx+sw,0);sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,255,.75)');sg.addColorStop(1,'rgba(255,255,255,0)');g2.fillStyle=sg;g2.fillRect(0,0,wm.c2.width,wm.c2.height);g2.globalCompositeOperation='source-over';
 g.drawImage(wm.c2,0,wy,w,wm.H);
 g.textAlign='center';g.font='800 '+Math.max(11,wm.f1*.2)+'px '+WF;g.fillStyle='#cfe0ff';g.globalAlpha=.85;
 if(g.letterSpacing!==undefined)g.letterSpacing='6px';g.fillText('CLAIM THE MAP',cx,wy+wm.H+wm.f1*.34);if(g.letterSpacing!==undefined)g.letterSpacing='0px';g.globalAlpha=1}
function bootLoop(t){if($('boot').className==='h')return;bootDraw(t);requestAnimationFrame(bootLoop)}
// ---------- start ----------
(function init(){
 try{const o=JSON.parse(lsGet('ct-set','null'));if(o)for(const k in SET)if(k in o)SET[k]=o[k]}catch(e){}
 const qs=BROWSER?new URLSearchParams(location.search):new URLSearchParams('');
 if(qs.get('quality'))SET.q=qs.get('quality');
 if(SET.q!=='auto'&&!QLV[SET.q])SET.q='auto';
 if(qs.get('fps')==='1')SET.fps=1;
 setQuality(SET.q==='auto'?lsGet('ct-qa',tierGuess()):SET.q);
 purgeLocal();fpsShow();
 if(BROWSER){room0=(qs.get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);replay0=(qs.get('replay')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24);
  requestAnimationFrame(bootLoop);conn();bootRun(qs.get('skip')==='1')}
 requestAnimationFrame(loop)})();