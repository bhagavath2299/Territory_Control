// ---------- the three cars: drawn once into sprites (body, wheels, shadow), plus shared light sprites and the trail styles ----------
const CARK=1.22;                                        // cars are drawn a little larger than their hit size so the detail can be seen
const CSW=4.0,CSH=2.5;                                  // sprite size in world units; the middle of the sprite is the middle of the car
const CARSPR={},CARHI={},WHLSPR={},SHSPR={},GLWSPR=[null],LSPR={};
const WHL={ // wheel centres and sizes in world units: front x, |y|, length, width; rear x, |y|, length, width
 sport:{fx:.82,fy:.68,fl:.52,fw:.27,rx:-.80,ry:.69,rl:.54,rw:.30},
 muscle:{fx:.90,fy:.75,fl:.58,fw:.31,rx:-.88,ry:.76,rl:.60,rw:.35},
 f1:{fx:.95,fy:.74,fl:.58,fw:.32,rx:-.92,ry:.75,rl:.64,rw:.40}};
const CEXH={sport:[-1.30,.2],muscle:[-1.40,.4],f1:[-1.24,0]};   // where the exhaust flames come out
const CHEAD={sport:[1.18,.46],muscle:[1.30,.45],f1:[1.2,.14]};  // where the headlights sit
const lg=(g,x0,y0,x1,y1,st)=>{const r=g.createLinearGradient(x0,y0,x1,y1);for(const s of st)r.addColorStop(s[0],s[1]);return r};
const rg=(g,x0,y0,r0,x1,y1,r1,st)=>{const r=g.createRadialGradient(x0,y0,r0,x1,y1,r1);for(const s of st)r.addColorStop(s[0],s[1]);return r};
function pal(h){return{c:h,hi:tint(h,.34),hi2:tint(h,.72),lo:shade(h,.68),lo2:shade(h,.46),dk:shade(h,.24)}}
// a closed outline described for the upper half (front centre to rear centre) and mirrored for the lower half
function symPath(g,s){const ex=a=>[a[a.length-2],a[a.length-1]];g.beginPath();g.moveTo(s[0][1],s[0][2]);
 for(let i=1;i<s.length;i++){const a=s[i];if(a[0]==='L')g.lineTo(a[1],a[2]);else g.bezierCurveTo(a[1],a[2],a[3],a[4],a[5],a[6])}
 for(let i=s.length-1;i>=1;i--){const a=s[i],p=ex(s[i-1]);if(a[0]==='L')g.lineTo(p[0],-p[1]);else g.bezierCurveTo(a[3],-a[4],a[1],-a[2],p[0],-p[1])}
 g.closePath()}
// darken the inside of an edge (soft ambient shadow where the body curves away)
function edgeAO(g,draw,w,a){g.save();draw();g.clip();g.lineJoin='round';for(let k=0;k<4;k++){g.lineWidth=w*(1-k*.22);g.strokeStyle='rgba(0,0,0,'+(a*.3)+')';draw();g.stroke()}g.restore()}
function glassGrad(g,x0,y0,x1,y1){return lg(g,x0,y0,x1,y1,[[0,'#46699a'],[.3,'#17243f'],[.7,'#0a111f'],[1,'#1d2c48']])}
function sheen(g,path,x0,y0,x1,y1,a){g.save();path();g.clip();g.fillStyle=lg(g,x0,y0,x1,y1,[[0,'rgba(255,255,255,0)'],[.45,'rgba(255,255,255,'+a+')'],[.62,'rgba(255,255,255,0)'],[1,'rgba(255,255,255,0)']]);g.fillRect(-2,-2,4,4);g.restore()}
const rr2=(g,x,y,w,h,r)=>{g.beginPath();g.roundRect(x,y,w,h,r)};
function lightBar(g,x,y,w,h,c1,c2,r){rr2(g,x,y,w,h,r);g.fillStyle=lg(g,x,y,x,y+h,[[0,c1],[1,c2]]);g.fill()}

const CARART={
 // low sports coupe: curved nose, two white stripes, small ducktail
 sport(g,P){
  const body=()=>symPath(g,[['M',1.30,0],['C',1.30,-.20,1.24,-.34,1.10,-.44],['C',.98,-.52,.84,-.57,.70,-.60],['C',.48,-.64,.20,-.65,-.05,-.64],['C',-.40,-.65,-.78,-.66,-1.00,-.62],['C',-1.18,-.58,-1.30,-.46,-1.30,-.30],['L',-1.30,0]]);
  body();g.fillStyle=lg(g,0,-.66,0,.66,[[0,P.lo2],[.13,P.lo],[.34,P.c],[.5,P.hi],[.66,P.c],[.87,P.lo],[1,P.lo2]]);g.fill();
  g.save();body();g.clip();
  g.fillStyle=lg(g,1.3,0,-1.3,0,[[0,'rgba(255,255,255,0)'],[.1,'rgba(255,255,255,.26)'],[.3,'rgba(255,255,255,.05)'],[.5,'rgba(0,0,0,.05)'],[.78,'rgba(255,255,255,.12)'],[1,'rgba(0,0,0,.3)']]);g.fillRect(-1.4,-.8,2.8,1.6);
  // wheel arches
  for(const [x,s] of [[.82,1],[.82,-1],[-.80,1],[-.80,-1]]){g.fillStyle='rgba(0,0,0,.5)';g.beginPath();g.ellipse(x,s*.665,.31,.13,0,0,7);g.fill()}
  // racing stripes with a thin dark edge
  for(const s of [-1,1]){g.fillStyle='rgba(10,16,30,.35)';g.fillRect(-1.4,s*.13-.075,2.8,.15);g.fillStyle='rgba(255,255,255,.94)';g.fillRect(-1.4,s*.13-.055,2.8,.11)}
  // hood vents and a splitter
  for(const s of [-1,1]){g.fillStyle='#0b0e15';g.beginPath();g.moveTo(.58,s*.36);g.lineTo(.82,s*.27);g.lineTo(.82,s*.21);g.lineTo(.58,s*.30);g.closePath();g.fill();g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.012;g.stroke()}
  g.fillStyle='#0d1018';g.beginPath();g.roundRect(1.22,-.26,.1,.52,.04);g.fill();
  g.restore();
  edgeAO(g,body,.2,1);
  // glass: windscreen, roof, rear window
  const ws=()=>{g.beginPath();g.moveTo(.56,-.50);g.quadraticCurveTo(.62,0,.56,.50);g.lineTo(.16,.44);g.quadraticCurveTo(.11,0,.16,-.44);g.closePath()};
  const rw=()=>{g.beginPath();g.moveTo(-.46,-.42);g.lineTo(-.80,-.37);g.quadraticCurveTo(-.86,0,-.80,.37);g.lineTo(-.46,.42);g.quadraticCurveTo(-.41,0,-.46,-.42);g.closePath()};
  for(const f of [ws,rw]){f();g.fillStyle=glassGrad(g,.5,-.5,-.1,.5);g.fill();sheen(g,f,.4,-.5,-.2,.5,.34);f();g.lineWidth=.022;g.strokeStyle='rgba(0,0,0,.7)';g.stroke()}
  // roof panel
  g.beginPath();g.roundRect(-.46,-.44,.62,.88,.1);g.fillStyle=lg(g,0,-.44,0,.44,[[0,P.lo],[.3,P.hi],[.5,P.hi2],[.7,P.hi],[1,P.lo]]);g.fill();
  for(const s of [-1,1]){g.fillStyle='rgba(255,255,255,.9)';g.fillRect(-.46,s*.13-.055,.62,.11)}
  g.lineWidth=.016;g.strokeStyle='rgba(0,0,0,.45)';g.beginPath();g.roundRect(-.46,-.44,.62,.88,.1);g.stroke();
  g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(-.1,-.2,.2,.05,.2,0,7);g.fill();
  // mirrors
  for(const s of [-1,1]){g.save();g.translate(.42,s*.725);g.rotate(s*-.35);g.fillStyle=P.c;g.beginPath();g.ellipse(0,0,.1,.06,0,0,7);g.fill();g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=.014;g.stroke();g.fillStyle='rgba(20,30,50,.9)';g.beginPath();g.ellipse(-.02,0,.05,.04,0,0,7);g.fill();g.restore()}
  // ducktail
  g.beginPath();g.roundRect(-1.28,-.52,.13,1.04,.05);g.fillStyle=lg(g,-1.28,0,-1.15,0,[[0,P.lo2],[1,P.lo]]);g.fill();g.fillStyle='rgba(255,255,255,.5)';g.fillRect(-1.16,-.5,.014,1);
  // lights
  for(const s of [-1,1]){g.lineCap='round';g.strokeStyle='#bfe3ff';g.lineWidth=.08;g.beginPath();g.moveTo(1.13,s*.38);g.lineTo(.93,s*.50);g.stroke();g.strokeStyle='#ffffff';g.lineWidth=.035;g.stroke();
   g.strokeStyle='rgba(120,200,255,.8)';g.lineWidth=.016;g.beginPath();g.moveTo(1.25,s*.2);g.lineTo(1.2,s*.34);g.stroke()}
  lightBar(g,-1.325,-.46,.07,.92,'#ff5a64','#a1121f',.03);g.fillStyle='rgba(255,230,230,.7)';g.fillRect(-1.31,-.44,.012,.88);
  for(const s of [-1,1]){g.fillStyle='#d5dbe6';g.beginPath();g.arc(-1.29,s*.2,.05,0,7);g.fill();g.fillStyle='#08090d';g.beginPath();g.arc(-1.29,s*.2,.034,0,7);g.fill()}
  g.lineWidth=.03;g.strokeStyle=P.dk;g.globalAlpha=.8;body();g.stroke();g.globalAlpha=1;
  g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=.012;g.save();body();g.clip();g.translate(-.012,-.012);body();g.stroke();g.restore()},
 // wide muscle car: long hood with a scoop, twin stripes, ducktail and quad lights
 muscle(g,P){
  const body=()=>symPath(g,[['M',1.38,0],['C',1.38,-.30,1.37,-.50,1.31,-.60],['C',1.23,-.70,1.06,-.72,.90,-.72],['C',.50,-.71,.10,-.71,-.30,-.72],['L',-1.10,-.72],['C',-1.28,-.72,-1.38,-.64,-1.38,-.46],['L',-1.38,0]]);
  body();g.fillStyle=lg(g,0,-.72,0,.72,[[0,P.lo2],[.12,P.lo],[.34,P.c],[.5,P.hi],[.66,P.c],[.88,P.lo],[1,P.lo2]]);g.fill();
  g.save();body();g.clip();
  g.fillStyle=lg(g,1.38,0,-1.38,0,[[0,'rgba(255,255,255,0)'],[.08,'rgba(255,255,255,.3)'],[.3,'rgba(255,255,255,.08)'],[.55,'rgba(0,0,0,.04)'],[.82,'rgba(255,255,255,.12)'],[1,'rgba(0,0,0,.32)']]);g.fillRect(-1.5,-.8,3,1.6);
  for(const [x,s] of [[.92,1],[.92,-1],[-.88,1],[-.88,-1]]){g.fillStyle='rgba(0,0,0,.5)';g.beginPath();g.ellipse(x,s*.74,.34,.14,0,0,7);g.fill();g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=.02;g.beginPath();g.ellipse(x,s*.74,.36,.17,0,s>0?3.4:.26,s>0?6:3.1);g.stroke()}
  // twin stripes
  for(const s of [-1,1]){g.fillStyle='rgba(8,10,20,.4)';g.fillRect(-1.5,s*.2-.115,3,.23);g.fillStyle='rgba(255,255,255,.95)';g.fillRect(-1.5,s*.2-.09,3,.18)}
  g.restore();
  edgeAO(g,body,.22,1);
  // hood scoop
  g.beginPath();g.roundRect(.52,-.27,.56,.54,.08);g.fillStyle=lg(g,0,-.27,0,.27,[[0,P.lo],[.5,P.hi],[1,P.lo]]);g.fill();g.strokeStyle='#cfd5df';g.lineWidth=.025;g.stroke();
  g.beginPath();g.roundRect(.86,-.2,.18,.4,.04);g.fillStyle='#07090d';g.fill();for(let k=-2;k<=2;k++){g.strokeStyle='rgba(180,190,205,.35)';g.lineWidth=.01;g.beginPath();g.moveTo(.87,k*.08);g.lineTo(1.03,k*.08);g.stroke()}
  for(const s of [-1,1]){g.fillStyle='#aab2c0';g.beginPath();g.arc(.4,s*.4,.018,0,7);g.fill();g.beginPath();g.arc(1.2,s*.4,.018,0,7);g.fill()}
  // glass
  const ws=()=>{g.beginPath();g.moveTo(.40,-.59);g.quadraticCurveTo(.46,0,.40,.59);g.lineTo(.06,.53);g.quadraticCurveTo(.02,0,.06,-.53);g.closePath()};
  const rw=()=>{g.beginPath();g.moveTo(-.62,-.50);g.lineTo(-.92,-.44);g.quadraticCurveTo(-.97,0,-.92,.44);g.lineTo(-.62,.50);g.quadraticCurveTo(-.58,0,-.62,-.50);g.closePath()};
  for(const f of [ws,rw]){f();g.fillStyle=glassGrad(g,.4,-.55,-.2,.55);g.fill();sheen(g,f,.3,-.6,-.1,.6,.3);f();g.lineWidth=.024;g.strokeStyle='rgba(0,0,0,.75)';g.stroke()}
  g.beginPath();g.roundRect(-.62,-.53,.68,1.06,.09);g.fillStyle=lg(g,0,-.53,0,.53,[[0,P.lo],[.28,P.hi],[.5,P.hi2],[.72,P.hi],[1,P.lo]]);g.fill();
  for(const s of [-1,1]){g.fillStyle='rgba(8,10,20,.4)';g.fillRect(-.62,s*.2-.115,.68,.23);g.fillStyle='rgba(255,255,255,.95)';g.fillRect(-.62,s*.2-.09,.68,.18)}
  g.lineWidth=.016;g.strokeStyle='rgba(0,0,0,.45)';g.beginPath();g.roundRect(-.62,-.53,.68,1.06,.09);g.stroke();
  g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.ellipse(-.2,-.28,.22,.05,.15,0,7);g.fill();
  for(const s of [-1,1]){g.fillStyle=P.lo;g.beginPath();g.roundRect(.25,s>0?.72:-.84,.14,.12,.03);g.fill();g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=.014;g.stroke()}
  // ducktail wing
  g.beginPath();g.roundRect(-1.34,-.62,.16,1.24,.05);g.fillStyle=lg(g,-1.34,0,-1.18,0,[[0,P.lo2],[1,P.lo]]);g.fill();g.fillStyle='rgba(255,255,255,.45)';g.fillRect(-1.19,-.6,.014,1.2);
  for(const s of [-1,1]){g.fillStyle='#10131a';g.fillRect(-1.34,s>0?.58:-.66,.2,.08)}
  // front: grille and bumper
  g.fillStyle='#0b0d12';g.beginPath();g.roundRect(1.3,-.42,.09,.84,.03);g.fill();g.strokeStyle='#d6dbe4';g.lineWidth=.03;g.beginPath();g.moveTo(1.385,-.5);g.lineTo(1.385,.5);g.stroke();
  for(const s of [-1,1])for(const o of [.52,.34]){g.fillStyle='#fff7d0';g.beginPath();g.arc(1.3,s*o,.07,0,7);g.fill();g.strokeStyle='#cfd5df';g.lineWidth=.016;g.stroke();g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(1.29,s*o-.015,.025,0,7);g.fill()}
  // tail lights and pipes
  for(const s of [-1,1])for(let k=0;k<3;k++){lightBar(g,-1.395,s>0?.14+k*.155:-.14-k*.155-.14,.07,.14,'#ff5b64','#a3121f',.02)}
  for(const s of [-1,1]){g.fillStyle='#dfe4ec';g.beginPath();g.arc(-1.40,s*.40,.065,0,7);g.fill();g.fillStyle='#07080c';g.beginPath();g.arc(-1.40,s*.40,.045,0,7);g.fill()}
  g.lineWidth=.03;g.strokeStyle=P.dk;g.globalAlpha=.8;body();g.stroke();g.globalAlpha=1;
  g.strokeStyle='rgba(255,255,255,.26)';g.lineWidth=.012;g.save();body();g.clip();g.translate(-.012,-.012);body();g.stroke();g.restore()},
 // open-wheel racer: wide wings, cockpit with halo, sidepods
 f1(g,P){
  const carbon=lg(g,0,-.4,0,.4,[[0,'#0c0e13'],[.5,'#2a2f3b'],[1,'#0c0e13']]);
  // floor plate and suspension arms
  g.fillStyle='#0d1015';g.beginPath();g.roundRect(-1.12,-.44,2.0,.88,.18);g.fill();
  g.strokeStyle='#161a22';g.lineWidth=.045;g.lineCap='round';for(const [x0,x1] of [[.95,.72],[.86,.72],[-.92,-.6],[-.82,-.6]])for(const s of [-1,1]){g.beginPath();g.moveTo(x0>0?.7:-.55,s*.14);g.lineTo(x0,s*(x0>0?.62:.64));g.stroke();g.beginPath();g.moveTo(x1,s*.14);g.lineTo(x0,s*(x0>0?.62:.64));g.stroke()}
  // front wing
  g.beginPath();g.moveTo(1.44,-.82);g.lineTo(1.44,.82);g.lineTo(1.16,.76);g.lineTo(1.16,-.76);g.closePath();g.fillStyle=carbon;g.fill();
  g.fillStyle=P.c;g.fillRect(1.36,-.76,.045,1.52);g.fillStyle='rgba(255,255,255,.55)';g.fillRect(1.34,-.76,.014,1.52);g.fillStyle=P.lo;g.fillRect(1.26,-.74,.04,1.48);
  for(const s of [-1,1]){g.beginPath();g.roundRect(1.12,s>0?.76:-.86,.36,.1,.04);g.fillStyle=lg(g,0,s*.76,0,s*.86,[[0,P.hi],[1,P.lo]]);g.fill();g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=.016;g.stroke()}
  // rear wing
  g.beginPath();g.moveTo(-1.46,-.66);g.lineTo(-1.46,.66);g.lineTo(-1.2,.62);g.lineTo(-1.2,-.62);g.closePath();g.fillStyle=carbon;g.fill();
  g.fillStyle=P.c;g.fillRect(-1.44,-.64,.07,1.28);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(-1.45,-.64,.016,1.28);g.fillStyle='#07090d';g.fillRect(-1.3,-.6,.02,1.2);
  for(const s of [-1,1]){g.beginPath();g.roundRect(-1.50,s>0?.62:-.72,.34,.1,.04);g.fillStyle=lg(g,0,s*.62,0,s*.72,[[0,P.hi],[1,P.lo]]);g.fill();g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=.016;g.stroke()}
  g.fillStyle='#10131a';g.fillRect(-1.24,-.07,.1,.14);
  // body: nose, tub, sidepods and engine cover
  const body=()=>symPath(g,[['M',1.34,0],['C',1.28,-.06,1.05,-.11,.80,-.14],['C',.62,-.16,.46,-.22,.36,-.32],['C',.30,-.38,.22,-.42,.08,-.42],['C',-.25,-.43,-.55,-.38,-.78,-.26],['C',-.92,-.18,-1.02,-.12,-1.24,-.08],['L',-1.24,0]]);
  body();g.fillStyle=lg(g,0,-.42,0,.42,[[0,P.lo2],[.2,P.lo],[.42,P.c],[.5,P.hi],[.58,P.c],[.8,P.lo],[1,P.lo2]]);g.fill();
  g.save();body();g.clip();
  g.fillStyle=lg(g,1.3,0,-1.3,0,[[0,'rgba(255,255,255,.1)'],[.2,'rgba(255,255,255,.2)'],[.45,'rgba(255,255,255,0)'],[.8,'rgba(0,0,0,.12)'],[1,'rgba(0,0,0,.3)']]);g.fillRect(-1.4,-.5,2.8,1);
  g.fillStyle='rgba(255,255,255,.92)';g.fillRect(-1.4,-.06,2.8,.12);g.fillStyle='rgba(8,10,20,.35)';g.fillRect(-1.4,-.075,2.8,.015);g.fillRect(-1.4,.06,2.8,.015);
  for(const s of [-1,1]){g.fillStyle='rgba(8,10,16,.6)';g.beginPath();g.ellipse(.27,s*.32,.07,.1,0,0,7);g.fill();for(let k=0;k<4;k++){g.fillStyle='rgba(0,0,0,.45)';g.fillRect(-.5-k*.07,s*(.2+k*.012)-.005,.05,.02)}}
  g.restore();
  edgeAO(g,body,.16,1);
  // cockpit, helmet and halo
  g.fillStyle='#07090d';g.beginPath();g.ellipse(.12,0,.25,.14,0,0,7);g.fill();g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=.014;g.stroke();
  g.fillStyle='#181c25';g.fillRect(-.06,-.2,.12,.07);g.fillRect(-.06,.13,.12,.07);
  g.fillStyle=rg(g,.02,-.04,.01,.04,0,.13,[[0,'#ffffff'],[.7,P.hi2],[1,'#9aa3b5']]);g.beginPath();g.arc(.06,0,.105,0,7);g.fill();
  g.fillStyle='#10151f';g.beginPath();g.ellipse(.15,0,.045,.075,0,-1.4,1.4);g.fill();g.fillStyle='rgba(120,190,255,.6)';g.fillRect(.145,-.05,.01,.04);
  g.strokeStyle='#262b36';g.lineWidth=.035;g.lineCap='round';g.beginPath();g.moveTo(-.1,-.15);g.quadraticCurveTo(.33,-.2,.33,0);g.quadraticCurveTo(.33,.2,-.1,.15);g.stroke();g.beginPath();g.moveTo(.33,0);g.lineTo(.5,0);g.stroke();
  g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=.012;g.beginPath();g.moveTo(-.1,-.15);g.quadraticCurveTo(.33,-.2,.33,0);g.stroke();
  // airbox and fin
  g.fillStyle=P.lo;g.beginPath();g.ellipse(-.22,0,.14,.1,0,0,7);g.fill();g.fillStyle='#06080b';g.beginPath();g.ellipse(-.17,0,.07,.065,0,0,7);g.fill();g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.012;g.beginPath();g.ellipse(-.22,0,.14,.1,0,0,7);g.stroke();
  g.fillStyle='rgba(255,255,255,.88)';g.fillRect(-1.2,-.012,.95,.024);
  // mirrors
  for(const s of [-1,1]){g.fillStyle=P.c;g.beginPath();g.roundRect(.2,s>0?.36:-.46,.1,.1,.03);g.fill();g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=.012;g.stroke()}
  g.lineWidth=.026;g.strokeStyle=P.dk;g.globalAlpha=.8;body();g.stroke();g.globalAlpha=1}};

// ---------- wheels, shadows and light sprites ----------
function wheelSprite(len,wid,cu,f1){const pw=Math.ceil((len+.08)*cu),ph=Math.ceil((wid+.08)*cu),c=mkc(pw,ph),g=c.getContext('2d');g.translate(pw/2,ph/2);g.scale(cu,cu);
 g.beginPath();g.roundRect(-len/2,-wid/2,len,wid,wid*.3);g.fillStyle=lg(g,0,-wid/2,0,wid/2,[[0,'#08090c'],[.16,'#262a33'],[.5,'#1b1e25'],[.84,'#262a33'],[1,'#08090c']]);g.fill();
 g.save();g.beginPath();g.roundRect(-len/2,-wid/2,len,wid,wid*.3);g.clip();
 g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=.014;for(let x=-len/2+.04;x<len/2;x+=.06){g.beginPath();g.moveTo(x,-wid/2);g.lineTo(x+.025,wid/2);g.stroke()}
 g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=.02;g.beginPath();g.moveTo(-len/2,0);g.lineTo(len/2,0);g.stroke();
 g.fillStyle=lg(g,-len/2,0,len/2,0,[[0,'rgba(255,255,255,0)'],[.4,'rgba(255,255,255,.13)'],[.6,'rgba(255,255,255,.04)'],[1,'rgba(255,255,255,0)']]);g.fillRect(-len/2,-wid/2,len,wid);
 if(f1){g.fillStyle='rgba(255,255,255,.85)';g.fillRect(-len*.3,-wid/2,len*.6,.022);g.fillRect(-len*.3,wid/2-.022,len*.6,.022)}
 g.restore();g.strokeStyle='rgba(170,180,195,.4)';g.lineWidth=.012;g.beginPath();g.roundRect(-len/2,-wid/2,len,wid,wid*.3);g.stroke();return c}
function drawWheels(g,m,st,sp){const w=WHL[m],ws=sp.wf,wr=sp.wr,cu=sp.cu;
 for(const s of [-1,1]){
  g.save();g.translate(w.fx,s*w.fy);g.rotate(st);g.drawImage(ws,-ws.width/cu/2,-ws.height/cu/2,ws.width/cu,ws.height/cu);g.restore();
  g.drawImage(wr,w.rx-wr.width/cu/2,s*w.ry-wr.height/cu/2,wr.width/cu,wr.height/cu)}}
function softShadow(src){const w=src.width,h=src.height,a=mkc(w,h),g=a.getContext('2d');g.drawImage(src,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#000';g.fillRect(0,0,w,h);
 const c=mkc(w,h),k=c.getContext('2d'),r=w/CSW;k.globalAlpha=.1;for(let i=0;i<14;i++){const an=i/14*6.283,d=(i%2?.05:.09)*r;k.drawImage(a,Math.cos(an)*d,Math.sin(an)*d)}k.globalAlpha=.4;k.drawImage(a,0,0);return c}
function glowSprite(hex){const c=mkc(256,160),g=c.getContext('2d'),v=rgbOf(hex);g.translate(128,80);g.scale(1,.62);
 g.fillStyle=rg(g,0,0,10,0,0,126,[[0,'rgba('+v[0]+','+v[1]+','+v[2]+',.85)'],[.35,'rgba('+v[0]+','+v[1]+','+v[2]+',.34)'],[1,'rgba('+v[0]+','+v[1]+','+v[2]+',0)']]);g.beginPath();g.arc(0,0,128,0,7);g.fill();return c}
function buildLightSprites(){
 // soft white dot: sparks, glints, headlight cores
 {const c=mkc(64,64),g=c.getContext('2d');g.fillStyle=rg(g,32,32,0,32,32,32,[[0,'rgba(255,255,255,1)'],[.25,'rgba(255,255,255,.55)'],[1,'rgba(255,255,255,0)']]);g.fillRect(0,0,64,64);LSPR.dot=c}
 // headlight cone, pointing along +x
 {const c=mkc(256,128),g=c.getContext('2d');g.translate(0,64);const gr=g.createLinearGradient(0,0,256,0);gr.addColorStop(0,'rgba(255,244,205,.75)');gr.addColorStop(.35,'rgba(255,240,200,.28)');gr.addColorStop(1,'rgba(255,240,200,0)');g.fillStyle=gr;g.beginPath();g.moveTo(0,-9);g.lineTo(256,-60);g.quadraticCurveTo(272,0,256,60);g.lineTo(0,9);g.closePath();g.fill();
  g.globalCompositeOperation='destination-in';const m=g.createRadialGradient(0,0,0,0,0,256);m.addColorStop(0,'#fff');m.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=m;g.fillRect(0,-64,256,128);LSPR.cone=c}
 // flame, pointing along -x (the base is at the right edge)
 {const c=mkc(160,64),g=c.getContext('2d');g.translate(0,32);const gr=g.createLinearGradient(160,0,0,0);gr.addColorStop(0,'rgba(255,255,235,1)');gr.addColorStop(.18,'rgba(255,214,110,.95)');gr.addColorStop(.5,'rgba(255,120,30,.6)');gr.addColorStop(1,'rgba(255,60,10,0)');g.fillStyle=gr;g.beginPath();g.moveTo(160,-14);g.quadraticCurveTo(80,-20,0,0);g.quadraticCurveTo(80,20,160,14);g.closePath();g.fill();LSPR.flame=c;
  const c2=mkc(160,64),h=c2.getContext('2d');h.translate(0,32);const g2=h.createLinearGradient(160,0,0,0);g2.addColorStop(0,'rgba(235,250,255,1)');g2.addColorStop(.2,'rgba(150,215,255,.95)');g2.addColorStop(.55,'rgba(60,130,255,.55)');g2.addColorStop(1,'rgba(40,90,255,0)');h.fillStyle=g2;h.beginPath();h.moveTo(160,-14);h.quadraticCurveTo(80,-20,0,0);h.quadraticCurveTo(80,20,160,14);h.closePath();h.fill();LSPR.blue=c2}
 // smoke puff
 {const c=mkc(64,64),g=c.getContext('2d');g.fillStyle=rg(g,32,32,0,32,32,32,[[0,'rgba(120,132,156,.62)'],[.55,'rgba(140,152,176,.28)'],[1,'rgba(150,160,184,0)']]);g.fillRect(0,0,64,64);LSPR.smoke=c}}
let CARSB=0;
function buildCars(){buildLightSprites();CARSB=1;if(!(GLS.ok&&CARGL.ok))buildLegacyCars()}
// the flat sprites: only needed on phones without the graphics chip path
function buildLegacyCars(){if(CARSPR.sport1)return;
 for(const m of CARS){const w=WHL[m];
  const mkset=cu=>({cu,wf:wheelSprite(w.fl,w.fw,cu,m==='f1'),wr:wheelSprite(w.rl,w.rw,cu,m==='f1')});
  WHLSPR[m]=mkset(64);
  for(let q=1;q<=5;q++){const c=mkc(Math.ceil(CSW*64),Math.ceil(CSH*64)),g=c.getContext('2d');g.translate(c.width/2,c.height/2);g.scale(64,64);g.lineJoin=g.lineCap='round';CARART[m](g,pal(COLS[q]));CARSPR[m+q]=c}
  // shadow includes the wheels
  const c=mkc(Math.ceil(CSW*64),Math.ceil(CSH*64)),g=c.getContext('2d');g.drawImage(CARSPR[m+1],0,0);g.translate(c.width/2,c.height/2);g.scale(64,64);drawWheels(g,m,0,WHLSPR[m]);SHSPR[m]=softShadow(c)}
 GLWSPR[0]=glowSprite('#cfe8ff');for(let q=1;q<=5;q++)GLWSPR[q]=glowSprite(COLS[q])}
// a close-up version for the garage (made when it is first needed)
function hiCar(m,q){const k=m+q;if(CARHI[k])return CARHI[k];const cu=128,c=mkc(Math.ceil(CSW*cu),Math.ceil(CSH*cu)),g=c.getContext('2d'),w=WHL[m];g.translate(c.width/2,c.height/2);g.scale(cu,cu);g.lineJoin=g.lineCap='round';
 const sp={cu,wf:wheelSprite(w.fl,w.fw,cu,m==='f1'),wr:wheelSprite(w.rl,w.rw,cu,m==='f1')};
 return CARHI[k]={body:(CARART[m](g,pal(COLS[q])),c),sp}}

// ---------- drawing a car ----------
// g: the canvas to draw on, in world units. st: front wheel angle. sc: scale. al: opacity. hi: use the close-up sprites. light: shadow direction and glow strength.
function drawCar(g,x,y,a,q,m,st,sc,al,hi,L){
 const w=WHL[m]||WHL.sport,body=hi?hiCar(m,q).body:CARSPR[m+q],sp=hi?hiCar(m,q).sp:WHLSPR[m],sh=hi?null:SHSPR[m];if(!body)return;
 g.save();g.translate(x,y);if(sc!==1)g.scale(sc,sc);
 if(sh){g.globalAlpha=al*L.sh;g.save();g.translate(L.lx*.36,L.ly*.36);g.rotate(a);g.drawImage(sh,-CSW/2,-CSH/2,CSW,CSH);g.restore()}
 g.rotate(a);g.globalAlpha=al;
 if(L.glow&&GLWSPR[q]){g.globalCompositeOperation='lighter';g.globalAlpha=al*.5*L.gk;g.drawImage(GLWSPR[q],-2.55,-1.6,5.1,3.2);g.globalCompositeOperation='source-over';g.globalAlpha=al}
 drawWheels(g,m,st,sp);
 const ro=Math.max(-.1,Math.min(.1,-st*.2));g.drawImage(body,-CSW/2,-CSH/2+ro,CSW,CSH);
 g.restore()}
// lights that glow on top of everything: head and tail lights, drawn after the mood tint so they shine at dusk
function drawCarLights(g,x,y,a,m,k,al){const h=CHEAD[m]||CHEAD.sport,ex=CEXH[m]||CEXH.sport;g.save();g.translate(x,y);g.rotate(a);g.scale(CARK,CARK);g.globalCompositeOperation='lighter';
 if(k.cone>0){g.globalAlpha=k.cone*al;g.drawImage(LSPR.cone,h[0]-.1,-3.1,7,6.2)}
 g.globalAlpha=.7*al*k.hl;for(const s of [-1,1])g.drawImage(LSPR.dot,h[0]-.35,s*h[1]-.35,.7,.7);
 g.fillStyle='#ff2a3c';g.globalAlpha=.5*al*k.hl;const tx=m==='f1'?-1.42:ex[0]-.05,ty=m==='f1'?.0:.38;
 if(m==='f1'){g.drawImage(LSPR.dot,tx-.25,-.25,.5,.5)}else for(const s of [-1,1])g.drawImage(LSPR.dot,tx-.3,s*ty-.3,.6,.6);
 g.restore()}
const FLAME_SIDES=m=>m==='f1'?[0]:[-1,1];
function drawFlames(g,x,y,a,m,sz,blue,t){const ex=CEXH[m]||CEXH.sport,sd=FLAME_SIDES(m);g.save();g.translate(x,y);g.rotate(a);g.scale(CARK,CARK);g.globalCompositeOperation='lighter';
 for(const s of sd){const f=sz*(.7+.3*Math.sin(t*60+s*2)+Math.random()*.25),sp=blue?LSPR.blue:LSPR.flame;g.drawImage(sp,ex[0]-1.1*f+.08,s*ex[1]*(m==='f1'?0:1)-.2*f,1.1*f,.4*f)}g.restore()}

// ---------- trails: three styles, shared by the match and the garage ----------
// t: flat list of points (oldest first). q: colour slot. k: strength of the glow (0 on slow phones). tm: time for the little animations.
function trailPath(t,a,b){const p=new Path2D();p.moveTo(t[a],t[a+1]);for(let i=a+2;i<b;i+=2)p.lineTo(t[i],t[i+1]);return p}
function drawTrail(g,t,q,style,k,tm,al,hx,hy){
 if(t.length<4&&hx===undefined)return;
 if(hx!==undefined){t=t.slice();t.push(hx,hy)}
 const n=t.length,tp=trailPath(t,0,n);g.save();g.lineCap=g.lineJoin='round';g.globalAlpha=al;
 g.save();g.translate(.12,.4);g.strokeStyle='rgba(12,22,45,.22)';g.lineWidth=1.0;g.stroke(tp);g.restore();
 if(style==='fire'){
  if(k>0){g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,110,30,'+(.16*k)+')';g.lineWidth=2.4;g.stroke(tp);g.strokeStyle='rgba(255,170,60,'+(.18*k)+')';g.lineWidth=1.5;g.stroke(tp);g.globalCompositeOperation='source-over'}
  g.strokeStyle='#3a0e08';g.lineWidth=1.02;g.stroke(tp);
  const ch=Math.max(1,Math.ceil(n/2/12));const per=Math.ceil(n/2/ch);
  for(let c=0;c<ch;c++){const a=Math.max(0,c*per*2-2),b=Math.min(n,(c+1)*per*2+2),h=(c+1)/ch,r=255,gg=Math.round(60+h*150),bb=Math.round(10+h*h*110);
   g.strokeStyle='rgb('+Math.round(120+h*135)+','+Math.round(30+h*110)+','+Math.round(8+h*30)+')';g.lineWidth=.9;g.stroke(trailPath(t,a,b));
   g.strokeStyle='rgba('+r+','+gg+','+bb+','+(.55+.4*h)+')';g.lineWidth=.62;g.stroke(trailPath(t,a,b));
   g.strokeStyle='rgba(255,'+Math.round(200+h*50)+','+Math.round(110+h*120)+','+(.25+.6*h)+')';g.lineWidth=.26+.1*Math.sin(tm*18+c);g.stroke(trailPath(t,a,b))}
  g.strokeStyle='rgba(255,245,170,.7)';g.lineWidth=.14;g.setLineDash([.4,1.5]);g.lineDashOffset=-tm*7;g.stroke(tp);g.setLineDash([]);g.lineDashOffset=0}
 else if(style==='neon'){
  if(k>0){g.globalCompositeOperation='lighter';g.strokeStyle=C_UG[q].replace('.42',(.2*k).toFixed(2));g.lineWidth=2.8;g.stroke(tp);g.lineWidth=1.8;g.strokeStyle=C_UG[q].replace('.42',(.28*k).toFixed(2));g.stroke(tp);g.globalCompositeOperation='source-over'}
  g.strokeStyle='rgba(8,12,28,.9)';g.lineWidth=.98;g.stroke(tp);
  g.strokeStyle=C_TR[q];g.lineWidth=.6;g.stroke(tp);
  g.strokeStyle='rgba(255,255,255,'+(.8+.2*Math.sin(tm*14)).toFixed(2)+')';g.lineWidth=.24;g.stroke(tp);
  g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=.36;g.setLineDash([.5,3.4]);g.lineDashOffset=-tm*9;g.stroke(tp);g.setLineDash([]);g.lineDashOffset=0;g.globalCompositeOperation='source-over'}
 else{
  if(k>0){g.globalCompositeOperation='lighter';g.strokeStyle=C_UG[q].replace('.42',(.14*k).toFixed(2));g.lineWidth=2.2;g.stroke(tp);g.strokeStyle=C_UG[q].replace('.42',(.2*k).toFixed(2));g.lineWidth=1.5;g.stroke(tp);g.globalCompositeOperation='source-over'}
  g.strokeStyle=C_DK[q];g.lineWidth=1.0;g.stroke(tp);
  g.strokeStyle=C_TR[q];g.lineWidth=.78;g.stroke(tp);
  g.strokeStyle=C_TI2[q];g.globalAlpha=al*.55;g.lineWidth=.48;g.stroke(tp);g.globalAlpha=al;
  g.save();g.translate(-.05,-.13);g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=.16;g.stroke(tp);g.restore();
  g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=.2;g.setLineDash([.5,1.6]);g.lineDashOffset=-tm*5;g.stroke(tp);g.setLineDash([]);g.lineDashOffset=0}
 g.restore()}

// ---------- garage and menu pictures ----------
// A snow plate with the car on it. Phones with the graphics chip get the real lit car and trail; others get the flat sprites.
const GAR_L={sh:.4,lx:.5,ly:.8,glow:1,gk:1};
let PICT=null;
function pictCanvas(w,h){if(!PICT)PICT=mkc(w,h);if(PICT.width!==w||PICT.height!==h){PICT.width=w;PICT.height=h}return PICT}
function snowPlate(g,W,H,dark){g.save();
 g.fillStyle=rg(g,W*.5,H*.46,W*.03,W*.5,H*.5,W*.66,[[0,'#ffffff'],[.62,'#f1f5fb'],[1,dark?'#c9d6e8':'#dbe5f2']]);g.fillRect(0,0,W,H);
 if(typeof grainTile==='function'){g.globalAlpha=.5;g.fillStyle=g.createPattern(grainTile(),'repeat');g.fillRect(0,0,W,H);g.globalAlpha=1}
 g.restore()}
function glCar(m,x,y,a,st,sc,q){return{x,y,a,sc:sc||1.22,m,c:COLRGB[q||1],st:st||0,al:1,em:1}}
function carThumb(c,m){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);g.imageSmoothingQuality='high';snowPlate(g,W,H);
 if(GLS.ok&&CARGL.ok){const t=pictCanvas(W,H);if(carPicture(t,[glCar(m,0,0,-.3,0,1.22)],0,0,W*.158,MOODS[0])){g.drawImage(t,0,0);return}}
 g.fillStyle=rg(g,W/2,H*.58,4,W/2,H*.58,W*.45,[[0,'rgba(130,180,255,.4)'],[1,'rgba(130,180,255,0)']]);g.fillRect(0,0,W,H);
 const u=W*.255;g.save();g.translate(W/2,H*.52);g.scale(u,u);drawCar(g,0,0,-.32,1,m,0,1,1,1,GAR_L);g.restore()}
function trailThumb(c,k){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);g.imageSmoothingQuality='high';snowPlate(g,W,H);
 const t=[];for(let i=0;i<=44;i++){const s=i/44;t.push(-2.9+s*5.4,Math.sin(s*5.4)*.62+(.5-s)*.2)}
 const e=t.length,hx=t[e-2],hy=t[e-1],an=Math.atan2(hy-t[e-4],hx-t[e-6]);
 if(GLS.ok&&CARGL.ok&&TRL.ok){const pc=pictCanvas(W,H);if(carPicture(pc,[glCar('sport',hx+.2,hy,an,0,.8)],0,0,W*.105,MOODS[0],[{tr:t,hx:hx+.2,hy,c:COLRGB[1],st:k,al:1,k:1}],k==='fire'?.4:.8)){g.drawImage(pc,0,0);return}}
 const u=W*.062;g.save();g.translate(W/2,H/2);g.scale(u,u);drawTrail(g,t,1,k,1,k==='fire'?.4:.8,1);drawCar(g,hx+.2,hy,an,1,'sport',0,.62,1,1,GAR_L);g.restore()}
// the garage preview: your car drives a loop and leaves the trail you picked
const GPT=[];
function drawGaragePreview(c,tm){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);g.imageSmoothingQuality='high';snowPlate(g,W,H);
 const w=.85,pos=s=>[Math.sin(s*w)*2.55,Math.sin(s*w*2)*.95+.1];
 const t=[];const T=tm;for(let i=40;i>=0;i--){const p=pos(T-i*.07);t.push(p[0],p[1])}
 const p0=pos(T),p1=pos(T-.02),an=Math.atan2(p0[1]-p1[1],p0[0]-p1[0]);
 let st=0;{const pa=pos(T-.12),an2=Math.atan2(p1[1]-pa[1],p1[0]-pa[0]),d=an-an2;st=Math.max(-.4,Math.min(.4,(Math.abs(d)<3?d:0)*5))}
 if(GLS.ok&&CARGL.ok&&TRL.ok){const pc=pictCanvas(W,H);if(carPicture(pc,[glCar(LOAD.skin,p0[0],p0[1],an,st,1.22)],0,0,W/12.6,MOODS[0],[{tr:t,hx:p0[0],hy:p0[1],c:COLRGB[1],st:LOAD.trail,al:1,k:1}],tm)){g.drawImage(pc,0,0);return}}
 g.fillStyle=rg(g,W/2,H*.55,10,W/2,H*.55,W*.5,[[0,'rgba(130,180,255,.32)'],[1,'rgba(130,180,255,0)']]);g.fillRect(0,0,W,H);
 const u=W/9.2;g.save();g.translate(W/2,H/2);g.scale(u,u);
 drawTrail(g,t,1,LOAD.trail,1,tm,1,p0[0],p0[1]);
 drawCar(g,p0[0],p0[1],an,1,LOAD.skin,st,1,1,1,GAR_L);g.restore()}
