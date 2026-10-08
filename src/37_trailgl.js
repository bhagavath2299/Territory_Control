// ---------- trails on the graphics chip: a lit ribbon with a soft shadow, drawn under the cars ----------
// A trail is the list of points a car left behind. It becomes a smooth strip (Catmull-Rom between the points) with a round tail.
// The fragment shader draws one of three looks: glow (glossy gel tube), neon (dark casing with a light core) and fire (flickering embers).
const TR_VS=`#version 300 es
precision highp float;
in vec2 aP,aN;
in vec4 aV;
uniform vec2 uRes,uCam;
uniform float uZoom,uHW,uSh;
uniform vec3 uSun;
out vec4 vV;
out vec2 vN;
void main(){
  vec2 w=aP+aN*(aV.x*aV.w*uHW);
  if(uSh>.5)w-=uSun.xy/uSun.z*.30;
  vec2 sp=(w-uCam)*uZoom+.5*uRes;
  gl_Position=vec4(sp.x/uRes.x*2.-1.,1.-sp.y/uRes.y*2.,0.,1.);
  vV=aV;vN=aN;
}
`;
const TR_FS=`#version 300 es
precision highp float;
uniform vec3 uCol,uSun,uSunC,uAmb,uGnd,uSky,uHor;
uniform float uStyle,uT,uAl,uSh,uK,uL;
in vec4 vV;
in vec2 vN;
out vec4 FC;
float hs(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1.,0.)),f.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),f.x),f.y);}
void main(){
  float v=vV.x,u=vV.y,e=vV.z;
  float r=length(vec2(v,e));
  if(uSh>.5){float a=smoothstep(1.8,.15,r)*.36*uAl;FC=vec4(vec3(.24,.34,.54)*a,a);return;}
  if(uStyle>2.5){
    // tyre tracks pressed into the snow: two grooves that fade out with age (u runs from the old end to the car)
    float age=1.-clamp(u/max(uL,1e-3),0.,1.);
    float d=(abs(v)-.8)/.15;
    float gr=exp(-d*d);
    float tread=.72+.28*hs(floor(vec2(u*7.,v*5.)));
    float mid=.05*smoothstep(.95,.5,abs(v));
    float a=(gr*.55*tread+mid)*pow(1.-age,1.4)*smoothstep(0.,1.2,uL-u+.6)*uAl;
    FC=vec4(vec3(.38,.47,.63)*a,a);return;}
  float aa=fwidth(r)*1.1+1e-4;
  float body=1.-smoothstep(1.-aa,1.+aa,r);
  vec2 tg=vec2(vN.y,-vN.x);
  vec2 nxy=vN*v-tg*e;
  float rr=min(r,1.);
  vec3 n=normalize(vec3(nxy/max(r,1e-4)*rr*.95,sqrt(max(1.-rr*rr*.9,.02))));
  vec3 L=normalize(uSun);
  float lam=max(dot(n,L),0.)/L.z;
  vec3 hemi=mix(uGnd,uAmb,n.z*.5+.5);
  vec3 H=normalize(L+vec3(0.,0.,1.));
  float nh=max(dot(n,H),0.);
  float F=.04+.96*pow(1.-n.z,4.);
  vec3 col,hc=uCol;float halo=0.;
  float grain=1.+(hs(floor(vec2(u,v)*46.))-.5)*.05;
  if(uStyle<.5){
    // glossy gel tube
    float edge=smoothstep(.5,1.,r);
    col=uCol*(uSunC*lam*.55+hemi*.62)*(1.-.34*edge);
    col+=uSunC*(pow(nh,64.)*1.0+pow(nh,10.)*.10)+F*uHor*.55;
    float core=exp(-v*v*10.);
    float pul=.5+.5*sin(u*2.3-uT*7.);
    col+=mix(uCol,vec3(1.),.55)*core*(.18+.20*pul)*uK;
    float dsh=smoothstep(.78,.97,sin(u*1.7-uT*5.5));
    col=mix(col,vec3(1.),dsh*exp(-v*v*38.)*.55);
    col*=grain;
    halo=exp(-(r-1.)*2.7)*.30*uK;
  }else if(uStyle<1.5){
    // neon: dark casing, light core, pulses running along it
    vec3 cas=vec3(.045,.055,.09)*(uSunC*lam*.55+hemi*.40)+uSunC*pow(nh,40.)*.55+F*uHor*.30;
    float cm=1.-smoothstep(.50,.64,r);
    float ch=smoothstep(.15,1.,.5+.5*sin(u*1.35-uT*9.));
    vec3 cc=mix(uCol*1.12,vec3(1.),smoothstep(.42,0.,r)*.8+ch*.30);
    cc*=.78+.22*ch+.12;
    col=mix(cas,cc,cm);
    float bz=smoothstep(.64,.50,r)*smoothstep(.40,.64,r);
    col+=uCol*bz*.35;
    col*=mix(1.,grain,1.-cm);
    halo=exp(-(r-1.)*2.2)*.46*uK;
  }else{
    // fire: embers and flames licking along a charred casing
    float f1=vn(vec2(u*1.1-uT*4.5,v*1.8)),f2=vn(vec2(u*2.7-uT*8.5,v*3.1+7.));
    float heat=clamp(1.18-r*.98+(f1-.5)*.85+(f2-.5)*.36,0.,1.);
    vec3 fc=heat<.33?mix(vec3(.30,.04,.0),vec3(.96,.20,.02),heat/.33):heat<.66?mix(vec3(.96,.20,.02),vec3(1.,.66,.10),(heat-.33)/.33):mix(vec3(1.,.66,.10),vec3(1.,.97,.68),(heat-.66)/.34);
    vec3 cas=vec3(.10,.035,.02)*(uSunC*lam*.6+hemi*.4)+uSunC*pow(nh,30.)*.25;
    float cm=smoothstep(.06,.30,heat);
    col=mix(cas,fc,cm);
    float em=step(.991,hs(floor(vec2(u*6.,v*4.+uT*3.))+floor(uT*5.)));
    col+=vec3(1.,.72,.25)*em*.9;
    halo=exp(-(r-1.)*2.4)*.34*uK*(.65+.35*f1);hc=vec3(1.,.46,.08);
  }
  float a=max(body,halo*(1.-body))*uAl;
  col=mix(hc,col,body);
  FC=vec4(col*a,a);
}
`;
const TRL={ok:0,P:null,U:{},vao:null,buf:null,HW:.55,E:2.0,NV:40000,data:null,pts:null,PN:12000,len:0};
const TSTYLE={glow:0,neon:1,fire:2,track:3};
function trailGLBuild(){const gl=GLS.gl;if(!gl)return;
 const P=glCompile(gl,TR_VS,TR_FS);if(!P){TRL.ok=0;return}
 TRL.P=P;gl.useProgram(P);TRL.U=glUniforms(gl,P,['uRes','uCam','uZoom','uHW','uSh','uSun','uCol','uSunC','uAmb','uGnd','uSky','uHor','uStyle','uT','uAl','uK','uL']);
 if(!TRL.data){TRL.data=new Float32Array(TRL.NV*8);TRL.pts=new Float32Array(TRL.PN*2)}
 TRL.vao=gl.createVertexArray();gl.bindVertexArray(TRL.vao);TRL.buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,TRL.buf);gl.bufferData(gl.ARRAY_BUFFER,TRL.data.byteLength,gl.DYNAMIC_DRAW);
 [['aP',2,0],['aN',2,8],['aV',4,16]].forEach(a=>{const l=gl.getAttribLocation(P,a[0]);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,a[1],gl.FLOAT,false,32,a[2])});
 gl.bindVertexArray(null);TRL.ok=1}

// one trail -> ribbon vertices at offset o of TRL.data. Returns the number of vertices written (0 when there is nothing to draw).
// tr: flat point list (oldest first). hx,hy: where the car is now (the ribbon ends there). vx0..vy1: the part of the world on screen.
function trailRibbon(o,tr,hx,hy,vx0,vy0,vx1,vy1,HW){
 const pts=TRL.pts,PN=TRL.PN,d=TRL.data,E=TRL.E;let np=0;
 // the raw points, without doubles
 const raw=[];for(let i=0;i+1<tr.length;i+=2){const n=raw.length;if(n&&Math.abs(tr[i]-raw[n-2])+Math.abs(tr[i+1]-raw[n-1])<.004)continue;raw.push(tr[i],tr[i+1])}
 if(hx!==undefined){const n=raw.length;if(!n||Math.abs(hx-raw[n-2])+Math.abs(hy-raw[n-1])>.004)raw.push(hx,hy)}
 const m=raw.length>>1;if(m<2)return 0;
 // smooth curve through the points; only the part on screen is subdivided
 for(let i=0;i<m-1&&np<PN-8;i++){
  const x1=raw[i*2],y1=raw[i*2+1],x2=raw[i*2+2],y2=raw[i*2+3];
  const vis=Math.max(x1,x2)>=vx0&&Math.min(x1,x2)<=vx1&&Math.max(y1,y2)>=vy0&&Math.min(y1,y2)<=vy1;
  if(!vis){pts[np*2]=x1;pts[np*2+1]=y1;np++;continue}
  const a=i>0?i-1:i,b=i+2<m?i+2:i+1,x0=raw[a*2],y0=raw[a*2+1],x3=raw[b*2],y3=raw[b*2+1];
  const K=Math.hypot(x2-x1,y2-y1)>.2?3:1;
  for(let k=0;k<K;k++){const t=k/K,t2=t*t,t3=t2*t;
   pts[np*2]=.5*(2*x1+(-x0+x2)*t+(2*x0-5*x1+4*x2-x3)*t2+(-x0+3*x1-3*x2+x3)*t3);
   pts[np*2+1]=.5*(2*y1+(-y0+y2)*t+(2*y0-5*y1+4*y2-y3)*t2+(-y0+3*y1-3*y2+y3)*t3);np++}}
 pts[np*2]=raw[(m-1)*2];pts[np*2+1]=raw[(m-1)*2+1];np++;
 if(np<2)return 0;
 // vertices: a round cap at the tail, then two per point (left, right)
 let n=0,u=0,px=0,py=0,pdx=0,pdy=0;
 const put=(x,y,nx,ny,v,uu,e,mi)=>{if(o+n>=TRL.NV)return;const q=(o+n)*8;d[q]=x;d[q+1]=y;d[q+2]=nx;d[q+3]=ny;d[q+4]=v;d[q+5]=uu;d[q+6]=e;d[q+7]=mi;n++};
 for(let j=0;j<np;j++){
  const ax=pts[Math.max(0,j-1)*2],ay=pts[Math.max(0,j-1)*2+1],bx=pts[Math.min(np-1,j+1)*2],by=pts[Math.min(np-1,j+1)*2+1];
  let tx=bx-ax,ty=by-ay;const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
  const x=pts[j*2],y=pts[j*2+1];
  if(j>0){u+=Math.hypot(x-px,y-py)}
  // the corner: widen the strip so it keeps its width where the path bends
  let mi=1;if(j>0&&j<np-1){const d0x=x-px,d0y=y-py,d1x=bx-x,d1y=by-y,l0=Math.hypot(d0x,d0y)||1,l1=Math.hypot(d1x,d1y)||1,c=(d0x*d1x+d0y*d1y)/(l0*l1);mi=Math.min(1.8,1/Math.sqrt(Math.max(.18,(1+c)/2)))}
  const nx=-ty,ny=tx;
  if(j===0){const cx=x-tx*E*HW,cy=y-ty*E*HW;put(cx,cy,nx,ny,-E,u-E*HW,E,1);put(cx,cy,nx,ny,E,u-E*HW,E,1)}
  put(x,y,nx,ny,-E,u,0,mi);put(x,y,nx,ny,E,u,0,mi);
  px=x;py=y}
 TRL.len=u;return n}

// every trail of the frame: [{tr,hx,hy,c:[r,g,b],st:'glow'|'neon'|'fire',al,k}]
function trailsDraw(gl,list,resW,resH,cx,cy,zoom,m,t,vx0,vy0,vx1,vy1){if(!TRL.ok||!list.length)return;
 const ent=[];let o=0;
 for(const e of list){const hw=e.hw||TRL.HW,n=trailRibbon(o,e.tr,e.hx,e.hy,vx0,vy0,vx1,vy1,hw);if(n){ent.push({first:o,n,e,hw,L:TRL.len});o+=n}}
 if(!ent.length)return;
 const U=TRL.U;gl.useProgram(TRL.P);
 gl.uniform2f(U.uRes,resW,resH);gl.uniform2f(U.uCam,cx,cy);gl.uniform1f(U.uZoom,zoom);gl.uniform1f(U.uT,t);
 gl.uniform3fv(U.uSun,m.sun);gl.uniform3fv(U.uSunC,m.sunC);gl.uniform3fv(U.uAmb,m.amb);gl.uniform3fv(U.uGnd,m.gnd);gl.uniform3fv(U.uSky,m.sky);gl.uniform3fv(U.uHor,m.hor);
 gl.bindVertexArray(TRL.vao);gl.bindBuffer(gl.ARRAY_BUFFER,TRL.buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,TRL.data,0,o*8);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 const one=(x,sh)=>{const e=x.e;gl.uniform1f(U.uSh,sh);gl.uniform1f(U.uHW,x.hw);gl.uniform1f(U.uL,x.L);gl.uniform3fv(U.uCol,e.c);gl.uniform1f(U.uStyle,TSTYLE[e.st]|0);gl.uniform1f(U.uAl,e.al===undefined?1:e.al);gl.uniform1f(U.uK,e.k===undefined?1:e.k);gl.drawArrays(gl.TRIANGLE_STRIP,x.first,x.n)};
 for(const x of ent)if(x.e.st==='track')one(x,0);
 for(const sh of [1,0])for(const x of ent)if(x.e.st!=='track')one(x,sh);
 gl.disable(gl.BLEND);gl.bindVertexArray(null)}
// the match: trails on top of the ground, same camera as the ground shader
function trailsFrame(list,cx,cy,zoom){if(!GLS.ok||!TRL.ok||!list.length)return;const gl=GLS.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,GLS.w,GLS.h);
 const z=zoom*GLS.s,hw=GLS.w/z/2+3,hh=GLS.h/z/2+3;
 trailsDraw(gl,list,GLS.w,GLS.h,cx,cy,z,MOOD,clk,cx-hw,cy-hh,cx+hw,cy+hh)}
