// ---------- the main loop ----------
let READY=0,BOOTED=0,dispQt=-1,dispA2=-1,dispB=-1,rpT2=0,qAcc=0,qN=0,qSlow=0;
function loop(t){requestAnimationFrame(loop);
 const dt=Math.min(.05,(t-last)/1000||0);last=t;clk+=dt;
 if(!READY)return;
 if(MP&&!RPL)mpStep(dt);else localFrame(dt);
 if(state==='menu')srDirector(dt);
 rush();camStep(dt);autoQuality(dt);musicTick(dt);
 if(MP&&state==='play'&&(hudT+=dt)>.25){hudT=0;hud(1)}
 if(!(fr++%30))theme();
 draw();
 const pl=state==='play',q=pl?1:0,a2=pl&&AB_.length>1?1:0;
 if(q!==dispQt){dispQt=q;$('qt').style.display=q?'block':'none';$('bst').classList.toggle('on',!!q)}
 if(a2!==dispA2){dispA2=a2;$('a2').classList.toggle('on',!!a2)}
 updatePowDock(pl);
 if(RPL&&(++rpT2%5===0))rpProg()}
// ---------- picture quality ----------
function applyQuality(){setQuality(SET.q==='auto'?lsGet('ct-qa','high'):SET.q);if(typeof fit==='function'&&BOOTED+READY)fit()}
function autoQuality(dt){if(SET.q!=='auto'||document.hidden||(state!=='play'&&state!=='replay'&&state!=='menu'))return;qAcc+=dt;if(++qN<90)return;const avg=qAcc/qN;qAcc=0;qN=0;
 if(avg>.027){if(++qSlow>=2){qSlow=0;const n=QNAME==='high'?'med':QNAME==='med'?'low':'low';if(n!==QNAME){lsSet('ct-qa',n);setQuality(n);fit()}}}else qSlow=0}
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
 BSTEP(6,'Warming up...');await tick();
 fit();BSTEP(18,'Painting the islands...');await tick();
 if(typeof buildTexSteps==='function'){const st=buildTexSteps();for(let i=0;i<st.length;i++){st[i][1]();BSTEP(18+Math.round((i+1)/st.length*34),st[i][0]);await tick()}}
 BSTEP(56,'Building the cars...');await tick();
 if(typeof buildCars==='function')buildCars();
 BSTEP(72,'Growing the palm trees...');await tick();
 bgStart();READY=1;
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
function wmURL(){if(!WMU){try{WMU=bootWM(520,2).c.toDataURL('image/png')}catch(e){WMU=''}}return WMU}
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
function bootDraw(t){const c=$('bl');if(!c||$('boot').className==='h'){return}
 const dp=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;if(c.width!==Math.round(w*dp)||c.height!==Math.round(h*dp)){c.width=Math.round(w*dp);c.height=Math.round(h*dp)}
 const g=c.getContext('2d');g.setTransform(dp,0,0,dp,0,0);
 const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#04060f');bg.addColorStop(.55,'#0a1330');bg.addColorStop(1,'#050812');g.fillStyle=bg;g.fillRect(0,0,w,h);
 // drifting territory tiles
 const cs2=Math.max(34,Math.min(w,h)/9),cols=Math.ceil(w/cs2)+1,rows=Math.ceil(h/cs2)+1,s=t/1000;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const hh=((x*73856093)^(y*19349663))>>>0,ph=(hh%1000)/1000,k=hh%5+1,a=Math.max(0,Math.sin(s*.7+ph*6.28+(x+y)*.35))**3*.22;
  if(a<.01)continue;g.globalAlpha=a;g.fillStyle=COLS[k];g.beginPath();g.roundRect(x*cs2-((s*6)%cs2)+3,y*cs2+3,cs2-6,cs2-6,cs2*.2);g.fill()}
 g.globalAlpha=1;
 const vg=g.createRadialGradient(w/2,h*.4,Math.min(w,h)*.1,w/2,h*.45,Math.max(w,h)*.7);vg.addColorStop(0,'rgba(5,8,18,0)');vg.addColorStop(1,'rgba(3,5,12,.88)');g.fillStyle=vg;g.fillRect(0,0,w,h);
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
 if(run<1){const p=rp(run),p2=rp(Math.max(0,run-.012)),an=Math.atan2(p[1]-p2[1],p[0]-p2[0]);g.save();g.translate(p[0],p[1]);g.rotate(an);
  g.fillStyle=col;g.shadowColor=col;g.shadowBlur=22;g.beginPath();g.roundRect(-14,-8,28,16,5);g.fill();g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.85)';g.fillRect(-2,-6,8,12);g.fillStyle='#ffe9a8';g.fillRect(10,-6,3,3);g.fillRect(10,3,3,3);g.restore()}
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
 setQuality(SET.q==='auto'?lsGet('ct-qa','high'):SET.q);
 theme();purgeLocal();
 if(BROWSER){room0=(qs.get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);replay0=(qs.get('replay')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24);
  requestAnimationFrame(bootLoop);conn();bootRun(qs.get('skip')==='1')}
 requestAnimationFrame(loop)})();
//@@end
