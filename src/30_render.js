//@@client
// ---------- renderer: the ground is a shader (34_gl.js); this file lays the cars, trails, effects and HUD on top of it ----------
function mkc(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
const rgbOf=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const COLRGB=COLS.map(c=>c?rgbOf(c).map(v=>v/255):[1,1,1]);
const shade=(h,f)=>{const c=rgbOf(h);return'rgb('+(c[0]*f|0)+','+(c[1]*f|0)+','+(c[2]*f|0)+')'};
const tint=(h,f)=>{const c=rgbOf(h);return'rgb('+(c[0]+(255-c[0])*f|0)+','+(c[1]+(255-c[1])*f|0)+','+(c[2]+(255-c[2])*f|0)+')'};
const rgba=(h,a)=>{const c=rgbOf(h);return'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'};
const C_UG=COLS.map(c=>c&&rgba(c,.42)),C_W1=COLS.map(c=>c&&shade(c,.7)),C_W2=COLS.map(c=>c&&shade(c,.5)),C_SW=COLS.map(c=>c&&shade(c,.66)),C_TR=COLS.map(c=>c&&tint(c,.42)),C_SH=COLS.map(c=>c&&shade(c,.56)),C_DK=COLS.map(c=>c&&shade(c,.62)),C_TI=COLS.map(c=>c&&tint(c,.28)),C_TI2=COLS.map(c=>c&&tint(c,.6));

// ---------- light of the day: every map gets a mood from its seed ----------
// sun: where the light comes from (shadows fall the other way). sunC / amb: sun and sky light. snow: colour of fresh snow. w0..w2: sea colours, shallow to deep.
// night: how much the lamps matter. gk: how strongly glows show on the 2D layer.
const nrm3=v=>{const l=Math.hypot(v[0],v[1],v[2]);return[v[0]/l,v[1]/l,v[2]/l]};
const MOODS=[
 {n:'Day',night:0,sun:nrm3([-.42,-.56,.71]),sunC:[1,.985,.95],amb:[.80,.88,1],snow:[.975,.98,.995],w0:[.56,.90,.92],w1:[.09,.46,.62],w2:[.02,.12,.26],sky:[.36,.56,.92],hor:[.92,.96,1],gnd:[.93,.95,.98],refl:2.4,sh:.36,gk:.8,hl:.25,cone:0,vig:.12,tone:null},
 {n:'Golden hour',night:.1,sun:nrm3([-.78,-.34,.52]),sunC:[1,.965,.90],amb:[.84,.87,.97],snow:[.99,.99,.985],w0:[.82,.90,.84],w1:[.16,.42,.56],w2:[.04,.10,.24],sky:[.50,.60,.88],hor:[1,.86,.70],gnd:[.97,.955,.92],refl:2.4,sh:.44,gk:.95,hl:.45,cone:.05,vig:.16,tone:[255,215,170,.03]},
 {n:'Dusk',night:.5,sun:nrm3([-.30,-.70,.64]),sunC:[.84,.88,1],amb:[.76,.82,1],snow:[.96,.975,1],w0:[.40,.72,.88],w1:[.08,.30,.54],w2:[.01,.06,.20],sky:[.28,.38,.72],hor:[.68,.76,.95],gnd:[.84,.88,.97],refl:2.4,sh:.5,gk:1.2,hl:.9,cone:.25,vig:.2,tone:[110,130,220,.06]}];
for(const m of MOODS){const l=Math.hypot(m.sun[0],m.sun[1])||1;m.lx=-m.sun[0]/l*(1-m.sun[2]*.4);m.ly=-m.sun[1]/l*(1-m.sun[2]*.4)}
let MOOD=MOODS[0];
function setMood(seed){const k=(seed>>>0)%4;MOOD=MOODS[k<2?0:k-1]}

// ---------- boot: the loading screen runs these one by one so the bar moves ----------
let TEXOK=0,LASTRB=-9;
const DEC={blob:null,shield:null,cloud:null};
function blobSprite(){const c=mkc(64,64),g=c.getContext('2d');g.fillStyle=rg(g,32,32,0,32,32,32,[[0,'rgba(20,34,60,.5)'],[.6,'rgba(20,34,60,.22)'],[1,'rgba(20,34,60,0)']]);g.fillRect(0,0,64,64);return c}
function shieldSprite(){const c=mkc(160,160),g=c.getContext('2d');g.fillStyle=rg(g,80,80,30,80,80,78,[[0,'rgba(94,225,255,.0)'],[.78,'rgba(94,225,255,.16)'],[.93,'rgba(150,240,255,.55)'],[1,'rgba(150,240,255,0)']]);g.beginPath();g.arc(80,80,78,0,7);g.fill();
 g.strokeStyle='rgba(60,150,200,.4)';g.lineWidth=1.2;const r=15;for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){const cx=80+x*r*1.5,cy=80+y*r*1.732+(x&1?r*.866:0);if(Math.hypot(cx-80,cy-80)>66)continue;g.beginPath();for(let k=0;k<6;k++){const a=k/6*6.283;k?g.lineTo(cx+Math.cos(a)*r*.92,cy+Math.sin(a)*r*.92):g.moveTo(cx+Math.cos(a)*r*.92,cy+Math.sin(a)*r*.92)}g.closePath();g.stroke()}
 g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(56,48,22,8,-.7,0,7);g.fill();return c}
function buildDecor(){DEC.blob=blobSprite();DEC.shield=shieldSprite()}
function buildTexSteps(){return[
 ['Freezing the lakes...',()=>{if(!GLS.noise)GLS.noise=glNoiseBuild()}],
 ['Packing the snow...',()=>{glInit();buildDecor();TEXOK=1;fit()}]]}
function buildTexAll(){for(const s of buildTexSteps())s[1]()}

// ---------- the island of this match ----------
let SKX=0,CAPW=[];
function buildIsland(){if(IS_SRV||!LANDI)return;
 setMood(SEED);LASTRB=-9;PREV=null;glMap();FLASH=null;CAPW.length=0;
 if(!GLS.ok)fbMap()}

// ---------- plain ground for phones that cannot run the shader: smooth coast picture plus a layer for the land that is owned ----------
let FBC=null,FBL=null;
function fbMap(){if(!FBC)FBC=mkc(MW,MH);
 // the island as a smooth picture: the land mask, blurred and sharpened again so the coast is round instead of stepped
 const m=mkc(MW,MH),g=m.getContext('2d'),img=g.createImageData(MW,MH),d=img.data;for(let i=0;i<ISL.length;i++){const k=i*4,v=ISL[i]?255:0;d[k]=d[k+1]=d[k+2]=v;d[k+3]=255}g.putImageData(img,0,0);
 FBL=mkc(MW*3,MH*3);const b=FBL.getContext('2d');b.imageSmoothingEnabled=true;b.imageSmoothingQuality='high';b.filter='blur(5px) contrast(9)';b.drawImage(m,0,0,MW*3,MH*3);b.filter='none';
 // white mask -> snow on water
 const id=b.getImageData(0,0,MW*3,MH*3),q=id.data;for(let i=0;i<q.length;i+=4){const l=q[i]/255,sh=Math.max(0,Math.min(1,(l-.0)*1));
  q[i]=30+(236-30)*sh;q[i+1]=96+(242-96)*sh;q[i+2]=140+(250-140)*sh;q[i+3]=255}b.putImageData(id,0,0);
 fbPaint()}
function fbPaint(){if(!FBC)return;const g=FBC.getContext('2d'),img=g.createImageData(MW,MH),d=img.data,cl=COLS.map(c=>c?rgbOf(c):[0,0,0]);
 for(let i=0;i<own.length;i++){const o=own[i],k=i*4;if(o){const c=cl[o];d[k]=c[0]*.85+30;d[k+1]=c[1]*.85+30;d[k+2]=c[2]*.85+30;d[k+3]=255}}
 g.putImageData(img,0,0)}

// ---------- screen and camera ----------
function fit(){if(IS_SRV)return;const wr=$('wrap');vw=Math.max(200,wr.clientWidth);vh=Math.max(200,wr.clientHeight);cs=Math.min(vw,vh)/40;dpr=Math.min(devicePixelRatio||1,QL.dpr||2);
 cv.style.width=vw+'px';cv.style.height=vh+'px';cv.width=Math.round(vw*dpr);cv.height=Math.round(vh*dpr);ctx.imageSmoothingQuality='medium';
 GLS.tier=QL.tier;if(GLS.gl)glFit(vw,vh,Math.min(devicePixelRatio||1,QL.gls||1.5));MDIRTY=true}
function camStep(dt){const t=camTarget(),fy=CAM.fy===undefined?.5:CAM.fy;
 if(t){const k=1-Math.exp(-dt*8);
  // look a little ahead of the car: the faster it goes, the more road you see
  const la=state==='menu'?0:3.1+(boost&&en>0?1.2:0),ax=(t.ra!==undefined?Math.cos(t.ra):0)*la,ay=(t.ra!==undefined?Math.sin(t.ra):0)*la;
  CAM.lx=(CAM.lx||0)+(ax-(CAM.lx||0))*(1-Math.exp(-dt*2.2));CAM.ly=(CAM.ly||0)+(ay-(CAM.ly||0))*(1-Math.exp(-dt*2.2));
  CAM.x+=(t.rx+CAM.lx-CAM.x)*k;CAM.y+=(t.ry+CAM.ly+(.5-fy)*vh/Math.max(1,CAM.z)-CAM.y)*k}
 const area=(CN[VS]||0)/(MC*MC),V=state==='menu'?34:Math.min(46,27+Math.sqrt(area)*.30+(boost&&en>0?2.5:0));CAM.vz+=(V-CAM.vz)*(1-Math.exp(-dt*2));CAM.z=Math.min(vw,vh)/CAM.vz;
 const hw=vw/2/CAM.z,hh=vh/2/CAM.z;CAM.x=hw*2>WW+6?WW/2:Math.min(WW+3-hw,Math.max(hw-3,CAM.x));CAM.y=hh*2>WH+6?WH/2:Math.min(WH+3-hh,Math.max(hh-3,CAM.y))}

// ---------- when territory changes: update the ground shader's picture, the minimap and the capture flash ----------
function rebuildLand(){if(IS_SRV)return;
  if(PREV&&me&&state==='play'){let n=0;for(let i=0;i<own.length;i++)if(own[i]===VS&&PREV[i]!==VS)n++;
  if(n>20){CAPW.push({x:me.rx,y:me.ry,t0:clk,c:VS,n});if(CAPW.length>4)CAPW.shift();RINGS.push({x:me.rx,y:me.ry,t0:clk,c:COLS[VS]})}}
 if(GLS.ok)glOwn();else fbPaint();
 PREV=own.slice();ZMY=ZN.map(z=>{let n=0;for(let k=0;k<z.c.length;k++)if(own[z.c[k]]===VS)n++;return z.c.length?n/z.c.length:0});
 if(!MINI)MINI=mkc(MW,MH);const g=MINI.getContext('2d'),img=g.createImageData(MW,MH),d=img.data,cl=COLS.map(c=>c?rgbOf(c):[236,242,250]);
 for(let i=0;i<own.length;i++){const c=own[i]?cl[own[i]]:(ISL[i]?[238,243,250]:[20,62,98]),k=i*4;d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=255}
 g.putImageData(img,0,0)}

// ---------- one frame ----------
let LT={sh:.34,lx:.5,ly:.8,glow:1,gk:.7},CARL=[],FRM={x:0,y:0,w:0,h:0};
function car(x,y,a,q,m,st,sc,al){drawCar(ctx,x,y,a,q,m,st,sc*CARK,al,0,LT)}
function zoneIcon(g,t,col){g.fillStyle=col;g.strokeStyle=col;g.lineWidth=.14;g.beginPath();
 if(t==='cannon'){g.save();g.rotate(-.6);g.roundRect(-.15,-.22,.95,.44,.12);g.restore();g.fill();g.beginPath();g.arc(-.15,.15,.38,0,7);g.fill()}
 else if(t==='fort'){g.moveTo(0,-.75);g.lineTo(.6,-.5);g.lineTo(.55,.15);g.quadraticCurveTo(.35,.6,0,.78);g.quadraticCurveTo(-.35,.6,-.55,.15);g.lineTo(-.6,-.5);g.closePath();g.fill()}
 else if(t==='strike'){g.arc(0,0,.55,0,7);g.stroke();g.beginPath();g.moveTo(-.8,0);g.lineTo(.8,0);g.moveTo(0,-.8);g.lineTo(0,.8);g.stroke();g.beginPath();g.arc(0,0,.15,0,7);g.fill()}
 else{g.moveTo(.15,-.8);g.lineTo(-.45,.1);g.lineTo(-.02,.1);g.lineTo(-.15,.8);g.lineTo(.45,-.12);g.lineTo(.03,-.12);g.closePath();g.fill()}}
function zonePad(z,o,my){const c=o?COLS[o]:'#ffffff',pul=.5+.5*Math.sin(clk*3+z.x);ctx.save();ctx.translate(z.x,z.y);
 ctx.fillStyle='rgba(20,34,64,.30)';ctx.beginPath();ctx.ellipse(.35,.55,ZR*1.0,ZR*.86,0,0,7);ctx.fill();
 ctx.fillStyle=lg(ctx,-ZR,-ZR,ZR,ZR,[[0,'#7f8aa0'],[.5,'#3a4357'],[1,'#1d2433']]);ctx.beginPath();ctx.arc(0,0,ZR*1.02,0,7);ctx.fill();
 const g=ctx.createRadialGradient(-.8,-1,.3,0,0,ZR);g.addColorStop(0,'rgba(255,255,255,.5)');g.addColorStop(1,o?C_UG[o]:'rgba(255,255,255,.1)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,ZR*.84,0,7);ctx.fill();
 ctx.lineWidth=.3;ctx.strokeStyle=c;ctx.globalAlpha=.75+.25*pul;ctx.beginPath();ctx.arc(0,0,ZR,0,7);ctx.stroke();ctx.globalAlpha=1;
 ctx.setLineDash([.5,.45]);ctx.lineDashOffset=-clk*1.2;ctx.lineWidth=.12;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(0,0,ZR*.9,0,7);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
 if(my>0&&o!==1){ctx.lineWidth=.3;ctx.strokeStyle=COLS[VS];ctx.beginPath();ctx.arc(0,0,ZR+.45,-1.571,-1.571+6.283*Math.min(1,my*2));ctx.stroke()}
 ctx.fillStyle=o?c:'#1d2433';ctx.beginPath();ctx.arc(0,0,1.25,0,7);ctx.fill();ctx.lineWidth=.12;ctx.strokeStyle='#ffffff';ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(-.3,-.45,.7,.35,-.5,0,7);ctx.fill();
 zoneIcon(ctx,z.t,'#ffffff');ctx.restore()}
function emberFx(p){if(FF||!QL.hi||Math.random()>.5*QL.fx)return;const t=p.tr,n=t.length/2;if(n<4)return;const k=Math.max(0,n-1-((Math.random()*Math.min(n-1,50))|0));FX.push({x:t[k*2]+(Math.random()-.5)*.5,y:t[k*2+1]+(Math.random()-.5)*.5,vx:(Math.random()-.5)*.8,vy:-.4-Math.random()*.9,l:.6+Math.random()*.6,l0:1.1,c:Math.random()<.5?'#ffb23a':'#ff7a22',k:4,s:.07+Math.random()*.06})}
function drawParticles(add){
 if(!add){for(const f of FX){const k=f.k||0;if(k===1||k===4)continue;const l0=f.l0||.8,u=Math.max(0,Math.min(1,f.l/l0));
   if(k===2){const r=(f.s||.4)*(1.4-u*.9)*2.4;ctx.globalAlpha=Math.min(.55,u*.8);ctx.drawImage(LSPR.smoke,f.x-r,f.y-r,r*2,r*2)}
   else if(k===3){ctx.globalAlpha=Math.min(1,u*2);ctx.fillStyle=f.c;ctx.save();ctx.translate(f.x,f.y);ctx.rotate((f.r||0)+(l0-f.l)*(f.vr||6));const s=(f.s||.18);ctx.fillRect(-s,-s*.6,s*2,s*1.2);ctx.restore()}
   else{ctx.globalAlpha=Math.max(0,Math.min(1,f.l*2));ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,(f.s||.12)+f.l*.14,0,7);ctx.fill()}}ctx.globalAlpha=1;return}
 for(const f of FX){const k=f.k||0;if(k!==1&&k!==4)continue;const l0=f.l0||.8,u=Math.max(0,Math.min(1,f.l/l0));
  if(k===1){ctx.globalAlpha=Math.min(1,u*1.6);ctx.strokeStyle=f.c;ctx.lineWidth=.1*(.4+u);ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x-f.vx*.045,f.y-f.vy*.045);ctx.stroke();const r=.22*u+.06;ctx.globalAlpha=Math.min(1,u*1.3)*.8;ctx.drawImage(LSPR.dot,f.x-r,f.y-r,r*2,r*2)}
  else{ctx.globalAlpha=Math.min(1,u*1.5);ctx.fillStyle=f.c;const r=(f.s||.09)*(.5+u);ctx.beginPath();ctx.arc(f.x,f.y,r,0,7);ctx.fill()}}
 ctx.globalAlpha=1}
let GTR=[];
function drawTrailsLayer(gok){const k=QL.glow?MOOD.gk:0;GTR.length=0;
 if(gok&&QL.tier)for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.alive||!p.hist||p.hist.length<6)continue;GTR.push({tr:p.hist,hx:p.rx,hy:p.ry,c:COLRGB[q],st:'track',hw:1.0,al:((p.fl||0)&2)?.5:1})}
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.ghost)continue;const a=1-(clk-p.ghost.t0)/.35;if(a<=0){p.ghost=null;continue}if(gok)GTR.push({tr:p.ghost.tr,c:COLRGB[q],st:'glow',al:a,k:0});else drawTrail(ctx,p.ghost.tr,q,'glow',0,clk,a)}
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.tr.length)continue;const st=(COS[q]||[])[1]||'glow',tr=(q===1&&MP)?ncTrail(p):p.tr,al=((p.fl||0)&2)?.45:1;
  if(!tr.length)continue;
  if(gok)GTR.push({tr,hx:p.alive?p.rx:undefined,hy:p.alive?p.ry:undefined,c:COLRGB[q],st,al,k:QL.glow?1:.5});
  else drawTrail(ctx,tr,q,st,k,clk,al,p.alive?p.rx:undefined,p.alive?p.ry:undefined);
  if(st==='fire')emberFx(p)}}
function drawMinesStrikes(){
 for(const s of STV){const tt=Math.max(0,s[2]),k=1-tt/1.4,r=2.6;ctx.strokeStyle='rgba(255,59,94,'+(.5+.5*Math.sin(clk*20)).toFixed(2)+')';ctx.lineWidth=.18;ctx.beginPath();ctx.arc(s[0],s[1],r,0,7);ctx.stroke();
  ctx.fillStyle='rgba(255,59,94,.18)';ctx.beginPath();ctx.arc(s[0],s[1],r*k,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(s[0]-r-.5,s[1]);ctx.lineTo(s[0]+r+.5,s[1]);ctx.moveTo(s[0],s[1]-r-.5);ctx.lineTo(s[0],s[1]+r+.5);ctx.stroke()}
 for(const mn of MNV){const mc=COLS[mn[2]]||'#ffffff';ctx.fillStyle='rgba(10,15,25,.3)';ctx.beginPath();ctx.ellipse(mn[0]+.1,mn[1]+.3,.6,.3,0,0,7);ctx.fill();ctx.fillStyle=rg(ctx,mn[0]-.15,mn[1]-.15,.05,mn[0],mn[1],.55,[[0,'#3a4252'],[1,'#151a24']]);ctx.beginPath();ctx.arc(mn[0],mn[1],.55,0,7);ctx.fill();ctx.strokeStyle=mc;ctx.lineWidth=.14;ctx.stroke();
  for(let k=0;k<6;k++){const an=k/6*6.283;ctx.fillStyle='#3a4252';ctx.fillRect(mn[0]+Math.cos(an)*.55-.07,mn[1]+Math.sin(an)*.55-.07,.14,.14)}ctx.fillStyle=mn[3]?(Math.sin(clk*12)>0?'#ff3b4e':'#6b1520'):'#6b7080';ctx.beginPath();ctx.arc(mn[0],mn[1],.2,0,7);ctx.fill()}}
// every car: wrecks fade out, living cars get shadow, wheels, body; extras (shield, rings) are drawn here
let GCARS=[];
function drawCarsLayer(S,gok){const labels=[];CARL.length=0;GCARS=[];
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.wreck)continue;const age=clk-p.wreck.t0;if(age>.7||(p.alive&&age>.05)){p.wreck=null;continue}
  {const wm=SKL[(COS[q]||[])[0]]?COS[q][0]:'sport';if(gok)GCARS.push({x:p.wreck.x,y:p.wreck.y,a:p.wreck.a+age*10,sc:CARK*(1-age*.5),m:wm,c:COLRGB[q],st:0,al:1-age/.7,em:0});else car(p.wreck.x,p.wreck.y,p.wreck.a+age*10,q,wm,0,1-age*.5,1-age/.7)}}
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.alive)continue;
  const x=p.rx,y=p.ry,an=p.ra,sk=SKL[(COS[q]||[])[0]]?COS[q][0]:'sport',fl=p.fl||0;
  {const h=p.hist||(p.hist=[]),n=h.length;if(!n||Math.hypot(x-h[n-2],y-h[n-1])>.4){if(n&&Math.hypot(x-h[n-2],y-h[n-1])>3)h.length=0;h.push(x,y);if(h.length>400)h.splice(0,2)}}
  const dtt=clk-(p.pt||0);let av=0;if(dtt>0&&dtt<.2){av=angd(p.pa===undefined?an:p.pa,an)/dtt;p.st=(p.st||0)+(Math.max(-.45,Math.min(.45,av*.09))-(p.st||0))*.35}
  p.pa=an;p.pt=clk;
  const sc=p.born&&clk-p.born<.35?.45+.55*Math.sin((clk-p.born)/.35*1.5708):1;
  if(gok)GCARS.push({x,y,a:an,sc:sc*CARK,m:sk,c:COLRGB[q],st:p.st||0,al:fl&2?.5:1,em:1,ice:fl&1?1:0});else car(x,y,an,q,sk,p.st||0,sc,fl&2?.5:1);
  const nitro=HOLDV[q]&8,boosting=(q===VS&&boost&&en>0);
  CARL.push({x,y,a:an,q,m:sk,al:fl&2?.5:1,fl:boosting?1.15:(fl&4)?1.3:nitro?.55:0,blue:nitro&&!boosting&&!(fl&4)?1:0,dash:fl&4?1:0});
  if(p.shd){const r=2.1+Math.sin(fr/6)*.06;ctx.save();ctx.translate(x,y);ctx.rotate(clk*.6);ctx.globalAlpha=.9;ctx.drawImage(DEC.shield,-r,-r,r*2,r*2);ctx.restore();ctx.globalAlpha=1}
  labels.push([...S(x,y-2.1),NM[q],q])}
 return labels}
function drawShells(){for(const s of SHV){const L=Math.hypot(s[2],s[3])||1,ux=s[2]/L,uy=s[3]/L,g=ctx.createLinearGradient(s[0]-ux*1.8,s[1]-uy*1.8,s[0],s[1]);g.addColorStop(0,'rgba(255,150,40,0)');g.addColorStop(1,'rgba(255,205,100,.95)');
  ctx.strokeStyle=g;ctx.lineWidth=.34;ctx.beginPath();ctx.moveTo(s[0]-ux*1.8,s[1]-uy*1.8);ctx.lineTo(s[0],s[1]);ctx.stroke();ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.arc(s[0],s[1],.22,0,7);ctx.fill()}}
function draw(){
 if(!TEXOK)buildTexAll();if(!CARSB)buildCars();
 const w=vw,h=vh,z=CAM.z;
 if(GLS.freshEnd&&clk>=GLS.freshEnd){GLS.freshEnd=0;MDIRTY=true}
 if(MDIRTY&&(clk-LASTRB>=.05||LASTRB<0)){rebuildLand();MDIRTY=false;LASTRB=clk}
 LT.sh=MOOD.sh;LT.lx=MOOD.lx;LT.ly=MOOD.ly;LT.glow=QL.glow;LT.gk=MOOD.gk;
 const sk=state==='menu'?0:shake,kx=sk>.3?(Math.random()-.5)*sk:0,ky=sk>.3?(Math.random()-.5)*sk:0,ox=w/2-CAM.x*z+kx,oy=h/2-CAM.y*z+ky,S=(x,y)=>[x*z+ox,y*z+oy];
 const gok=GLS.ok&&glFrame(CAM.x-kx/z,CAM.y-ky/z,z,clk,RINGS);if(!gok&&!CARSPR.sport1)buildLegacyCars();
 ctx.setTransform(1,0,0,1,0,0);
 if(gok)ctx.clearRect(0,0,cv.width,cv.height);else{ctx.fillStyle='#1e6088';ctx.fillRect(0,0,cv.width,cv.height)}
 ctx.setTransform(dpr*z,0,0,dpr*z,dpr*ox,dpr*oy);
 const vx0=CAM.x-w/2/z-2,vy0=CAM.y-h/2/z-2,vw0=w/z+4,vh0=h/z+4;
 if(!gok&&FBC){ctx.imageSmoothingEnabled=true;if(FBL)ctx.drawImage(FBL,0,0,WW,WH);ctx.drawImage(FBC,0,0,WW,WH)}
 for(let i=SCORCH.length-1;i>=0;i--){const s=SCORCH[i],age=clk-s.t0;if(age>8){SCORCH.splice(i,1);continue}const a=(1-age/8)*.5,g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r);
  g.addColorStop(0,'rgba(30,30,40,'+a.toFixed(3)+')');g.addColorStop(.7,'rgba(50,55,70,'+(a*.6).toFixed(3)+')');g.addColorStop(1,'rgba(50,55,70,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill()}
 const zl=[];for(let zi=0;zi<ZN.length;zi++){const zz=ZN[zi];if(zz.x<vx0-5||zz.x>vx0+vw0+5||zz.y<vy0-5||zz.y>vy0+vh0+5)continue;if(!gok)zonePad(zz,ZOWN[zi]||0,ZMY[zi]||0);zl.push([...S(zz.x,zz.y+ZR+1.0),ZNAME[zz.t],ZOWN[zi]||0])}
 for(let i=RINGS.length-1;i>=0;i--){const r=RINGS[i],age=clk-r.t0;if(age>.7){RINGS.splice(i,1);continue}if(gok)continue;const a=1-age/.65;ctx.strokeStyle=r.c;ctx.globalAlpha=a*.8;ctx.lineWidth=.45*a+.05;ctx.beginPath();ctx.arc(r.x,r.y,1+age*11,0,7);ctx.stroke();ctx.lineWidth=.18;ctx.globalAlpha=a*.5;ctx.beginPath();ctx.arc(r.x,r.y,.6+age*8,0,7);ctx.stroke();ctx.globalAlpha=1}
 ctx.lineCap=ctx.lineJoin='round';
 drawTrailsLayer(gok);
 drawMinesStrikes();
 const labels=drawCarsLayer(S,gok);
 if(gok){if(window.DBGCARS)for(const c of window.DBGCARS)GCARS.push(c);if(window.DBGTRAILS)for(const c of window.DBGTRAILS)GTR.push(c);trailsFrame(GTR,CAM.x-kx/z,CAM.y-ky/z,z);carsFrame(GCARS,CAM.x-kx/z,CAM.y-ky/z,z)}
 drawShells();
 drawParticles(false);drawParticles(true);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 drawHUD(w,h,z,labels,zl,S)}
