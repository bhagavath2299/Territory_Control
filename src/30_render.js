//@@client
// ---------- renderer: textured world, water and light, detailed cars and trails ----------
function mkc(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
const rgbOf=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const shade=(h,f)=>{const c=rgbOf(h);return'rgb('+(c[0]*f|0)+','+(c[1]*f|0)+','+(c[2]*f|0)+')'};
const tint=(h,f)=>{const c=rgbOf(h);return'rgb('+(c[0]+(255-c[0])*f|0)+','+(c[1]+(255-c[1])*f|0)+','+(c[2]+(255-c[2])*f|0)+')'};
const C_UG=COLS.map(c=>{if(!c)return c;const v=rgbOf(c);return 'rgba('+v[0]+','+v[1]+','+v[2]+',.42)'}),C_W1=COLS.map(c=>c&&shade(c,.7)),C_W2=COLS.map(c=>c&&shade(c,.5)),C_SW=COLS.map(c=>c&&shade(c,.66)),C_TR=COLS.map(c=>c&&tint(c,.42)),C_SH=COLS.map(c=>c&&shade(c,.56)),C_DK=COLS.map(c=>c&&shade(c,.62)),C_TI=COLS.map(c=>c&&tint(c,.28)),C_TI2=COLS.map(c=>c&&tint(c,.6));

// ---------- time of day: every map gets a light mood from its seed ----------
// lx,ly: where shadows fall. sh: shadow strength. gk: how strongly glows show. cone: headlight beams. hl: lamp glow. tint: multiplied over the world. sun: warm glow from the top left.
const MOODS=[
 {n:'Day',tint:null,sun:[255,244,214,.10],lx:.5,ly:.8,sh:.34,gk:.7,cone:0,hl:.3,vig:.2,sea:[0,0,0,0]},
 {n:'Golden hour',tint:[255,208,150,.22],sun:[255,178,98,.20],lx:.95,ly:.5,sh:.42,gk:.95,cone:.07,hl:.55,vig:.26,sea:[255,150,60,.08]},
 {n:'Dusk',tint:[122,136,216,.36],sun:[196,140,255,.10],lx:.3,ly:.9,sh:.5,gk:1.5,cone:.34,hl:1,vig:.36,sea:[40,30,110,.16]}];
let MOOD=MOODS[0];
function setMood(seed){MOOD=MOODS[(seed>>>0)%3]}

// ---------- textures ----------
function wrapNoise(N,cells){const L=new Float32Array(cells*cells);for(let i=0;i<L.length;i++)L[i]=Math.random();
 return(x,y)=>{const fx=x*cells/N,fy=y*cells/N,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),at=(a,b)=>L[(b%cells)*cells+(a%cells)];
  const a=at(x0,y0),b=at(x0+1,y0),e=at(x0,y0+1),f=at(x0+1,y0+1);return(a+(b-a)*sx)*(1-sy)+(e+(f-e)*sx)*sy}}
// the floor of a captured area: soft rubber tiles with a bevel, 4 x 4 per picture
function patTex(i){const N=128,T=32,c=mkc(N,N),g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data,col=rgbOf(COLS[i]),n1=wrapNoise(N,4),n2=wrapNoise(N,16),n3=wrapNoise(N,64);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const tx=x%T,ty=y%T,th=((((x/T|0)*374761393+(y/T|0)*668265263)>>>0)%1000)/1000,v=(n1(x,y)*.5+n2(x,y)*.32+n3(x,y)*.18-.5)*.14;
  let bv=0;if(tx===0||ty===0)bv=-.16;else if(tx<3||ty<3)bv=.065;else if(tx>=T-2||ty>=T-2)bv=-.075;
  const cx=(tx-T/2)/(T/2),cy=(ty-T/2)/(T/2),sh=.04*(1-Math.min(1,Math.sqrt(cx*cx+cy*cy))),f=1+v+(th-.5)*.05+bv+sh+(Math.random()-.5)*.03,k=(y*N+x)*4;
  d[k]=Math.min(255,col[0]*f)|0;d[k+1]=Math.min(255,col[1]*f)|0;d[k+2]=Math.min(255,col[2]*f)|0;d[k+3]=255}
 g.putImageData(img,0,0);return c}
function wrapDraw(N,x,y,fn){fn(x,y);const nx=x<14?N:x>N-14?-N:0,ny=y<14?N:y>N-14?-N:0;if(nx)fn(x+nx,y);if(ny)fn(x,y+ny);if(nx&&ny)fn(x+nx,y+ny)}
function grassTex(){const N=256,c=mkc(N,N),g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data,n1=wrapNoise(N,4),n2=wrapNoise(N,16),n3=wrapNoise(N,64);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=n1(x,y)*.5+n2(x,y)*.3+n3(x,y)*.2,k=(y*N+x)*4,bl=Math.random();let r=72+v*34,gg=132+v*42,b=60+v*22;
  if(bl<.06){r+=24;gg+=30;b+=10}else if(bl<.13){r-=15;gg-=19;b-=9}d[k]=r|0;d[k+1]=gg|0;d[k+2]=b|0;d[k+3]=255}
 g.putImageData(img,0,0);g.lineCap='round';const R=mulberry32(77);
 const blade=(x,y,len,an,col,w)=>wrapDraw(N,x,y,(a,b)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(a,b);g.quadraticCurveTo(a+Math.cos(an)*len*.5+(R()-.5)*1.5,b+Math.sin(an)*len*.5,a+Math.cos(an)*len,b+Math.sin(an)*len);g.stroke()});
 for(let k=0;k<1500;k++){const x=R()*N,y=R()*N,t=R();blade(x,y,3+R()*5,-1.57+(R()-.5)*1.1,t<.45?'rgba(34,86,38,.5)':t<.85?'rgba(156,208,98,.42)':'rgba(205,212,110,.32)',.9+R()*.7)}
 for(let k=0;k<26;k++){const x=R()*N,y=R()*N;wrapDraw(N,x,y,(a,b)=>{g.fillStyle='rgba(60,130,60,.25)';g.beginPath();g.arc(a,b,3.5,0,7);g.fill()})}
 for(let k=0;k<34;k++){const x=R()*N,y=R()*N,t=R(),col=t<.45?'#fff6dc':t<.75?'#ffe066':'#ffb3d1';wrapDraw(N,x,y,(a,b)=>{g.fillStyle=col;g.beginPath();g.arc(a,b,1.2,0,7);g.fill();g.fillStyle='rgba(255,255,255,.7)';g.fillRect(a-.4,b-.5,.7,.6)})}
 return c}
function sandTex(){const N=256,c=mkc(N,N),g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data,n1=wrapNoise(N,4),n2=wrapNoise(N,32);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=n1(x,y)*.6+n2(x,y)*.4,k=(y*N+x)*4,s=Math.random(),rp=Math.sin(((x*2+y)/N)*6.2832*6+n1(x,y)*6)*.5+.5;let r=224+v*20+rp*7,gg=202+v*20+rp*7,b=154+v*18+rp*5;
  if(s<.03){r-=34;gg-=34;b-=30}else if(s<.045){r+=18;gg+=20;b+=24}const gr=(Math.random()-.5)*9;d[k]=Math.min(255,r+gr)|0;d[k+1]=Math.min(255,gg+gr)|0;d[k+2]=Math.min(255,b+gr)|0;d[k+3]=255}
 g.putImageData(img,0,0);const R=mulberry32(91);
 for(let k=0;k<40;k++){const x=R()*N,y=R()*N,r=.8+R()*1.4;wrapDraw(N,x,y,(a,b)=>{g.fillStyle='rgba(120,100,70,.4)';g.beginPath();g.ellipse(a,b,r*1.4,r,R()*3,0,7);g.fill();g.fillStyle='rgba(255,250,235,.4)';g.beginPath();g.arc(a-.4,b-.4,r*.45,0,7);g.fill()})}
 return c}
function seaTex(){const N=256,c=mkc(N,N),g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data,n1=wrapNoise(N,4),n2=wrapNoise(N,16),n3=wrapNoise(N,32);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=n1(x,y)*.6+n2(x,y)*.4,w1=Math.sin((x/N*3+v*.8)*6.2832),w2=Math.sin((y/N*2+x/N+v*.6)*6.2832),cr=Math.max(0,w1*w2-.6)*1.7,rg1=1-Math.abs(n3(x,y)*2-1),sw=Math.pow(rg1,7)*.42,k=(y*N+x)*4;
  d[k]=Math.min(255,20+v*22+cr*62+sw*46)|0;d[k+1]=Math.min(255,104+v*42+cr*58+sw*54)|0;d[k+2]=Math.min(255,164+v*40+cr*40+sw*46)|0;d[k+3]=255}
 g.putImageData(img,0,0);return c}
// light networks that dance on the sea floor (added on top of the water)
function causTex(){const N=256,c=mkc(N,N),g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data,a=wrapNoise(N,6),b=wrapNoise(N,10),e=wrapNoise(N,22);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const u=x+(e(x,y)-.5)*18,v=y+(e(y,x)-.5)*18,r1=1-Math.abs(a(((u%N)+N)%N,((v%N)+N)%N)*2-1),r2=1-Math.abs(b(((v%N)+N)%N,((u%N)+N)%N)*2-1),w=Math.pow(r1*r2,2.6),k=(y*N+x)*4;
  d[k]=190;d[k+1]=255;d[k+2]=245;d[k+3]=Math.min(255,w*300)|0}
 g.putImageData(img,0,0);return c}
function hexTex(){const c=mkc(45,26),g=c.getContext('2d'),r=15;g.strokeStyle='rgba(170,245,255,.95)';g.lineWidth=1.6;g.fillStyle='rgba(94,225,255,.2)';
 const hx=(cx,cy)=>{g.beginPath();for(let k=0;k<6;k++){const a=k/6*6.2832,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;k?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.fill();g.stroke()};
 for(const v of [[0,0],[22.5,13],[45,0],[0,26],[45,26]])hx(v[0],v[1]);return c}

// ---------- decoration sprites: palms, bushes, rocks, flowers, grass, shells ----------
const DU=44,DEC={crown:null,trunk:null,bush:[],rock:[],flw:[],tuft:[],shell:[],blob:null,cloud:null,shield:null};
let TEXOK=0,TX={},LASTRB=-9;
function decorCanvas(wu,hu,fn){const c=mkc(Math.ceil(wu*DU),Math.ceil(hu*DU)),g=c.getContext('2d');g.translate(c.width/2,c.height/2);g.scale(DU,DU);g.lineJoin=g.lineCap='round';fn(g);return c}
function drawFrond(g,len,droop,w,tone){
 g.beginPath();g.moveTo(0,0);g.bezierCurveTo(len*.3,-w*1.15,len*.72,-w*.85+droop*.5,len,droop);g.bezierCurveTo(len*.72,w*.75+droop*.5,len*.3,w*1.0,0,0);g.closePath();
 g.fillStyle=lg(g,0,0,len,0,[[0,'#1b5628'],[.45,tone?'#3d8d39':'#357f39'],[1,'#86c45a']]);g.fill();
 g.save();g.clip();g.fillStyle='rgba(255,255,255,.1)';g.fillRect(0,-w*1.3,len,w*1.2);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,w*.15,len,w*1.2);g.restore();
 g.strokeStyle='rgba(18,66,28,.45)';g.lineWidth=.024;g.beginPath();for(let k=1;k<15;k++){const t=k/15,x=len*t,y=droop*t*t,ww=w*(1-t*.78)*.95;g.moveTo(x,y);g.lineTo(x+.2,y-ww);g.moveTo(x,y);g.lineTo(x+.2,y+ww)}g.stroke();
 g.strokeStyle='rgba(222,240,160,.55)';g.lineWidth=.04;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(len*.55,droop*.15,len,droop);g.stroke()}
function crownSprite(){return decorCanvas(4.4,4.4,g=>{const R=mulberry32(5),n=10;
 for(let k=0;k<n;k++){const an=k/n*6.2832+(R()-.5)*.25,len=1.3+R()*.5,dr=.28+R()*.5;g.save();g.rotate(an);drawFrond(g,len,dr*(Math.sin(an)>0?1.1:.7),.27+R()*.07,k%2);g.restore()}
 for(const [x,y] of [[-.06,-.05],[.08,-.02],[0,.08]]){g.fillStyle=rg(g,x-.03,y-.03,.01,x,y,.12,[[0,'#a0714a'],[1,'#4d2f17']]);g.beginPath();g.arc(x,y,.1,0,7);g.fill()}})}
function trunkSprite(){return decorCanvas(1.7,2.1,g=>{g.translate(-.25,.65);
 g.beginPath();g.moveTo(-.17,.08);g.bezierCurveTo(-.13,-.5,.2,-.95,.4,-1.5);g.lineTo(.6,-1.46);g.bezierCurveTo(.4,-.9,.15,-.45,.15,.08);g.closePath();g.fillStyle=lg(g,-.2,0,.6,-1.5,[[0,'#6a4a2a'],[.5,'#9a7448'],[1,'#7a5632']]);g.fill();
 g.save();g.clip();g.strokeStyle='rgba(40,24,10,.5)';g.lineWidth=.02;for(let k=0;k<17;k++){const t=k/17,x=-.02+t*.5,y=.04-t*1.5;g.beginPath();g.moveTo(x-.24,y+.04);g.quadraticCurveTo(x,y-.04,x+.22,y+.03);g.stroke()}
 g.fillStyle='rgba(255,236,190,.22)';g.fillRect(-.3,-2,.16,3);g.restore()})}
function bushSprite(kind){return decorCanvas(2.9,2.5,g=>{const R=mulberry32(kind*77+3);
 for(const [x,y,r] of [[-.6,.1,.82],[.55,.15,.78],[0,-.3,.88],[-.2,.4,.72],[.4,-.28,.62]]){g.fillStyle=rg(g,x-.22,y-.28,.05,x,y,r,[[0,'#82c85e'],[.55,'#46903f'],[1,'#25602d']]);g.beginPath();g.arc(x,y,r,0,7);g.fill()}
 for(let k=0;k<46;k++){const a=R()*6.283,d=Math.sqrt(R())*1.05,x=Math.cos(a)*d*1.15-.05,y=Math.sin(a)*d*.8-.1;g.save();g.translate(x,y);g.rotate(R()*3);g.fillStyle=R()<.55?'rgba(190,240,130,.42)':'rgba(16,64,28,.38)';g.beginPath();g.ellipse(0,0,.13,.06,0,0,7);g.fill();g.restore()}
 if(kind===1)for(let k=0;k<14;k++){const a=R()*6.283,d=Math.sqrt(R())*.95,x=Math.cos(a)*d*1.1,y=Math.sin(a)*d*.75-.1;g.fillStyle='#d94444';g.beginPath();g.arc(x,y,.07,0,7);g.fill();g.fillStyle='rgba(255,255,255,.8)';g.fillRect(x-.03,y-.04,.03,.025)}
 if(kind>=2){const cols=kind===2?['#ff9ec6','#ffd0e4']:['#ffe066','#fff3a8'];for(let k=0;k<12;k++){const a=R()*6.283,d=Math.sqrt(R())*.95,x=Math.cos(a)*d*1.1,y=Math.sin(a)*d*.75-.1;for(let j=0;j<5;j++){g.fillStyle=cols[0];g.beginPath();g.arc(x+Math.cos(j*1.2566)*.06,y+Math.sin(j*1.2566)*.06,.045,0,7);g.fill()}g.fillStyle=cols[1];g.beginPath();g.arc(x,y,.03,0,7);g.fill()}}})}
function rockSprite(kind){return decorCanvas(2.8,2.4,g=>{const R=mulberry32(kind*131+7),n=8+kind,pts=[],base=[[146,151,160],[152,140,124],[132,142,154]][kind];
 for(let i=0;i<n;i++){const a=i/n*6.283+R()*.3,r=(.72+R()*.34)*(kind===2?.82:1);pts.push([Math.cos(a)*r*1.12,Math.sin(a)*r*.88])}
 const cx=-.08,cy=-.14,L=[-.6,-.8];
 g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle='rgb('+(base[0]*.5|0)+','+(base[1]*.5|0)+','+(base[2]*.5|0)+')';g.fill();
 for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,len=Math.hypot(mx,my)||1,dt=(mx/len)*L[0]+(my/len)*L[1],br=.62+.36*dt+(R()-.5)*.1;
  g.fillStyle='rgb('+Math.min(255,base[0]*br)+','+Math.min(255,base[1]*br)+','+Math.min(255,base[2]*br)+')';g.beginPath();g.moveTo(cx,cy);g.lineTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.closePath();g.fill()}
 g.fillStyle='rgba(255,255,255,.14)';g.beginPath();pts.forEach((p,i)=>{const x=cx+(p[0]-cx)*.55,y=cy+(p[1]-cy)*.55;i?g.lineTo(x,y):g.moveTo(x,y)});g.closePath();g.fill();
 g.strokeStyle='rgba(20,24,32,.45)';g.lineWidth=.03;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.stroke();
 g.strokeStyle='rgba(20,24,32,.3)';g.lineWidth=.02;for(let k=0;k<3;k++){const p=pts[(R()*n)|0];g.beginPath();g.moveTo(cx+(p[0]-cx)*.2,cy+(p[1]-cy)*.2);g.lineTo(cx+(p[0]-cx)*.7+(R()-.5)*.2,cy+(p[1]-cy)*.7+(R()-.5)*.2);g.stroke()}
 if(kind!==1){g.fillStyle='rgba(76,140,60,.5)';g.beginPath();g.ellipse(.3,.35,.4,.16,.2,0,7);g.fill();g.fillStyle='rgba(120,180,80,.4)';g.beginPath();g.ellipse(.22,.3,.2,.07,.2,0,7);g.fill()}})}
function flowerSprite(kind){return decorCanvas(1.8,1.6,g=>{const R=mulberry32(kind*53+9),cols=[['#ffffff','#ffe066'],['#ffd447','#fff2a6'],['#ff8fc0','#ffd3e6'],['#b78bff','#e3d1ff'],['#ff6f61','#ffc9c2']][kind%5];
 for(let k=0;k<9;k++){const x=(R()-.5)*1.4,y=(R()-.5)*1.1;g.strokeStyle='#3b8a3b';g.lineWidth=.03;g.beginPath();g.moveTo(x,y+.18);g.lineTo(x,y);g.stroke();g.fillStyle='#4aa04a';g.beginPath();g.ellipse(x-.07,y+.12,.07,.03,.5,0,7);g.fill();
  for(let j=0;j<5;j++){g.fillStyle=cols[0];g.beginPath();g.arc(x+Math.cos(j*1.2566)*.07,y+Math.sin(j*1.2566)*.07,.055,0,7);g.fill()}g.fillStyle=cols[1];g.beginPath();g.arc(x,y,.04,0,7);g.fill()}})}
function tuftSprite(kind){return decorCanvas(1.4,1.2,g=>{const R=mulberry32(kind*29+1);for(let k=0;k<9;k++){const x=(R()-.5)*.7,h=.35+R()*.45,lean=(R()-.5)*.7;g.strokeStyle=['#2f7a36','#4a9b43','#7ab955'][k%3];g.lineWidth=.06;g.beginPath();g.moveTo(x,.3);g.quadraticCurveTo(x+lean*.4,.3-h*.6,x+lean,.3-h);g.stroke()}})}
function shellSprite(kind){return decorCanvas(.9,.9,g=>{
 if(kind===0){g.fillStyle='#f4d8cf';g.beginPath();g.moveTo(0,.28);for(let k=0;k<=6;k++){const a=-2.6+k*(2.12/6*1.0);g.lineTo(Math.cos(a)*.32,Math.sin(a)*.32-.02)}g.closePath();g.fill();g.strokeStyle='rgba(150,100,90,.55)';g.lineWidth=.02;for(let k=0;k<=5;k++){const a=-2.55+k*.34;g.beginPath();g.moveTo(0,.26);g.lineTo(Math.cos(a)*.3,Math.sin(a)*.3-.02);g.stroke()}}
 else if(kind===1){g.fillStyle='#ead9b8';g.beginPath();g.arc(0,0,.2,0,7);g.fill();g.strokeStyle='rgba(120,90,60,.6)';g.lineWidth=.03;g.beginPath();for(let a=0;a<12;a+=.4)g.lineTo(Math.cos(a)*(.02+a*.014),Math.sin(a)*(.02+a*.014));g.stroke()}
 else{g.fillStyle='#e8864a';g.beginPath();for(let k=0;k<10;k++){const r=k%2?.1:.3,a=k/10*6.283-1.57;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill();g.fillStyle='rgba(255,230,190,.7)';for(let k=0;k<5;k++){const a=k/5*6.283-1.57;g.beginPath();g.arc(Math.cos(a)*.14,Math.sin(a)*.14,.018,0,7);g.fill()}}})}
function blobSprite(){const c=mkc(64,64),g=c.getContext('2d');g.fillStyle=rg(g,32,32,0,32,32,32,[[0,'rgba(10,18,12,.55)'],[.6,'rgba(10,18,12,.25)'],[1,'rgba(10,18,12,0)']]);g.fillRect(0,0,64,64);return c}
function cloudSprite(){const c=mkc(192,128),g=c.getContext('2d');for(const [x,y,r,a] of [[96,64,50,.5],[60,70,36,.42],[134,72,38,.42],[80,48,30,.34],[118,52,28,.34]]){g.fillStyle=rg(g,x,y,0,x,y,r,[[0,'rgba(15,25,45,'+a+')'],[1,'rgba(15,25,45,0)']]);g.fillRect(0,0,192,128)}return c}
function shieldSprite(){const c=mkc(160,160),g=c.getContext('2d');g.fillStyle=rg(g,80,80,30,80,80,78,[[0,'rgba(94,225,255,.0)'],[.78,'rgba(94,225,255,.16)'],[.93,'rgba(150,240,255,.55)'],[1,'rgba(150,240,255,0)']]);g.beginPath();g.arc(80,80,78,0,7);g.fill();
 g.strokeStyle='rgba(190,245,255,.28)';g.lineWidth=1.2;const r=15;for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){const cx=80+x*r*1.5,cy=80+y*r*1.732+(x&1?r*.866:0);if(Math.hypot(cx-80,cy-80)>66)continue;g.beginPath();for(let k=0;k<6;k++){const a=k/6*6.283;k?g.lineTo(cx+Math.cos(a)*r*.92,cy+Math.sin(a)*r*.92):g.moveTo(cx+Math.cos(a)*r*.92,cy+Math.sin(a)*r*.92)}g.closePath();g.stroke()}
 g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(56,48,22,8,-.7,0,7);g.fill();return c}
function buildDecor(){DEC.crown=crownSprite();DEC.trunk=trunkSprite();DEC.bush=[0,1,2,3].map(bushSprite);DEC.rock=[0,1,2].map(rockSprite);DEC.flw=[0,1,2,3,4].map(flowerSprite);DEC.tuft=[0,1,2].map(tuftSprite);DEC.shell=[0,1,2].map(shellSprite);DEC.blob=blobSprite();DEC.cloud=cloudSprite();DEC.shield=shieldSprite()}
function scaled(p,s){try{if(p&&p.setTransform&&typeof DOMMatrix!=='undefined'){p.setTransform(new DOMMatrix([s,0,0,s,0,0]));return p}}catch(e){}return null}
function makePatterns(){PP=[null];for(let i=1;i<=5;i++)PP.push(scaled(ctx.createPattern(PAT[i],'repeat'),6/128)||COLS[i]);
 GRP=scaled(ctx.createPattern(TX.grass,'repeat'),12/256);SDP=scaled(ctx.createPattern(TX.sand,'repeat'),10/256);SEP=ctx.createPattern(TX.sea,'repeat');SEP2=ctx.createPattern(TX.caus,'repeat');HEXP=scaled(ctx.createPattern(hexTex(),'repeat'),1/15);TEXOK=1}
// the loading screen runs these one by one so the bar moves
function buildTexSteps(){return[
 ['Laying the tiles...',()=>{PAT=[null];for(let i=1;i<=5;i++)PAT.push(patTex(i))}],
 ['Growing the grass...',()=>{TX.grass=grassTex()}],
 ['Sifting the sand...',()=>{TX.sand=sandTex()}],
 ['Filling the ocean...',()=>{TX.sea=seaTex();TX.caus=causTex()}],
 ['Planting trees...',buildDecor],
 ['Finishing the island...',makePatterns]]}
function buildTexAll(){for(const s of buildTexSteps())s[1]()}

// ---------- the island of this match: coast, shallows, decoration ----------
let WTR=null,GROUND=[],TALL=[],BUSH=[],FLWR=[],TUFT=[],SHELL=[],COAST=[],GLINT=[],SKID=null,SKX=0;
function buildIsland(){if(IS_SRV||!LANDI)return;
 setMood(SEED);LASTRB=-9;
 LANDP=toPath(loopsOf(ISL,1)[1]);
 const N=ISL.length,Dm=new Int16Array(N).fill(-1),Q=new Int32Array(N);
 const bfs=(Dd,seedOf)=>{let h=0,t=0;for(let i=0;i<N;i++)if(seedOf(i)){Dd[i]=0;Q[t++]=i}
  while(h<t){const i=Q[h++],x=i%MW,d=Dd[i]+1;if(x>0&&Dd[i-1]<0){Dd[i-1]=d;Q[t++]=i-1}if(x<MW-1&&Dd[i+1]<0){Dd[i+1]=d;Q[t++]=i+1}if(i>=MW&&Dd[i-MW]<0){Dd[i-MW]=d;Q[t++]=i-MW}if(i+MW<N&&Dd[i+MW]<0){Dd[i+MW]=d;Q[t++]=i+MW}}};
 bfs(Dm,i=>!ISL[i]);const G=new Uint8Array(N);for(let i=0;i<N;i++)G[i]=Dm[i]>MC*1.8?1:0;const gl=loopsOf(G,1)[1];GRASSP=gl.length?toPath(gl):null;
 const E=new Int16Array(N).fill(-1);bfs(E,i=>ISL[i]===1);
 // sea depth: pale and clear at the beach, deep and dark far out (a margin of 8 units keeps the edge of the world deep)
 {const M=8,PX=3,W2=(WW+M*2)*PX,H2=(WH+M*2)*PX;if(!WTR||WTR.width!==W2)WTR=mkc(W2,H2);const g=WTR.getContext('2d'),img=g.createImageData(W2,H2),dd=img.data,lut=new Uint8ClampedArray(256*4);
  const ramp=[[0,[210,255,246,150]],[.35,[150,248,226,120]],[1.2,[96,226,214,84]],[3,[40,176,210,46]],[6,[28,120,196,10]],[9,[10,60,140,40]],[16,[6,34,96,92]],[40,[4,22,70,128]]];
  for(let k=0;k<256;k++){const e=k/6;let a=ramp[0],b=ramp[ramp.length-1];for(let j=0;j<ramp.length-1;j++)if(e>=ramp[j][0]&&e<=ramp[j+1][0]){a=ramp[j];b=ramp[j+1];break}
   const f=b[0]===a[0]?0:Math.max(0,Math.min(1,(e-a[0])/(b[0]-a[0])));for(let c=0;c<4;c++)lut[k*4+c]=a[1][c]+(b[1][c]-a[1][c])*f}
  for(let Y=0;Y<H2;Y++)for(let X=0;X<W2;X++){const cx=((X/PX-M)*MC)|0,cy=((Y/PX-M)*MC)|0,k=(Y*W2+X)*4,qx=cx<0?0:cx>=MW?MW-1:cx,qy=cy<0?0:cy>=MH?MH-1:cy,i=qy*MW+qx;
   if(ISL[i]){dd[k+3]=0;continue}const e=Math.min(255,(((E[i]+Math.hypot(cx-qx,cy-qy))/MC)*6)|0),o=e*4;dd[k]=lut[o];dd[k+1]=lut[o+1];dd[k+2]=lut[o+2];dd[k+3]=lut[o+3]}
  g.putImageData(img,0,0)}
 const R=mulberry32(SEED^0x5bd1e995),at=i=>[(i%MW+.5)/MC,(((i/MW)|0)+.5)/MC],nearZone=(x,y,m)=>ZN.some(z=>Math.hypot(z.x-x,z.y-y)<ZR+m);
 const scatter=(list,max,tries,test,gap,mk)=>{list.length=0;for(let k=0;k<tries&&list.length<max;k++){const i=LANDI[(R()*LANDI.length)|0];if(!test(Dm[i]))continue;const [x,y]=at(i);if(gap&&list.some(p=>Math.hypot(p.x-x,p.y-y)<gap))continue;list.push(mk(x,y))}};
 PALMS=[];TALL=PALMS;scatter(PALMS,32,15000,d=>d>=1&&d<=MC*1.3,5,(x,y)=>({x,y,s:.85+R()*.4,ph:R()*6.28,a:R()*6.28,m:R()<.5?1:-1}));
 ROCKS=[];scatter(ROCKS,60,15000,d=>d>=MC*3,4,(x,y)=>({x,y,s:.5+R()*.55,v:(R()*3)|0,a:(R()-.5)*.6}));ROCKS=ROCKS.filter(r=>!nearZone(r.x,r.y,1.5));
 scatter(BUSH,70,15000,d=>d>=MC*2.2,3,(x,y)=>({x,y,s:.55+R()*.5,v:(R()*4)|0,a:0}));
 for(let k=BUSH.length-1;k>=0;k--)if(nearZone(BUSH[k].x,BUSH[k].y,1.2)||ROCKS.some(r=>Math.hypot(r.x-BUSH[k].x,r.y-BUSH[k].y)<2.4))BUSH.splice(k,1);
 scatter(FLWR,100,12000,d=>d>=MC*2,2.6,(x,y)=>({x,y,s:.7+R()*.6,v:(R()*5)|0}));
 scatter(TUFT,280,16000,d=>d>=MC*1.8,1.4,(x,y)=>({x,y,s:.6+R()*.6,v:(R()*3)|0}));
 scatter(SHELL,46,12000,d=>d>=1&&d<=MC*1.2,2.4,(x,y)=>({x,y,s:.7+R()*.5,v:(R()*3)|0,a:R()*6.28}));
 CLOUDS=[];for(let k=0;k<12;k++)CLOUDS.push({x:R()*WW,y:R()*WH,s:6+R()*7,v:.6+R()*.8});BIRDS=[];
 // coast samples for the foam bubbles: a point every ~1.4 units along the shore, with the side that faces the water
 COAST=[];{const loops=loopsOf(ISL,1)[1]||[];for(const lp of loops){const n=lp.length/2;let acc=0;for(let i=0;i<n;i++){const j=(i+1)%n,x=lp[i*2]/MC,y=lp[i*2+1]/MC,x2=lp[j*2]/MC,y2=lp[j*2+1]/MC,d=Math.hypot(x2-x,y2-y);acc+=d;if(acc<1.4)continue;acc=0;
   const L=d||1,nx=(y2-y)/L,ny=-(x2-x)/L;let sx=nx,sy=ny;const px=x+nx*.9,py=y+ny*.9;if(ISL[gy(py)*MW+gx(px)]===1){sx=-nx;sy=-ny}COAST.push({x,y,nx:sx,ny:sy,ph:R(),r:.08+R()*.1})}}}
 GLINT=[];for(let k=0;k<4000&&GLINT.length<320;k++){const x=R()*WW,y=R()*WH;if(ISL[gy(y)*MW+gx(x)])continue;GLINT.push({x,y,ph:R()*6.283,f:.6+R()*1.6,s:.35+R()*.5})}
 // skid marks live in a picture of the whole map
 if(!SKID||SKID.width!==WW*6){SKID=mkc(WW*6,WH*6)}SKID.getContext('2d').clearRect(0,0,SKID.width,SKID.height);SKX=clk}
function palm(p){const sw=Math.sin(clk*1.4+p.ph)*.05,s=p.s,tw=DEC.trunk.width/DU,th=DEC.trunk.height/DU,cw=DEC.crown.width/DU,m=p.m||1;
 ctx.save();ctx.translate(p.x,p.y);
 ctx.globalAlpha=MOOD.sh*.8;ctx.drawImage(DEC.blob,MOOD.lx*.9*s-1.5*s,MOOD.ly*.5*s-.7*s,3.4*s,1.7*s);ctx.globalAlpha=1;
 ctx.scale(m*s,s);ctx.rotate(sw*.4);ctx.drawImage(DEC.trunk,.25-tw/2,-.65-th/2,tw,th);
 ctx.translate(.5,-1.47);ctx.rotate(sw*1.3+p.a*.02);const sc=1+Math.sin(clk*2.1+p.ph)*.01;ctx.scale(sc,sc);ctx.drawImage(DEC.crown,-cw/2,-cw/2,cw,cw);ctx.restore()}
function decorList(list,key,n){const sp=DEC[key],cnt=Math.ceil(list.length*n),vx0=CAM.x-vw/2/CAM.z-3,vx1=CAM.x+vw/2/CAM.z+3,vy0=CAM.y-vh/2/CAM.z-3,vy1=CAM.y+vh/2/CAM.z+3,sh=MOOD.sh;
 for(let i=0;i<cnt;i++){const o=list[i];if(o.x<vx0||o.x>vx1||o.y<vy0||o.y>vy1)continue;const im=sp[o.v%sp.length],w=im.width/DU*o.s,h=im.height/DU*o.s;
  if(key==='bush'||key==='rock'){ctx.globalAlpha=sh*.9;ctx.drawImage(DEC.blob,o.x+MOOD.lx*.4*o.s-w*.5,o.y+MOOD.ly*.4*o.s-h*.34,w,h*.8);ctx.globalAlpha=1}
  if(o.a){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.a);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}else ctx.drawImage(im,o.x-w/2,o.y-h/2,w,h)}}
function zoneIcon(t,col){ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=.14;ctx.beginPath();
 if(t==='cannon'){ctx.save();ctx.rotate(-.6);ctx.roundRect(-.15,-.22,.95,.44,.12);ctx.restore();ctx.fill();ctx.beginPath();ctx.arc(-.15,.15,.38,0,7);ctx.fill()}
 else if(t==='fort'){ctx.moveTo(0,-.75);ctx.lineTo(.6,-.5);ctx.lineTo(.55,.15);ctx.quadraticCurveTo(.35,.6,0,.78);ctx.quadraticCurveTo(-.35,.6,-.55,.15);ctx.lineTo(-.6,-.5);ctx.closePath();ctx.fill()}
 else if(t==='strike'){ctx.arc(0,0,.55,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(-.8,0);ctx.lineTo(.8,0);ctx.moveTo(0,-.8);ctx.lineTo(0,.8);ctx.stroke();ctx.beginPath();ctx.arc(0,0,.15,0,7);ctx.fill()}
 else{ctx.moveTo(.15,-.8);ctx.lineTo(-.45,.1);ctx.lineTo(-.02,.1);ctx.lineTo(-.15,.8);ctx.lineTo(.45,-.12);ctx.lineTo(.03,-.12);ctx.closePath();ctx.fill()}}
function zonePad(z,o,my){const c=o?COLS[o]:'#ffffff',pul=.5+.5*Math.sin(clk*3+z.x),hi=QL.hi;ctx.save();ctx.translate(z.x,z.y);
 ctx.fillStyle='rgba(10,15,30,.28)';ctx.beginPath();ctx.ellipse(.2,.5,ZR*.97,ZR*.82,0,0,7);ctx.fill();
 // raised metal plate
 ctx.fillStyle=lg(ctx,-ZR,-ZR,ZR,ZR,[[0,'#5b6478'],[.5,'#2a3142'],[1,'#151a26']]);ctx.beginPath();ctx.arc(0,0,ZR*1.02,0,7);ctx.fill();
 const g=ctx.createRadialGradient(-.8,-1,.3,0,0,ZR);g.addColorStop(0,'rgba(255,255,255,.5)');g.addColorStop(1,o?C_UG[o]:'rgba(255,255,255,.1)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,ZR*.84,0,7);ctx.fill();
 ctx.lineWidth=.3;ctx.strokeStyle=c;ctx.globalAlpha=.75+.25*pul;ctx.beginPath();ctx.arc(0,0,ZR,0,7);ctx.stroke();ctx.globalAlpha=1;
 ctx.setLineDash([.5,.45]);ctx.lineDashOffset=-clk*1.2;ctx.lineWidth=.12;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(0,0,ZR*.9,0,7);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
 if(hi){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=o?C_UG[o].replace('.42','.5'):'rgba(255,255,255,.22)';ctx.lineWidth=.9;ctx.globalAlpha=.4+.4*pul;ctx.beginPath();ctx.arc(0,0,ZR+.2,0,7);ctx.stroke();ctx.globalAlpha=1;
  for(let k=0;k<3;k++){const a=clk*(1.4+k*.2)+k*2.1;ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.14;ctx.beginPath();ctx.arc(0,0,ZR*.7,a,a+.5);ctx.stroke()}ctx.globalCompositeOperation='source-over'}
 if(my>0&&o!==1){ctx.lineWidth=.3;ctx.strokeStyle=COLS[VS];ctx.beginPath();ctx.arc(0,0,ZR+.45,-1.571,-1.571+6.283*Math.min(1,my*2));ctx.stroke()}
 ctx.fillStyle=o?c:'#1d2433';ctx.beginPath();ctx.arc(0,0,1.25,0,7);ctx.fill();ctx.lineWidth=.12;ctx.strokeStyle='#ffffff';ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(-.3,-.45,.7,.35,-.5,0,7);ctx.fill();
 zoneIcon(z.t,'#ffffff');ctx.restore()}
function fit(){if(IS_SRV)return;const wr=$('wrap');vw=Math.max(200,wr.clientWidth);vh=Math.max(200,wr.clientHeight);cs=Math.min(vw,vh)/40;dpr=Math.min(devicePixelRatio||1,QL.dpr||2);
 cv.style.width=vw+'px';cv.style.height=vh+'px';cv.width=Math.round(vw*dpr);cv.height=Math.round(vh*dpr);ctx.imageSmoothingQuality='medium';MDIRTY=true}
function camStep(dt){const t=camTarget(),fy=CAM.fy===undefined?.5:CAM.fy;if(t){const k=1-Math.exp(-dt*7);CAM.x+=(t.rx-CAM.x)*k;CAM.y+=(t.ry+(.5-fy)*vh/Math.max(1,CAM.z)-CAM.y)*k}
 const area=(CN[VS]||0)/(MC*MC),V=state==='menu'?36:Math.min(50,28+Math.sqrt(area)*.38+(boost&&en>0?2.5:0));CAM.vz+=(V-CAM.vz)*(1-Math.exp(-dt*2));CAM.z=Math.min(vw,vh)/CAM.vz;
 const hw=vw/2/CAM.z,hh=vh/2/CAM.z;CAM.x=hw*2>WW+6?WW/2:Math.min(WW+3-hw,Math.max(hw-3,CAM.x));CAM.y=hh*2>WH+6?WH/2:Math.min(WH+3-hh,Math.max(hh-3,CAM.y))}
function loopsOf(src,max){src=src||own;max=max||5;
 const nx=MW+1,E=[null];for(let i=1;i<=max;i++)E.push(new Map());
 const add=(m,x0,y0,x1,y1)=>{const a=y0*nx+x0,b=y1*nx+x1,l=m.get(a);if(l)l.push(b);else m.set(a,[b])};
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=y*MW+x,o=src[i];if(!o||o>max)continue;const m=E[o];
  if(y===0||src[i-MW]!==o)add(m,x,y,x+1,y);
  if(x===MW-1||src[i+1]!==o)add(m,x+1,y,x+1,y+1);
  if(y===MH-1||src[i+MW]!==o)add(m,x+1,y+1,x,y+1);
  if(x===0||src[i-1]!==o)add(m,x,y+1,x,y)}
 const out=[null];
 for(let id=1;id<=max;id++){const m=E[id],loops=[];
  while(m.size){const first=m.keys().next().value;let cur=first,pts=[],g=0;
   while(g++<600000){const l=m.get(cur);if(!l)break;const nv=l.pop();if(!l.length)m.delete(cur);pts.push(cur%nx,(cur/nx)|0);cur=nv;if(cur===first)break}
   if(pts.length>=8)loops.push(smooth(dp(simp(pts),1)))}
  out.push(loops)}
 return out}
function dp(p,eps){const n=p.length/2;if(n<8)return p;const keep=new Uint8Array(n);let far=0,fd=-1;for(let i=1;i<n;i++){const d=(p[i*2]-p[0])**2+(p[i*2+1]-p[1])**2;if(d>fd){fd=d;far=i}}
 keep[0]=keep[far]=1;const st=[[0,far],[far,n]],e2=eps*eps;
 while(st.length){const [a,b]=st.pop();if(b-a<2)continue;const ax=p[a*2],ay=p[a*2+1],bi=(b%n)*2,bx=p[bi],by=p[bi+1];let mi=-1,md=e2;
  for(let i=a+1;i<b;i++){const d=segD2(p[i*2],p[i*2+1],ax,ay,bx,by);if(d>md){md=d;mi=i}}
  if(mi>=0){keep[mi]=1;st.push([a,mi],[mi,b])}}
 const o=[];for(let i=0;i<n;i++)if(keep[i])o.push(p[i*2],p[i*2+1]);return o.length>=6?o:p}
function simp(p){const n=p.length/2,o=[];for(let i=0;i<n;i++){const a=((i+n-1)%n)*2,b=i*2,c=((i+1)%n)*2;if((p[b]-p[a])*(p[c+1]-p[b+1])-(p[b+1]-p[a+1])*(p[c]-p[b])!==0)o.push(p[b],p[b+1])}return o.length>=6?o:p}
function smooth(p){for(let it=0;it<3;it++){const n=p.length/2,o=[];for(let i=0;i<n;i++){const a=i*2,b=((i+1)%n)*2;o.push(p[a]*.75+p[b]*.25,p[a+1]*.75+p[b+1]*.25,p[a]*.25+p[b]*.75,p[a+1]*.25+p[b+1]*.75)}p=o}return p}
function toPath(loops){const p=new Path2D();for(const lp of loops){for(let i=0;i<lp.length;i+=2){const x=lp[i]/MC,y=lp[i+1]/MC;i?p.lineTo(x,y):p.moveTo(x,y)}p.closePath()}return p}
function rebuildLand(){if(IS_SRV)return;
 const L=loopsOf();TP=[null];for(let id=1;id<=5;id++)TP.push(L[id].length?toPath(L[id]):null);
 if(!SHC){SHC=mkc((WW+SHP*2)*4,(WH+SHP*2)*4);SMC=mkc((WW+SHP*2)/2|0,(WH+SHP*2)/2|0)}
 {const g=SHC.getContext('2d'),sm=SMC.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,SHC.width,SHC.height);g.setTransform(4,0,0,4,SHP*4,SHP*4);g.fillStyle='#0a1020';for(let id=1;id<=5;id++)if(TP[id])g.fill(TP[id],'evenodd');
  sm.clearRect(0,0,SMC.width,SMC.height);sm.drawImage(SHC,0,0,SMC.width,SMC.height);g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,SHC.width,SHC.height);g.imageSmoothingEnabled=true;g.drawImage(SMC,0,0,SHC.width,SHC.height)}
 if(PREV&&me&&state==='play'){let n=0;const Dm=new Uint8Array(own.length);for(let i=0;i<own.length;i++)if(own[i]===VS&&PREV[i]!==VS){Dm[i]=1;n++}
  if(n>20){const fl=loopsOf(Dm,1)[1];if(fl.length){FLASH={p:toPath(fl),t0:clk,x:me.rx,y:me.ry};RINGS.push({x:me.rx,y:me.ry,t0:clk,c:COLS[VS]})}}}
 PREV=own.slice();ZMY=ZN.map(z=>{let n=0;for(let k=0;k<z.c.length;k++)if(own[z.c[k]]===VS)n++;return z.c.length?n/z.c.length:0});
 if(!MINI)MINI=mkc(MW,MH);const g=MINI.getContext('2d'),img=g.createImageData(MW,MH),d=img.data,cl=COLS.map(c=>c?rgbOf(c):[214,221,232]);
 for(let i=0;i<own.length;i++){const c=own[i]?cl[own[i]]:(ISL[i]?[226,208,160]:[46,120,170]),k=i*4;d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=255}
 g.putImageData(img,0,0)}
function car(x,y,a,q,m,st,sc,al){drawCar(ctx,x,y,a,q,m,st,sc*CARK,al,0,LT)}

// ---------- one frame ----------
let LT={sh:.34,lx:.5,ly:.8,glow:1,gk:.7},CARL=[],FRM={x:0,y:0,w:0,h:0};
function drawSea(vx0,vy0,vw0,vh0){const hi=QL.hi;
 if(SEP&&SEP.setTransform){const s=16/256;SEP.setTransform(new DOMMatrix([s,0,0,s,(clk*.7)%16,(clk*.35)%16]));if(SEP2&&SEP2.setTransform){const s2=21/256;SEP2.setTransform(new DOMMatrix([s2,0,0,s2,-((clk*.5)%21),(clk*.6)%21]))}}
 ctx.fillStyle=SEP||'#1d78ad';ctx.fillRect(vx0,vy0,vw0,vh0);
 if(WTR){ctx.imageSmoothingEnabled=true;ctx.drawImage(WTR,-8,-8,WW+16,WH+16)}
 if(SEP2&&hi){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(.22,.14*MOOD.gk/.7);ctx.fillStyle=SEP2;ctx.fillRect(vx0,vy0,vw0,vh0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
 if(MOOD.sea[3]){ctx.fillStyle='rgba('+MOOD.sea[0]+','+MOOD.sea[1]+','+MOOD.sea[2]+','+MOOD.sea[3]+')';ctx.fillRect(vx0,vy0,vw0,vh0)}
 if(hi&&GLINT.length){ctx.globalCompositeOperation='lighter';for(const s of GLINT){if(s.x<vx0||s.x>vx0+vw0||s.y<vy0||s.y>vy0+vh0)continue;const a=Math.sin(clk*s.f+s.ph);if(a<.82)continue;const k=(a-.82)/.18;ctx.globalAlpha=k*.9;const r=s.s*(.6+k*.7);ctx.drawImage(LSPR.dot,s.x-r,s.y-r,r*2,r*2)}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}}
function drawIsland(vx0,vy0,vw0,vh0){if(!LANDP)return;const hi=QL.hi;ctx.lineJoin='round';
 const pulse=.5+.5*Math.sin(clk*1.3);
 ctx.strokeStyle='rgba(236,255,250,'+(.1+.05*pulse).toFixed(3)+')';ctx.lineWidth=3.4+.7*pulse;ctx.stroke(LANDP);
 ctx.strokeStyle='rgba(240,255,252,.2)';ctx.lineWidth=1.9+.4*Math.sin(clk*1.1+1);ctx.stroke(LANDP);
 ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.3;ctx.setLineDash([1.1,1.9]);ctx.lineDashOffset=-clk*1.1;ctx.stroke(LANDP);ctx.setLineDash([]);ctx.lineDashOffset=0;
 if(hi&&COAST.length){ctx.fillStyle='#fff';for(const c of COAST){if(c.x<vx0-2||c.x>vx0+vw0+2||c.y<vy0-2||c.y>vy0+vh0+2)continue;const ph=(clk*.3+c.ph)%1,d=ph*1.5+.2,a=(ph<.12?ph/.12:1-(ph-.12)/.88)*.7;ctx.globalAlpha=a;ctx.beginPath();ctx.arc(c.x+c.nx*d,c.y+c.ny*d,c.r*(1-ph*.4),0,7);ctx.fill()}ctx.globalAlpha=1}
 ctx.fillStyle=SDP||'#e6cf9a';ctx.fill(LANDP,'evenodd');
 ctx.save();ctx.clip(LANDP,'evenodd');for(const [lw,a] of [[4,.07],[2.6,.09],[1.4,.13]]){ctx.lineWidth=lw;ctx.strokeStyle='rgba(88,64,34,'+a+')';ctx.stroke(LANDP)}ctx.restore();
 ctx.strokeStyle='rgba(120,92,52,.22)';ctx.lineWidth=.5;ctx.stroke(LANDP);
 if(GRASSP){ctx.save();ctx.translate(0,.12);ctx.fillStyle='rgba(90,70,40,.18)';ctx.fill(GRASSP,'evenodd');ctx.restore();
  ctx.strokeStyle='rgba(138,160,78,.2)';ctx.lineWidth=2.4;ctx.stroke(GRASSP);ctx.strokeStyle='rgba(150,172,82,.26)';ctx.lineWidth=1.2;ctx.stroke(GRASSP);
  ctx.fillStyle=GRP||'#5f9a4e';ctx.fill(GRASSP,'evenodd');
  ctx.save();ctx.clip(GRASSP,'evenodd');ctx.strokeStyle='rgba(28,68,30,.15)';ctx.lineWidth=2.2;ctx.stroke(GRASSP);ctx.restore();
  ctx.strokeStyle='rgba(50,86,40,.45)';ctx.lineWidth=.22;ctx.stroke(GRASSP)}
 const lgr=ctx.createRadialGradient(MCX-6,MCY-14,3,MCX,MCY,WH*.8);lgr.addColorStop(0,'rgba(255,250,230,.14)');lgr.addColorStop(1,'rgba(20,40,80,.12)');ctx.fillStyle=lgr;ctx.fillRect(vx0,vy0,vw0,vh0)}
function drawTerritory(vx0,vy0,vw0,vh0){const hi=QL.hi;
 if(SHC){ctx.globalAlpha=.34;ctx.drawImage(SHC,-SHP,-SHP+.95,WW+SHP*2,WH+SHP*2);ctx.globalAlpha=1}
 for(let id=1;id<=5;id++)if(TP[id]){ctx.save();ctx.translate(0,.74);ctx.fillStyle=C_W2[id];ctx.fill(TP[id],'evenodd');ctx.translate(0,-.37);ctx.fillStyle=C_W1[id];ctx.fill(TP[id],'evenodd');ctx.restore()}
 for(let id=1;id<=5;id++)if(TP[id]){ctx.fillStyle=PP[id]||COLS[id];ctx.fill(TP[id],'evenodd')}
 const tl2=ctx.createLinearGradient(0,0,WW,WH*.7);tl2.addColorStop(0,'rgba(255,255,255,.2)');tl2.addColorStop(.55,'rgba(255,255,255,0)');tl2.addColorStop(1,'rgba(0,0,0,.09)');ctx.fillStyle=tl2;
 for(let id=1;id<=5;id++)if(TP[id])ctx.fill(TP[id],'evenodd');
 // a slow band of light that slides over every captured area
 let shim=null;if(hi){const ph=((clk*.11)%1.6)-.3,x0=ph*(WW+WH*.5)-WH*.25;shim=ctx.createLinearGradient(x0,0,x0+WH*.35,WH*.5);shim.addColorStop(0,'rgba(255,255,255,0)');shim.addColorStop(.5,'rgba(255,255,255,.13)');shim.addColorStop(1,'rgba(255,255,255,0)')}
 for(let id=1;id<=5;id++)if(TP[id]){ctx.save();ctx.clip(TP[id],'evenodd');ctx.lineWidth=.55;ctx.translate(.12,.16);ctx.strokeStyle='rgba(255,255,255,.45)';ctx.stroke(TP[id]);ctx.translate(-.24,-.32);ctx.strokeStyle='rgba(0,0,0,.17)';ctx.stroke(TP[id]);ctx.translate(.12,.16);
  if(hi){ctx.globalCompositeOperation='lighter';ctx.lineWidth=1.3;ctx.strokeStyle=C_UG[id].replace('.42','.16');ctx.stroke(TP[id]);ctx.lineWidth=.45;ctx.strokeStyle=C_UG[id].replace('.42','.3');ctx.stroke(TP[id]);ctx.fillStyle=shim;ctx.fillRect(vx0,vy0,vw0,vh0);ctx.globalCompositeOperation='source-over'}
  ctx.restore()}
 ctx.lineWidth=.06;ctx.strokeStyle='rgba(20,25,40,.3)';for(let id=1;id<=5;id++)if(TP[id])ctx.stroke(TP[id]);
 for(let id=1;id<=5;id++)if(TP[id]&&PRV[id]>0){ctx.save();ctx.clip(TP[id],'evenodd');ctx.globalAlpha=.6;ctx.fillStyle=HEXP||'rgba(94,225,255,.18)';ctx.fillRect(vx0,vy0,vw0,vh0);ctx.restore();ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(94,225,255,'+(.55+.3*Math.sin(clk*6)).toFixed(2)+')';ctx.lineWidth=.35;ctx.stroke(TP[id])}}
function drawSkids(vx0,vy0,vw0,vh0){if(!SKID||!QL.hi||FF)return;const sx=Math.max(0,vx0),sy=Math.max(0,vy0),ex=Math.min(WW,vx0+vw0),ey=Math.min(WH,vy0+vh0);if(ex<=sx||ey<=sy)return;
 if(clk-SKX>1.2){SKX=clk;const g=SKID.getContext('2d');g.globalCompositeOperation='destination-out';g.fillStyle='rgba(0,0,0,.06)';g.fillRect(0,0,SKID.width,SKID.height);g.globalCompositeOperation='source-over'}
 ctx.globalAlpha=.7;ctx.drawImage(SKID,sx*6,sy*6,(ex-sx)*6,(ey-sy)*6,sx,sy,ex-sx,ey-sy);ctx.globalAlpha=1}
function skidMark(p,an,hard){if(!SKID||!QL.hi||FF)return;const g=SKID.getContext('2d'),c=Math.cos(an),s=Math.sin(an),sk=p.sk||(p.sk=[0,0,0,0,0]);g.lineCap='round';g.lineWidth=1.25;g.strokeStyle='rgba(18,18,22,'+(hard?.5:.3)+')';
 for(let j=0;j<2;j++){const o=j?.52:-.52,wx=p.rx-c*1.0-s*o,wy=p.ry-s*1.0+c*o;if(sk[4]&&Math.hypot(wx-sk[j*2],wy-sk[j*2+1])<1.2){g.beginPath();g.moveTo(sk[j*2]*6,sk[j*2+1]*6);g.lineTo(wx*6,wy*6);g.stroke()}sk[j*2]=wx;sk[j*2+1]=wy}sk[4]=1}
function emberFx(p){if(FF||!QL.hi||Math.random()>.5*QL.fx)return;const t=p.tr,n=t.length/2;if(n<4)return;const k=Math.max(0,n-1-((Math.random()*Math.min(n-1,50))|0));FX.push({x:t[k*2]+(Math.random()-.5)*.5,y:t[k*2+1]+(Math.random()-.5)*.5,vx:(Math.random()-.5)*.8,vy:-.4-Math.random()*.9,l:.6+Math.random()*.6,l0:1.1,c:Math.random()<.5?'#ffb23a':'#ff7a22',k:4,s:.07+Math.random()*.06})}
function drawParticles(add){
 if(!add){for(const f of FX){const k=f.k||0;if(k===1||k===4)continue;const l0=f.l0||.8,u=Math.max(0,Math.min(1,f.l/l0));
   if(k===2){const r=(f.s||.4)*(1.4-u*.9)*2.4;ctx.globalAlpha=Math.min(.55,u*.8);ctx.drawImage(LSPR.smoke,f.x-r,f.y-r,r*2,r*2)}
   else if(k===3){ctx.globalAlpha=Math.min(1,u*2);ctx.fillStyle=f.c;ctx.save();ctx.translate(f.x,f.y);ctx.rotate((f.r||0)+(l0-f.l)*(f.vr||6));const s=(f.s||.18);ctx.fillRect(-s,-s*.6,s*2,s*1.2);ctx.restore()}
   else{ctx.globalAlpha=Math.max(0,Math.min(1,f.l*2));ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,(f.s||.12)+f.l*.14,0,7);ctx.fill()}}ctx.globalAlpha=1;return}
 ctx.globalCompositeOperation='lighter';
 for(const f of FX){const k=f.k||0;if(k!==1&&k!==4)continue;const l0=f.l0||.8,u=Math.max(0,Math.min(1,f.l/l0));
  if(k===1){ctx.globalAlpha=Math.min(1,u*1.6);ctx.strokeStyle=f.c;ctx.lineWidth=.1*(.4+u);ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x-f.vx*.045,f.y-f.vy*.045);ctx.stroke();const r=.22*u+.06;ctx.globalAlpha=Math.min(1,u*1.3)*.8;ctx.drawImage(LSPR.dot,f.x-r,f.y-r,r*2,r*2)}
  else{ctx.globalAlpha=Math.min(1,u*1.5);ctx.fillStyle=f.c;const r=(f.s||.09)*(.5+u);ctx.beginPath();ctx.arc(f.x,f.y,r,0,7);ctx.fill();ctx.globalAlpha*=.45;ctx.drawImage(LSPR.dot,f.x-r*3,f.y-r*3,r*6,r*6)}}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
function drawTrailsLayer(){const k=QL.glow?MOOD.gk:0;
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.ghost)continue;const a=1-(clk-p.ghost.t0)/.35;if(a<=0){p.ghost=null;continue}drawTrail(ctx,p.ghost.tr,q,'glow',0,clk,a)}
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.tr.length)continue;const st=(COS[q]||[])[1]||'glow';
  drawTrail(ctx,p.tr,q,st,k,clk,((p.fl||0)&2)?.45:1,p.alive?p.rx:undefined,p.alive?p.ry:undefined);if(st==='fire')emberFx(p)}}
function drawMinesStrikes(){
 for(const s of STV){const tt=Math.max(0,s[2]),k=1-tt/1.4,r=2.6;ctx.strokeStyle='rgba(255,59,94,'+(.5+.5*Math.sin(clk*20)).toFixed(2)+')';ctx.lineWidth=.18;ctx.beginPath();ctx.arc(s[0],s[1],r,0,7);ctx.stroke();
  ctx.fillStyle='rgba(255,59,94,.18)';ctx.beginPath();ctx.arc(s[0],s[1],r*k,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(s[0]-r-.5,s[1]);ctx.lineTo(s[0]+r+.5,s[1]);ctx.moveTo(s[0],s[1]-r-.5);ctx.lineTo(s[0],s[1]+r+.5);ctx.stroke()}
 for(const mn of MNV){const mc=COLS[mn[2]]||'#ffffff';ctx.fillStyle='rgba(10,15,25,.3)';ctx.beginPath();ctx.ellipse(mn[0]+.1,mn[1]+.3,.6,.3,0,0,7);ctx.fill();ctx.fillStyle=rg(ctx,mn[0]-.15,mn[1]-.15,.05,mn[0],mn[1],.55,[[0,'#3a4252'],[1,'#151a24']]);ctx.beginPath();ctx.arc(mn[0],mn[1],.55,0,7);ctx.fill();ctx.strokeStyle=mc;ctx.lineWidth=.14;ctx.stroke();
  for(let k=0;k<6;k++){const an=k/6*6.283;ctx.fillStyle='#3a4252';ctx.fillRect(mn[0]+Math.cos(an)*.55-.07,mn[1]+Math.sin(an)*.55-.07,.14,.14)}ctx.fillStyle=mn[3]?(Math.sin(clk*12)>0?'#ff3b4e':'#6b1520'):'#6b7080';ctx.beginPath();ctx.arc(mn[0],mn[1],.2,0,7);ctx.fill()}}
// every car: wrecks fade out, living cars get shadow, wheels, body; extras (shield, rings) are drawn here, lights and flames are queued for the glow pass
function drawCarsLayer(S){const labels=[];CARL.length=0;
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.wreck)continue;const age=clk-p.wreck.t0;if(age>.7||(p.alive&&age>.05)){p.wreck=null;continue}
  car(p.wreck.x,p.wreck.y,p.wreck.a+age*10,q,SKL[(COS[q]||[])[0]]?COS[q][0]:'sport',0,1-age*.5,1-age/.7)}
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.alive)continue;
  const x=p.rx,y=p.ry,an=p.ra,sk=SKL[(COS[q]||[])[0]]?COS[q][0]:'sport',fl=p.fl||0;
  const dtt=clk-(p.pt||0);let av=0;if(dtt>0&&dtt<.2){av=angd(p.pa===undefined?an:p.pa,an)/dtt;p.st=(p.st||0)+(Math.max(-.45,Math.min(.45,av*.09))-(p.st||0))*.35;
   if(Math.abs(av)>3.4&&!FF){if(Math.random()<.45*QL.fx)FX.push({x:x-Math.cos(an)*1.1,y:y-Math.sin(an)*1.1,vx:(Math.random()-.5)*.8,vy:(Math.random()-.5)*.8,l:.6,l0:.6,c:'rgba(205,210,220,.9)',s:.35,k:QL.hi?2:0});skidMark(p,an,1)}
   else if(fl&4&&!FF)skidMark(p,an,0);else if(p.sk)p.sk[4]=0}
  p.pa=an;p.pt=clk;
  const sc=p.born&&clk-p.born<.35?.45+.55*Math.sin((clk-p.born)/.35*1.5708):1;
  car(x,y,an,q,sk,p.st||0,sc,fl&2?.5:1);
  const nitro=HOLDV[q]&8,boosting=(q===VS&&boost&&en>0);
  CARL.push({x,y,a:an,q,m:sk,al:fl&2?.5:1,fl:boosting?1.15:(fl&4)?1.3:nitro?.55:0,blue:nitro&&!boosting&&!(fl&4)?1:0,dash:fl&4?1:0});
  if(HOLDV[q]&1){ctx.save();ctx.translate(x,y);ctx.rotate(an);ctx.fillStyle=rg(ctx,-.2,-.15,.03,-.1,0,.34,[[0,'#59606f'],[1,'#1c212c']]);ctx.beginPath();ctx.arc(-.1,0,.32,0,7);ctx.fill();ctx.fillStyle=lg(ctx,0,-.09,0,.09,[[0,'#6b7385'],[1,'#252b38']]);ctx.fillRect(-.1,-.09,1.15,.18);ctx.fillStyle='#ffb020';ctx.fillRect(.95,-.1,.12,.2);ctx.restore()}
  if(fl&2){ctx.strokeStyle='rgba(190,235,255,.9)';ctx.lineWidth=.1;ctx.setLineDash([.3,.22]);ctx.lineDashOffset=-clk*2;ctx.beginPath();ctx.arc(x,y,1.65,0,7);ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0}
  if(fl&1){ctx.strokeStyle='rgba(94,225,255,.95)';ctx.lineWidth=.07;for(let k=0;k<3;k++){const a2=Math.random()*6.283,r0=1.1+Math.random()*.4;ctx.beginPath();ctx.moveTo(x+Math.cos(a2)*r0,y+Math.sin(a2)*r0);ctx.lineTo(x+Math.cos(a2+.2)*(r0+.35),y+Math.sin(a2+.2)*(r0+.35));ctx.lineTo(x+Math.cos(a2+.05)*(r0+.6),y+Math.sin(a2+.05)*(r0+.6));ctx.stroke()}}
  if(p.shd){const r=2.1+Math.sin(fr/6)*.06;ctx.save();ctx.translate(x,y);ctx.rotate(clk*.6);ctx.globalAlpha=.9;ctx.drawImage(DEC.shield,-r,-r,r*2,r*2);ctx.restore();ctx.globalAlpha=1}
  if(p.sh>0&&((p.sh*8)|0)%2){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=.1;ctx.beginPath();ctx.arc(x,y,1.6,0,7);ctx.stroke()}
  if(q===VS&&en<.999){ctx.strokeStyle=boost&&en>0?'#ffb020':'rgba(47,107,255,.8)';ctx.lineWidth=.14;ctx.beginPath();ctx.arc(x,y,1.55,-1.571,-1.571+6.283*en);ctx.stroke()}
  labels.push([...S(x,y-2.1),NM[q]+(PRV[q]>0&&NM[q]?' \u{1F6E1}'+Math.ceil(PRV[q])+'s':''),q])}
 return labels}
// shells in flight
function drawShells(){for(const s of SHV){const L=Math.hypot(s[2],s[3])||1,ux=s[2]/L,uy=s[3]/L,g=ctx.createLinearGradient(s[0]-ux*1.8,s[1]-uy*1.8,s[0],s[1]);g.addColorStop(0,'rgba(255,150,40,0)');g.addColorStop(1,'rgba(255,205,100,.95)');
  ctx.strokeStyle=g;ctx.lineWidth=.34;ctx.beginPath();ctx.moveTo(s[0]-ux*1.8,s[1]-uy*1.8);ctx.lineTo(s[0],s[1]);ctx.stroke();ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.arc(s[0],s[1],.22,0,7);ctx.fill();
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.8;ctx.drawImage(LSPR.dot,s[0]-.9,s[1]-.9,1.8,1.8);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}}
function drawSky(vx0,vy0,vw0,vh0){
 if(QL.cloud){const sh=MOOD.sh;ctx.globalAlpha=.55+sh*.5;for(const cl of CLOUDS){const cx=((cl.x+clk*cl.v)%(WW+30))-15,cy=cl.y;if(cx<vx0-cl.s*2||cx>vx0+vw0+cl.s*2||cy<vy0-cl.s*2||cy>vy0+vh0+cl.s*2)continue;ctx.drawImage(DEC.cloud,cx-cl.s*1.4,cy-cl.s,cl.s*2.8,cl.s*1.9)}ctx.globalAlpha=1}
 if(fr%420===0&&BIRDS.length<4&&QL.decor>.5)BIRDS.push({x:vx0-2,y:vy0+Math.random()*vh0,vx:5+Math.random()*2,vy:(Math.random()-.5)*1.5,t0:clk,n:3+(Math.random()*3|0)});
 for(let i=BIRDS.length-1;i>=0;i--){const b=BIRDS[i],age=clk-b.t0,bx=b.x+b.vx*age,by=b.y+b.vy*age;if(bx>vx0+vw0+4||age>30){BIRDS.splice(i,1);continue}
  ctx.fillStyle='rgba(20,28,40,.18)';for(let k=0;k<b.n;k++){const px2=bx-k*.9+.8,py2=by+(k%2?.6:-.6)*Math.ceil(k/2)+1.6;ctx.beginPath();ctx.ellipse(px2,py2,.28,.1,0,0,7);ctx.fill()}
  ctx.strokeStyle='rgba(30,35,45,.9)';ctx.lineWidth=.11;for(let k=0;k<b.n;k++){const px2=bx-k*.9,py2=by+(k%2?.6:-.6)*Math.ceil(k/2),f2=Math.sin(clk*10+k)*.35;ctx.beginPath();ctx.moveTo(px2-.45,py2-f2);ctx.quadraticCurveTo(px2-.2,py2+.05,px2,py2);ctx.quadraticCurveTo(px2+.2,py2+.05,px2+.45,py2-f2);ctx.stroke()}}}
// the light of the day: a colour multiplied over the world, a warm glow from the sun's side, and a soft haze
function drawMood(vx0,vy0,vw0,vh0){const m=MOOD;
 if(m.tint){ctx.globalCompositeOperation='multiply';ctx.fillStyle='rgba('+m.tint[0]+','+m.tint[1]+','+m.tint[2]+','+m.tint[3]+')';ctx.fillRect(vx0,vy0,vw0,vh0);ctx.globalCompositeOperation='source-over'}
 const sx=CAM.x-vw/2/CAM.z*.8,sy=CAM.y-vh/2/CAM.z*.9,r=Math.max(vw,vh)/CAM.z*.9,g=ctx.createRadialGradient(sx,sy,0,sx,sy,r);g.addColorStop(0,'rgba('+m.sun[0]+','+m.sun[1]+','+m.sun[2]+','+m.sun[3]+')');g.addColorStop(1,'rgba('+m.sun[0]+','+m.sun[1]+','+m.sun[2]+',0)');
 ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(vx0,vy0,vw0,vh0);ctx.globalCompositeOperation='source-over'}
// things that give off light: lamps, flames, sparks. Drawn after the tint so they shine, most of all at dusk.
function drawGlow(){const hi=QL.hi,m=MOOD;
 for(const c of CARL){drawCarLights(ctx,c.x,c.y,c.a,c.m,{cone:hi?m.cone:0,hl:QL.glow?m.hl:.2},c.al);
  if(c.fl>0){drawFlames(ctx,c.x,c.y,c.a,c.m,c.fl,c.blue,clk);
   if(c.dash){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=.08;for(const o of [-.45,0,.45]){ctx.beginPath();ctx.moveTo(-1.45,o);ctx.lineTo(-3.1-Math.random()*.9,o);ctx.stroke()}ctx.restore()}}}
 if(hi){for(const z of ZN){if(z.x<CAM.x-vw/2/CAM.z-4||z.x>CAM.x+vw/2/CAM.z+4||z.y<CAM.y-vh/2/CAM.z-4||z.y>CAM.y+vh/2/CAM.z+4)continue;const o=z.own;ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(.18+.12*Math.sin(clk*3+z.x))*(m.gk>1?1.4:1);const r=ZR*2.2;ctx.drawImage(GLWSPR[o||0],z.x-r,z.y-r*.8,r*2,r*1.6);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}}
 drawParticles(true)}
function draw(){
 if(!TEXOK)buildTexAll();if(!CARSPR.sport1)buildCars();
 const w=vw,h=vh,z=CAM.z;ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#0a1226';ctx.fillRect(0,0,w,h);
 if(MDIRTY&&(clk-LASTRB>=.09||LASTRB<0)){rebuildLand();MDIRTY=false;LASTRB=clk}
 LT.sh=MOOD.sh;LT.lx=MOOD.lx;LT.ly=MOOD.ly;LT.glow=QL.glow;LT.gk=MOOD.gk;
 const sk=state==='menu'?0:shake,kx=sk>.3?(Math.random()-.5)*sk:0,ky=sk>.3?(Math.random()-.5)*sk:0,ox=w/2-CAM.x*z+kx,oy=h/2-CAM.y*z+ky,S=(x,y)=>[x*z+ox,y*z+oy];
 ctx.setTransform(dpr*z,0,0,dpr*z,dpr*ox,dpr*oy);
 const vx0=CAM.x-w/2/z-2,vy0=CAM.y-h/2/z-2,vw0=w/z+4,vh0=h/z+4;
 drawSea(vx0,vy0,vw0,vh0);
 drawIsland(vx0,vy0,vw0,vh0);
 const dn=QL.decor;
 decorList(FLWR,'flw',dn);decorList(TUFT,'tuft',dn);decorList(SHELL,'shell',dn);decorList(BUSH,'bush',dn);decorList(ROCKS,'rock',dn);
 drawTerritory(vx0,vy0,vw0,vh0);
 drawSkids(vx0,vy0,vw0,vh0);
 for(let i=SCORCH.length-1;i>=0;i--){const s=SCORCH[i],age=clk-s.t0;if(age>8){SCORCH.splice(i,1);continue}const a=(1-age/8)*.55,g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r);
  g.addColorStop(0,'rgba(30,22,15,'+a.toFixed(3)+')');g.addColorStop(.7,'rgba(45,35,25,'+(a*.6).toFixed(3)+')');g.addColorStop(1,'rgba(45,35,25,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill()}
 const zl=[];for(let zi=0;zi<ZN.length;zi++){const zz=ZN[zi];if(zz.x<vx0-5||zz.x>vx0+vw0+5||zz.y<vy0-5||zz.y>vy0+vh0+5)continue;zonePad(zz,ZOWN[zi]||0,ZMY[zi]||0);zl.push([...S(zz.x,zz.y+ZR+1.0),ZNAME[zz.t],ZOWN[zi]||0])}
 if(FLASH){const age=clk-FLASH.t0,a=1-age/.8;if(a<=0)FLASH=null;else{ctx.save();ctx.clip(FLASH.p,'evenodd');ctx.fillStyle='rgba(255,255,255,'+(a*.5).toFixed(3)+')';ctx.fillRect(vx0,vy0,vw0,vh0);
   const rr0=age*26;ctx.lineWidth=2.4*a+.2;ctx.strokeStyle='rgba(255,255,255,'+(a*.9).toFixed(3)+')';ctx.beginPath();ctx.arc(FLASH.x,FLASH.y,rr0,0,7);ctx.stroke();ctx.restore();
   ctx.lineWidth=.25+(1-a)*.9;ctx.strokeStyle='rgba(255,255,255,'+a.toFixed(3)+')';ctx.stroke(FLASH.p)}}
 for(let i=RINGS.length-1;i>=0;i--){const r=RINGS[i],age=clk-r.t0;if(age>.65){RINGS.splice(i,1);continue}const a=1-age/.65;ctx.strokeStyle='rgba(255,255,255,'+(a*.9).toFixed(3)+')';ctx.lineWidth=.35*a+.05;ctx.beginPath();ctx.arc(r.x,r.y,1+age*11,0,7);ctx.stroke();ctx.strokeStyle=r.c;ctx.globalAlpha=a*.6;ctx.lineWidth=.18;ctx.beginPath();ctx.arc(r.x,r.y,.6+age*8,0,7);ctx.stroke();ctx.globalAlpha=1}
 for(const pm of PALMS)if(pm.x>vx0-4&&pm.x<vx0+vw0+4&&pm.y>vy0-5&&pm.y<vy0+vh0+4)palm(pm);
 ctx.lineCap=ctx.lineJoin='round';
 drawTrailsLayer();
 drawMinesStrikes();
 const labels=drawCarsLayer(S);
 drawShells();
 drawParticles(false);
 drawSky(vx0,vy0,vw0,vh0);
 drawMood(vx0,vy0,vw0,vh0);
 drawGlow();
 ctx.setTransform(dpr,0,0,dpr,0,0);
 drawHUD(w,h,z,labels,zl,S)}
