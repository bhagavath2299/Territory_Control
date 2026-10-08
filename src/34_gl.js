// ---------- the ground: snow, ice, sea, captured land and the power pads are drawn by the graphics chip ----------
// The whole floor is one shader. It works out the surface of every screen pixel from a few small repeating detail maps, so grain, cracks and ripples stay
// sharp at any zoom and cost almost nothing. The map itself (coast, who owns what) is fed in as small pictures; a blur pass turns the owned cells into a
// smooth field so captured land gets round, clean edges. Cars, trails and the HUD sit on top (35_cargl.js, 30_render.js, 33_hud.js).
const GLS={ok:0,gl:null,cv:null,P:null,PB:null,U:{},UB:{},T:{},F:{},w:1,h:1,s:1,noise:null,land:null,oa:null,ob:null,fr:null,seedOff:[0,0],tier:1,lost:0,err:'',cols:null,
 rg:new Float32Array(16),rc:new Float32Array(12),zn:new Float32Array(32),zm:new Float32Array(8),freshEnd:0};
const ZTI={cannon:0,fort:1,strike:2,nitro:3};
const GL_VS='#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}';
// blur of the owned cells: pass 0 reads the raw cells, pass 1 blurs the result downwards. out0: players 1-4, out1: player 5, flash of fresh captures, all owned land
const GL_BL=`#version 300 es
precision highp float;
precision highp sampler2D;
layout(location=0) out vec4 o0;
layout(location=1) out vec4 o1;
uniform sampler2D tA,tB;
uniform float uMode,uT;
uniform ivec2 uSz;
const float WT[9]=float[9](.0076,.0361,.1096,.2134,.2666,.2134,.1096,.0361,.0076);
float flashOf(float v){if(v<.5)return 0.;float age=mod(uT*10.-(v-1.),250.)/10.;return age<1.6?exp(-age*2.6)*(1.-smoothstep(1.2,1.6,age)):0.;}
void main(){
  ivec2 c=ivec2(gl_FragCoord.xy);
  vec4 a0=vec4(0.),a1=vec4(0.);
  for(int k=-4;k<=4;k++){
    float w=WT[k+4];
    ivec2 cc=clamp(uMode<.5?ivec2(c.x+k,c.y):ivec2(c.x,c.y+k),ivec2(0),uSz-1);
    vec4 a=texelFetch(tA,cc,0),b=texelFetch(tB,cc,0);
    if(uMode<.5)b=vec4(b.r,flashOf(b.g*255.),0.,0.);
    a0+=w*a;a1+=w*b;
  }
  o0=a0;
  o1=vec4(a1.r,a1.g,min(1.,a0.r+a0.g+a0.b+a0.a+a1.r),0.);
}
`;
const GL_FS=`#version 300 es
precision highp float;
precision highp sampler2D;
out vec4 FC;
uniform vec2 uRes,uCam,uW,uSeed;
uniform float uZoom,uT,uNight,uTier,uZR;
uniform sampler2D tLand,tS0,tS1,tN0,tN1,tN2,tIc;
uniform vec3 uSun,uSunC,uAmb,uW0,uW1,uW2,uSnow,uMy;
uniform vec3 uC[6];
uniform vec4 uRg[4];
uniform vec3 uRc[4];
uniform vec4 uZn[8];
uniform float uZm[8];
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 gr(vec4 t){return t.gb*2.-1.;}
// detail lookups with the exact slope of the screen mapping, so they are safe inside any branch
vec4 T(sampler2D s,vec2 q,float k){return textureGrad(s,q*k,vec2(k/uZoom,0.),vec2(0.,k/uZoom));}
float sdf(vec2 p){vec2 q=clamp(p,vec2(0.),uW);return (textureLod(tLand,q/uW,0.).r-.5)*12.8-length(p-q);}
float cov(vec2 p){return textureLod(tS1,clamp(p,vec2(0.),uW)/uW,0.).b;}
const vec3 HV0=vec3(0.,0.,1.);

// ---- sea: depth colour, moving ripples, sun glints, ice floes, slush at the shore
vec3 sea(vec2 p,vec2 q,float dw){
  vec2 g=gr(T(tN1,q+vec2(uT*.13,uT*.07),.06))*.8+gr(T(tN0,q-vec2(uT*.07,-uT*.05),.11))*.6;
  vec3 n=normalize(vec3(-g*.30,1.));
  float t1=smoothstep(0.,1.3,dw),t2=smoothstep(1.,6.,dw);
  vec3 c=mix(uW0,uW1,t1);c=mix(c,uW2,t2);
  float dif=clamp(dot(n,uSun)/uSun.z,.5,1.5);
  c*=.70+.30*dif;
  vec3 hv=normalize(uSun+HV0);
  float sp=pow(max(dot(n,hv),0.),70.);
  c+=uSunC*sp*.65;
  float sh=smoothstep(-.4,.5,sdf(p+uSun.xy*.9));
  c*=1.-.28*sh*(1.-t2*.5);
  float cs=T(tN2,q+vec2(uT*.07,0.),.07).a;
  c+=vec3(.25,.55,.60)*(1.-smoothstep(0.,.07,cs))*(1.-t1)*.20;
  if(uTier>0.5){
    vec2 fq=q+vec2(uT*.02,uT*.008);
    vec4 fl=T(tN2,fq,.036);
    float plate=step(.60,fl.r)*smoothstep(.02,.10,fl.g)*smoothstep(1.1,2.2,dw);
    vec4 fs=T(tN2,fq+uSun.xy*.3,.036);
    float fsh=step(.60,fs.r)*smoothstep(.02,.10,fs.g)*smoothstep(1.1,2.2,dw);
    c*=1.-.32*fsh*(1.-plate);
    if(plate>.01){
      float e=.12;
      float gx=T(tN2,fq+vec2(e,0.),.036).g-T(tN2,fq-vec2(e,0.),.036).g,gy=T(tN2,fq+vec2(0.,e),.036).g-T(tN2,fq-vec2(0.,e),.036).g;
      vec3 fn=normalize(vec3(-vec2(gx,gy)*1.0,1.));
      float fl2=clamp(dot(fn,uSun)/uSun.z,0.,1.5);
      vec4 gk=T(tN0,q,.032);
      vec3 fc=vec3(.97,.985,1.)*(uSunC*fl2*.64+uAmb*.42)*(1.-gk.a*.08);
      fc*=1.-.08*smoothstep(.75,.2,gk.r);
      c=mix(c,fc,plate*.97);
    }
  }
  float wob=T(tN0,q+vec2(uT*.08,uT*.035),.2).r;
  float fo=1.-smoothstep(.0,.55,dw+(wob-.5)*.55);
  float br=T(tN0,q,.5).r;
  c=mix(c,vec3(.95,.985,1.),clamp(fo*(.55+.45*br),0.,1.)*.92);
  return c;
}

// ---- snow: crisp grain, wind ripples and drifts, packed-ice patches with cracks, glitter
vec3 snow(vec2 q,out float ice){
  vec4 f=T(tN0,q,.032);
  vec4 g2=T(tN0,q+3.1,.125);
  vec4 m=T(tN1,vec2(q.x+q.y*.28,q.y-q.x*.28),.0435);
  vec4 l=T(tN1,q+7.,.0149);
  ice=smoothstep(.66,.80,l.a+(m.r-.5)*.30);
  vec2 g=gr(f)*mix(1.,.40,ice)*1.6+gr(g2)*mix(1.,.5,ice)*1.0+gr(m)*mix(.9,.35,ice)+gr(l)*.25;
  vec3 n=normalize(vec3(-g*.115,1.));
  float lam=clamp(dot(n,uSun)/uSun.z,0.,1.8);
  vec3 lit=uSunC*lam*.66+uAmb*.40;
  vec3 alb=mix(uSnow,uSnow*vec3(.94,.975,1.02),ice);
  vec3 c=alb*lit;
  c=mix(c,c*vec3(.92,.95,1.02),smoothstep(.42,.12,f.r)*.38);
  c*=1.-f.a*.14-g2.a*.10;
  c*=1.+(l.r-.5)*.035;
  if(uTier>0.5){
    vec4 cr=T(tN2,q,.05);
    float crack=(1.-smoothstep(0.,.05,cr.a))*ice;
    c=mix(c,c*vec3(.74,.85,.97),crack*.50);
    vec2 gc=floor(q*12.);
    float h=hash(gc);
    float tw=.5+.5*sin(uT*(1.5+h*6.)+h*60.);
    float spk=step(.955,h)*tw;
    vec3 sc=.5+.5*cos(6.2832*(h*5.+vec3(0.,.33,.67)));
    c=mix(c,mix(vec3(1.),sc,.28),spk*.42);
    vec3 hv=normalize(uSun+HV0);
    c+=uSunC*pow(max(dot(n,hv),0.),40.)*ice*.18;
  }
  return c;
}

// ---- captured land: frosted coloured ice with a bevelled rim, lit from the sun. d: distance inside the edge, gn: direction of the edge pointing inwards
vec3 slab(vec2 q,float d,vec2 gn,vec2 uv){
  vec4 a=textureLod(tS0,uv,0.),b=textureLod(tS1,uv,0.);
  float v[5];v[0]=a.r;v[1]=a.g;v[2]=a.b;v[3]=a.a;v[4]=b.r;
  float top=0.,sec=0.;
  vec3 base=vec3(0.);float ws=0.;
  for(int i=0;i<5;i++){float x=v[i];if(x>top){sec=top;top=x;}else if(x>sec)sec=x;float w=x*x*x;base+=uC[i+1]*w;ws+=w;}
  base/=max(ws,1e-4);
  base=mix(base,vec3(1.),.05);
  vec4 fN=T(tN0,q,.04);
  vec4 gN=T(tN0,q+5.,.14);
  vec4 cr=T(tN2,q,.05);
  float veins=1.-smoothstep(0.,.05,cr.a);
  float dd=max(d,0.);
  vec3 tone=base*(.93+.10*fN.r+.04*gN.r);
  tone=mix(tone*1.07+.02,tone*.90,smoothstep(.05,1.3,dd));
  tone=mix(tone,vec3(1.),veins*.16);
  float chamf=1.-smoothstep(0.,.10,dd);
  float rnd=1.-smoothstep(.05,.48,dd);
  float slope=chamf*1.25+rnd*.55;
  vec3 n=normalize(vec3(-gn*slope+gr(fN)*.07+gr(gN)*.045,1.));
  float lam=clamp(dot(n,uSun)/uSun.z,0.,2.);
  vec3 c=tone*(uSunC*lam*.64+uAmb*.44);
  vec3 hv=normalize(uSun+HV0);
  c+=uSunC*pow(max(dot(n,hv),0.),24.)*.30*(.5+chamf);
  vec2 gc=floor(q*14.);float h=hash(gc+9.);
  c+=vec3(1.)*step(.975,h)*(.5+.5*sin(uT*(2.+h*8.)+h*70.))*.35;
  c*=1.-.12*chamf*(1.-lam*.5);
  c=mix(c,c*.55,smoothstep(.14,.46,sec)*.8);
  float fl=b.g;
  c=mix(c,vec3(1.),fl*.55);c+=fl*.20*(1.-smoothstep(0.,.5,dd));
  return c;
}

// ---- power pads: a steel platform with a ring in the owner's colour. z: x, y, kind (0..3), owner
float ln(float x,float w,float aa){return 1.-smoothstep(w,w+aa,abs(x));}
vec3 pad(vec3 col,vec2 p,vec2 q,int i){
  vec4 z=uZn[i];vec2 d=p-z.xy;float R=uZR,r=length(d),t=r/R;
  vec2 so=-uSun.xy*.30/uSun.z;
  col*=1.-.30*(1.-smoothstep(.96,1.40,length(d-so)/R));
  if(t>1.30)return col;
  float px=1.4/(uZoom*R);
  vec3 oc=z.w<.5?vec3(.80,.87,.95):uC[int(z.w+.5)];
  vec2 dir=d/max(r,1e-4);
  float ang=atan(d.y,d.x);
  vec4 f=T(tN0,q,.063);
  vec3 c=vec3(0.);
  float hs=.5+.5*dot(normalize(vec3(-dir*.7,1.)),uSun);
  if(t<.62){
    // dark plate with fine scratches and concentric grooves
    c=vec3(.15,.17,.22)*(.86+.28*f.r)*(.80+.30*hs);
    c*=1.-.10*ln(t-.30,.004,px)-.10*ln(t-.50,.004,px)-.45*(1.-smoothstep(.42,.62,t))*0.;
    c*=1.-.30*smoothstep(.54,.62,t);
    float em=1.-smoothstep(.40-px,.40,t);
    if(em>.001){
      vec3 ec=vec3(.06,.07,.10)*(.9+.2*f.r);
      int ic=int(z.z+.5);
      vec2 iuv=d/(R*.84)+.5;
      vec2 au=vec2((float(ic)+iuv.x)*.25,iuv.y);
      float gp=1./(uZoom*R*.84);
      float ia=iuv.x>0.&&iuv.x<1.&&iuv.y>0.&&iuv.y<1.?textureGrad(tIc,au,vec2(gp*.25,0.),vec2(0.,gp)).a:0.;
      ec+=oc*.20*(1.-smoothstep(0.,.40,t));
      ec=mix(ec,vec3(.97,.98,1.),ia*.96);
      c=mix(c,ec,em);
    }
    c+=oc*.55*ln(t-.43,.006,px);
  }else if(t<.90){
    float u=(t-.62)/.28;
    c=oc*(.78+.30*smoothstep(0.,1.,u))*(.88+.12*f.r)*(.82+.30*hs);
    c=mix(c,c*.55,ln(u-.03,.03,px*3.))*1.;
    float dash=step(.5,fract(ang/6.2832*20.+uT*.25));
    c=mix(c,mix(c,vec3(1.),.65),dash*ln(u-.5,.10,px*2.));
    c+=vec3(1.)*.18*ln(u-.9,.05,px*2.);
  }else{
    float u=clamp((t-.90)/.15,0.,1.);
    float k=cos(u*3.1416)*.9;
    vec3 n=normalize(vec3(-dir*k,1.));
    float lam=clamp(dot(n,uSun)/uSun.z,0.,2.);
    c=vec3(.66,.70,.77)*(uSunC*lam*.60+uAmb*.45)*(.9+.2*f.r);
    c+=uSunC*pow(max(dot(n,normalize(uSun+HV0)),0.),20.)*.30;
  }
  col=mix(col,c,1.-smoothstep(1.05-px,1.05,t));
  // my progress: the arc around the pad fills up as I take land on it
  float my=uZm[i];
  if(my>.005){
    float a01=mod(ang+1.5708,6.2832)/6.2832;
    float band=ln(t-1.17,.045,px*2.);
    float on=step(a01,my);
    col=mix(col,mix(vec3(1.),uMy,.35),band*.35);
    col=mix(col,mix(uMy,vec3(1.),.35),band*on*(.85+.15*sin(uT*8.)));
  }
  return col;
}

void main(){
  vec2 p=uCam+(vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)-.5*uRes)/uZoom;
  vec2 q=p+uSeed;
  vec2 uv=clamp(p,vec2(0.),uW)/uW;
  float sd=sdf(p);
  float cj=(T(tN1,q,.09).a-.5)*.34+(T(tN0,q,.2).r-.5)*.10;
  float s=sd+cj-.20;
  float aa=1.1/uZoom;
  vec3 col=vec3(0.);
  float ice=0.;
  if(s<aa*2.)col=sea(p,q,max(0.,-s));
  if(s>-aa*2.){
    vec3 sn=snow(q,ice);
    float rim=smoothstep(.55,.0,s);
    sn=mix(sn,sn*vec3(.93,.97,1.02)+vec3(.02),rim*.5);
    float edge=smoothstep(.0,.16,s);
    sn=mix(vec3(.80,.89,.98)*(uSunC*.5+uAmb*.45),sn,edge);
    // captured land
    float v0=cov(p),v1=cov(p+uSun.xy*.6);
    if(v0>.004||v1>.004){
      float e=.3;
      vec2 g=vec2(cov(p+vec2(e,0.))-cov(p-vec2(e,0.)),cov(p+vec2(0.,e))-cov(p-vec2(0.,e)))/(2.*e);
      float gm=max(length(g),.05);
      float d=clamp((v0-.5)/gm,-3.,3.);
      float sh=smoothstep(.10,.60,v1)*(1.-smoothstep(.45,.70,v0));
      sn=mix(sn,sn*vec3(.64,.73,.88),sh*.85);
      float tm=smoothstep(-aa,aa,d)*step(0.,s);
      if(tm>.001)sn=mix(sn,slab(q,d,g/gm,uv),tm);
    }
    for(int i=0;i<8;i++){if(uZn[i].z<-.5)continue;vec2 dz=p-uZn[i].xy;if(dot(dz,dz)<uZR*uZR*2.2)sn=pad(sn,p,q,i);}
    float m=smoothstep(-aa,aa,s);
    col=(s<aa*2.)?mix(col,sn,m):sn;
  }
  // rings sent out by captures and blasts
  for(int i=0;i<4;i++){vec4 r=uRg[i];
    if(r.w>0.){float age=r.z;
      if(age>=0.&&age<.7){float R=1.+age*17.,w=.5+age*1.3,x=(length(p-r.xy)-R)/w,band=exp(-x*x)*(1.-age/.7);
        col=mix(col,uRc[i],band*.50);col+=vec3(.08)*band;col*=1.-.06*band;}}}
  FC=vec4(clamp(col,0.,1.),1.);
}
`;

// ---------- detail maps: made once, then repeated over the whole world ----------
// n0: fine grain. n1: drifts. n2: cell patterns for floes and cracks. Each holds a height, its slope in two channels, and one extra channel.
function glNoiseBuild(){
 const N=512,R=mulberry32(0x5eed1e55),Z=N*N;
 const lat=(nx,ny)=>{const a=new Float32Array(nx*ny);for(let i=0;i<a.length;i++)a[i]=R();return a};
 const fbm=(oct)=>{const H=new Float32Array(Z);let ws=0;
  for(const [nx,ny,w] of oct){const a=lat(nx,ny);ws+=w;
   for(let y=0;y<N;y++){const fy=y*ny/N,y0=fy|0,ty=fy-y0,sy=ty*ty*ty*(ty*(ty*6-15)+10),r0=(y0%ny)*nx,r1=(((y0+1)%ny))*nx;
    for(let x=0;x<N;x++){const fx=x*nx/N,x0=fx|0,tx=fx-x0,sx=tx*tx*tx*(tx*(tx*6-15)+10),xa=x0%nx,xb=(x0+1)%nx,a00=a[r0+xa],a10=a[r0+xb],a01=a[r1+xa],a11=a[r1+xb];
     H[y*N+x]+=w*((a00+(a10-a00)*sx)*(1-sy)+(a01+(a11-a01)*sx)*sy)}}}
  for(let i=0;i<Z;i++)H[i]/=ws;return H};
 const norm=H=>{let mn=1e9,mx=-1e9;for(let i=0;i<Z;i++){if(H[i]<mn)mn=H[i];if(H[i]>mx)mx=H[i]}const k=1/(mx-mn||1);for(let i=0;i<Z;i++)H[i]=(H[i]-mn)*k;return H};
 // slope in x and y, spread over the byte range
 const slopes=(H,d,ch)=>{const gx=new Float32Array(Z),gy=new Float32Array(Z);let s2=0;
  for(let y=0;y<N;y++){const ym=((y+N-1)%N)*N,yp=((y+1)%N)*N,r=y*N;for(let x=0;x<N;x++){const xm=(x+N-1)%N,xp=(x+1)%N,a=(H[r+xp]-H[r+xm])*.5,b=(H[yp+x]-H[ym+x])*.5;gx[r+x]=a;gy[r+x]=b;s2+=a*a+b*b}}
  const K=1/(3*Math.sqrt(s2/(2*Z))+1e-9);
  for(let i=0;i<Z;i++){d[i*4+ch]=Math.max(0,Math.min(255,Math.round(127.5+127.5*Math.max(-1,Math.min(1,gx[i]*K)))));d[i*4+ch+1]=Math.max(0,Math.min(255,Math.round(127.5+127.5*Math.max(-1,Math.min(1,gy[i]*K)))))}};
 // jittered cell pattern (Worley): distance to the nearest point, to the second nearest, and a random number per cell
 const worley=(cn,warp)=>{const px=new Float32Array(cn*cn),py=new Float32Array(cn*cn),id=new Float32Array(cn*cn);
  for(let i=0;i<cn*cn;i++){px[i]=R();py[i]=R();id[i]=R()}
  const F1=new Float32Array(Z),F2=new Float32Array(Z),ID=new Float32Array(Z),wu=warp?lat(8,8):null,wv=warp?lat(8,8):null;
  // a smooth, repeating wobble of the cell pattern (two separate fields, one for each direction)
  const bil=(a,fx,fy)=>{const x0=fx|0,y0=fy|0,tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),g=(i,j)=>a[(j%8)*8+(i%8)];return(g(x0,y0)*(1-sx)+g(x0+1,y0)*sx)*(1-sy)+(g(x0,y0+1)*(1-sx)+g(x0+1,y0+1)*sx)*sy};
  for(let y=0;y<N;y++){for(let x=0;x<N;x++){let u=x/N,v=y/N;
   if(warp){const fx=u*8,fy=v*8,du=(bil(wu,fx,fy)-.5)*warp,dv=(bil(wv,fx,fy)-.5)*warp;u=((u+du)%1+1)%1;v=((v+dv)%1+1)%1}
   const ci=(u*cn)|0,cj=(v*cn)|0;let d1=9,d2=9,bi=0;
   for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ai=ci+di,aj=cj+dj,k=((aj+cn)%cn)*cn+((ai+cn)%cn),dx=(ai+px[k])/cn-u,dy=(aj+py[k])/cn-v,d=dx*dx+dy*dy;
    if(d<d1){d2=d1;d1=d;bi=k}else if(d<d2)d2=d}
   F1[y*N+x]=Math.sqrt(d1)*cn;F2[y*N+x]=Math.sqrt(d2)*cn;ID[y*N+x]=id[bi]}}
  return{F1,F2,ID}};
 const n0=new Uint8Array(Z*4),n1=new Uint8Array(Z*4),n2=new Uint8Array(Z*4);
 // fine grain: sand-like roughness on top of small ripples
 {const H=norm(fbm([[32,32,.34],[64,64,.28],[128,128,.22],[256,256,.16]]));const g=new Float32Array(Z);for(let i=0;i<Z;i++)g[i]=R();
  for(let i=0;i<Z;i++){H[i]=H[i]*.74+g[i]*.26;n0[i*4]=Math.round(H[i]*255);n0[i*4+3]=g[i]>.93?Math.round(255*(g[i]-.93)/.07):0}
  slopes(H,n0,1)}
 // drifts: long and low, stretched along the wind
 {const H=norm(fbm([[5,13,.30],[10,28,.26],[20,56,.20],[40,110,.14],[80,200,.10]]));const L=norm(fbm([[3,3,.5],[6,6,.3],[12,12,.2]]));
  for(let i=0;i<Z;i++){n1[i*4]=Math.round(H[i]*255);n1[i*4+3]=Math.round(L[i]*255)}
  slopes(H,n1,1)}
 // cells: big plates (floes) and fine cracks
 {const A=worley(7,.05),B=worley(15,.035);
  for(let i=0;i<Z;i++){n2[i*4]=Math.round(A.ID[i]*255);n2[i*4+1]=Math.round(Math.min(1,(A.F2[i]-A.F1[i])*2.2)*255);n2[i*4+2]=Math.round(B.ID[i]*255);n2[i*4+3]=Math.round(Math.min(1,(B.F2[i]-B.F1[i])*2.0)*255)}}
 return{n0,n1,n2,N}}

// ---------- the coast as a distance picture: signed distance to the water's edge, in 1/20 steps of a unit (positive on land) ----------
function edt1(f,n,d,v,z){let k=0;v[0]=0;z[0]=-1e20;z[1]=1e20;
 for(let q=1;q<n;q++){let s;for(;;){const p=v[k];s=((f[q]+q*q)-(f[p]+p*p))/(2*q-2*p);if(s<=z[k])k--;else break}k++;v[k]=q;z[k]=s;z[k+1]=1e20}
 k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;const p=v[k];d[q]=(q-p)*(q-p)+f[p]}}
function edt2(feat,w,h){ // squared distance (in cells) from every cell to the nearest cell where feat is 1
 const INF=1e12,g=new Float32Array(w*h),m=Math.max(w,h),f=new Float32Array(m),d=new Float32Array(m),v=new Int32Array(m),z=new Float32Array(m+1);
 for(let i=0;i<w*h;i++)g[i]=feat[i]?0:INF;
 for(let x=0;x<w;x++){for(let y=0;y<h;y++)f[y]=g[y*w+x];edt1(f,h,d,v,z);for(let y=0;y<h;y++)g[y*w+x]=d[y]}
 for(let y=0;y<h;y++){for(let x=0;x<w;x++)f[x]=g[y*w+x];edt1(f,w,d,v,z);for(let x=0;x<w;x++)g[y*w+x]=d[x]}
 return g}
function glLandData(){const N=MW*MH,land=new Uint8Array(N),sea=new Uint8Array(N);for(let i=0;i<N;i++){land[i]=ISL[i]?1:0;sea[i]=ISL[i]?0:1}
 const dl=edt2(sea,MW,MH),ds=edt2(land,MW,MH),out=new Uint8Array(N*4);
 for(let i=0;i<N;i++){ // inside: distance to the nearest sea cell minus half a cell; outside: minus the distance to the nearest land cell plus half a cell
  const d=land[i]?(Math.sqrt(dl[i])-.5)/MC:-(Math.sqrt(ds[i])-.5)/MC,v=Math.max(0,Math.min(255,Math.round((d/12.8+.5)*255)));
  out[i*4]=v;out[i*4+1]=land[i]?255:0;out[i*4+2]=0;out[i*4+3]=255}
 return out}

// ---------- the graphics context ----------
function glBind(gl,unit,tex){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex)}
function glMkTex(gl,unit,w,h,data,opt){const t=gl.createTexture();glBind(gl,unit,t);
 if(opt.src)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,opt.src);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
 const wrap=opt.rep?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wrap);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wrap);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,opt.near?gl.NEAREST:gl.LINEAR);
 if(opt.mip){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)}else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,opt.near?gl.NEAREST:gl.LINEAR);
 return t}
// a render target with n colour pictures
function glFbo(gl,w,h,n){const fb=gl.createFramebuffer(),tx=[],at=[];gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
 for(let i=0;i<n;i++){const t=gl.createTexture();glBind(gl,15,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,gl.TEXTURE_2D,t,0);tx.push(t);at.push(gl.COLOR_ATTACHMENT0+i)}
 gl.drawBuffers(at);const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 if(!ok)throw new Error('framebuffer');return{fb,tx,w,h}}
function glCompile(gl,vs,fs){const mk=(ty,src)=>{const s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){GLS.err=gl.getShaderInfoLog(s)||'shader';return null}return s};
 const a=mk(gl.VERTEX_SHADER,vs),b=mk(gl.FRAGMENT_SHADER,fs);if(!a||!b)return null;
 const p=gl.createProgram();gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){GLS.err=gl.getProgramInfoLog(p)||'link';return null}return p}
function glUniforms(gl,P,names){const U={};for(const n of names)U[n]=gl.getUniformLocation(P,n);return U}
function glInit(){
 if(GLS.ok)return 1;const cvg=document.getElementById('gl');if(!cvg)return 0;
 let gl=null;try{gl=cvg.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'high-performance'})}catch(e){}
 if(!gl){GLS.err='no webgl2';return 0}
 GLS.gl=gl;GLS.cv=cvg;
 cvg.addEventListener('webglcontextlost',e=>{e.preventDefault();GLS.ok=0;GLS.lost=1},false);
 cvg.addEventListener('webglcontextrestored',()=>{GLS.lost=0;try{glBuild();if(typeof glMap==='function'&&GLS.land)glRestore();if(typeof fit==='function')fit();MDIRTY=true}catch(e){GLS.ok=0}},false);
 try{return glBuild()}catch(e){GLS.err=String(e&&e.message||e);GLS.ok=0;return 0}}
function glBuild(){const gl=GLS.gl;if(!GLS.noise)GLS.noise=glNoiseBuild();
 const P=glCompile(gl,GL_VS,GL_FS),PB=glCompile(gl,GL_VS,GL_BL);if(!P||!PB){GLS.ok=0;return 0}
 GLS.P=P;GLS.PB=PB;
 gl.useProgram(P);GLS.U=glUniforms(gl,P,['uRes','uCam','uW','uSeed','uZoom','uT','uNight','uTier','uZR','uSun','uSunC','uAmb','uW0','uW1','uW2','uSnow','uMy','uC','uRg','uRc','uZn','uZm','tLand','tS0','tS1','tN0','tN1','tN2','tIc']);
 const U=GLS.U;gl.uniform1i(U.tLand,0);gl.uniform1i(U.tS0,3);gl.uniform1i(U.tS1,4);gl.uniform1i(U.tN0,5);gl.uniform1i(U.tN1,6);gl.uniform1i(U.tN2,7);gl.uniform1i(U.tIc,9);
 gl.useProgram(PB);GLS.UB=glUniforms(gl,PB,['uMode','uT','uSz','tA','tB']);gl.uniform1i(GLS.UB.tA,1);gl.uniform1i(GLS.UB.tB,2);gl.uniform2i(GLS.UB.uSz,MW,MH);
 const nz=GLS.noise,T=GLS.T,N=MW*MH*4;
 T.n0=glMkTex(gl,5,nz.N,nz.N,nz.n0,{rep:1,mip:1});T.n1=glMkTex(gl,6,nz.N,nz.N,nz.n1,{rep:1,mip:1});T.n2=glMkTex(gl,7,nz.N,nz.N,nz.n2,{rep:1,mip:1});
 const blank=new Uint8Array(N);
 T.land=glMkTex(gl,0,MW,MH,GLS.land||blank,{});T.a=glMkTex(gl,1,MW,MH,GLS.oa||blank,{near:1});T.b=glMkTex(gl,2,MW,MH,GLS.ob||blank,{near:1});
 T.ic=glMkTex(gl,9,0,0,null,{src:glIconAtlas(),mip:1});
 GLS.F.h=glFbo(gl,MW,MH,2);GLS.F.s=glFbo(gl,MW,MH,2);
 gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);GLS.ok=1;
 if(typeof glBuildMore==='function')glBuildMore();
 return 1}
// the four power-pad symbols, white on clear, drawn once
function glIconAtlas(){const c=mkc(512,128),g=c.getContext('2d');g.lineCap=g.lineJoin='round';
 ['cannon','fort','strike','nitro'].forEach((t,i)=>{g.save();g.translate(i*128+64,64);g.scale(54,54);zoneIcon(g,t,'#ffffff');g.restore()});return c}
// a new island
function glMap(){if(!GLS.gl)return;GLS.land=glLandData();
 if(!GLS.oa){GLS.oa=new Uint8Array(MW*MH*4);GLS.ob=new Uint8Array(MW*MH*4);GLS.fr=new Uint8Array(MW*MH)}
 GLS.oa.fill(0);GLS.ob.fill(0);GLS.fr.fill(0);
 if(GLS.ok){const gl=GLS.gl;glBind(gl,0,GLS.T.land);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,MW,MH,0,gl.RGBA,gl.UNSIGNED_BYTE,GLS.land);
  glBind(gl,1,GLS.T.a);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,MW,MH,gl.RGBA,gl.UNSIGNED_BYTE,GLS.oa);glBind(gl,2,GLS.T.b);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,MW,MH,gl.RGBA,gl.UNSIGNED_BYTE,GLS.ob)}
 const R=mulberry32(SEED^0x7f4a7c15);GLS.seedOff=[R()*512,R()*512]}
// after the phone gave the graphics chip back: put the current map in again
function glRestore(){if(!GLS.ok||!GLS.land)return;const gl=GLS.gl;glBind(gl,0,GLS.T.land);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,MW,MH,0,gl.RGBA,gl.UNSIGNED_BYTE,GLS.land);
 glBind(gl,1,GLS.T.a);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,MW,MH,gl.RGBA,gl.UNSIGNED_BYTE,GLS.oa);glBind(gl,2,GLS.T.b);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,MW,MH,gl.RGBA,gl.UNSIGNED_BYTE,GLS.ob)}
// who owns what: one byte per player and cell. Cells that changed hands get a time stamp (tenths of a second, wraps at 25 s) so the shader can flash them smoothly.
function glOwn(){if(!GLS.gl||!GLS.oa)return;const a=GLS.oa,b=GLS.ob,fr=GLS.fr,N=own.length,pv=PREV,now=Math.floor(clk*10),code=1+(((now%250)+250)%250);let fresh=0;
 a.fill(0);
 for(let i=0;i<N;i++){const o=own[i],k=i*4;let r=0;
  if(o){if(o<5)a[k+o-1]=255;else r=255;
   if(pv&&pv[i]!==o){fr[i]=code;fresh=1}else if(fr[i]){const age=((now-(fr[i]-1))%250+250)%250;if(age>16)fr[i]=0}}
  else fr[i]=0;
  b[k]=r;b[k+1]=fr[i]}
 if(fresh)GLS.freshEnd=clk+1.8;
 if(!GLS.ok)return;const gl=GLS.gl;
 glBind(gl,1,GLS.T.a);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,MW,MH,gl.RGBA,gl.UNSIGNED_BYTE,a);
 glBind(gl,2,GLS.T.b);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,MW,MH,gl.RGBA,gl.UNSIGNED_BYTE,b)}
// the two blur passes (cheap: one small picture)
function glBlur(t){const gl=GLS.gl,F=GLS.F,UB=GLS.UB;gl.useProgram(GLS.PB);gl.disable(gl.BLEND);gl.viewport(0,0,MW,MH);
 gl.bindFramebuffer(gl.FRAMEBUFFER,F.h.fb);glBind(gl,1,GLS.T.a);glBind(gl,2,GLS.T.b);gl.uniform1f(UB.uMode,0);gl.uniform1f(UB.uT,t);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.bindFramebuffer(gl.FRAMEBUFFER,F.s.fb);glBind(gl,1,F.h.tx[0]);glBind(gl,2,F.h.tx[1]);gl.uniform1f(UB.uMode,1);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
function glFit(cw,ch,sc){const c=GLS.cv;if(!c)return;GLS.s=sc;const w=Math.max(1,Math.round(cw*sc)),h=Math.max(1,Math.round(ch*sc));if(c.width!==w||c.height!==h){c.width=w;c.height=h}
 c.style.width=cw+'px';c.style.height=ch+'px';GLS.w=w;GLS.h=h}
// one frame of ground. cx,cy: world point at the middle of the screen; zoom: screen pixels (of the css size) per world unit; rings: [{x,y,t0,c}] newest last
function glFrame(cx,cy,zoom,t,rings){if(!GLS.ok)return 0;const gl=GLS.gl,U=GLS.U,m=MOOD;
 glBlur(t);
 glBind(gl,0,GLS.T.land);glBind(gl,3,GLS.F.s.tx[0]);glBind(gl,4,GLS.F.s.tx[1]);glBind(gl,5,GLS.T.n0);glBind(gl,6,GLS.T.n1);glBind(gl,7,GLS.T.n2);glBind(gl,9,GLS.T.ic);
 gl.useProgram(GLS.P);gl.viewport(0,0,GLS.w,GLS.h);
 gl.uniform2f(U.uRes,GLS.w,GLS.h);gl.uniform2f(U.uCam,cx,cy);gl.uniform1f(U.uZoom,zoom*GLS.s);gl.uniform2f(U.uW,WW,WH);gl.uniform2f(U.uSeed,GLS.seedOff[0],GLS.seedOff[1]);
 gl.uniform1f(U.uT,t);gl.uniform1f(U.uNight,m.night||0);gl.uniform1f(U.uTier,GLS.tier);gl.uniform1f(U.uZR,ZR);
 if(!GLS.cols){GLS.cols=new Float32Array(18);for(let i=1;i<=5;i++){const c=rgbOf(COLS[i]);GLS.cols[i*3]=c[0]/255;GLS.cols[i*3+1]=c[1]/255;GLS.cols[i*3+2]=c[2]/255}}gl.uniform3fv(U.uC,GLS.cols);
 const my=GLS.cols.subarray(VS*3,VS*3+3);gl.uniform3f(U.uMy,my[0],my[1],my[2]);
 const rg=GLS.rg,rc=GLS.rc;rg.fill(0);rc.fill(0);
 if(rings){let n=0;for(let i=Math.max(0,rings.length-4);i<rings.length;i++,n++){const r=rings[i],c=rgbOf(r.c);rg[n*4]=r.x;rg[n*4+1]=r.y;rg[n*4+2]=t-r.t0;rg[n*4+3]=1;rc[n*3]=c[0]/255;rc[n*3+1]=c[1]/255;rc[n*3+2]=c[2]/255}}
 gl.uniform4fv(U.uRg,rg);gl.uniform3fv(U.uRc,rc);
 const zn=GLS.zn,zm=GLS.zm;for(let i=0;i<8;i++){const z=ZN[i];if(z){zn[i*4]=z.x;zn[i*4+1]=z.y;zn[i*4+2]=ZTI[z.t]|0;zn[i*4+3]=ZOWN[i]||0;zm[i]=Math.min(1,(ZMY[i]||0)*2)}else{zn[i*4+2]=-1;zm[i]=0}}
 gl.uniform4fv(U.uZn,zn);gl.uniform1fv(U.uZm,zm);
 gl.uniform3fv(U.uSun,m.sun);gl.uniform3fv(U.uSunC,m.sunC);gl.uniform3fv(U.uAmb,m.amb);gl.uniform3fv(U.uW0,m.w0);gl.uniform3fv(U.uW1,m.w1);gl.uniform3fv(U.uW2,m.w2);gl.uniform3fv(U.uSnow,m.snow);
 gl.drawArrays(gl.TRIANGLES,0,3);return 1}
