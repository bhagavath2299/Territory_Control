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
 grainCss();BSTEP(6,'Warming up the engines...');await tick();
 fit();BSTEP(18,'Gritting the roads...');await tick();
 if(typeof buildTexSteps==='function'){const st=buildTexSteps();for(let i=0;i<st.length;i++){st[i][1]();BSTEP(18+Math.round((i+1)/st.length*34),st[i][0]);await tick()}}
 BSTEP(56,'Polishing the paint...');await tick();
 if(typeof buildCars==='function')buildCars();
 BSTEP(72,'Laying fresh snow...');await tick();
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
// ---------- the loading screen: asphalt seen from above, worn lane paint, snow banks and drifting snow ----------
let ROAD=null,RDW=0;
// a tileable piece of asphalt: mottled tar, a grit of small stones and a few hairline cracks
function asphaltTile(N){const c=mkc(N,N),g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data,lf=new Float32Array(N*N);
 for(const [cell,amp] of [[128,.46],[64,.30],[32,.16],[16,.08]]){const gw=N/cell,gr=new Float32Array(gw*gw);for(let i=0;i<gr.length;i++)gr[i]=Math.random();
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x/cell,fy=y/cell,x0=Math.floor(fx)%gw,y0=Math.floor(fy)%gw,x1=(x0+1)%gw,y1=(y0+1)%gw,tx=fx-Math.floor(fx),ty=fy-Math.floor(fy),sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
   lf[y*N+x]+=(gr[y0*gw+x0]*(1-sx)*(1-sy)+gr[y0*gw+x1]*sx*(1-sy)+gr[y1*gw+x0]*(1-sx)*sy+gr[y1*gw+x1]*sx*sy)*amp}}
 for(let i=0;i<N*N;i++){const n=Math.random(),v=24+lf[i]*22+n*9,k=i*4;d[k]=v;d[k+1]=v+1.5;d[k+2]=v+4;d[k+3]=255}
 g.putImageData(im,0,0);
 // stones: small light and dark chips, wrapped at the edges so the tile joins up
 for(let i=0;i<N*N/26;i++){const x=Math.random()*N,y=Math.random()*N,r=.6+Math.random()*1.7,l=Math.random()<.7,v=l?70+Math.random()*80:6+Math.random()*14;g.fillStyle='rgba('+v+','+(v+2)+','+(v+6)+','+(.28+Math.random()*.5)+')';
  for(const ox of(x<4?[0,N]:x>N-4?[0,-N]:[0]))for(const oy of(y<4?[0,N]:y>N-4?[0,-N]:[0])){g.beginPath();g.ellipse(x+ox,y+oy,r*(.8+Math.random()*.5),r,Math.random()*3,0,7);g.fill()}}
 // hairline cracks
 g.lineCap='round';for(let k=0;k<3;k++){let x=40+Math.random()*(N-80),y=40+Math.random()*(N-80),a=Math.random()*6.28;const pts=[[x,y]];for(let i=0;i<22;i++){a+=(Math.random()-.5)*.9;x+=Math.cos(a)*(5+Math.random()*7);y+=Math.sin(a)*(5+Math.random()*7);if(x<6||y<6||x>N-6||y>N-6)break;pts.push([x,y])}
  g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=1.1;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();g.strokeStyle='rgba(255,255,255,.06)';g.lineWidth=.8;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0]+.9,p[1]+.9):g.moveTo(p[0]+.9,p[1]+.9));g.stroke()}
 return c}
// one tall piece of road that scrolls: asphalt, worn paint, tar patches and snow banks on both sides. The height (1024 px) repeats seamlessly.
function roadBake(w,dp){const rw=Math.round(w*dp),P=1024,c=mkc(rw,P),g=c.getContext('2d'),at=asphaltTile(256);
 g.fillStyle=g.createPattern(at,'repeat');g.fillRect(0,0,rw,P);
 // darker tar patches and old tyre rubber
 for(let i=0;i<9;i++){const x=Math.random()*rw,y=Math.random()*P,r=40+Math.random()*90;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(4,5,8,.34)');gr.addColorStop(1,'rgba(4,5,8,0)');g.fillStyle=gr;for(const oy of[0,P,-P]){g.save();g.translate(0,oy);g.fillRect(x-r,y-r,r*2,r*2);g.restore()}}
 for(const xf of[.30,.70]){g.strokeStyle='rgba(6,7,10,.34)';g.lineWidth=rw*.05;g.lineCap='round';for(const ph of[0,1]){g.beginPath();for(let y=-20;y<=P+20;y+=16){const x=rw*xf+Math.sin(y/P*6.2832*2+ph*2+xf*9)*rw*.025+ph*rw*.045;y<=-20?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}}
 // lane paint: two dashed lines and two solid edge lines, then worn away with noise
 const pl=mkc(rw,P),pg=pl.getContext('2d');pg.fillStyle='#e9edf2';
 for(const xf of[.36,.64])for(let y=0;y<P;y+=256)pg.fillRect(rw*xf-5*dp,y+20,10*dp,150);
 for(const xf of[.115,.885])pg.fillRect(rw*xf-4*dp,0,8*dp,P);
 {const im=pg.getImageData(0,0,rw,P),d=im.data;for(let y=0;y<P;y++)for(let x=0;x<rw;x++){const i=(y*rw+x)*4+3;if(d[i]){const wr=Math.random();d[i]=wr<.18?0:d[i]*(.55+.45*Math.random())}}pg.putImageData(im,0,0)}
 g.globalAlpha=.86;g.drawImage(pl,0,0);g.globalAlpha=1;
 // snow banks: a lumpy white edge with a soft shadow on the road
 for(const side of[0,1]){const base=side?rw:0,dir=side?-1:1,wd=rw*.075;
  const edge=y=>base+dir*(wd+Math.sin(y/P*6.2832*3+side*2)*rw*.014+Math.sin(y/P*6.2832*7+side)*rw*.007);
  g.save();g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=18*dp;g.fillStyle='#e8eef7';g.beginPath();g.moveTo(base,-4);for(let y=-4;y<=P+4;y+=8)g.lineTo(edge(y),y);g.lineTo(base,P+4);g.closePath();g.fill();g.restore();
  g.save();g.beginPath();g.moveTo(base,-4);for(let y=-4;y<=P+4;y+=8)g.lineTo(edge(y),y);g.lineTo(base,P+4);g.closePath();g.clip();
  const bg=g.createLinearGradient(base,0,edge(0),0);bg.addColorStop(0,'rgba(255,255,255,1)');bg.addColorStop(1,'rgba(196,210,230,1)');g.fillStyle=bg;g.fillRect(0,0,rw,P);
  g.globalAlpha=.5;g.fillStyle=g.createPattern(grainTile(),'repeat');g.fillRect(0,0,rw,P);g.globalAlpha=1;g.restore()}
 // frost and salt on the road
 for(let i=0;i<rw*P/900;i++){const x=Math.random()*rw,near=Math.min(x,rw-x)/rw;if(Math.random()>.22+Math.max(0,.2-near)*3)continue;g.fillStyle='rgba(235,242,252,'+(.12+Math.random()*.5)+')';g.beginPath();g.arc(x,Math.random()*P,.5+Math.random()*1.3,0,7);g.fill()}
 ROAD=c;RDW=rw;return c}
function bootDraw(t){const c=$('bl');if(!c||$('boot').className==='h'){return}
 const dp=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;if(c.width!==Math.round(w*dp)||c.height!==Math.round(h*dp)){c.width=Math.round(w*dp);c.height=Math.round(h*dp)}
 const g=c.getContext('2d');g.setTransform(dp,0,0,dp,0,0);
 if(!ROAD||RDW!==Math.round(w*dp))roadBake(w,dp);
 const s=t/1000,rph=ROAD.height/dp,sy=(s*56)%rph;
 for(let y=-sy;y<h;y+=rph)g.drawImage(ROAD,0,y,w,rph);
 // snow drifting across
 g.fillStyle='#ffffff';for(let i=0;i<44;i++){const hh=((i*73856093)^(i*19349663))>>>0,sp=.25+(hh%100)/160,x=((hh%997)/997*w+s*(14+sp*20)+Math.sin(s*.6+i)*14)%w,y=(((hh>>8)%991)/991*h+s*(26+sp*40))%h,r=.8+(hh%7)*.38;g.globalAlpha=.25+(hh%5)*.1;g.beginPath();g.arc(x,y,r,0,7);g.fill()}
 g.globalAlpha=1;
 const vg=g.createRadialGradient(w/2,h*.4,Math.min(w,h)*.12,w/2,h*.45,Math.max(w,h)*.72);vg.addColorStop(0,'rgba(4,6,10,.46)');vg.addColorStop(.5,'rgba(4,6,10,.1)');vg.addColorStop(1,'rgba(2,3,6,.78)');g.fillStyle=vg;g.fillRect(0,0,w,h);
 g.fillStyle=lg(g,0,h*.62,0,h,[[0,'rgba(4,6,10,0)'],[1,'rgba(4,6,10,.82)']]);g.fillRect(0,h*.62,w,h*.38);
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
 setQuality(SET.q==='auto'?lsGet('ct-qa','high'):SET.q);
 theme();purgeLocal();
 if(BROWSER){room0=(qs.get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);replay0=(qs.get('replay')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24);
  requestAnimationFrame(bootLoop);conn();bootRun(qs.get('skip')==='1')}
 requestAnimationFrame(loop)})();
//@@end
