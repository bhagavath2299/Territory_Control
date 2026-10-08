// ---------- the car models: built once as height-and-material pictures, lit later by the graphics chip (36_cargl.js) ----------
// Each car is a stack of shapes drawn from above (body, glass, roof, wings, lights...). Every shape gets a height, a rounded edge and a material; from that we get
// a normal, an ambient shadow and the material values per pixel. The shader then lights the same picture for any sun, sky and heading, so paint, glass and metal
// all react to the light like the real thing. Units are world units; the car points along +x, +y is its right-hand side.
const CG={W:384,H:232,GU:96,CX:192,CY:116,AW:512,AH:1024,HM:.6,CELL:256};
const CGMODELS=['sport','muscle','f1'];
const rdn=t=>t>=1?1:t<=0?0:Math.sqrt(1-(1-t)*(1-t));
const smt=t=>t>=1?1:t<=0?0:t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;
// a closed smooth curve through the points (Catmull-Rom turned into Beziers)
function closedSpline(g,p){const n=p.length;g.beginPath();g.moveTo(p[0][0],p[0][1]);
 for(let i=0;i<n;i++){const p0=p[(i+n-1)%n],p1=p[i],p2=p[(i+1)%n],p3=p[(i+2)%n];
  g.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,p2[0],p2[1])}
 g.closePath()}
// stations [x, half width] from the nose to the tail, mirrored into a closed outline
function symPts(st){const up=st.map(s=>[s[0],-s[1]]),lo=[];for(let i=st.length-1;i>=1;i--){if(st[i][1]>0)lo.push([st[i][0],st[i][1]])}return up.concat(lo)}
const symOutline=st=>g=>closedSpline(g,symPts(st));
// a polygon with straight sides, mirrored: [x, y] for the upper half from front to back
function symPoly(g,u){g.beginPath();u.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));for(let i=u.length-1;i>=0;i--)g.lineTo(u[i][0],-u[i][1]);g.closePath()}

function cgBuilder(){
 const W=CG.W,Hh=CG.H,N=W*Hh,GU=CG.GU,cx=CG.CX,cy=CG.CY;
 const B={H:new Float32Array(N),A:new Float32Array(N),R:new Float32Array(N),G:new Float32Array(N),Bl:new Float32Array(N),PM:new Float32Array(N),SP:new Float32Array(N),GL:new Float32Array(N),EM:new Float32Array(N)};
 const cv=mkc(W,Hh),g=cv.getContext('2d',{willReadFrequently:true});
 const mask=(draw,lw)=>{g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,Hh);g.setTransform(GU,0,0,GU,cx,cy);g.fillStyle=g.strokeStyle='#fff';g.lineJoin=g.lineCap='round';draw(g);if(lw){g.lineWidth=lw;g.stroke()}else g.fill();return g.getImageData(0,0,W,Hh).data};
 // add one shape. o.h(x,y,d,H) gives the new height (d: distance inside the edge, in units). o.m: {c:[r,g,b], pm: paint share, sp, gl, em}. o.cut removes the shape from the car.
 B.layer=(draw,o)=>{const m=mask(draw,o.lw);let dd=null;
  if(o.h&&o.h.length>=3){const f=new Uint8Array(N);for(let i=0;i<N;i++)f[i]=m[i*4+3]<128?1:0;dd=edt2(f,W,Hh)}
  const mt=o.m||{};
  for(let i=0;i<N;i++){const a=m[i*4+3]/255;if(a<=0)continue;
   const py=(i/W)|0,px=i-py*W,x=(px+.5-cx)/GU,y=(py+.5-cy)/GU;
   if(o.h){const d=dd?Math.max(0,Math.sqrt(dd[i])-.5)/GU:0;const nh=o.h(x,y,d,B.H[i]);B.H[i]+=(nh-B.H[i])*a}
   if(mt.c){B.R[i]+=(mt.c[0]-B.R[i])*a;B.G[i]+=(mt.c[1]-B.G[i])*a;B.Bl[i]+=(mt.c[2]-B.Bl[i])*a}
   if(mt.pm!==undefined)B.PM[i]+=(mt.pm-B.PM[i])*a;
   if(mt.sp!==undefined)B.SP[i]+=(mt.sp-B.SP[i])*a;
   if(mt.gl!==undefined)B.GL[i]+=(mt.gl-B.GL[i])*a;
   if(mt.em!==undefined)B.EM[i]+=(mt.em-B.EM[i])*a;
   if(o.cut)B.A[i]*=1-a;else if(a>B.A[i])B.A[i]=a}};
 // a thin line (panel gaps, grooves)
 B.line=(draw,w,o)=>B.layer(g2=>{g2.beginPath();draw(g2)},Object.assign({lw:w},o));
 // the finished arrays -> RGBA bytes for the four pictures
 B.finish=()=>{const t0=new Uint8Array(N*4),t1=new Uint8Array(N*4),t2=new Uint8Array(N*4);
  const Hs=new Float32Array(N),Hb=new Float32Array(N),H=B.H;
  // slight blur of the height so steps from the pixel grid do not show up in the lighting
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x;let s=0,c=0;for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=Hh)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=W)continue;const w=(dx&&dy)?1:(dx||dy)?2:4;s+=H[yy*W+xx]*w;c+=w}}Hs[i]=s/c}
  // wider blur for the cavity (ambient shadow)
  const R=9,tmp=new Float32Array(N);
  for(let y=0;y<Hh;y++){let s=0;for(let x=-R;x<=R;x++)s+=Hs[y*W+Math.min(W-1,Math.max(0,x))];for(let x=0;x<W;x++){tmp[y*W+x]=s/(2*R+1);s+=Hs[y*W+Math.min(W-1,x+R+1)]-Hs[y*W+Math.max(0,x-R)]}}
  for(let x=0;x<W;x++){let s=0;for(let y=-R;y<=R;y++)s+=tmp[Math.min(Hh-1,Math.max(0,y))*W+x];for(let y=0;y<Hh;y++){Hb[y*W+x]=s/(2*R+1);s+=tmp[Math.min(Hh-1,y+R+1)*W+x]-tmp[Math.max(0,y-R)*W+x]}}
  const f=new Uint8Array(N);for(let i=0;i<N;i++)f[i]=B.A[i]<.5?1:0;const de=edt2(f,W,Hh);
  const q=v=>v<0?0:v>1?1:v;
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x,k=i*4;
   const xm=x>0?x-1:x,xp=x<W-1?x+1:x,ym=y>0?y-1:y,yp=y<Hh-1?y+1:y;
   const gx=(Hs[y*W+xp]-Hs[y*W+xm])*GU/(xp-xm||1),gy=(Hs[yp*W+x]-Hs[ym*W+x])*GU/(yp-ym||1);
   const il=1/Math.sqrt(gx*gx+gy*gy+1),nx=-gx*il,ny=-gy*il;
   const cav=q((Hb[i]-Hs[i])*5.5),edge=smt(Math.max(0,Math.sqrt(de[i])-.5)/GU/.11);
   const ao=q((1-cav*.85)*(.62+.38*(B.A[i]>.5?edge:1)));
   t0[k]=Math.round((nx*.5+.5)*255);t0[k+1]=Math.round((ny*.5+.5)*255);t0[k+2]=Math.round(q(H[i]/CG.HM)*255);t0[k+3]=Math.round(q(B.A[i])*255);
   t1[k]=Math.round(q(B.R[i])*255);t1[k+1]=Math.round(q(B.G[i])*255);t1[k+2]=Math.round(q(B.Bl[i])*255);t1[k+3]=Math.round(q(B.PM[i])*255);
   t2[k]=Math.round(q(B.SP[i])*255);t2[k+1]=Math.round(q(B.GL[i])*255);t2[k+2]=Math.round(q(B.EM[i])*255);t2[k+3]=Math.round(ao*255)}
  return[t0,t1,t2]};
 return B}

// ---------- shared material values ----------
const MT={
 paint:{c:[1,1,1],pm:1,sp:.30,gl:.93,em:0},
 paint2:{c:[.82,.82,.82],pm:1,sp:.30,gl:.9,em:0},
 glass:{c:[.035,.06,.10],pm:0,sp:.42,gl:.98,em:0},
 trim:{c:[.045,.045,.055],pm:0,sp:.16,gl:.45,em:0},
 carbon:{c:[.06,.06,.07],pm:0,sp:.22,gl:.82,em:0},
 chrome:{c:[.86,.88,.92],pm:0,sp:.95,gl:.97,em:0},
 steel:{c:[.55,.58,.64],pm:0,sp:.80,gl:.80,em:0},
 white:{c:[.96,.96,.97],pm:0,sp:.30,gl:.88,em:0},
 black:{c:[.02,.02,.025],pm:0,sp:.12,gl:.5,em:0},
 rubber:{c:[.055,.055,.065],pm:0,sp:.08,gl:.28,em:0},
 lamp:{c:[.95,.98,1],pm:0,sp:.5,gl:.95,em:1},
 lampR:{c:[1,.12,.14],pm:0,sp:.5,gl:.9,em:1},
 lampA:{c:[1,.62,.15],pm:0,sp:.5,gl:.9,em:.8}};

// ---------- the three cars ----------
// each builder returns the sizes the renderer needs: wheel centres and sizes, where the lights sit
const CGDEF={};
const CG_GL={c:[1,1,1],pm:0,sp:.3,gl:.9,em:0};
// small helpers shared by the models
const dec=(L,path,mat)=>L.layer(path,{m:mat});                                   // paint on top: no height change
const rim=(x,y,d,H,r,t)=>H+t*rdn(d/r);                                           // a raised panel with a rounded edge
const crown=(y,yw)=>1-Math.min(1,(y/yw)*(y/yw));
const rect=(x0,y0,x1,y1,r)=>g=>{g.beginPath();g.roundRect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0),r||0)};
const poly=pts=>g=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()};
const circ=(x,y,r)=>g=>{g.beginPath();g.arc(x,y,r,0,7)};
const ell=(x,y,rx,ry,a)=>g=>{g.beginPath();g.ellipse(x,y,rx,ry,a||0,0,7)};
const mir=(f,pts)=>[1,-1].map(s=>pts.map(p=>[p[0],p[1]*s]));                      // both sides of a point list
const GAP={c:[.09,.09,.10],pm:.35,sp:.2,gl:.5};

CGDEF.sport=function(L){
 const body=[[1.46,0],[1.43,.13],[1.36,.28],[1.22,.43],[1.05,.57],[.88,.65],[.60,.67],[.20,.66],[-.20,.65],[-.55,.68],[-.90,.72],[-1.20,.68],[-1.38,.56],[-1.46,.38],[-1.47,0]];
 const bp=symOutline(body);
 L.layer(bp,{h:(x,y,d)=>.19*rdn(d/.23)+.05*crown(y,.72)+.035*crown(x,1.5),m:MT.paint});
 // hood with a crease, front intake
 const hood=symOutline([[1.40,0],[1.35,.18],[1.20,.36],[1.00,.50],[.74,.55],[.64,0]]);
 L.layer(hood,{h:(x,y,d,H)=>rim(x,y,d,H,.05,.018),m:{}});
 L.line(hood,.012,{h:(x,y,d,H)=>H-.012,m:GAP});
 // racing stripes go down first, glass and roof cover them
 for(const s of [-1,1])dec(L,rect(-1.42,s*.12-.05,1.43,s*.12+.05),MT.white);
 // glasshouse
 const house=symOutline([[.66,0],[.64,.24],[.52,.38],[.24,.44],[-.20,.44],[-.50,.41],[-.70,.32],[-.74,0]]);
 L.layer(house,{h:(x,y,d,H)=>lerp(H,.33,rdn(d/.10))+.035*crown(y,.46),m:MT.paint2});
 const ws=g=>{g.beginPath();g.moveTo(.62,-.33);g.quadraticCurveTo(.66,0,.62,.33);g.lineTo(.30,.40);g.quadraticCurveTo(.27,0,.30,-.40);g.closePath()};
 L.layer(ws,{h:(x,y,d,H)=>H-.045+(.62-x)*.18,m:MT.glass});
 dec(L,rect(.34,-.30,.58,.30,.04),{c:[.10,.11,.14],pm:0,sp:.3,gl:.8});          // dashboard seen through the screen
 const rw=g=>{g.beginPath();g.moveTo(-.28,-.37);g.lineTo(-.56,-.29);g.quadraticCurveTo(-.60,0,-.56,.29);g.lineTo(-.28,.37);g.quadraticCurveTo(-.25,0,-.28,-.37);g.closePath()};
 L.layer(rw,{h:(x,y,d,H)=>H-.04-(x+.28)*.16,m:MT.glass});
 L.layer(rect(-.26,-.38,.28,.38,.07),{h:(x,y,d,H)=>H+.02*rdn(d/.04)+.02*crown(y,.4),m:MT.paint});
 for(const s of [-1,1])dec(L,rect(-.26,s*.12-.05,.28,s*.12+.05),MT.white);
 L.line(rect(-.26,-.38,.28,.38,.07),.011,{h:(x,y,d,H)=>H-.008,m:GAP});
 // engine cover with louvres
 const eng=symOutline([[-.60,0],[-.62,.34],[-.80,.43],[-1.1,.47],[-1.30,.42],[-1.33,0]]);
 L.layer(eng,{h:(x,y,d,H)=>rim(x,y,d,H,.05,.03),m:MT.carbon});
 for(const s of [-1,1])dec(L,rect(-1.30,s*.12-.04,-.62,s*.12+.04),MT.white);
 for(let k=0;k<7;k++){const x=-.72-k*.088;L.line(g=>{g.moveTo(x,-.38+k*.012);g.lineTo(x-.035,0);g.lineTo(x,.38-k*.012)},.028,{h:(x2,y,d,H)=>H-.03,m:MT.black})}
 // hood vents
 for(const s of [-1,1]){L.layer(poly([[.62,s*.20],[.84,s*.27],[.84,s*.36],[.62,s*.30]]),{h:(x,y,d,H)=>H-.03,m:MT.black});for(let k=0;k<3;k++)L.line(g=>{g.moveTo(.66+k*.06,s*(.23+k*.012));g.lineTo(.66+k*.06,s*(.31+k*.012))},.012,{m:MT.carbon})}
 // side intakes
 for(const s of [-1,1])L.layer(g=>{g.beginPath();g.moveTo(-.10,s*.60);g.quadraticCurveTo(-.30,s*.59,-.52,s*.66);g.lineTo(-.52,s*.72);g.lineTo(-.10,s*.71);g.closePath()},{h:(x,y,d,H)=>H-.05,m:MT.black});
 // nose: splitter and intakes
 L.layer(g=>{g.beginPath();g.moveTo(1.47,-.12);g.quadraticCurveTo(1.46,-.30,1.30,-.44);g.lineTo(1.25,-.36);g.quadraticCurveTo(1.40,-.24,1.40,0);g.quadraticCurveTo(1.40,.24,1.25,.36);g.lineTo(1.30,.44);g.quadraticCurveTo(1.46,.30,1.47,.12);g.closePath()},{h:(x,y,d,H)=>H*.55,m:MT.black});
 for(const s of [-1,1])L.layer(poly([[1.34,s*.10],[1.18,s*.20],[1.18,s*.34],[1.34,s*.26]]),{h:(x,y,d,H)=>H-.03,m:MT.black});
 // headlights: black housing, a bright LED blade
 for(const s of [-1,1]){L.layer(poly([[1.22,s*.42],[.94,s*.61],[.90,s*.52],[1.12,s*.35]]),{h:(x,y,d,H)=>H-.01,m:MT.black});
  L.layer(poly([[1.18,s*.42],[.97,s*.57],[.95,s*.53],[1.14,s*.385]]),{h:(x,y,d,H)=>H+.005,m:MT.lamp})}
 // tail: LED bar, corner lights, exhausts
 L.layer(rect(-1.47,-.46,-1.39,.46,.03),{h:(x,y,d,H)=>H-.01,m:MT.lampR});
 for(const s of [-1,1]){dec(L,circ(-1.42,s*.24,.058),MT.steel);dec(L,circ(-1.425,s*.24,.038),MT.black)}
 // rear wing: stands, carbon blade, end plates
 for(const s of [-1,1])L.layer(rect(-1.30,s*.26-.03,-1.14,s*.26+.03,.02),{h:(x,y,d,H)=>H+.08,m:MT.black});
 L.layer(rect(-1.52,-.68,-1.22,.68,.05),{h:(x,y,d,H)=>lerp(H,.41,.9)+.02*rdn(d/.03),m:MT.carbon});
 L.line(g=>{g.moveTo(-1.36,-.66);g.lineTo(-1.36,.66)},.02,{m:MT.white});
 for(const s of [-1,1])L.layer(rect(-1.54,s*.68-.03,-1.20,s*.68+.03,.02),{h:(x,y,d,H)=>H+.05,m:MT.paint});
 // mirrors on short stalks
 for(const s of [-1,1]){L.layer(rect(.30,s*.62-.012,.38,s*.74+.012,.01),{h:(x,y,d,H)=>.23,m:MT.black});L.layer(ell(.35,s*.76,.095,.052,s*.3),{h:(x,y,d)=>.22+.07*rdn(d/.05),m:MT.paint})}
 // door lines
 for(const s of [-1,1])L.line(g=>{g.moveTo(.26,s*.47);g.quadraticCurveTo(.0,s*.63,-.32,s*.54)},.011,{h:(x,y,d,H)=>H-.01,m:GAP});
 return{wf:{x:.88,y:.64,l:.54,w:.27},wr:{x:-.88,y:.65,l:.60,w:.32},hl:[1.05,.46],tl:[-1.44,.30]}};

CGDEF.muscle=function(L){
 const body=[[1.50,0],[1.49,.28],[1.45,.50],[1.35,.66],[1.18,.74],[.95,.77],[.60,.77],[.20,.76],[-.30,.77],[-.80,.79],[-1.15,.79],[-1.38,.75],[-1.47,.63],[-1.50,.40],[-1.50,0]];
 const bp=symOutline(body);
 L.layer(bp,{h:(x,y,d)=>.19*rdn(d/.20)+.045*crown(y,.8)+.03*crown(x,1.55),m:MT.paint});
 // fenders stand a little proud of the hood
 for(const s of [-1,1]){const fen=g=>{g.beginPath();g.moveTo(1.40,s*.52);g.quadraticCurveTo(1.30,s*.76,1.0,s*.77);g.lineTo(.5,s*.77);g.lineTo(.5,s*.55);g.quadraticCurveTo(1.0,s*.54,1.40,s*.52);g.closePath()};
  L.layer(fen,{h:(x,y,d,H)=>rim(x,y,d,H,.06,.02),m:{}});L.line(fen,.012,{h:(x,y,d,H)=>H-.01,m:GAP})}
 // stripes
 for(const s of [-1,1]){dec(L,rect(-1.50,s*.21-.08,1.50,s*.21+.08),MT.white);dec(L,rect(-1.50,s*.21-.095,1.50,s*.21-.08),{c:[.03,.03,.04],pm:0,sp:.2,gl:.6});dec(L,rect(-1.50,s*.21+.08,1.50,s*.21+.095),{c:[.03,.03,.04],pm:0,sp:.2,gl:.6})}
 // hood with a scoop
 L.layer(rect(.22,-.56,1.40,.56,.10),{h:(x,y,d,H)=>rim(x,y,d,H,.05,.02),m:{}});
 L.line(rect(.22,-.56,1.40,.56,.10),.012,{h:(x,y,d,H)=>H-.01,m:GAP});
 L.layer(rect(.58,-.27,1.14,.27,.08),{h:(x,y,d,H)=>rim(x,y,d,H,.07,.06),m:MT.paint});
 L.layer(rect(.98,-.22,1.10,.22,.03),{h:(x,y,d,H)=>H-.07,m:MT.black});
 for(let k=-3;k<=3;k++)L.line(g=>{g.moveTo(1.0,k*.06);g.lineTo(1.09,k*.06)},.012,{m:MT.steel});
 for(const s of [-1,1]){dec(L,circ(.36,s*.46,.018),MT.chrome);dec(L,circ(1.26,s*.46,.018),MT.chrome)}
 // glasshouse: short and set back
 const house=symOutline([[.24,0],[.22,.40],[.10,.57],[-.10,.61],[-.70,.59],[-.95,.51],[-1.02,.38],[-1.04,0]]);
 L.layer(house,{h:(x,y,d,H)=>lerp(H,.34,rdn(d/.11))+.03*crown(y,.6),m:MT.paint2});
 const ws=g=>{g.beginPath();g.moveTo(.20,-.50);g.quadraticCurveTo(.25,0,.20,.50);g.lineTo(-.08,.55);g.quadraticCurveTo(-.12,0,-.08,-.55);g.closePath()};
 L.layer(ws,{h:(x,y,d,H)=>H-.04+(.20-x)*.15,m:MT.glass});
 dec(L,rect(.04,-.45,.18,.45,.03),{c:[.10,.11,.14],pm:0,sp:.3,gl:.8});
 const rw=g=>{g.beginPath();g.moveTo(-.74,-.46);g.lineTo(-.97,-.37);g.quadraticCurveTo(-1.01,0,-.97,.37);g.lineTo(-.74,.46);g.quadraticCurveTo(-.70,0,-.74,-.46);g.closePath()};
 L.layer(rw,{h:(x,y,d,H)=>H-.04-(x+.74)*.15,m:MT.glass});
 L.layer(rect(-.70,-.55,-.04,.55,.08),{h:(x,y,d,H)=>H+.02*rdn(d/.04)+.02*crown(y,.55),m:MT.paint});
 for(const s of [-1,1])dec(L,rect(-.70,s*.21-.08,-.04,s*.21+.08),MT.white);
 L.line(rect(-.70,-.55,-.04,.55,.08),.011,{h:(x,y,d,H)=>H-.008,m:GAP});
 // trunk with a ducktail spoiler
 L.layer(rect(-1.44,-.62,-1.06,.62,.07),{h:(x,y,d,H)=>rim(x,y,d,H,.04,.015),m:{}});
 L.line(rect(-1.44,-.62,-1.06,.62,.07),.012,{h:(x,y,d,H)=>H-.01,m:GAP});
 L.layer(rect(-1.54,-.70,-1.28,.70,.05),{h:(x,y,d,H)=>lerp(H,.34,.85)+.02*rdn(d/.03),m:MT.paint});
 dec(L,rect(-1.54,-.70,-1.50,.70),MT.black);
 for(const s of [-1,1])L.layer(rect(-1.55,s*.72-.035,-1.26,s*.72+.035,.02),{h:(x,y,d,H)=>H+.05,m:MT.black});
 // front: grille, round lamps with chrome rings
 L.layer(rect(1.43,-.40,1.50,.40,.03),{h:(x,y,d,H)=>H-.03,m:MT.black});
 L.line(g=>{g.moveTo(1.445,-.42);g.lineTo(1.445,.42)},.02,{m:MT.chrome});
 for(const s of [-1,1])for(const o of [.60,.40]){dec(L,circ(1.37,s*o,.082),MT.chrome);L.layer(circ(1.37,s*o,.062),{h:(x,y,d,H)=>H-.012,m:MT.lamp})}
 // tail lamps and pipes
 for(const s of [-1,1])for(let k=0;k<3;k++)L.layer(rect(-1.505,s*(.12+k*.155)-(s>0?0:.14),-1.435,s*(.12+k*.155)+(s>0?.14:0),.02),{h:(x,y,d,H)=>H-.008,m:MT.lampR});
 for(const s of [-1,1]){dec(L,circ(-1.52,s*.46,.07),MT.chrome);dec(L,circ(-1.525,s*.46,.048),MT.black)}
 // mirrors
 for(const s of [-1,1]){L.layer(rect(.12,s*.68-.012,.20,s*.80+.012,.01),{h:(x,y,d,H)=>.24,m:MT.black});L.layer(ell(.17,s*.82,.09,.055,s*.3),{h:(x,y,d)=>.24+.07*rdn(d/.05),m:MT.paint})}
 for(const s of [-1,1])L.line(g=>{g.moveTo(.16,s*.55);g.quadraticCurveTo(-.2,s*.70,-.74,s*.60)},.011,{h:(x,y,d,H)=>H-.01,m:GAP});
 return{wf:{x:.94,y:.70,l:.62,w:.32},wr:{x:-.92,y:.72,l:.66,w:.38},hl:[1.30,.5],tl:[-1.5,.4]}};

CGDEF.f1=function(L){
 const carbon=MT.carbon;
 // floor and diffuser: the dark plate under everything
 L.layer(symOutline([[1.0,0],[.96,.38],[.55,.50],[-.30,.52],[-.95,.48],[-1.20,.40],[-1.25,.22],[-1.25,0]]),{h:(x,y,d)=>.05*rdn(d/.06),m:MT.black});
 // front wing: main plane, flaps in team colour, end plates
 L.layer(rect(1.30,-.88,1.52,.88,.04),{h:(x,y,d)=>.05+.03*rdn(d/.03),m:carbon});
 L.layer(rect(1.40,-.84,1.50,.84,.03),{h:(x,y,d,H)=>H+.025,m:MT.paint});
 L.layer(rect(1.32,-.82,1.38,.82,.02),{h:(x,y,d,H)=>H+.01,m:MT.white});
 for(const s of [-1,1])L.layer(rect(1.28,s*.88-.035,1.54,s*.88+.035,.02),{h:(x,y,d)=>.13+.02*rdn(d/.03),m:MT.paint});
 // suspension arms
 for(const s of [-1,1]){for(const [x0,x1,xw,yw] of [[.74,.60,.98,.66],[.74,.86,.98,.66],[-.70,-.56,-.96,.68],[-.70,-.86,-.96,.68]])L.line(g=>{g.moveTo(x0,s*.14);g.lineTo(xw,s*yw)},.032,{h:()=>.075,m:carbon})}
 // nose and tub
 const tub=symOutline([[1.34,0],[1.28,.07],[1.05,.11],[.80,.13],[.56,.20],[.42,.30],[.20,.34],[-.20,.35],[-.55,.32],[-.82,.23],[-1.08,.15],[-1.25,.10],[-1.28,0]]);
 L.layer(tub,{h:(x,y,d)=>.16*rdn(d/.14)+.04*crown(y,.36),m:MT.paint});
 // sidepods with a dark intake at the front
 for(const s of [-1,1]){const sp=g=>{g.beginPath();g.moveTo(.46,s*.20);g.quadraticCurveTo(.50,s*.44,.30,s*.47);g.lineTo(-.20,s*.46);g.quadraticCurveTo(-.58,s*.42,-.80,s*.24);g.lineTo(-.50,s*.20);g.closePath()};
  L.layer(sp,{h:(x,y,d,H)=>Math.max(H,lerp(H,.19,rdn(d/.12))+.03*crown(y-s*.33,.14)),m:MT.paint});
  L.layer(g=>{g.beginPath();g.moveTo(.47,s*.26);g.quadraticCurveTo(.50,s*.42,.36,s*.45);g.lineTo(.34,s*.30);g.closePath()},{h:(x,y,d,H)=>H-.06,m:MT.black});
  for(let k=0;k<4;k++)L.line(g=>{g.moveTo(-.30-k*.09,s*(.22+k*.01));g.lineTo(-.34-k*.09,s*(.38-k*.02))},.018,{h:(x,y,d,H)=>H-.025,m:MT.black})}
 // white centre stripe and the engine cover
 dec(L,rect(-1.26,-.05,1.33,.05),MT.white);
 L.layer(symOutline([[-.46,0],[-.48,.10],[-.75,.12],[-1.20,.07],[-1.27,0]]),{h:(x,y,d,H)=>rim(x,y,d,H,.04,.05),m:MT.paint});
 dec(L,rect(-1.26,-.045,-.48,.045),MT.white);
 // cockpit: opening, seat, helmet, halo
 L.layer(ell(.12,0,.27,.15),{h:(x,y,d,H)=>H-.07,m:MT.black});
 L.layer(rect(-.14,-.19,.03,.19,.04),{h:(x,y,d,H)=>H+.02,m:{c:[.09,.09,.11],pm:0,sp:.15,gl:.5}});
 L.layer(circ(.08,0,.105),{h:(x,y,d)=>.10+.10*rdn(d/.10),m:{c:[.97,.97,.98],pm:0,sp:.35,gl:.9}});
 dec(L,rect(.0,-.012,.19,.012),{c:[.9,.15,.15],pm:0,sp:.3,gl:.9});
 L.layer(g=>{g.beginPath();g.ellipse(.17,0,.045,.07,0,-1.3,1.3)},{h:(x,y,d,H)=>H+.01,m:{c:[.05,.09,.16],pm:0,sp:.9,gl:.98}});
 L.line(g=>{g.moveTo(-.12,-.17);g.quadraticCurveTo(.36,-.22,.36,0);g.quadraticCurveTo(.36,.22,-.12,.17)},.032,{h:()=>.26,m:{c:[.10,.10,.12],pm:0,sp:.8,gl:.7}});
 L.line(g=>{g.moveTo(.36,0);g.lineTo(.54,0)},.03,{h:()=>.26,m:{c:[.10,.10,.12],pm:0,sp:.8,gl:.7}});
 // airbox
 L.layer(ell(-.24,0,.15,.10),{h:(x,y,d)=>.21+.04*rdn(d/.07),m:MT.paint});L.layer(ell(-.19,0,.07,.065),{h:(x,y,d,H)=>H-.05,m:MT.black});
 // rear wing: beam wing, main plane, end plates, rain light
 L.layer(rect(-1.50,-.66,-1.26,.66,.04),{h:(x,y,d)=>.14+.03*rdn(d/.03),m:carbon});
 L.layer(rect(-1.48,-.64,-1.36,.64,.03),{h:(x,y,d,H)=>H+.03,m:MT.paint});
 L.layer(rect(-1.34,-.60,-1.28,.60,.02),{h:(x,y,d,H)=>H+.05,m:carbon});
 for(const s of [-1,1])L.layer(rect(-1.52,s*.66-.035,-1.22,s*.66+.035,.02),{h:(x,y,d)=>.22+.02*rdn(d/.03),m:MT.paint});
 L.layer(rect(-1.30,-.07,-1.22,.07,.02),{h:(x,y,d,H)=>H+.02,m:MT.lampR});
 // mirrors
 for(const s of [-1,1])L.layer(rect(.22,s*.36-.045,.34,s*.36+.045,.03),{h:(x,y,d)=>.19+.04*rdn(d/.04),m:MT.paint});
 return{wf:{x:.98,y:.74,l:.60,w:.34},wr:{x:-.96,y:.76,l:.68,w:.42},hl:[1.3,.1],tl:[-1.3,0]}};

// wheels: tyre pictures (front and rear sizes); tread and spin are added by the shader
function cgWheel(l,w){const W=96,Hh=64,N=W*Hh,B={H:new Float32Array(N),A:new Float32Array(N)};
 const cv=mkc(W,Hh),g=cv.getContext('2d',{willReadFrequently:true}),GU=CG.GU;
 g.setTransform(GU,0,0,GU,W/2,Hh/2);g.fillStyle='#fff';g.beginPath();g.roundRect(-l/2,-w/2,l,w,Math.min(l,w)*.22);g.fill();
 const m=g.getImageData(0,0,W,Hh).data,f=new Uint8Array(N);for(let i=0;i<N;i++)f[i]=m[i*4+3]<128?1:0;const dd=edt2(f,W,Hh);
 const t0=new Uint8Array(N*4),t1=new Uint8Array(N*4),t2=new Uint8Array(N*4),Hh2=new Float32Array(N);
 for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x,a=m[i*4+3]/255,xu=(x+.5-W/2)/GU,d=Math.max(0,Math.sqrt(dd[i])-.5)/GU;
  const cyl=Math.sqrt(Math.max(0,1-(2*xu/l)**2))*l*.5*.9,sh=rdn(d/(w*.28));Hh2[i]=a>0?(cyl*.7+.03)*(.35+.65*sh):0}
 for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x,k=i*4,a=m[i*4+3]/255,xm=x>0?x-1:x,xp=x<W-1?x+1:x,ym=y>0?y-1:y,yp=y<Hh-1?y+1:y;
  const gx=(Hh2[y*W+xp]-Hh2[y*W+xm])*GU/(xp-xm||1),gy=(Hh2[yp*W+x]-Hh2[ym*W+x])*GU/(yp-ym||1),il=1/Math.sqrt(gx*gx+gy*gy+1);
  t0[k]=Math.round((-gx*il*.5+.5)*255);t0[k+1]=Math.round((-gy*il*.5+.5)*255);t0[k+2]=Math.round(Math.min(1,Hh2[i]/CG.HM)*255);t0[k+3]=Math.round(a*255);
  t1[k]=t1[k+1]=14;t1[k+2]=17;t1[k+3]=0;
  t2[k]=Math.round(.08*255);t2[k+1]=Math.round(.28*255);t2[k+2]=0;t2[k+3]=255}
 return[t0,t1,t2,W,Hh]}

// ---------- the picture atlas: three models stacked, each with a body and its two wheel sizes ----------
let CGATLAS=null;
function cgBuildAll(){if(CGATLAS)return CGATLAS;
 const AW=CG.AW,AH=CG.AH,at=[new Uint8Array(AW*AH*4),new Uint8Array(AW*AH*4),new Uint8Array(AW*AH*4)],info={};
 const put=(src,sw,sh,dx,dy)=>{for(let t=0;t<3;t++){const s=src[t],d=at[t];for(let y=0;y<sh;y++)d.set(s.subarray(y*sw*4,(y+1)*sw*4),((dy+y)*AW+dx)*4)}};
 CGMODELS.forEach((nm,mi)=>{const def=CGDEF[nm];if(!def)return;const L=cgBuilder(),spec=def(L),y0=mi*CG.CELL;
  put(L.finish(),CG.W,CG.H,0,y0);
  const wf=cgWheel(spec.wf.l,spec.wf.w),wr=cgWheel(spec.wr.l,spec.wr.w);
  put([wf[0],wf[1],wf[2]],96,64,392,y0);put([wr[0],wr[1],wr[2]],96,64,392,y0+80);
  info[nm]={spec,y0,idx:mi}});
 CGATLAS={tex:at,info,AW,AH};return CGATLAS}
