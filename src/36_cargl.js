// ---------- cars on the graphics chip: every car is lit per pixel from its model pictures (35_carmodel.js) ----------
// A car is drawn as quads: a soft shadow, four wheels (front ones steer) and the body. The shader turns the stored normal, material and ambient shadow into
// colour using the sun and sky of the current mood, and reflects a small sky into the paint, so highlights slide over the bodywork as the car turns.
const CAR_VS=`#version 300 es
precision highp float;
in vec4 aA,aB,aC,aD,aE,aF;
uniform vec2 uRes,uCam;
uniform float uZoom;
uniform vec3 uSun;
out vec2 vUV,vLoc,vCS;
out vec3 vL;
flat out vec4 vD,vE,vF;
void main(){
  vec2 c=vec2(float(gl_VertexID&1)*2.-1.,float(gl_VertexID>>1)*2.-1.);
  float rot=aD.x;
  vec2 loc=c*aB.zw;
  float cr=cos(rot),sr=sin(rot);
  vec2 lr=vec2(loc.x*cr-loc.y*sr,loc.x*sr+loc.y*cr)+aB.xy;
  float ca=cos(aA.z),sa=sin(aA.z);
  vec2 w=aA.xy+aA.w*vec2(lr.x*ca-lr.y*sa,lr.x*sa+lr.y*ca);
  if(aD.y<.5)w-=uSun.xy/uSun.z*.30*aA.w;
  vec2 sp=(w-uCam)*uZoom+.5*uRes;
  gl_Position=vec4(sp.x/uRes.x*2.-1.,1.-sp.y/uRes.y*2.,0.,1.);
  vUV=mix(aC.xy,aC.zw,c*.5+.5);
  vLoc=loc;
  float a=aA.z+rot,c2=cos(a),s2=sin(a);
  vCS=vec2(c2,s2);
  vL=vec3(uSun.x*c2+uSun.y*s2,-uSun.x*s2+uSun.y*c2,uSun.z);
  vD=aD;vE=aE;vF=aF;
}
`;
const CAR_FS=`#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D tG0,tG1,tG2;
uniform vec3 uSunC,uAmb,uSky,uHor,uGnd,uSun;
uniform float uTread,uFlake,uRefl;
in vec2 vUV,vLoc,vCS;
in vec3 vL;
flat in vec4 vD,vE,vF;
out vec4 FC;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
// a small made-up sky: dome, snow below the horizon, the sun and two long soft boxes
vec3 env(vec3 r){
  float u=r.z;
  vec3 sky=mix(uHor,uSky,pow(clamp(u,0.,1.),.55));
  vec3 e=mix(uGnd,sky,smoothstep(-.12,.12,u));
  float sd=max(dot(r,uSun),0.);
  e+=uSunC*(pow(sd,500.)*34.+pow(sd,36.)*.55);
  float b1=smoothstep(.20,.0,abs(dot(r,normalize(vec3(.55,-.42,.72)))-.86));
  float b2=smoothstep(.16,.0,abs(dot(r,normalize(vec3(-.62,.40,.68)))-.88));
  e+=vec3(1.,1.,1.)*(b1*.55+b2*.40);
  return e;
}
void main(){
  vec4 g0=texture(tG0,vUV);
  float al=vD.z;
  if(vD.y<.5){float a=textureLod(tG0,vUV,3.4).a*.46*al;FC=vec4(vec3(.26,.36,.55)*a,a);return;}
  if(g0.a<.004)discard;
  vec4 g1=texture(tG1,vUV),g2=texture(tG2,vUV);
  vec3 n=vec3(g0.rg*2.-1.,0.);n.z=sqrt(max(1.-dot(n.xy,n.xy),.04));n=normalize(n);
  if(vD.y<1.5){float tr=sin((vLoc.x*30.+vD.w)*6.2832)*uTread;n.x+=tr*.34;n=normalize(n);}
  vec3 L=normalize(vL);
  vec3 alb=mix(g1.rgb,vE.rgb*g1.rgb,g1.a);
  float sp=g2.r,gl=g2.g,em=g2.b,ao=g2.a;
  float met=smoothstep(.5,.9,sp);
  vec3 F0=mix(vec3(.02+min(sp,.5)*.12)*uRefl,alb,met);
  float nv=max(n.z,0.);
  vec3 F=F0+(1.-F0)*pow(1.-nv,5.);
  vec3 R=vec3(2.*nv*n.xy,2.*nv*nv-1.);
  vec3 Rw=vec3(R.x*vCS.x-R.y*vCS.y,R.x*vCS.y+R.y*vCS.x,R.z);
  vec3 e=env(Rw);
  float lam=max(dot(n,L),0.)/L.z;
  vec3 hemi=mix(uGnd,uAmb,n.z*.5+.5);
  vec3 diff=alb*(uSunC*lam*.58+hemi*.52)*(1.-met)*ao;
  vec3 refl=F*e*mix(.55,1.,gl)*mix(.5,1.,ao);
  vec3 col=diff+refl;
  col+=alb*em*vE.w*1.5;
  col=mix(col,vec3(1.),vF.x);
  col=mix(col,col*vec3(.78,.90,1.10)+vec3(.04,.09,.14),vF.y);
  float a=g0.a*al;
  FC=vec4(col*a,a);
}
`;
const CARGL={ok:0,P:null,U:{},vao:null,buf:null,tex:[],data:new Float32Array(96*24),fbo:null,fw:0,fh:0,flake:0};
function carGLBuild(){const gl=GLS.gl;if(!gl)return;
 const at=cgBuildAll(),P=glCompile(gl,CAR_VS,CAR_FS);if(!P){CARGL.ok=0;return}
 CARGL.P=P;gl.useProgram(P);CARGL.U=glUniforms(gl,P,['uRes','uCam','uZoom','uSun','uSunC','uAmb','uSky','uHor','uGnd','uTread','uFlake','uRefl','tG0','tG1','tG2']);
 const U=CARGL.U;gl.uniform1i(U.tG0,10);gl.uniform1i(U.tG1,11);gl.uniform1i(U.tG2,12);
 CARGL.tex=[0,1,2].map(i=>glMkTex(gl,10+i,at.AW,at.AH,at.tex[i],{mip:1}));
 // sharper texture lookups on slanted views
 const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext){for(let i=0;i<3;i++){glBind(gl,10+i,CARGL.tex[i]);gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,4)}}
 CARGL.vao=gl.createVertexArray();gl.bindVertexArray(CARGL.vao);CARGL.buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,CARGL.buf);gl.bufferData(gl.ARRAY_BUFFER,CARGL.data.byteLength,gl.DYNAMIC_DRAW);
 ['aA','aB','aC','aD','aE','aF'].forEach((n,i)=>{const l=gl.getAttribLocation(P,n);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,96,i*16);gl.vertexAttribDivisor(l,1)});
 gl.bindVertexArray(null);CARGL.fbo=null;CARGL.ok=1}
function glBuildMore(){carGLBuild();if(typeof trailGLBuild==='function')trailGLBuild()}

// cars: [{x,y,a,sc,m,c:[r,g,b],st,al,em,fl,ice,sp}]. Fills the instance list: all shadows, then all wheels, then all bodies.
function carInst(cars){const at=CGATLAS,d=CARGL.data,AW=at.AW,AH=at.AH;let n=0;
 const put=(x,y,a,sc,ox,oy,hx,hy,u0,v0,u1,v1,rot,kind,al,spin,r,g,b,em,fl,ice)=>{if(n>=96)return;const o=n*24;
  d[o]=x;d[o+1]=y;d[o+2]=a;d[o+3]=sc;d[o+4]=ox;d[o+5]=oy;d[o+6]=hx;d[o+7]=hy;d[o+8]=u0;d[o+9]=v0;d[o+10]=u1;d[o+11]=v1;d[o+12]=rot;d[o+13]=kind;d[o+14]=al;d[o+15]=spin;d[o+16]=r;d[o+17]=g;d[o+18]=b;d[o+19]=em;d[o+20]=fl;d[o+21]=ice;d[o+22]=0;d[o+23]=0;n++};
 const bw=CG.W/2/CG.GU,bh=CG.H/2/CG.GU,ww=48/CG.GU,wh=32/CG.GU;
 for(const pass of [0,1,2])for(const c of cars){const mi=at.info[c.m]||at.info.sport,sp=mi.spec,y0=mi.y0,al=c.al===undefined?1:c.al,sc=c.sc===undefined?1:c.sc,col=c.c||[1,1,1];
  const bu0=0,bu1=CG.W/AW,bv0=y0/AH,bv1=(y0+CG.H)/AH,fu0=392/AW,fu1=488/AW,fv0=y0/AH,fv1=(y0+64)/AH,rv0=(y0+80)/AH,rv1=(y0+144)/AH;
  if(pass===0)put(c.x,c.y,c.a,sc,0,0,bw,bh,bu0,bv0,bu1,bv1,0,0,al,0,0,0,0,0,0,0);
  else if(pass===1){for(const s of [-1,1]){put(c.x,c.y,c.a,sc,sp.wf.x,s*sp.wf.y,ww,wh,fu0,fv0,fu1,fv1,c.st||0,1,al,c.sp||0,0,0,0,0,c.fl||0,c.ice||0);put(c.x,c.y,c.a,sc,sp.wr.x,s*sp.wr.y,ww,wh,fu0,rv0,fu1,rv1,0,1,al,c.sp||0,0,0,0,0,c.fl||0,c.ice||0)}}
  else put(c.x,c.y,c.a,sc,0,0,bw,bh,bu0,bv0,bu1,bv1,0,2,al,0,col[0],col[1],col[2],c.em===undefined?1:c.em,c.fl||0,c.ice||0)}
 return n}
function carUniforms(gl,m,resW,resH,cx,cy,zoom){const U=CARGL.U;gl.useProgram(CARGL.P);
 gl.uniform2f(U.uRes,resW,resH);gl.uniform2f(U.uCam,cx,cy);gl.uniform1f(U.uZoom,zoom);
 gl.uniform3fv(U.uSun,m.sun);gl.uniform3fv(U.uSunC,m.sunC);gl.uniform3fv(U.uAmb,m.amb);gl.uniform3fv(U.uSky,m.sky);gl.uniform3fv(U.uHor,m.hor);gl.uniform3fv(U.uGnd,m.gnd);
 gl.uniform1f(U.uTread,Math.max(0,Math.min(1,(zoom-45)/40)));gl.uniform1f(U.uFlake,0);gl.uniform1f(U.uRefl,m.refl||2.2)}
function carDraw(gl,n){glBind(gl,10,CARGL.tex[0]);glBind(gl,11,CARGL.tex[1]);glBind(gl,12,CARGL.tex[2]);
 gl.bindVertexArray(CARGL.vao);gl.bindBuffer(gl.ARRAY_BUFFER,CARGL.buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,CARGL.data,0,n*24);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,n);gl.disable(gl.BLEND);gl.bindVertexArray(null)}
// the match: cars on top of the ground, same camera as the ground shader
function carsFrame(cars,cx,cy,zoom){if(!GLS.ok||!CARGL.ok||!cars.length)return;const gl=GLS.gl,n=carInst(cars);if(!n)return;
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,GLS.w,GLS.h);carUniforms(gl,MOOD,GLS.w,GLS.h,cx,cy,zoom*GLS.s);carDraw(gl,n)}

// pictures for the menus: draws cars into a small off-screen target and copies them into a 2D canvas
// list: cars in the same form as above (positions in units, camera at cx,cy), ppu: pixels per unit. Returns false when the graphics chip is not available.
function carPicture(canvas,list,cx,cy,ppu,mood,trails,tm){if(!GLS.ok||!CARGL.ok)return false;const gl=GLS.gl,w=canvas.width,h=canvas.height;
 if(!CARGL.fbo||CARGL.fw<w||CARGL.fh<h){if(CARGL.fbo){gl.deleteFramebuffer(CARGL.fbo.fb);gl.deleteTexture(CARGL.fbo.tx[0])}CARGL.fw=Math.max(w,CARGL.fw);CARGL.fh=Math.max(h,CARGL.fh);CARGL.fbo=glFbo(gl,CARGL.fw,CARGL.fh,1)}
 const n=carInst(list);gl.bindFramebuffer(gl.FRAMEBUFFER,CARGL.fbo.fb);gl.viewport(0,0,CARGL.fw,CARGL.fh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 // the picture is drawn in the lower left corner of the target: shift the camera so its top-left is at pixel (0, fh-h)
 gl.viewport(0,0,w,h);
 if(trails&&trails.length&&TRL.ok)trailsDraw(gl,trails,w,h,cx,cy,ppu,mood||MOOD,tm||0,cx-w/ppu/2-3,cy-h/ppu/2-3,cx+w/ppu/2+3,cy+h/ppu/2+3);
 carUniforms(gl,mood||MOOD,w,h,cx,cy,ppu);carDraw(gl,n);
 const px=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 const img=new ImageData(w,h),o=img.data;
 for(let y=0;y<h;y++){const sy=(h-1-y)*w*4,dy=y*w*4;for(let x=0;x<w;x++){const i=sy+x*4,k=dy+x*4,a=px[i+3];if(a){const f=255/a;o[k]=Math.min(255,px[i]*f);o[k+1]=Math.min(255,px[i+1]*f);o[k+2]=Math.min(255,px[i+2]*f);o[k+3]=a}}}
 const g=canvas.getContext('2d');g.putImageData(img,0,0);return true}
