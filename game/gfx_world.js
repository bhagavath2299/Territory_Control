// ---------- 3D renderer, part 2: the arena. A black void with a neon floor: a faint grid, a glowing rim, land in the owners' colours, scorched land, power pads ----------
// The game runs on a flat map. The floor is one flat sheet drawn by one shader from small pictures of the map: where the arena ends (texEdge),
// who owns what (texOwn, turned into smooth coverage on the GPU), and which land is scorched (texScar).
const GW={built:0,u:null,pads:[],floor:null,floorMat:null,texOwn:null,texEdge:null,texScar:null,scData:null,scT:-9,scOn:0,scDirty:0};
const sm01=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
// ---- exact distance to the nearest set cell (Felzenszwalb), in cells ----
function edt1(f,n,d,v,z){let k=0;v[0]=0;z[0]=-1e20;z[1]=1e20;
 for(let q=1;q<n;q++){let s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);while(s<=z[k]){k--;s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k])}k++;v[k]=q;z[k]=s;z[k+1]=1e20}
 k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;const dq=q-v[k];d[q]=dq*dq+f[v[k]]}}
function edt2(on,w,h){const m=Math.max(w,h),f=new Float32Array(m),d=new Float32Array(m),v=new Int32Array(m),z=new Float32Array(m+1),g=new Float32Array(w*h);
 for(let i=0;i<g.length;i++)g[i]=on[i]?0:1e20;
 for(let x=0;x<w;x++){for(let y=0;y<h;y++)f[y]=g[y*w+x];edt1(f,h,d,v,z);for(let y=0;y<h;y++)g[y*w+x]=d[y]}
 for(let y=0;y<h;y++){for(let x=0;x<w;x++)f[x]=g[y*w+x];edt1(f,w,d,v,z);for(let x=0;x<w;x++)g[y*w+x]=d[x]}
 for(let i=0;i<g.length;i++)g[i]=Math.sqrt(g[i]);return g}
function blurSep(a,w,h,sig){const R=Math.ceil(sig*2.5),k=new Float32Array(R*2+1);let s=0;for(let i=-R;i<=R;i++){k[i+R]=Math.exp(-i*i/(2*sig*sig));s+=k[i+R]}for(let i=0;i<k.length;i++)k[i]/=s;
 const t=new Float32Array(a.length);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let c=0;for(let i=-R;i<=R;i++){const xx=Math.min(w-1,Math.max(0,x+i));c+=a[y*w+xx]*k[i+R]}t[y*w+x]=c}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let c=0;for(let i=-R;i<=R;i++){const yy=Math.min(h-1,Math.max(0,y+i));c+=t[yy*w+x]*k[i+R]}a[y*w+x]=c}
 return a}
// the floor is flat: everything stands at height 0
function gfxH(x,y){return 0}

// ---- the floor ----
function gwUniforms(){
 const U=GFX.U,th=GTH[0];
 GW.u={uMA:{value:null},uMB:{value:null},uEdge:{value:null},uScar:{value:null},
  uOwnSize:{value:new THREE.Vector2(MW,MH)},uWorld:{value:new THREE.Vector2(WW,WH)},
  uCol:{value:COLLIN.map(c=>new THREE.Vector3(c[0],c[1],c[2]))},uFlash:{value:[0,1,2,3].map(()=>new THREE.Vector4(0,0,1,0))},
  uEdgeC:{value:new THREE.Vector3(...linOf(th.edge))},uGridC:{value:new THREE.Vector3(...linOf(th.grid))},
  uTime:U.time,uGlowPass:U.glowPass,uFogN:U.fogNear,uFogF:U.fogFar,uQ:{value:1}}}
function gwVoidMat(){
 return new THREE.ShaderMaterial({uniforms:GW.u,extensions:{derivatives:true},
  vertexShader:'varying vec3 vWP;void main(){vec4 w=modelMatrix*vec4(position,1.);vWP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:`uniform sampler2D uMA,uMB,uEdge,uScar;uniform vec2 uOwnSize,uWorld;uniform vec3 uCol[6],uEdgeC,uGridC;uniform vec4 uFlash[4];
  uniform float uTime,uGlowPass,uFogN,uFogF;varying vec3 vWP;
  float h21(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
  float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
  // 1 on the lines of a grid with cells of size s (w: half the line width in pixels)
  float gridL(vec2 p,float s,float w){vec2 q=p/s,d=abs(fract(q-.5)-.5)/max(fwidth(q),vec2(1e-4));return 1.-smoothstep(w-.5,w+.5,min(d.x,d.y));}
  void main(){
   vec2 wp=vWP.xz,ouv=wp/uWorld,px=fwidth(wp);float pxu=max(max(px.x,px.y),1e-4);
   // where the arena ends: distance in units (+ inside), carried on outward beyond the map
   float sd=(texture2D(uEdge,clamp(ouv,0.,1.)).r-.5)*12.;vec2 ob=max(max(-wp,wp-uWorld),0.);float outD=length(ob);if(outD>0.)sd=min(sd,0.)-outD;
   float inA=smoothstep(-pxu,pxu,sd);
   vec3 base=vec3(.003,.0045,.01)*inA,emis=vec3(0.);
   // the grid: 4-unit cells, and 1-unit cells that fade away as the camera pulls back; it carries on faintly a little way past the rim
   float gMaj=gridL(wp,4.,.6),gMin=gridL(wp,1.,.45)*clamp(1.5-pxu*7.,0.,1.);
   vec2 cr=abs(fract(wp/4.-.5)-.5)*4.;float dot0=(1.-smoothstep(.06,.06+pxu*1.5,length(cr)))*inA;
   float gk=inA+(1.-inA)*.35*smoothstep(-8.,0.,sd);
   vec3 grid=uGridC*(gMaj*.085+gMin*.026)*gk+uGridC*dot0*.35;
   // land: coverage of the five players (smooth), the owner is the one with the most
   vec4 mA=texture2D(uMA,ouv),mB=texture2D(uMB,ouv);
   vec4 dxA=dFdx(mA),dyA=dFdy(mA);vec2 dB=vec2(dFdx(mB.x),dFdy(mB.x));
   float own=0.;
   if(mB.g>.01){
    float c=mA.x;vec2 gc=vec2(dxA.x,dyA.x);int cid=1;
    if(mA.y>c){c=mA.y;gc=vec2(dxA.y,dyA.y);cid=2;}if(mA.z>c){c=mA.z;gc=vec2(dxA.z,dyA.z);cid=3;}if(mA.w>c){c=mA.w;gc=vec2(dxA.w,dyA.w);cid=4;}if(mB.x>c){c=mB.x;gc=dB;cid=5;}
    vec3 oc=uCol[cid];
    float dOwn=(c-.5)/max(length(gc),1e-5)*pxu;   // units to the edge of this owner's land (+ inside)
    own=smoothstep(-pxu*.8,pxu*.8,dOwn);
    float rimW=max(.17,pxu*1.3),rim=(1.-smoothstep(rimW-pxu,rimW+pxu,dOwn))*own,inner=exp(-max(dOwn,0.)*1.1)*own;
    // inside: a deep tint of the colour with the grid lit in it, a fine weave and a slow sweep of light
    float weave=smoothstep(.86,.9,fract((wp.x-wp.y)*.9))*.5;
    float sweep=pow(.5+.5*sin((wp.x*.55+wp.y*.35)*.3-uTime*1.4),24.);
    base=mix(base,oc*(.06+weave*.025),own);
    grid=mix(grid,oc*(gMaj*.5+gMin*.12+dot0*.8),own);
    emis+=oc*(rim*2.1+inner*.3+sweep*.1*own);
    // a capture: a wave of light runs out from where the loop closed
    for(int fi=0;fi<4;fi++){vec4 fl=uFlash[fi];if(fl.z<1.){float dd=length(wp-fl.xy),rr=fl.z*32.;emis+=uCol[int(fl.w+.5)]*exp(-pow((dd-rr)/1.6,2.))*(1.-fl.z)*1.1*own;}}
   }
   // scorched land: embers and glowing cracks that cool as the scar wears off
   float sc=texture2D(uScar,ouv).r*(1.-own);
   if(sc>.004){float n1=vn(wp*1.7+vec2(uTime*.25,0.)),n2=vn(wp*5.3-vec2(0.,uTime*.55)),n3=vn(wp*.6);
    float crack=1.-smoothstep(.04,.12,abs(n1-.5)),heat=sc*(.5+.5*n2);
    vec3 ember=mix(vec3(.45,.04,.0),vec3(1.9,.55,.08),heat);
    emis+=ember*(crack*.95+.12+n3*.08)*sc;base+=vec3(.03,.005,.0)*sc;}
   // the rim of the arena: a bright line with a soft glow on both sides
   float ae=abs(sd);
   emis+=uEdgeC*((1.-smoothstep(.05,.05+pxu*1.5,ae))*1.7+exp(-ae*.9)*.12+exp(-ae*3.4)*.24)*(.86+.14*sin(uTime*1.8+(wp.x-wp.y)*.12))*(1.-own*.5);
   float fog=smoothstep(uFogN,uFogF,length(vWP-cameraPosition));
   vec3 col=(uGlowPass>.5?emis:base+grid+emis)*(1.-fog);
   gl_FragColor=vec4(col,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`})}

// ---- territory masks: the game's land map (one id per cell) is turned into smooth coverage fields on the GPU whenever it changes ----
// rtA = coverage of players 1-4 (r,g,b,a), rtB = coverage of player 5 (r) and of everybody together (g). A 5x5 gaussian over the cells, then the hardware filter between them.
function gwMaskInit(){
 if(GW.rtA)return;
 const mk=()=>new THREE.WebGLRenderTarget(MW,MH,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false,generateMipmaps:false});
 GW.rtA=mk();GW.rtB=mk();
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));
 GW.mm=new THREE.ShaderMaterial({uniforms:{tOwn:{value:null},uSize:{value:new THREE.Vector2(MW,MH)},uSet:{value:0}},depthTest:false,depthWrite:false,
  vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D tOwn;uniform vec2 uSize;uniform float uSet;
   void main(){ivec2 c=ivec2(gl_FragCoord.xy),mx=ivec2(uSize)-ivec2(1);float a0=0.,a1=0.,a2=0.,a3=0.,a4=0.,ws=0.;
    for(int j=-2;j<=2;j++)for(int i=-2;i<=2;i++){float w=exp(-float(i*i+j*j)*.174);ws+=w;int id=int(texelFetch(tOwn,clamp(c+ivec2(i,j),ivec2(0),mx),0).r*255.+.5);
     if(id==1)a0+=w;else if(id==2)a1+=w;else if(id==3)a2+=w;else if(id==4)a3+=w;else if(id==5)a4+=w;}
    a0/=ws;a1/=ws;a2/=ws;a3/=ws;a4/=ws;
    gl_FragColor=uSet<.5?vec4(a0,a1,a2,a3):vec4(a4,a0+a1+a2+a3+a4,0.,1.);}`});
 const m=new THREE.Mesh(g,GW.mm);m.frustumCulled=false;GW.mScene=new THREE.Scene();GW.mScene.add(m);GW.mCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 GW.u.uMA.value=GW.rtA.texture;GW.u.uMB.value=GW.rtB.texture;GW.maskDirty=1}
function gwMask(){
 if(!GW.maskDirty||!GW.rtA||!GW.texOwn)return;GW.maskDirty=0;
 const R=GFX.R,old=R.getRenderTarget();GW.mm.uniforms.tOwn.value=GW.texOwn;
 GW.mm.uniforms.uSet.value=0;R.setRenderTarget(GW.rtA);R.render(GW.mScene,GW.mCam);
 GW.mm.uniforms.uSet.value=1;R.setRenderTarget(GW.rtB);R.render(GW.mScene,GW.mCam);
 R.setRenderTarget(old)}
// ---- scorched land: how much of its 15 seconds each scorched cell has left (0..255), redrawn a few times a second while any is cooling ----
function gwScar(){
 if(!GW.texScar)return;const live=typeof SCARMAX!=='undefined'&&SCARMAX>TK;
 if(!live&&!GW.scOn)return;if(clk-GW.scT<(GW.scDirty?.05:.2))return;GW.scT=clk;GW.scDirty=0;
 const d=GW.scData,K=255/Math.max(1,SCART);let on=0;
 for(let i=0;i<d.length;i++){const r=SCAR[i]-TK;let v=0;if(r>0&&!own[i]){v=(r*K)|0;if(v>255)v=255;on=1}d[i]=v}
 GW.texScar.needsUpdate=true;GW.scOn=on}

// ---- building the arena of this match ----
function gwBuild(){
 if(!GFX.ok||IS_SRV||!LANDI)return;
 const t0=performance.now();
 if(!GW.u)gwUniforms();
 gwDispose();
 gfxSetTheme(0);
 // where the arena ends (signed distance in units, -6..6, smoothed so the rim is round instead of stepped)
 const inW=new Uint8Array(MW*MH);for(let i=0;i<inW.length;i++)inW[i]=ISL[i]?0:1;
 const dIn=edt2(inW,MW,MH),dOut=edt2(ISL,MW,MH),sdc=new Float32Array(MW*MH);
 for(let i=0;i<sdc.length;i++)sdc[i]=(ISL[i]?dIn[i]-.5:-(dOut[i]-.5))/MC;
 blurSep(sdc,MW,MH,1.2);
 const eb=new Uint8Array(MW*MH);for(let i=0;i<eb.length;i++)eb[i]=Math.max(0,Math.min(255,Math.round((sdc[i]/12+.5)*255)));
 if(GW.texEdge)GW.texEdge.dispose();GW.texEdge=dtex(eb,MW,MH,THREE.RedFormat,THREE.UnsignedByteType,{clamp:1});GW.u.uEdge.value=GW.texEdge;
 // ownership picture (the game's land map, uploaded as it is)
 if(!GW.texOwn){GW.texOwn=new THREE.DataTexture(own,MW,MH,THREE.RedFormat,THREE.UnsignedByteType);GW.texOwn.unpackAlignment=1;GW.texOwn.minFilter=GW.texOwn.magFilter=THREE.NearestFilter;GW.texOwn.generateMipmaps=false}
 GW.texOwn.needsUpdate=true;gwMaskInit();GW.maskDirty=1;
 // scorched land
 if(!GW.texScar){GW.scData=new Uint8Array(MW*MH);GW.texScar=dtex(GW.scData,MW,MH,THREE.RedFormat,THREE.UnsignedByteType,{clamp:1});GW.u.uScar.value=GW.texScar}
 else{GW.scData.fill(0);GW.texScar.needsUpdate=true}GW.scOn=0;
 // the floor: one sheet reaching a little beyond the map (past it the screen is cleared to black anyway)
 const mat=GW.floorMat||(GW.floorMat=gwVoidMat()),PAD=34,g=new THREE.PlaneGeometry(WW+2*PAD,WH+2*PAD,1,1);g.rotateX(-Math.PI/2);g.translate(WW/2,0,WH/2);
 GW.floor=new THREE.Mesh(g,mat);GW.floor.frustumCulled=false;GW.floor.renderOrder=-2;GW.floor.layers.enable(GLOW);GFX.S.add(GW.floor);
 gwPads();
 GW.built=1;GW.buildMs=performance.now()-t0}
function gwDispose(){
 if(GW.floor){GFX.S.remove(GW.floor);GW.floor.geometry.dispose();GW.floor=null}
 for(const g of GW.pads)GFX.S.remove(g);GW.pads=[];GW.built=0}

// ---- power pads: a hologram on the floor (rings that turn, the pad's sign, how much of it you hold), a column of light,
// and the pad's machine floating above it as a hologram. The pad shows its own colour until someone takes it, then the owner's ----
const PADCOL={cannon:'#ff8a3d',fort:'#4fd8ff',strike:'#ff4d5e',nitro:'#ffc83d'},PADIC={cannon:'cannon',fort:'fort',strike:'orbital',nitro:'bolt'},PADTEX={},PADLIN={};
function padIconTex(t){if(PADTEX[t])return PADTEX[t];const N=256,c=mkc(N,N),g=c.getContext('2d');
 const svg=(typeof IC!=='undefined'&&IC[PADIC[t]])||'',ds=[...svg.matchAll(/\sd="([^"]+)"/g)].map(m=>m[1]),ev=/evenodd/.test(svg);
 g.translate(N/2,N/2);const sc=N*.86/24;g.scale(sc,sc);g.translate(-12,-12);g.fillStyle='#fff';
 for(const d of ds){try{g.fill(new Path2D(d),ev?'evenodd':'nonzero')}catch(e){}}
 for(const m of svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)){g.beginPath();g.arc(+m[1],+m[2],+m[3],0,7);g.fill()}
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.NoColorSpace;tx.anisotropy=4;return PADTEX[t]=tx}
const PAD_FS=`uniform vec3 uC,uMe;uniform float uT,uP,uK,uA;uniform sampler2D uIcon;varying vec2 vUv;
float ln(float x,float w){return smoothstep(w,0.,abs(x));}
void main(){vec2 d=vUv*2.-1.;float r=length(d),an=atan(d.y,d.x),u=an/6.2832;
 float ring0=ln(r-.965,.012);
 float dash=step(.42,fract(u*28.+uT*.22))*ln(r-.905,.028);
 float tick=step(.7,fract(u*64.-uT*.35))*ln(r-.8,.035)*.8;
 float ring2=ln(r-.66,.012)*.8;
 float seg=step(.5,fract(u*3.-uT*.12))*ln(r-.72,.02);
 // how much of the pad you hold, from nothing to the half that unlocks it
 float arc=ln(r-.845,.03)*step(fract(.25-u),uP)*step(.001,uP);
 vec2 iv=d/.72+.5;float ic=(abs(d.x)<.36&&abs(d.y)<.36)?texture2D(uIcon,iv).r:0.;
 float hx=(1.-smoothstep(.07,.11,length(fract(d*7.)-.5)))*smoothstep(.62,.3,r)*.22;
 float fill=smoothstep(.62,0.,r)*.07;
 float pul=.85+.15*sin(uT*3.);
 vec3 cw=mix(uC,vec3(1.),.35);
 vec3 col=cw*((ring0*1.3+dash*1.5+tick*1.1+ring2*1.1+seg*.8)*pul)+uC*(fill+hx)+cw*ic*(1.7+.5*uK)+uMe*arc*2.4;
 gl_FragColor=vec4(col*uA*smoothstep(1.,.97,r),1.);}`;
const BEAM_FS=`uniform vec3 uC;uniform float uT,uA;varying vec2 vUv;
void main(){float h=vUv.y;float a=(1.-h)*(1.-h)*smoothstep(0.,.14,h);float band=pow(.5+.5*sin(h*34.-uT*5.),10.)*(1.-h)*smoothstep(0.,.1,h);
 gl_FragColor=vec4(uC*(a*.22+band*.22)*uA,1.);}`;
const HOLO_VS='varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const HOLO_FS=`uniform vec3 uC;uniform float uT,uA;varying vec3 vN;varying vec3 vW;
void main(){float f=1.-abs(normalize(vN).z);f=f*f;float scan=.62+.38*sin(vW.y*28.-uT*7.);float fl=.9+.1*sin(uT*29.+vW.y*4.);
 gl_FragColor=vec4(uC*(.16+f*1.6)*scan*fl*uA,1.);}`;
// the machine of each kind of pad, as one shape (drawn as a hologram)
const HOLOGEO={};
function holoGeo(t){if(HOLOGEO[t])return HOLOGEO[t];let L;
 if(t==='cannon')L=[gP(cyl(.5,.6,.16,24),0,.08,0),gP(box(.82,.34,.66,.06),0,.36,0),gP(cyl(.075,.075,1.25,10),.72,.4,.15,0,0,Math.PI/2),gP(cyl(.075,.075,1.25,10),.72,.4,-.15,0,0,Math.PI/2)];
 else if(t==='fort')L=[gP(new THREE.OctahedronGeometry(.48,0),0,.95,0,0,0,0,.78,1.45,.78),gP(new THREE.TorusGeometry(.7,.035,6,40),0,.95,0,Math.PI/2,0,0)];
 else if(t==='strike'){L=[gP(cyl(.18,.18,1.0,16),0,.7,0),gP(new THREE.ConeGeometry(.18,.46,16),0,1.43,0)];for(let k=0;k<4;k++)L.push(gP(box(.04,.32,.34),Math.cos(k*1.5708)*.18,.32,Math.sin(k*1.5708)*.18,0,-k*1.5708,0))}
 else{const s=new THREE.Shape(),P2=[[13,2],[4,14],[10,14],[9,22],[18,10],[12,10]];P2.forEach((q,i)=>{const x=(q[0]-11)*.075,y=(12-q[1])*.075;i?s.lineTo(x,y):s.moveTo(x,y)});s.closePath();
  const eg=new THREE.ExtrudeGeometry(s,{depth:.16,bevelEnabled:false});eg.translate(0,0,-.08);L=[gP(eg,0,1.0,0)]}
 return HOLOGEO[t]=gMerge(L)}
function gwPads(){
 GW.pads=[];const R0=ZR*1.3,disc=new THREE.PlaneGeometry(R0*2,R0*2);disc.rotateX(-Math.PI/2);
 const cg=new THREE.CylinderGeometry(R0*.82,R0*.82,7,40,1,true);cg.translate(0,3.5,0);
 const add={transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor};
 for(let zi=0;zi<ZN.length;zi++){const z=ZN[zi],g=new THREE.Group();g.position.set(z.x,0,z.y);
  const pu={uC:{value:new THREE.Vector3(1,1,1)},uMe:{value:new THREE.Vector3(1,1,1)},uT:GFX.U.time,uP:{value:0},uK:{value:0},uA:{value:1},uIcon:{value:padIconTex(z.t)}};
  const pad=new THREE.Mesh(disc,new THREE.ShaderMaterial(Object.assign({uniforms:pu,vertexShader:GRND_VS,fragmentShader:PAD_FS},add)));pad.position.y=.03;pad.renderOrder=1;pad.layers.enable(GLOW);
  const bu={uC:pu.uC,uT:GFX.U.time,uA:{value:1}};
  const beam=new THREE.Mesh(cg,new THREE.ShaderMaterial(Object.assign({uniforms:bu,vertexShader:GRND_VS,fragmentShader:BEAM_FS,side:THREE.DoubleSide},add)));beam.renderOrder=11;
  const hu={uC:pu.uC,uT:GFX.U.time,uA:{value:1}};
  const holo=new THREE.Mesh(holoGeo(z.t),new THREE.ShaderMaterial(Object.assign({uniforms:hu,vertexShader:HOLO_VS,fragmentShader:HOLO_FS,side:THREE.DoubleSide},add)));holo.position.y=.8;holo.scale.setScalar(1.6);holo.renderOrder=12;holo.layers.enable(GLOW);
  g.add(pad,beam,holo);g.userData={pu,bu,hu,holo,k:0};GFX.S.add(g);GW.pads.push(g)}}
function gwPadTick(){
 const t=GFX.time,me3=COLLIN[VS]||[1,1,1];
 for(let zi=0;zi<GW.pads.length;zi++){const g=GW.pads[zi],z=ZN[zi];if(!z)continue;const o=(typeof ZOWN!=='undefined'&&ZOWN[zi])||0,u=g.userData,c=o?COLLIN[o]:(PADLIN[z.t]||(PADLIN[z.t]=linOf(PADCOL[z.t])));
  u.k+=((o?1:0)-u.k)*.08;
  u.pu.uC.value.set(c[0],c[1],c[2]);u.pu.uMe.value.set(me3[0],me3[1],me3[2]);u.pu.uK.value=u.k;
  // your progress toward the half of the pad that unlocks it (full once it is yours)
  const mine=o===VS&&o?1:Math.min(1,((typeof ZMY!=='undefined'&&ZMY[zi])||0)*2);u.pu.uP.value=state==='menu'?0:mine;
  u.bu.uA.value=.55+.45*u.k;u.hu.uA.value=.75+.25*u.k;
  u.holo.rotation.y=t*.7+zi;u.holo.position.y=.8+Math.sin(t*1.8+zi)*.15}}

// ---- every frame: coverage of the land, scorched land, capture flashes, pads ----
function gwFrame(dt){
 if(!GW.built)return;
 GFX.U.time.value=GFX.time;gwPadTick();gwMask();gwScar();
 // capture flashes (up to 4 at a time)
 const F=GW.u.uFlash.value;for(let i=0;i<4;i++){const c=CAPW[i];if(c){const age=(clk-c.t0)/.8;F[i].set(c.x,c.y,Math.min(1,age),c.c)}else F[i].z=1}}
// ---------- 3D renderer, part 3: the four cars. Real vehicle shapes built from code: lofted bodies, a glass house with pillars and a painted roof, wheels, lights, class gear ----------
// Car space: +x is the nose, +y is up, +z is the right-hand side. One unit is one unit of the game map (a car is about 2.5 long).
const CAR_L=2.5,CAR_K=1.7;   // the model is about 2.5 long; on screen it is drawn CAR_K times bigger, so the car reads at a glance
const _gm=new THREE.Matrix4(),_gq=new THREE.Quaternion(),_ge=new THREE.Euler(),_gv=new THREE.Vector3(),_gs=new THREE.Vector3();
// a geometry moved, turned and scaled into place (rx, ry, rz in radians)
function gP(g,x,y,z,rx,ry,rz,sx,sy,sz){g=g.clone();_ge.set(rx||0,ry||0,rz||0);_gq.setFromEuler(_ge);_gv.set(x||0,y||0,z||0);_gs.set(sx===undefined?1:sx,sy===undefined?1:sy,sz===undefined?(sx===undefined?1:sx):sz);_gm.compose(_gv,_gq,_gs);g.applyMatrix4(_gm);return g}
// all parts that share a material become one geometry (positions, normals, uvs only)
function gMerge(list){const a=list.filter(Boolean).map(g=>{const n=g.index?g.toNonIndexed():g.clone();for(const k of Object.keys(n.attributes))if(k!=='position'&&k!=='normal'&&k!=='uv')n.deleteAttribute(k);if(!n.attributes.uv){const c=n.attributes.position.count;n.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(c*2),2))}return n});
 const m=THREE.mergeGeometries(a,false);for(const g of a)g.dispose();return m}
// a smooth hull from cross sections. st: [{x, w (half width), y0 (underside), y1 (top in the middle), k (squareness: 2 is an ellipse, 5 is a box with soft corners), zc (sideways shift)}]
// the stations are first smoothed along the length with a Catmull-Rom spline
function spStations(st,n){const out=[],x0=st[0].x,x1=st[st.length-1].x;
 for(let i=0;i<n;i++){const x=x0+(x1-x0)*i/(n-1);let k=0;while(k<st.length-2&&x>st[k+1].x)k++;
  const t=(x-st[k].x)/Math.max(1e-6,st[k+1].x-st[k].x),a=st[Math.max(0,k-1)],b=st[k],c=st[k+1],d=st[Math.min(st.length-1,k+2)],t2=t*t,t3=t2*t;
  const cr=f=>{const p0=a[f]===undefined?0:a[f],p1=b[f]===undefined?0:b[f],p2=c[f]===undefined?0:c[f],p3=d[f]===undefined?0:d[f];return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3)};
  out.push({x,w:Math.max(.02,cr('w')),y0:cr('y0'),y1:Math.max(cr('y0')+.01,cr('y1')),k:Math.max(2,cr('k')||3),zc:cr('zc')})}
 return out}
function loft(st,seg,smooth){seg=seg||16;if(smooth!==0)st=spStations(st,smooth||Math.max(14,st.length*3));const n=st.length,pos=[],uv=[],idx=[],xs=st[0].x,xe=st[n-1].x;let wm=0;for(const s of st)wm=Math.max(wm,s.w);
 for(let i=0;i<n;i++){const s=st[i],e=2/(s.k||2.6);
  for(let j=0;j<=seg;j++){const th=Math.PI*(1-j/seg),c=Math.cos(th),sn=Math.sin(th),z=Math.sign(c)*Math.pow(Math.abs(c),e)*s.w+(s.zc||0),y=s.y0+(s.y1-s.y0)*Math.pow(Math.abs(sn),e);
   pos.push(s.x,y,z);uv.push((s.x-xs)/(xe-xs),z/(2*wm)+.5)}}
 for(let i=0;i<n-1;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j,b=a+1,c=a+seg+1,d=c+1;idx.push(a,b,c,b,d,c)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g}
const cyl=(r0,r1,h,s)=>new THREE.CylinderGeometry(r0,r1,h,s||14);
const box=(x,y,z,r)=>r?new THREE.RoundedBoxGeometry(x,y,z,2,r):new THREE.BoxGeometry(x,y,z);
const tubeX=(r,l,s)=>gP(cyl(r,r,l,s||8),0,0,0,0,0,Math.PI/2);     // a cylinder lying along x
const tubeZ=(r,l,s)=>gP(cyl(r,r,l,s||8),0,0,0,Math.PI/2,0,0);     // a cylinder lying along z
// a tube from one point to another (roll cages, bars, suspension arms)
const _ta=new THREE.Vector3(),_tb=new THREE.Vector3(),_tq=new THREE.Quaternion(),_tm=new THREE.Matrix4(),_t1=new THREE.Vector3(1,1,1);
function tubeAB(a,b,r,s){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz),g=cyl(r,r,l,s||7);_tq.setFromUnitVectors(_ta.set(0,1,0),_tb.set(dx/l,dy/l,dz/l));_tm.compose(_ta.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),_tq,_t1);g.applyMatrix4(_tm);return g}
// triangles given as a flat list of points -> a geometry with plan-view uvs (the same mapping as the hull, so paint lines up) and smooth normals with creases
function triGeo(pts,uvf,crease){const n=pts.length,pos=new Float32Array(n*3),uv=new Float32Array(n*2);for(let i=0;i<n;i++){const p=pts[i];pos[i*3]=p[0];pos[i*3+1]=p[1];pos[i*3+2]=p[2];const u=uvf?uvf(p[0],p[2]):[0,0];uv[i*2]=u[0];uv[i*2+1]=u[1]}
 let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g=THREE.mergeVertices(g,1e-4);g.computeVertexNormals();return crease?THREE.toCreasedNormals(g,crease):g}
// The glass house of a car: a ring at the belt line and a smaller ring at the roof, both rounded rectangles. Between them glass, with painted pillars at the four
// corners (pilF / pilR: half width in degrees at the front and at the back; bp: half width of a pillar in the middle of each side, 0 for none; solidRear: the back of the house is closed). On top the painted roof.
function greenhouse(o,uvf){
 const M=72,e=2/(o.n||5),ring=(x0,x1,w,y)=>{const p=[],cx=(x0+x1)/2,ax=(x1-x0)/2;for(let i=0;i<M;i++){const th=i/M*6.2832,c=Math.cos(th),s=Math.sin(th);p.push([cx+Math.sign(c)*Math.pow(Math.abs(c),e)*ax,y,Math.sign(s)*Math.pow(Math.abs(s),e)*w])}return p};
 const B=ring(o.x0,o.x1,o.w,o.y),T=ring(o.tx0,o.tx1,o.tw,o.ty),k=.56,mx=(o.tx0+o.tx1)/2,hx=(o.tx1-o.tx0)/2,cr=o.crown===undefined?.02:o.crown,T2=ring(mx-hx*k,mx+hx*k,o.tw*k,o.ty+cr*.8);
 const pf=(o.pilF===undefined?6:o.pilF)*Math.PI/180,pr=(o.pilR===undefined?9:o.pilR)*Math.PI/180,gl=[],pl=[],rf=[];
 for(let i=0;i<M;i++){const j=(i+1)%M,th=(i+.5)/M*6.2832,c=Math.cos(th),a4=((th%1.5708)+1.5708)%1.5708;
  const pil=Math.abs(a4-.7854)<(c>0?pf:pr)||(o.bp&&Math.abs(c)<o.bp)||(o.solidRear&&c<-o.solidRear);
  (pil?pl:gl).push(B[i],T[j],B[j],B[i],T[i],T[j]);
  rf.push(T2[i],T[j],T[i],T2[i],T2[j],T[j],[mx,o.ty+cr,0],T2[j],T2[i])}
 return{glass:triGeo(gl,null,.5),pillar:pl.length?triGeo(pl,uvf,.5):null,roof:triGeo(rf,uvf,.6)}}

// ---------- the shapes of each class ----------
// body: the lower hull in paint (cross sections, smoothed into a curve). cab: the glass house (see greenhouse), null for an open car.
// wr / ww: wheel radius and width; wz: how far out the wheels stand; wx: front and rear axle. emb: where the class mark is painted [x, z, size].
const CARS3D=[
 { // Striker: a low sports coupe, wide at the rear, with a wing
  wr:.235,ww:.2,wz:.5,wx:[.8,-.78],emb:[-.13,0,.17],
  body:[{x:-1.27,w:.36,y0:.2,y1:.34,k:3.4},{x:-1.2,w:.5,y0:.15,y1:.46,k:4},{x:-.95,w:.575,y0:.12,y1:.535,k:4.4},{x:-.5,w:.57,y0:.12,y1:.53,k:4.6},{x:0,w:.55,y0:.12,y1:.5,k:4.6},{x:.4,w:.55,y0:.12,y1:.475,k:4.6},{x:.8,w:.565,y0:.12,y1:.44,k:4.4},{x:1.05,w:.52,y0:.14,y1:.375,k:4},{x:1.21,w:.42,y0:.17,y1:.3,k:3.4},{x:1.27,w:.28,y0:.19,y1:.25,k:3}],
  cab:{x0:-.74,x1:.47,w:.455,y:.485,tx0:-.34,tx1:.1,tw:.36,ty:.715,n:4.6,pilF:5,pilR:8,crown:.022}},
 { // Titan: a tall armoured truck with small windows and big wheels
  wr:.36,ww:.3,wz:.72,wx:[.76,-.78],emb:[-.38,0,.24],
  body:[{x:-1.2,w:.6,y0:.36,y1:.66,k:6},{x:-1.12,w:.72,y0:.3,y1:.74,k:7},{x:.3,w:.73,y0:.3,y1:.74,k:7},{x:.85,w:.71,y0:.3,y1:.72,k:6.5},{x:1.1,w:.66,y0:.32,y1:.64,k:6},{x:1.2,w:.56,y0:.36,y1:.54,k:5}],
  cab:{x0:-1.05,x1:.44,w:.66,y:.72,tx0:-1.0,tx1:.26,tw:.6,ty:1.08,n:8,pilF:9,pilR:20,bp:.16,solidRear:.45,crown:.014}},
 { // Gunner: a pickup with a cannon on the bed, the barrel reaching forward over the cab
  wr:.3,ww:.24,wz:.6,wx:[.84,-.8],emb:[.12,0,.15],
  body:[{x:-1.3,w:.5,y0:.28,y1:.5,k:5},{x:-1.23,w:.6,y0:.22,y1:.6,k:6.5},{x:-.2,w:.61,y0:.22,y1:.62,k:6.5},{x:.5,w:.61,y0:.22,y1:.6,k:6},{x:.95,w:.6,y0:.22,y1:.56,k:5.5},{x:1.2,w:.54,y0:.24,y1:.48,k:5},{x:1.3,w:.42,y0:.27,y1:.4,k:4.2}],
  cab:{x0:-.2,x1:.64,w:.53,y:.6,tx0:-.12,tx1:.36,tw:.46,ty:.92,n:6.5,pilF:6,pilR:11,crown:.018}},
 { // Sapper: an open buggy with a roll cage, wheels standing far out
  wr:.3,ww:.26,wz:.68,wx:[.84,-.8],emb:[-.19,0,.2],
  body:[{x:-1.12,w:.38,y0:.26,y1:.46,k:4},{x:-.95,w:.5,y0:.22,y1:.54,k:4.6},{x:-.3,w:.5,y0:.2,y1:.5,k:4.6},{x:.35,w:.48,y0:.2,y1:.46,k:4.4},{x:.85,w:.4,y0:.22,y1:.4,k:4},{x:1.1,w:.28,y0:.25,y1:.33,k:3.4},{x:1.17,w:.18,y0:.27,y1:.3,k:3}],
  cab:null}];

// ---------- paint: the player's colour over the whole car, with panel lines, a finish (skin) and the class mark on the roof ----------
const SKINL={sport:'Stock',muscle:'Twin stripe',f1:'Carbon'};
function liveryCanvas(col,skin,cl){const W=512,H=256,c=mkc(W,H),g=c.getContext('2d'),D=CARS3D[cl],xs=D.body[0].x,xe=D.body[D.body.length-1].x;let wm=0;for(const s of D.body)wm=Math.max(wm,s.w);
 const X=x=>(x-xs)/(xe-xs)*W,Y=z=>(.5-z/(2*wm))*H;   // the picture is flipped when it becomes a texture, so the right-hand side (+z) is at the top
 g.fillStyle=col;g.fillRect(0,0,W,H);
 // paint depth: a touch lighter along the middle, darker toward the sills
 g.fillStyle=lg(g,0,0,0,H,[[0,'rgba(0,0,0,.30)'],[.2,'rgba(0,0,0,0)'],[.5,'rgba(255,255,255,.08)'],[.8,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.30)']]);g.fillRect(0,0,W,H);
 if(skin==='f1'){ // carbon bonnet and tail, colour in between
  const weave=(x0,x1)=>{g.fillStyle='#10131a';g.fillRect(x0,0,x1-x0,H);for(let y=0;y<H;y+=4)for(let x=x0;x<x1;x+=4){g.fillStyle=((x+y)>>2)&1?'#1a1e28':'#0b0d12';g.fillRect(x,y,4,4)}};
  weave(W*.66,W*.93);weave(W*.04,W*.2);g.fillStyle=col;g.fillRect(0,H*.47,W,H*.06)}
 else if(skin==='muscle'){g.fillStyle='rgba(255,255,255,.95)';g.fillRect(0,H*.36,W,H*.085);g.fillRect(0,H*.555,W,H*.085);g.fillStyle='rgba(0,0,0,.32)';g.fillRect(0,H*.445,W,H*.012);g.fillRect(0,H*.543,W,H*.012)}
 else{g.fillStyle='rgba(255,255,255,.93)';g.fillRect(0,H*.455,W,H*.09);g.fillStyle='rgba(0,0,0,.26)';g.fillRect(0,H*.545,W,H*.01);g.fillRect(0,H*.445,W,H*.01)}
 // panel gaps: a dark line with a light one beside it
 const gap=(pts,close)=>{for(const [o,st,lw] of [[0,'rgba(0,0,0,.6)',2.2],[1.4,'rgba(255,255,255,.2)',1.1]]){g.strokeStyle=st;g.lineWidth=lw;g.lineJoin='round';g.beginPath();pts.forEach((p,i)=>i?g.lineTo(X(p[0])+o,Y(p[1])+o):g.moveTo(X(p[0])+o,Y(p[1])+o));if(close)g.closePath();g.stroke()}};
 if(cl===0){gap([[.5,-.46],[.62,-.4],[1.12,-.36],[1.2,0],[1.12,.36],[.62,.4],[.5,.46]]);gap([[-.78,-.47],[-.9,-.42],[-1.18,-.4],[-1.18,.4],[-.9,.42],[-.78,.47]]);gap([[.2,-.56],[.2,-.47]]);gap([[.2,.56],[.2,.47]]);gap([[-.55,-.56],[-.55,-.48]]);gap([[-.55,.56],[-.55,.48]])}
 else if(cl===1){gap([[.47,-.6],[1.08,-.56],[1.08,.56],[.47,.6]],true);gap([[.78,-.56],[.78,.56]]);for(const z of [-.74,.74]){gap([[-.2,z],[-.2,z*.9]]);gap([[-.75,z],[-.75,z*.9]])}}
 else if(cl===2){gap([[.67,-.5],[1.16,-.46],[1.22,0],[1.16,.46],[.67,.5]]);gap([[-.24,-.61],[-.24,.61]]);gap([[-1.22,-.5],[-1.22,.5]]);gap([[.2,-.61],[.2,-.53]]);gap([[.2,.61],[.2,.53]])}
 else{gap([[.36,-.4],[.98,-.3],[1.04,0],[.98,.3],[.36,.4]]);gap([[-.5,-.5],[-.5,-.4]]);gap([[-.5,.5],[-.5,.4]])}
 // dust thrown up along the sills and over the tail
 g.fillStyle=lg(g,0,0,0,H,[[0,'rgba(120,104,84,.55)'],[.13,'rgba(120,104,84,0)'],[.87,'rgba(120,104,84,0)'],[1,'rgba(120,104,84,.55)']]);g.fillRect(0,0,W,H);
 g.fillStyle=lg(g,0,0,W*.2,0,[[0,'rgba(120,104,84,.3)'],[1,'rgba(120,104,84,0)']]);g.fillRect(0,0,W*.2,H);
 // the class mark, large, where it shows from above (on the roof)
 if(D.emb&&typeof clsGlyph==='function'){g.save();g.translate(X(D.emb[0]),Y(D.emb[1]));const s=D.emb[2]/(xe-xs)*W;g.rotate(Math.PI/2);
  clsGlyph(cl,1.5,1.5,s,'rgba(0,0,0,.3)',g);clsGlyph(cl,0,0,s,'rgba(255,255,255,.96)',g);g.restore()}
 return c}
function liveryTex(col,skin,cl){const t=new THREE.CanvasTexture(liveryCanvas(col,skin,cl));t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;return t}
// round soft spot used for light pools and contact shadows (alpha only)
let _spotTex=null;
function spotTex(){if(_spotTex)return _spotTex;const c=mkc(64,64),g=c.getContext('2d');g.fillStyle=rg(g,32,32,0,32,32,32,[[0,'rgba(255,255,255,1)'],[.4,'rgba(255,255,255,.55)'],[1,'rgba(255,255,255,0)']]);g.fillRect(0,0,64,64);
 _spotTex=new THREE.CanvasTexture(c);_spotTex.colorSpace=THREE.SRGBColorSpace;return _spotTex}

// ---------- a whole car ----------
const CARGEO=[];
// a tyre with rounded shoulders, a rim with spokes, and the arch lip that sits over the wheel
function tireGeo(r,w){const h=w/2,rm=r*.62,P=(a,b)=>new THREE.Vector2(a,b);
 const g=new THREE.LatheGeometry([P(rm,-h*.9),P(r*.82,-h),P(r*.94,-h*.86),P(r*.995,-h*.55),P(r,-h*.2),P(r,h*.2),P(r*.995,h*.55),P(r*.94,h*.86),P(r*.82,h),P(rm,h*.9)],28);g.rotateX(Math.PI/2);return g}
function rimGeo(r,w){const rm=r*.64,parts=[];
 parts.push(gP(new THREE.LatheGeometry([new THREE.Vector2(0,w*.34),new THREE.Vector2(rm*.34,w*.4),new THREE.Vector2(rm*.5,w*.3),new THREE.Vector2(rm*.96,w*.36),new THREE.Vector2(rm,w*.44),new THREE.Vector2(rm,w*.18)],22),0,0,0,Math.PI/2,0,0));
 for(let k=0;k<5;k++)parts.push(gP(box(rm*.22,rm*1.9,w*.16,.012),0,0,w*.38,0,0,k/5*Math.PI));
 return gMerge(parts)}
function flareGeo(R0,R1,w){const sh=new THREE.Shape();sh.absarc(0,0,R1,.1,Math.PI-.1,false);sh.absarc(0,0,R0,Math.PI-.1,.1,true);sh.closePath();
 const g=new THREE.ExtrudeGeometry(sh,{depth:w,bevelEnabled:true,bevelThickness:.018,bevelSize:.016,bevelSegments:2,curveSegments:16});g.translate(0,0,-w/2);return g}
function carGeoms(cl){
 if(CARGEO[cl])return CARGEO[cl];const D=CARS3D[cl],G={},B=D.body,xs=B[0].x,xe=B[B.length-1].x;let wmax=0;for(const s of B)wmax=Math.max(wmax,s.w);
 const uvf=(x,z)=>[(x-xs)/(xe-xs),z/(2*wmax)+.5];
 G.body=loft(B,26,40);
 if(D.cab){const gh=greenhouse(D.cab,uvf);G.cab=gh.glass;G.roof=gh.pillar?gMerge([gh.roof,gh.pillar]):gh.roof}
 const wr=D.wr,ww=D.ww,front=xe,back=xs;
 G.tire=tireGeo(wr,ww);G.rim=rimGeo(wr,ww);G.hub=gP(cyl(wr*.16,wr*.16,ww*1.0,12),0,0,0,Math.PI/2,0,0);
 const trim=[],metal=[],paint=[],glow=[],lampF=[],lampR=[],barrel=[],barrelM=[],dark=[];
 // an underbody pan so the ground never shows through
 trim.push(gP(box(front-back-.4,.1,wmax*1.5,.03),(front+back)/2,B[2].y0+.02,0));
 if(cl===0){ // Striker
  for(const x of D.wx)for(const z of [-D.wz,D.wz])paint.push(gP(flareGeo(wr*1.04,wr*1.04+.045,ww*1.06),x,wr,z+(z>0?.03:-.03)));
  // rear wing on two struts, with end plates
  paint.push(gP(box(.3,.028,1.08,.012),-1.1,.7,0),gP(box(.3,.15,.03,.01),-1.1,.66,.545),gP(box(.3,.15,.03,.01),-1.1,.66,-.545),gP(box(.07,.02,1.02,.008),-.97,.725,0));
  trim.push(gP(box(.05,.2,.04),-1.06,.6,.26),gP(box(.05,.2,.04),-1.06,.6,-.26));
  // front splitter, side skirts, diffuser, bonnet vents, the scuttle under the windscreen
  trim.push(gP(box(.3,.03,1.08,.012),1.12,.145,0),gP(box(1.2,.06,.04,.012),0,.15,.565),gP(box(1.2,.06,.04,.012),0,.15,-.565),gP(box(.22,.07,.9,.012),-1.2,.18,0),
   gP(box(.2,.012,.1,.005),.78,.452,.2,0,.25,0),gP(box(.2,.012,.1,.005),.78,.452,-.2,0,-.25,0),gP(box(.07,.014,.84,.005),.47,.482,0));
  // mirrors, exhausts, engine cover louvres behind the rear glass
  for(const z of [-1,1]){paint.push(gP(box(.09,.05,.12,.02),.36,.55,z*.52));trim.push(gP(box(.03,.03,.1),.36,.52,z*.47))}
  metal.push(gP(tubeX(.045,.14,10),-1.27,.25,.2),gP(tubeX(.045,.14,10),-1.27,.25,-.2));
  for(let k=0;k<3;k++)trim.push(gP(box(.035,.012,.5,.004),-.86-k*.075,.538,0));
  lampF.push(gP(box(.17,.03,.19,.012),1.06,.365,.37,0,-.3,0),gP(box(.17,.03,.19,.012),1.06,.365,-.37,0,.3,0));
  lampR.push(gP(box(.03,.035,.94,.012),-1.255,.4,0));
  glow.push(gP(box(.05,.012,.03),1.14,.34,.3),gP(box(.05,.012,.03),1.14,.34,-.3));
  for(const s of [1,-1]){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(.7,.02*s);sh.lineTo(.78,.1*s);sh.lineTo(.12,.14*s);sh.closePath();const bl=new THREE.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:true,bevelThickness:.01,bevelSize:.01,bevelSegments:1});bl.rotateX(-Math.PI/2);G['blade'+(s>0?'R':'L')]=bl}}
 else if(cl===1){ // Titan
  for(const x of D.wx)for(const z of [-D.wz,D.wz])trim.push(gP(flareGeo(wr*1.05,wr*1.05+.08,ww*1.12),x,wr,z+(z>0?.03:-.03)));
  // armour: door plates with bolts, a sloped bonnet plate, a roof hatch, a light bar
  paint.push(gP(box(.62,.3,.05,.02),-.5,.56,.745),gP(box(.62,.3,.05,.02),-.5,.56,-.745),gP(box(.5,.3,.05,.02),.1,.56,.75),gP(box(.5,.3,.05,.02),.1,.56,-.75),gP(box(.46,.035,1.0,.015),.76,.745,0));
  for(const z of [-.775,.775])for(const x of [-.76,-.5,-.24,-.1,.1,.3])trim.push(gP(cyl(.022,.022,.02,6),x,.66,z,Math.PI/2,0,0),gP(cyl(.022,.022,.02,6),x,.46,z,Math.PI/2,0,0));
  trim.push(gP(cyl(.24,.26,.05,20),-.3,1.11,0),gP(box(.5,.05,.05),-.3,1.1,.3),gP(box(.05,.05,.6),-.56,1.1,0),gP(box(.34,.012,.5,.005),.86,.766,0));
  metal.push(gP(cyl(.17,.19,.04,18),-.3,1.14,0));
  // bull bar with a winch, a snorkel, side steps, mud flaps
  metal.push(gP(tubeZ(.04,1.2),1.27,.62,0),gP(tubeZ(.04,1.2),1.27,.4,0),tubeAB([1.27,.4,.4],[1.27,.62,.4],.035),tubeAB([1.27,.4,-.4],[1.27,.62,-.4],.035),tubeAB([1.16,.4,.58],[1.27,.4,.58],.035),tubeAB([1.16,.4,-.58],[1.27,.4,-.58],.035));
  trim.push(gP(box(.16,.14,.5,.03),1.2,.45,0),gP(cyl(.05,.05,.62,10),.5,.92,.7),gP(box(.1,.1,.1,.02),.5,1.24,.7),gP(box(1.0,.05,.14,.02),-.02,.3,.83),gP(box(1.0,.05,.14,.02),-.02,.3,-.83),gP(box(.03,.22,.3),-1.14,.3,.72),gP(box(.03,.22,.3),-1.14,.3,-.72));
  // spare wheel and fuel cans on the back, antenna
  trim.push(gP(tireGeo(.3,.2),-1.3,.66,0,0,Math.PI/2,0),gP(box(.14,.3,.2,.03),-1.24,.6,.5),gP(box(.14,.3,.2,.03),-1.24,.6,-.5));
  metal.push(gP(cyl(.1,.1,.08,12),-1.34,.66,0,0,0,Math.PI/2),gP(cyl(.012,.012,.7,5),-.9,1.42,.5));
  lampF.push(gP(box(.05,.1,.16,.02),1.19,.56,.48),gP(box(.05,.1,.16,.02),1.19,.56,-.48),gP(box(.05,.05,.62,.015),.2,1.12,0));
  lampR.push(gP(box(.04,.14,.1,.015),-1.2,.6,.63),gP(box(.04,.14,.1,.015),-1.2,.6,-.63));
  glow.push(gP(box(.04,.03,.06),1.19,.47,.48),gP(box(.04,.03,.06),1.19,.47,-.48))}
 else if(cl===2){ // Gunner
  for(const x of D.wx)for(const z of [-D.wz,D.wz])trim.push(gP(flareGeo(wr*1.05,wr*1.05+.06,ww*1.1),x,wr,z+(z>0?.025:-.025)));
  // the open bed: a dark liner, the tailgate, a roll bar behind the cab, ammunition boxes and a spare wheel
  dark.push(gP(box(.94,.02,1.04),-.74,.632,0));
  paint.push(gP(box(.035,.07,1.12,.01),-1.24,.66,0),gP(box(1.0,.07,.04,.01),-.74,.66,.575),gP(box(1.0,.07,.04,.01),-.74,.66,-.575),gP(box(.04,.07,1.12,.01),-.24,.66,0));
  metal.push(tubeAB([-.3,.62,.5],[-.3,1.0,.44],.03),tubeAB([-.3,.62,-.5],[-.3,1.0,-.44],.03),tubeAB([-.3,1.0,.44],[-.3,1.0,-.44],.03));
  trim.push(gP(box(.22,.16,.3,.02),-1.02,.72,.34),gP(box(.22,.16,.3,.02),-1.02,.72,-.34),gP(box(.2,.12,.2,.02),-.44,.7,-.36),gP(tireGeo(.24,.16),-.46,.69,.3,Math.PI/2,0,0));
  // the gun: a pedestal, a turning ring, a shield in the car's colour, the cannon itself moves (recoil)
  trim.push(gP(cyl(.2,.24,.14,20),-.74,.71,0),gP(cyl(.1,.12,.2,12),-.74,.86,0),gP(box(.3,.14,.24,.03),-.72,1.02,0));
  paint.push(gP(box(.05,.3,.56,.02),-.52,1.04,0,0,0,.18),gP(box(.3,.03,.5,.012),-.68,1.19,0));
  barrel.push(gP(tubeX(.055,1.5,12),.18,1.03,0));barrelM.push(gP(tubeX(.085,.2,12),.93,1.03,0),gP(tubeX(.075,.3,12),-.44,1.03,0),gP(box(.1,.04,.12),.1,1.1,0));
  // bumpers, bonnet scoop, the scuttle, mirrors, antenna, roof lights
  trim.push(gP(box(.12,.14,1.16,.04),1.3,.34,0),gP(box(.1,.12,1.12,.04),-1.33,.36,0),gP(box(.3,.03,.3,.012),.92,.585,0),gP(box(.07,.014,.94,.005),.64,.612,0));
  for(const z of [-1,1]){paint.push(gP(box(.09,.07,.13,.02),.52,.7,z*.63));trim.push(gP(box(.03,.03,.1),.52,.66,z*.57))}
  metal.push(gP(cyl(.012,.012,.8,5),-.16,1.3,-.4));
  lampF.push(gP(box(.06,.09,.2,.02),1.26,.44,.4),gP(box(.06,.09,.2,.02),1.26,.44,-.4),gP(box(.04,.04,.36,.012),.3,.96,0));
  lampR.push(gP(box(.04,.14,.09,.015),-1.31,.5,.52),gP(box(.04,.14,.09,.015),-1.31,.5,-.52));
  glow.push(gP(tubeX(.058,.02,12),.99,1.03,0))}
 else{ // Sapper
  // mudguards over the wheels, in the car's colour
  for(const x of D.wx)for(const z of [-D.wz,D.wz])paint.push(gP(flareGeo(wr*1.1,wr*1.1+.05,ww*1.25),x,wr,z));
  // the open cockpit: floor, two seats, the wheel, the dash
  dark.push(gP(box(.86,.02,.74),-.14,.515,0));
  trim.push(gP(box(.3,.1,.3,.04),-.2,.56,.2),gP(box(.3,.1,.3,.04),-.2,.56,-.2),gP(box(.08,.36,.3,.03),-.36,.72,.2,0,0,.16),gP(box(.08,.36,.3,.03),-.36,.72,-.2,0,0,.16),gP(new THREE.TorusGeometry(.09,.018,6,14),.14,.68,-.2,0,Math.PI/2,.5),gP(box(.3,.1,.8,.03),.3,.52,0));
  // roll cage and the roof panel (in the car's colour, so the driver's colour shows from above)
  const Q=[[-.6,.52,.42],[.3,.5,.4],[-.5,1.0,.36],[.12,1.0,.36]];
  for(const s of [1,-1]){const q=Q.map(p=>[p[0],p[1],p[2]*s]);metal.push(tubeAB(q[0],q[2],.026),tubeAB(q[1],q[3],.026),tubeAB(q[2],q[3],.026),tubeAB(q[0],[q[0][0]-.3,.56,q[0][2]],.022),tubeAB(q[2],[-.9,.6,.3*s],.022))}
  metal.push(tubeAB([-.5,1.0,.36],[-.5,1.0,-.36],.026),tubeAB([.12,1.0,.36],[.12,1.0,-.36],.026),tubeAB([.3,.5,.4],[.3,.5,-.4],.022));
  G.roof=gP(box(.66,.03,.76,.012),-.19,1.035,0);{const p=G.roof.attributes.position,u=G.roof.attributes.uv;for(let i=0;i<p.count;i++){const q=uvf(p.getX(i),p.getZ(i));u.setXY(i,q[0],q[1])}}
  // suspension arms out to each wheel, bumper bar, skid plate
  for(const x of D.wx)for(const s of [1,-1]){metal.push(tubeAB([x+.12,.3,.36*s],[x,.3,(D.wz-.1)*s],.022),tubeAB([x-.12,.3,.36*s],[x,.3,(D.wz-.1)*s],.022),tubeAB([x,.46,.34*s],[x,.34,(D.wz-.12)*s],.03))}
  metal.push(gP(tubeZ(.03,.76),1.2,.3,0),tubeAB([1.2,.3,.3],[.95,.34,.3],.025),tubeAB([1.2,.3,-.3],[.95,.34,-.3],.025),gP(box(.3,.02,.5),1.05,.23,0,0,0,-.3));
  // engine at the back with twin pipes, the mine rack, the drone tube on the side
  trim.push(gP(box(.34,.2,.44,.04),-.82,.64,0),gP(box(.3,.03,.84,.01),-1.14,.5,0),gP(box(.2,.2,.3,.05),-.5,.6,0));
  metal.push(gP(tubeX(.035,.3,8),-1.0,.72,.14),gP(tubeX(.035,.3,8),-1.0,.72,-.14),gP(tubeX(.055,.5,10),-.3,.92,-.44));
  for(let k=0;k<3;k++){trim.push(gP(cyl(.11,.12,.1,14),-1.16,.56,(k-1)*.27));glow.push(gP(cyl(.03,.03,.02,8),-1.16,.62,(k-1)*.27))}
  lampF.push(gP(box(.04,.045,.5,.012),.14,1.07,0),gP(box(.05,.06,.1,.015),1.1,.33,.16),gP(box(.05,.06,.1,.015),1.1,.33,-.16));
  lampR.push(gP(box(.04,.05,.1,.012),-1.14,.5,.36),gP(box(.04,.05,.1,.012),-1.14,.5,-.36))}
 const none=()=>[gP(box(.01,.01,.01),0,-9,0)];
 G.paint=gMerge(paint.length?paint:none());G.trim=gMerge(trim);G.metal=gMerge(metal.length?metal:none());G.glow=gMerge(glow.length?glow:none());G.lampF=gMerge(lampF);G.lampR=gMerge(lampR);G.dark=dark.length?gMerge(dark):null;
 if(barrel.length){G.barrel=gMerge(barrel);G.barrelM=gMerge(barrelM)}
 return CARGEO[cl]=G}
let _flakeN=null;
function flakeNormal(){if(_flakeN||!GFX.tex)return _flakeN;_flakeN=GFX.tex.gritN.clone();_flakeN.repeat.set(26,12);_flakeN.wrapS=_flakeN.wrapT=THREE.RepeatWrapping;_flakeN.needsUpdate=true;return _flakeN}
function carMats(col,skin,cl){
 const lt=liveryTex(col,skin,cl),lc=cLin(col),fl=flakeNormal();
 const paint=new THREE.MeshPhysicalMaterial({color:0xffffff,map:lt,metalness:.3,roughness:.36,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.0,normalMap:fl,normalScale:new THREE.Vector2(.06,.06)});
 const paint2=new THREE.MeshPhysicalMaterial({color:lc,metalness:.3,roughness:.36,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.0,normalMap:fl,normalScale:new THREE.Vector2(.06,.06)});
 const glass=new THREE.MeshPhysicalMaterial({color:0xa9b8c8,metalness:1,roughness:.06,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:1.6});
 const trim=new THREE.MeshStandardMaterial({color:0x1b1d22,metalness:.3,roughness:.58,envMapIntensity:.7});
 const dark=new THREE.MeshStandardMaterial({color:0x23262b,metalness:.1,roughness:.9,envMapIntensity:.3});
 const metal=new THREE.MeshStandardMaterial({color:0x8a919c,metalness:1,roughness:.34,envMapIntensity:1.2});
 const rim=new THREE.MeshStandardMaterial({color:0x9aa2b0,metalness:1,roughness:.3,envMapIntensity:1.3});
 const tire=new THREE.MeshStandardMaterial({color:0x0d0d10,metalness:0,roughness:.92,envMapIntensity:.25});
 const lampF=new THREE.MeshBasicMaterial({color:new THREE.Color(2.0,1.95,1.75),toneMapped:false});
 const lampR=new THREE.MeshBasicMaterial({color:new THREE.Color(1.5,.07,.05),toneMapped:false});
 const glow=new THREE.MeshBasicMaterial({color:new THREE.Color(1.6,.9,.2),toneMapped:false});
 return{paint,paint2,glass,trim,dark,metal,rim,tire,lampF,lampR,glow,lt}}
// builds one car for class cl in colour col (hex) with finish skin; the returned object is what the frame code moves around
// Draw calls are what a phone pays for most, so a car is kept to few of them:
// - each wheel is one mesh (tyre, rim and hub share one material: colour per vertex, shine from a two-texel map), not three;
// - the shadow is cast by one merged copy of the car (it writes no colour, only depth), not by every part.
let WHEELMAT=null,SHPROXYMAT=null;
function wheelMat(){if(WHEELMAT)return WHEELMAT;const d=new Uint8Array([0,235,0,255,0,77,255,255]),t=new THREE.DataTexture(d,2,1,THREE.RGBAFormat,THREE.UnsignedByteType);t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;
 return WHEELMAT=new THREE.MeshStandardMaterial({vertexColors:true,metalness:1,roughness:1,metalnessMap:t,roughnessMap:t,envMapIntensity:1.1})}
function wheelGeo(G,flip){const col=hex=>{const c=new THREE.Color(hex);return[c.r,c.g,c.b]};
 const paint=(g,c,u)=>{g=g.index?g.toNonIndexed():g.clone();for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal')g.deleteAttribute(k);const n=g.attributes.position.count,cc=new Float32Array(n*3),uv=new Float32Array(n*2);
  for(let i=0;i<n;i++){cc[i*3]=c[0];cc[i*3+1]=c[1];cc[i*3+2]=c[2];uv[i*2]=u;uv[i*2+1]=.5}g.setAttribute('color',new THREE.BufferAttribute(cc,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return g};
 const rim=flip?gP(G.rim,0,0,0,0,Math.PI,0):G.rim;
 return THREE.mergeGeometries([paint(G.tire,col(0x0d0d10),.25),paint(rim,col(0x9aa2b0),.75),paint(G.hub,col(0x1b1d22),.25)],false)}
function shadowGeo(G,D){const pos=g=>{g=g.index?g.toNonIndexed():g.clone();for(const k of Object.keys(g.attributes))if(k!=='position')g.deleteAttribute(k);return g};
 const L=[G.body,G.cab,G.roof,G.paint.attributes.position.count>8?G.paint:null,G.trim,G.metal].filter(Boolean).map(pos);
 for(const x of D.wx)for(const z of [-D.wz,D.wz])L.push(pos(gP(G.tire,x,D.wr,z)));
 return THREE.mergeGeometries(L,false)}
function carBuild(cl,col,skin,id){
 const G=carGeoms(cl),M=carMats(col,skin,cl),D=CARS3D[cl],root=new THREE.Group(),body=new THREE.Group(),C={root,body,cl,id,col,skin,M,lc:linOf(col),sp:0,wheels:[],steer:[],spin:0,lean:0,yaw:0,roll:0,pitch:0,kick:0,flame:0,lastA:0,ph:Math.random()*6};
 const add=(g,m,cast,layer,par)=>{const o=new THREE.Mesh(g,m);o.castShadow=false;o.receiveShadow=false;if(layer)o.layers.enable(layer);(par||body).add(o);return o};
 if(!G.shadow){G.shadow=shadowGeo(G,D);G.wheelR=wheelGeo(G,0);G.wheelL=wheelGeo(G,1)}
 SHPROXYMAT=SHPROXYMAT||new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
 {const sp=new THREE.Mesh(G.shadow,SHPROXYMAT);sp.castShadow=true;sp.receiveShadow=false;body.add(sp);C.shProxy=sp}
 C.mBody=add(G.body,M.paint,true);
 if(G.cab)C.mCab=add(G.cab,M.glass,true);
 if(G.roof)C.mRoof=add(G.roof,M.paint,true);
 if(G.paint.attributes.position.count>8)add(G.paint,M.paint2,true);
 add(G.trim,M.trim,true);add(G.metal,M.metal,true);if(G.dark)add(G.dark,M.dark,false);
 C.mGlow=add(G.glow,M.glow,false,GLOW);C.mLampF=add(G.lampF,M.lampF,false,GLOW);C.mLampR=add(G.lampR,M.lampR,false,GLOW);C.lampOn=-1;
 // class parts that move
 if(cl===0){C.bladeL=new THREE.Mesh(G.bladeL,M.metal);C.bladeR=new THREE.Mesh(G.bladeR,M.metal);for(const b of [C.bladeL,C.bladeR]){b.castShadow=false;b.position.set(.5,.3,0);body.add(b)}
  C.bladeL.position.z=-.5;C.bladeR.position.z=.5;
  const edge=new THREE.MeshBasicMaterial({color:new THREE.Color(4,.5,.5),toneMapped:false});C.bladeEdge=edge;C.bladeGl=[];
  for(const [b,s] of [[C.bladeL,-1],[C.bladeR,1]]){const e=new THREE.Mesh(gP(box(.62,.02,.02),.42,.02,.07*s,0,0,0),edge);e.layers.enable(GLOW);e.visible=false;b.add(e);C.bladeGl.push(e)}}
 if(cl===2){C.barrel=new THREE.Group();body.add(C.barrel);add(G.barrel,M.metal,true,0,C.barrel);add(G.barrelM,M.trim,true,0,C.barrel)}
 // wheels
 const mk=(x,z,f)=>{const w=new THREE.Mesh(z<0?G.wheelL:G.wheelR,wheelMat());w.castShadow=false;w.receiveShadow=false;const s=new THREE.Group();s.add(w);s.position.set(x,D.wr,z);root.add(s);C.wheels.push(w);if(f)C.steer.push(s);return w};
 for(const x of D.wx)for(const z of [-D.wz,D.wz])mk(x,z,x>0);
 // soft ground effects: the dark patch right under the car, and the head-light pool (only seen at dusk and night)
 const sp=spotTex();
 C.contact=new THREE.Mesh(new THREE.PlaneGeometry(3.3,2.1),new THREE.MeshBasicMaterial({map:sp,color:0x05070c,transparent:true,opacity:.5,depthWrite:false,toneMapped:false}));C.contact.rotation.x=-Math.PI/2;C.contact.position.y=.03;C.contact.renderOrder=2;root.add(C.contact);
 C.under=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.3),new THREE.MeshBasicMaterial({map:sp,color:new THREE.Color(C.lc[0]*1.5,C.lc[1]*1.5,C.lc[2]*1.5),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));C.under.rotation.x=-Math.PI/2;C.under.position.y=.05;C.under.renderOrder=3;C.under.visible=false;C.under.layers.enable(GLOW);root.add(C.under);
 C.beam=new THREE.Mesh(new THREE.PlaneGeometry(6,3.2),new THREE.MeshBasicMaterial({map:sp,color:new THREE.Color(.95,1.05,1.25),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));C.beam.rotation.x=-Math.PI/2;C.beam.position.set(4,.06,0);C.beam.renderOrder=3;root.add(C.beam);
 // exhaust flame (sprint, lunge)
 C.flames=[];for(const z of (cl===1?[-.3,.3]:[-.2,.2])){const f=new THREE.Mesh(new THREE.ConeGeometry(.09,1,8,1,true),new THREE.MeshBasicMaterial({color:new THREE.Color(2.4,1.3,.55),transparent:true,opacity:.0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide}));f.rotation.z=Math.PI/2;f.position.set(D.body[0].x-.2,.3,z);f.layers.enable(GLOW);f.visible=false;root.add(f);C.flames.push(f)}
 // armour plate / fortress dome (Titan), bladestorm ring (Striker), generic shield bubble for spawn protection
 C.dome=new THREE.Mesh(new THREE.SphereGeometry(1.7,28,16,0,6.2832,0,1.6),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,side:THREE.DoubleSide,
  uniforms:{uC:{value:new THREE.Color(.4,.9,1.4)},uA:{value:0},uT:{value:0}},
  vertexShader:'varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normalMatrix*normal);vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 uC;uniform float uA,uT;varying vec3 vN;varying vec3 vP;void main(){float f=pow(1.-abs(vN.z),2.2);vec2 q=vP.xz*3.2+vec2(0.,vP.y*2.);float hx=abs(fract(q.x+floor(q.y)*.5)-.5)+abs(fract(q.y)-.5)*.4;float gr=smoothstep(.46,.5,max(hx,abs(fract(q.y)-.5)))*.35;float sc=.5+.5*sin(vP.x*3.+vP.z*2.+uT*2.);vec3 cc=uC/max(max(uC.r,uC.g),max(uC.b,.001));float a=clamp((f*.85+gr*.75+.16+sc*.06)*uA,0.,1.);vec3 col=mix(cc*.7,vec3(1.),gr*.55+f*.2);gl_FragColor=vec4(col*a,a);}'}));
 C.dome.scale.set(1,.55,.8);C.dome.layers.enable(GLOW);C.dome.visible=false;C.dome.position.y=.1;root.add(C.dome);
 if(cl===0){C.ring=new THREE.Group();
  // Bladestorm: four saw blades orbit the car at the reach of the attack, each with two ghosts behind it, over a thin ring on the ground
  const R0=.6,R1=.24,sh=new THREE.Shape();for(let k=0;k<20;k++){const a=k/20*6.2832,r=k&1?R1:R0;k?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r)}sh.closePath();
  const hole=new THREE.Path();hole.absarc(0,0,.1,0,6.2832,true);sh.holes.push(hole);
  const bg=new THREE.ExtrudeGeometry(sh,{depth:.06,bevelEnabled:false});bg.rotateX(-Math.PI/2);bg.translate(0,-.03,0);
  C.ringBl=[];const lc=C.lc;
  for(let k=0;k<4;k++)for(let g=0;g<3;g++){const m=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({color:new THREE.Color(Math.min(1.2,lc[0]*1.15+.06),Math.min(1.2,lc[1]*1.15+.06),Math.min(1.2,lc[2]*1.15+.06)),toneMapped:false,transparent:g>0,opacity:g===1?.5:.24,depthWrite:false}));
   if(!g){const hub=new THREE.Mesh(new THREE.CircleGeometry(.2,16),new THREE.MeshBasicMaterial({color:new THREE.Color(1.6,1.6,1.7),toneMapped:false}));hub.rotation.x=-Math.PI/2;hub.position.y=.04;m.add(hub)}
   m.scale.setScalar(g?1.05:1);m.layers.enable(GLOW);C.ring.add(m);C.ringBl.push(m)}
  const rr=new THREE.Mesh(new THREE.RingGeometry(BAL.stormR/CAR_K-.07,BAL.stormR/CAR_K+.05,96),new THREE.MeshBasicMaterial({color:new THREE.Color(Math.min(1.2,lc[0]*1.2+.1),Math.min(1.2,lc[1]*1.2+.1),Math.min(1.2,lc[2]*1.2+.1)),toneMapped:false,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));rr.rotation.x=-Math.PI/2;rr.position.y=.06;rr.layers.enable(GLOW);C.ring.add(rr);
  C.vortex=new THREE.Mesh(new THREE.CircleGeometry(BAL.stormR/CAR_K,64),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,
   uniforms:{uC:{value:new THREE.Vector3(lc[0],lc[1],lc[2])},uT:GFX.U.time},vertexShader:GRND_VS,
   fragmentShader:'uniform vec3 uC;uniform float uT;varying vec2 vUv;void main(){vec2 d=vUv*2.-1.;float r=length(d),a=atan(d.y,d.x);float sw=pow(.5+.5*sin(a*5.+r*9.-uT*14.),6.);float k=smoothstep(1.,.75,r)*smoothstep(.15,.5,r);gl_FragColor=vec4(uC*(sw*.55+.08)*k,1.);}'}));
  C.vortex.rotation.x=-Math.PI/2;C.vortex.position.y=.04;C.vortex.layers.enable(GLOW);C.ring.add(C.vortex);
  C.ring.visible=false;root.add(C.ring)}
 if(cl===1){const sg=new THREE.CylinderGeometry(1.5,1.5,.7,24,1,true,-.75,1.5);sg.rotateY(Math.PI/2);
  C.ramShield=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({color:new THREE.Color(1.2,.7,.15),transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  C.ramShield.position.set(.1,.45,0);C.ramShield.layers.enable(GLOW);C.ramShield.visible=false;root.add(C.ramShield)}
 root.add(body);
 C.setHeadlights=v=>{C.beam.material.opacity=v;C.beam.visible=v>0};C.beam.visible=false;
 return C}
// A car that leaves gives back its livery picture. Its materials are not disposed: disposing the last material of a kind throws its compiled shader away,
// and the next car would have to compile it again in the middle of play (a visible hitch). Kept, every shader built at loading time stays ready.
function carFree(C){if(C.M.lt)C.M.lt.dispose()}
// ---------- every frame: where the car is, how it leans, wheels, lights, flames and what its abilities look like ----------
const _cn=new THREE.Vector3();
function carFrame(C,p,dt,tm,night){
 const root=C.root,x=p.rx,z=p.ry,a=p.ra,cs=Math.cos(a),sn=Math.sin(a),th=GFX.theme||{};
 // ground: height under the car and the slope along and across it
 const h0=gfxH(x,z),hf=gfxH(x+cs*.9,z+sn*.9),hb=gfxH(x-cs*.9,z-sn*.9),hl=gfxH(x+sn*.6,z-cs*.6),hr=gfxH(x-sn*.6,z+cs*.6);
 const gp=Math.atan2(hf-hb,1.8),gr=Math.atan2(hr-hl,1.2);
 // how fast it turns decides the lean and the steering
 let da=angd(C.lastA,a);C.lastA=a;const yr=dt>0?da/dt:0;C.yaw+=(yr-C.yaw)*Math.min(1,dt*10);
 const lean=Math.max(-.2,Math.min(.2,C.yaw*.035));C.roll+=(lean-C.roll)*Math.min(1,dt*9);
 const kick=C.kick;C.kick*=Math.pow(.01,dt);
 root.position.set(x,Math.max(h0,-.2)+.02,z);root.rotation.set(0,-a,0);
 body0(C,gp,gr,kick,tm);
 // wheels
 const mdx=x-(C.px===undefined?x:C.px),mdy=z-(C.py===undefined?z:C.py);C.px=x;C.py=z;
 const sp0=(dt>0&&mdx*mdx+mdy*mdy<16)?Math.min(60,Math.hypot(mdx,mdy)/dt):0;C.sp+=(sp0-C.sp)*Math.min(1,dt*12);const spd=C.sp;C.spin+=spd*dt/CARS3D[C.cl].wr;
 for(const w of C.wheels)w.rotation.z=-C.spin;
 const st=Math.max(-.5,Math.min(.5,-C.yaw*.075));for(const s of C.steer)s.rotation.y=st;
 // lights
 // by day the lamps are plain lenses; they are switched on (and glow) at dusk and at night. The red ones flare when the car turns hard.
 const lon=night>.25?1:0,brk=Math.abs(C.yaw)>2.5;C.setHeadlights(lon&&p.alive?.15*night:0);
 C.under.visible=!!p.alive;if(p.alive)C.under.material.opacity=.5+Math.min(.3,C.sp/110)+(p.fSpr?.2:0);
 if(lon!==C.lampOn){C.lampOn=lon;if(lon){C.mLampF.material.color.setRGB(2.0,1.95,1.75);C.mLampF.layers.enable(GLOW)}else{C.mLampF.material.color.setRGB(.8,.82,.84);C.mLampF.layers.disable(GLOW)}}
 C.mLampR.material.color.setRGB(lon?1.5+(brk?2.4:0):brk?2.6:.62,lon?.07:.04,lon?.05:.03);if(lon||brk)C.mLampR.layers.enable(GLOW);else C.mLampR.layers.disable(GLOW);
 // flames at the exhaust: sprint, lunge, ultimate
 const fl=p.fSpr||p.fMv||0;C.flame+=((fl?1:0)-C.flame)*Math.min(1,dt*10);
 for(let i=0;i<C.flames.length;i++){const f=C.flames[i];f.visible=C.flame>.05;if(f.visible){const s=(.6+.5*Math.sin(tm*60+i*2))*C.flame,len=.8*s+.3;f.scale.set(1,len,1);f.position.x=CARS3D[C.cl].body[0].x-.1-len*.5;f.material.opacity=.8*C.flame}}
 // abilities
 const ul=p.fUlt?1:0;
 if(C.ring){C.ring.visible=!!ul;if(ul){const t=tm*7,R=BAL.stormR/CAR_K-.05;for(let k=0;k<4;k++)for(let g=0;g<3;g++){const m=C.ringBl[k*3+g],a=t+k*1.5708-g*.2;m.position.set(Math.cos(a)*R,.5,Math.sin(a)*R);m.rotation.y=-tm*34+k;m.scale.setScalar(g?1.35:1.3)}}}
 if(C.ramShield){const on=p.fMv===2?1:0;C.ramK=(C.ramK||0)+(on-(C.ramK||0))*Math.min(1,dt*16);C.ramShield.visible=C.ramK>.03;if(C.ramShield.visible){C.ramShield.material.opacity=.62*C.ramK;C.ramShield.scale.set(1,1+.1*Math.sin(tm*40),1)}}
 const dust=th.dust||'#dfe9fb';
 // sparks of light off the rear wheels: when the car slides through a turn or boosts
 if(!FF&&QL.fx>.5&&p.alive&&C.sp>10){const D=CARS3D[C.cl],slide=Math.abs(C.yaw)>2.3,pr=slide?.6:(p.fSpr?.45:0);
  if(pr&&Math.random()<pr){const sd=slide?(C.yaw>0?-1:1):(Math.random()<.5?-1:1),rx=D.wx[1]*CAR_K,wz=D.wz*CAR_K;
   FX.push({x:x+cs*rx-sn*wz*sd,y:z+sn*rx+cs*wz*sd,h:.12,vh:.6+Math.random(),vx:-cs*6-sn*sd*(slide?4:.8)+(Math.random()-.5)*2,vy:-sn*6+cs*sd*(slide?4:.8)+(Math.random()-.5)*2,l:.32,l0:.32,c:slide?'#ffffff':COLS[p.id]||dust,k:1,s:.12,r:0,vr:0})}}
 // spray at the sides while ramming, a speed streak while dashing
 if(!FF&&QL.fx>.3){if(p.fMv===2&&Math.random()<.7){const sd=Math.random()<.5?-1:1;FX.push({x:x+cs*1.6+Math.cos(a+1.57*sd)*1.9,y:z+sn*1.6+Math.sin(a+1.57*sd)*1.9,h:.3,vh:.8,vx:Math.cos(a+1.57*sd)*3-cs*4,vy:Math.sin(a+1.57*sd)*3-sn*4,l:.6,l0:.6,c:dust,k:2,s:.55,r:Math.random()*6,vr:1})}
  else if(p.fMv===1){FX.push({x:x-cs*1.2,y:z-sn*1.2,h:.5,vh:0,vx:0,vy:0,l:.3,l0:.3,c:COLS[p.id]||'#ff4d5e',k:1,s:1.0,r:0,vr:0})}}
 if(C.bladeL){const ex=(p.fMv===1||ul)?1:0;C.bex=(C.bex||0)+(ex-(C.bex||0))*Math.min(1,dt*14);C.bladeL.position.z=-.5-.45*C.bex;C.bladeR.position.z=.5+.45*C.bex;C.bladeL.scale.set(1+.5*C.bex,1,1);C.bladeR.scale.set(1+.5*C.bex,1,1);C.bladeEdge.color.setRGB(4+4*C.bex,.5,.5);for(const e of C.bladeGl)e.visible=C.bex>.1}
 // shield bubble: Titan plate, fortress, spawn protection, armour of a power zone
 let da2=0,col=null;
 if(p.fInv&&p.fUlt){da2=.9;col=[.3,1.1,1.8]}else if(p.fInv){da2=.7;col=[.6,.9,1.8]}else if(p.fPlt){da2=.28;col=[.35,.8,1.5]}else if(p.fSh){da2=.45+.25*Math.sin(tm*18);col=[1.5,1.5,1.5]}else if(p.fPrt){da2=.3;col=[.4,1.1,1.7]}
 C.dome.visible=da2>.01;if(C.dome.visible){const u=C.dome.material.uniforms;u.uA.value=da2;u.uT.value=tm;u.uC.value.setRGB(col[0],col[1],col[2]);const sc=(p.fInv&&p.fUlt)?1.18+.06*Math.sin(tm*8):1;C.dome.scale.set(sc,.55*sc,.8*sc)}}
function body0(C,gp,gr,kick,tm){const b=C.body;b.rotation.set(-gr*.9-C.roll,0,gp*.9+Math.sin(tm*17+C.ph)*.004*(C.flame+.3));b.position.y=Math.abs(Math.sin(tm*13+C.ph))*.006;
 if(C.barrel)C.barrel.position.x=-kick*.2}
// ---------- 3D renderer, part 4: trails, sparks and smoke, rings, ember marks ----------
function gfxGround(x,y){return 0}
const colOf=c=>{if(c&&c.lc)return c.lc;return linOf(c&&c[0]==='#'?c:'#ffffff')};

// ---------- trails ----------
const TR3={pool:[],used:0,NV:5200,idx:null,ok:0,part:1};
const TR_VS=`attribute vec2 aN;attribute vec4 aV;uniform float uHW,uSh;uniform vec3 uSunDir;varying vec4 vV;varying vec2 vN;varying vec3 vW;
void main(){vec3 w=position;w.xz+=aN*(aV.x*aV.w*uHW);if(uSh>.5){w.xz-=uSunDir.xz/max(uSunDir.y,.3)*.14;w.y-=.012;}
 vV=aV;vN=aN;vW=w;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`;
const TR_FS=`uniform vec3 uCol,uSunDir,uSunCol,uAmb,uGnd,uHor;uniform float uStyle,uT,uAl,uSh,uK,uL;varying vec4 vV;varying vec2 vN;varying vec3 vW;
float hs(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1.,0.)),f.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),f.x),f.y);}
void main(){
 float v=vV.x,u=vV.y,e=vV.z;float r=length(vec2(v,e));
 if(uSh>.5){float a=smoothstep(1.9,.2,r)*.30*uAl;gl_FragColor=vec4(vec3(.05,.1,.2)*a,a);return;}
 if(uStyle>2.5){
  float age=1.-clamp(u/max(uL,1e-3),0.,1.);float d=(abs(v)-.8)/.15;float gr=exp(-d*d);float tread=.72+.28*hs(floor(vec2(u*7.,v*5.)));float mid=.05*smoothstep(.95,.5,abs(v));
  float a=(gr*.55*tread+mid)*pow(1.-age,1.4)*smoothstep(0.,1.2,uL-u+.6)*uAl;gl_FragColor=vec4(uCol*a,a);return;}
 float aa=fwidth(r)*1.1+1e-4;float body=1.-smoothstep(1.-aa,1.+aa,r);
 vec2 tg=vec2(vN.y,-vN.x);vec2 nxy=vN*v-tg*e;float rr=min(r,1.);
 vec3 n=normalize(vec3(nxy.x/max(r,1e-4)*rr*.95,sqrt(max(1.-rr*rr*.9,.02)),nxy.y/max(r,1e-4)*rr*.95));
 vec3 L=normalize(uSunDir);float lam=max(dot(n,L),0.)/max(L.y,.25);vec3 hemi=mix(uGnd,uAmb,n.y*.5+.5);
 vec3 V=vec3(0.,1.,0.);vec3 H=normalize(L+V);float nh=max(dot(n,H),0.);float F=.04+.96*pow(1.-n.y,4.);
 vec3 col,hc=uCol;float halo=0.;float grain=1.+(hs(floor(vec2(u,v)*46.))-.5)*.05;
 if(uStyle<.5){
  float core=exp(-v*v*10.),run=.82+.18*sin(u*.8-uT*8.);
  col=uCol*(1.05+.45*run)*(1.-.3*smoothstep(.65,1.,r))+vec3(1.)*core*.6;halo=exp(-(r-1.)*2.5)*.4*uK;
 }else if(uStyle<1.5){
  vec3 cas=vec3(.02,.025,.05)*(uSunCol*lam*.5+hemi*.4)+uSunCol*pow(nh,40.)*.55+F*uHor*.30;float cm=1.-smoothstep(.50,.64,r);
  float ch=smoothstep(.15,1.,.5+.5*sin(u*1.35-uT*9.));vec3 cc=mix(uCol*2.2,vec3(2.2),smoothstep(.42,0.,r)*.8+ch*.30);cc*=.78+.22*ch+.12;
  col=mix(cas,cc,cm);float bz=smoothstep(.64,.50,r)*smoothstep(.40,.64,r);col+=uCol*bz*.6;col*=mix(1.,grain,1.-cm);halo=exp(-(r-1.)*2.2)*.46*uK;
 }else{
  float f1=vn(vec2(u*1.1-uT*4.5,v*1.8)),f2=vn(vec2(u*2.7-uT*8.5,v*3.1+7.));float heat=clamp(1.18-r*.98+(f1-.5)*.85+(f2-.5)*.36,0.,1.);
  vec3 fc=heat<.33?mix(vec3(.30,.04,.0),vec3(1.5,.22,.02),heat/.33):heat<.66?mix(vec3(1.5,.22,.02),vec3(2.4,1.1,.14),(heat-.33)/.33):mix(vec3(2.4,1.1,.14),vec3(3.,2.6,1.4),(heat-.66)/.34);
  vec3 cas=vec3(.06,.02,.012)*(uSunCol*lam*.6+hemi*.4)+uSunCol*pow(nh,30.)*.25;float cm=smoothstep(.06,.30,heat);col=mix(cas,fc,cm);
  float em=step(.991,hs(floor(vec2(u*6.,v*4.+uT*3.))+floor(uT*5.)));col+=vec3(2.,1.2,.4)*em*.9;halo=exp(-(r-1.)*2.4)*.34*uK*(.65+.35*f1);hc=vec3(1.6,.6,.12);}
 float a=max(body,halo*(1.-body))*uAl;col=mix(hc,col,body);gl_FragColor=vec4(col*a,a);}`;
function trInit(){
 if(TR3.ok||!GFX.ok)return;TR3.ok=1;const N=TR3.NV,idx=new Uint16Array((N-2)*3);
 for(let i=0;i<N-2;i++){if(i&1){idx[i*3]=i+1;idx[i*3+1]=i;idx[i*3+2]=i+2}else{idx[i*3]=i;idx[i*3+1]=i+1;idx[i*3+2]=i+2}}
 TR3.idx=new THREE.BufferAttribute(idx,1)}
function trMesh(k){
 let m=TR3.pool[k];if(m)return m;
 const g=new THREE.BufferGeometry(),N=TR3.NV;
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3).setUsage(THREE.DynamicDrawUsage));
 g.setAttribute('aN',new THREE.BufferAttribute(new Float32Array(N*2),2).setUsage(THREE.DynamicDrawUsage));
 g.setAttribute('aV',new THREE.BufferAttribute(new Float32Array(N*4),4).setUsage(THREE.DynamicDrawUsage));
 g.setIndex(TR3.idx);g.setDrawRange(0,0);g.boundingSphere=new THREE.Sphere(new THREE.Vector3(WW/2,0,WH/2),400);
 const U=GFX.U,mk=sh=>new THREE.ShaderMaterial({vertexShader:TR_VS,fragmentShader:TR_FS,transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
  polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,extensions:{derivatives:true},
  uniforms:{uCol:{value:new THREE.Vector3(1,1,1)},uStyle:{value:0},uAl:{value:1},uSh:{value:sh},uK:{value:1},uL:{value:1},uHW:{value:.5},uT:U.time,uSunDir:U.sunDir,uSunCol:U.sunCol,uAmb:U.skyHor,uGnd:U.fogCol,uHor:U.skyHor}});
 const sh=new THREE.Mesh(g,mk(1)),ln=new THREE.Mesh(g,mk(0));sh.frustumCulled=ln.frustumCulled=false;sh.renderOrder=4;ln.renderOrder=5;ln.layers.enable(GLOW);
 const grp=new THREE.Group();grp.add(sh,ln);GFX.S.add(grp);
 return TR3.pool[k]={g,sh,ln,grp,pts:new Float32Array(4000*2)}}
// one trail -> ribbon vertices. tr: flat point list, oldest first. (hx,hy): where the car is now. vis: the part of the ground on screen (to subdivide only that)
function trBuild(m,tr,hx,hy,vis,HW,lift){
 const pts=m.pts,PN=pts.length>>1,E=2.0,g=m.g,P=g.attributes.position.array,A=g.attributes.aN.array,V=g.attributes.aV.array,NV=TR3.NV;
 let np=0;const raw=[];for(let i=0;i+1<tr.length;i+=2){const n=raw.length;if(n&&Math.abs(tr[i]-raw[n-2])+Math.abs(tr[i+1]-raw[n-1])<.004)continue;raw.push(tr[i],tr[i+1])}
 if(hx!==undefined){const n=raw.length;if(!n||Math.abs(hx-raw[n-2])+Math.abs(hy-raw[n-1])>.004)raw.push(hx,hy)}
 const mm=raw.length>>1;if(mm<2){g.setDrawRange(0,0);return 0}
 for(let i=0;i<mm-1&&np<PN-8;i++){
  const x1=raw[i*2],y1=raw[i*2+1],x2=raw[i*2+2],y2=raw[i*2+3];
  const on=Math.max(x1,x2)>=vis[0]&&Math.min(x1,x2)<=vis[2]&&Math.max(y1,y2)>=vis[1]&&Math.min(y1,y2)<=vis[3];
  if(!on){pts[np*2]=x1;pts[np*2+1]=y1;np++;continue}
  const a=i>0?i-1:i,b=i+2<mm?i+2:i+1,x0=raw[a*2],y0=raw[a*2+1],x3=raw[b*2],y3=raw[b*2+1],K=Math.hypot(x2-x1,y2-y1)>.2?3:1;
  for(let k=0;k<K;k++){const t=k/K,t2=t*t,t3=t2*t;
   pts[np*2]=.5*(2*x1+(-x0+x2)*t+(2*x0-5*x1+4*x2-x3)*t2+(-x0+3*x1-3*x2+x3)*t3);
   pts[np*2+1]=.5*(2*y1+(-y0+y2)*t+(2*y0-5*y1+4*y2-y3)*t2+(-y0+3*y1-3*y2+y3)*t3);np++}}
 pts[np*2]=raw[(mm-1)*2];pts[np*2+1]=raw[(mm-1)*2+1];np++;
 if(np<2){g.setDrawRange(0,0);return 0}
 let n=0,u=0,px=0,py=0;
 const put=(x,y,nx,ny,v,uu,e,mi)=>{if(n>=NV)return;const q=n*3,w=n*2,z=n*4;P[q]=x;P[q+1]=gfxGround(x,y)+lift;P[q+2]=y;A[w]=nx;A[w+1]=ny;V[z]=v;V[z+1]=uu;V[z+2]=e;V[z+3]=mi;n++};
 for(let j=0;j<np;j++){
  const ax=pts[Math.max(0,j-1)*2],ay=pts[Math.max(0,j-1)*2+1],bx=pts[Math.min(np-1,j+1)*2],by=pts[Math.min(np-1,j+1)*2+1];
  let tx=bx-ax,ty=by-ay;const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
  const x=pts[j*2],y=pts[j*2+1];if(j>0)u+=Math.hypot(x-px,y-py);
  let mi=1;if(j>0&&j<np-1){const d0x=x-px,d0y=y-py,d1x=bx-x,d1y=by-y,l0=Math.hypot(d0x,d0y)||1,l1=Math.hypot(d1x,d1y)||1,c=(d0x*d1x+d0y*d1y)/(l0*l1);mi=Math.min(1.8,1/Math.sqrt(Math.max(.18,(1+c)/2)))}
  const nx=-ty,ny=tx;
  if(j===0){const cx=x-tx*E*HW,cy=y-ty*E*HW;put(cx,cy,nx,ny,-E,u-E*HW,E,1);put(cx,cy,nx,ny,E,u-E*HW,E,1)}
  put(x,y,nx,ny,-E,u,0,mi);put(x,y,nx,ny,E,u,0,mi);px=x;py=y}
 // only the part of the buffers this trail uses goes to the GPU (the buffers hold 5200 points; a trail is usually a few hundred)
 for(const [a,k] of [[g.attributes.position,3],[g.attributes.aN,2],[g.attributes.aV,4]]){if(TR3.part){a.clearUpdateRanges();a.addUpdateRange(0,n*k)}a.needsUpdate=true}
 g.setDrawRange(0,Math.max(0,(n-2)*3));m.len=u;return n}
// the ground rectangle the camera sees (rough, for deciding what to subdivide)
function trVis(){const c=GFX.cam,x=c.position.x,z=c.position.z,r=Math.max(30,CAM.vw*1.5);return[CAM.x-r,CAM.y-r,CAM.x+r,CAM.y+r]}
const TRSTY={glow:0,neon:1,fire:2};
function trailsFrame(){
 trInit();if(!TR3.ok)return;const vis=trVis();let k=0;
 const use=(tr,hx,hy,c,st,al,kk,hw,lift)=>{if(k>=22)return;const m=trMesh(k);const n=trBuild(m,tr,hx,hy,vis,hw,lift);m.grp.visible=n>0;if(!n)return;k++;
  for(const o of [m.sh,m.ln]){const u=o.material.uniforms;u.uCol.value.set(c[0],c[1],c[2]);u.uStyle.value=TRSTY[st]|0;u.uAl.value=al;u.uK.value=kk;u.uL.value=m.len;u.uHW.value=hw}
  m.sh.visible=false}
 // the ghosts of trails that were just closed, then the live trails
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.ghost)continue;const a=1-(clk-p.ghost.t0)/.4;if(a<=0){p.ghost=null;continue}use(p.ghost.tr,undefined,undefined,COLLIN[q],'glow',a,.5,.42,.07)}
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.tr||!p.tr.length)continue;const st=(COS[q]||[])[1]||'glow',tr=(q===1&&MP)?ncTrail(p):p.tr;if(!tr.length)continue;
  use(tr,p.alive?p.rx:undefined,p.alive?p.ry:undefined,COLLIN[q],st,p.fSlow?.55:1,QL.glow?1:.6,.42,.075);
  if(st==='fire'&&QL.hi&&p.alive&&tr.length>4&&Math.random()<.5){const j=Math.max(0,tr.length-2-((Math.random()*Math.min(40,tr.length/2))|0)*2);FX.push({x:tr[j],y:tr[j+1],h:.1,vh:1.6+Math.random()*1.4,vx:(Math.random()-.5)*.6,vy:(Math.random()-.5)*.6,l:.6,l0:.6,c:'#ff9a3a',k:4,s:.16,r:0,vr:0})}}
 for(let j=k;j<TR3.pool.length;j++)TR3.pool[j].grp.visible=false}

// ---------- sparks, smoke and chips: two instanced sprite sets (glowing ones add up, smoke and chips blend normally) ----------
const PT={ok:0,max:900,A:null,N:null,part:1};
const PT_VS=`attribute vec3 iP,iV;attribute vec4 iC,iS;varying vec4 vC;varying vec2 vUv;varying float vK;
void main(){vec3 cp=iP;float sz=iS.x,k=iS.y;vec2 q=position.xy;vec3 off;
 if(k>.5&&k<1.5){vec3 vd=normalize(iV+vec3(1e-4));float len=sz*(.6+min(length(iV)*.14,2.6));vec3 tc=normalize(cameraPosition-cp);vec3 sd=normalize(cross(vd,tc)+vec3(1e-5));off=vd*q.x*len+sd*q.y*sz*.32;}
 else{float c=cos(iS.z),s=sin(iS.z);vec2 r=vec2(q.x*c-q.y*s,q.x*s+q.y*c);vec3 rt=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]),up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);off=(rt*r.x+up*r.y)*sz;}
 gl_Position=projectionMatrix*viewMatrix*vec4(cp+off,1.);vC=iC;vUv=position.xy+.5;vK=k;}`;
const PT_FS=(add)=>`varying vec4 vC;varying vec2 vUv;varying float vK;
void main(){vec2 d=vUv*2.-1.;float r2=dot(d,d);float a;
 if(vK<.5)a=exp(-r2*4.5);else if(vK<1.5)a=exp(-d.y*d.y*7.)*smoothstep(1.,.35,abs(d.x));else if(vK<2.5)a=smoothstep(1.,.1,sqrt(r2))*.55;else if(vK<3.5)a=step(abs(d.x),.85)*step(abs(d.y),.55);else if(vK<4.5)a=exp(-r2*3.2);else a=smoothstep(1.,.12,sqrt(r2));
 ${add?'gl_FragColor=vec4(vC.rgb*a*vC.a,a*vC.a*.9);':'gl_FragColor=vec4(vC.rgb*a*vC.a,a*vC.a);'}}`;
function ptInit(){
 if(PT.ok||!GFX.ok)return;PT.ok=1;const base=new THREE.PlaneGeometry(1,1);
 const mk=add=>{const g=new THREE.InstancedBufferGeometry();g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
  const at=(n,s)=>g.setAttribute(n,new THREE.InstancedBufferAttribute(new Float32Array(PT.max*s),s).setUsage(THREE.DynamicDrawUsage));at('iP',3);at('iV',3);at('iC',4);at('iS',4);g.instanceCount=0;
  const m=new THREE.ShaderMaterial({vertexShader:PT_VS,fragmentShader:PT_FS(add),transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor});
  const o=new THREE.Mesh(g,m);o.frustumCulled=false;o.renderOrder=add?8:7;if(add)o.layers.enable(GLOW);GFX.S.add(o);return{g,o,n:0}};
 PT.A=mk(1);PT.N=mk(0)}
const FXK=[[1.6,1],[1.6,1],[1,0],[.5,0],[1.8,1],[1,0]];   // per kind: brightness, glowing set (the others blend normally). 0 spark, 1 streak, 2 smoke, 3 chip, 4 ember, 5 fireball
function fxPut(S,x,h,y,vx,vh,vy,r,g,b,a,sz,k,rot){if(S.n>=PT.max)return;const G=S.g,i=S.n++,P=G.attributes.iP.array,V=G.attributes.iV.array,C=G.attributes.iC.array,Z=G.attributes.iS.array;
 P[i*3]=x;P[i*3+1]=h;P[i*3+2]=y;V[i*3]=vx;V[i*3+1]=vh;V[i*3+2]=vy;C[i*4]=r;C[i*4+1]=g;C[i*4+2]=b;C[i*4+3]=a;Z[i*4]=sz;Z[i*4+1]=k;Z[i*4+2]=rot;Z[i*4+3]=0}
function fxStep(dt){shake*=Math.pow(.88,dt*60);
 const drag=Math.pow(.95,dt*60);
 for(const f of FX){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=drag;f.vy*=drag;f.l-=dt;
  if(f.h===undefined)f.h=.4;if(f.vh===undefined)f.vh=2;
  if(f.k===2){f.h+=f.vh*dt;f.vh*=Math.pow(.9,dt*60)}else{f.h+=f.vh*dt;f.vh-=16*dt;if(f.h<.05){f.h=.05;f.vh*=-.32;f.vx*=.55;f.vy*=.55}}
  if(f.vr)f.r+=f.vr*dt}
 if(FX.length){let j=0;for(let i=0;i<FX.length;i++)if(FX[i].l>0)FX[j++]=FX[i];FX.length=j}
 const cap=QL.fx>.5?700:300;if(FX.length>cap)FX.splice(0,FX.length-cap);
 for(const q of PO){q.y-=dt*1.6;q.l-=dt}PO=PO.filter(q=>q.l>0);for(const d of FD)d.l-=dt;FD=FD.filter(d=>d.l>0)}
function particlesFrame(){
 ptInit();if(!PT.ok)return;PT.A.n=PT.N.n=0;
 for(const f of FX){const t=Math.max(0,f.l/f.l0),k=f.k||0,lc=f.lc||(f.lc=linOf(f.c&&f.c[0]==='#'?f.c:'#ffffff')),kb=FXK[k]||FXK[0];
  if(k===5){ // fireball: a soft blob that goes from white-yellow through orange to dark red as it swells and dies
   const u=1-t,cr=t>.66?[1.5,1.25,.7]:t>.33?[1.4,.55,.1]:[.5,.12,.04];
   fxPut(PT.N,f.x,f.h,f.y,0,0,0,cr[0],cr[1],cr[2],Math.min(1,t*1.5)*.92,(f.s||1)*(.55+.9*u),5,f.r)}
  else if(kb[1]){const br=kb[0]*(k===4?(.4+.6*t):t);fxPut(PT.A,f.x,f.h,f.y,f.vx,f.vh,f.vy,lc[0]*br+.05*br,lc[1]*br+.04*br,lc[2]*br+.04*br,Math.min(1,t*1.6),k===1?(f.s||.22):(f.s||(k===4?.2:.16+.1*t)),k,f.r)}
  else if(k===2){const gs=.55,sz=(f.s||.4)*(1.5-.8*t)*1.6;fxPut(PT.N,f.x,f.h,f.y,0,0,0,lc[0]*.35+gs*.72,lc[1]*.35+gs*.74,lc[2]*.35+gs*.8,Math.min(.8,t*1.3)*.62,sz,2,f.r)}
  else{const dk=.12;fxPut(PT.N,f.x,f.h,f.y,0,0,0,lc[0]*.5+dk,lc[1]*.5+dk,lc[2]*.5+dk,Math.min(1,t*2.2),f.s||.14,3,f.r)}}
 // only the sprites in use go to the GPU, and nothing when none are shown
 for(const S of [PT.A,PT.N]){const G=S.g;G.instanceCount=S.n;if(PT.part&&!S.n)continue;
  for(const n of ['iP','iV','iC','iS']){const a=G.attributes[n];if(PT.part){a.clearUpdateRanges();a.addUpdateRange(0,S.n*a.itemSize)}a.needsUpdate=true}}}

// ---------- rings, scorch marks, falling snow ----------
const RG3={pool:[],max:22,sc:[],scMax:22};
const RG_FS=`uniform vec3 uC;uniform float uP,uA;varying vec2 vUv;
void main(){vec2 d=vUv*2.-1.;float r=length(d);float rad=.08+uP*.92;float w=.075+.06*(1.-uP);
 float ring=exp(-pow((r-rad)/w,2.)),core=exp(-pow((r-rad)/(w*.35),2.)),rim=exp(-pow((r-rad)/(w*1.9),2.));
 float fill=smoothstep(rad,rad*.1,r)*.28*(1.-uP);float edge=smoothstep(1.,.9,r);float fade=(1.-uP*uP)*uA*edge;
 float a=clamp(ring*.95+fill+rim*.32,0.,1.)*fade;
 vec3 col=mix(vec3(.0),uC*1.1,clamp(ring*1.4+fill*2.,0.,1.));col=mix(col,vec3(1.1),core*.3);
 gl_FragColor=vec4(col*a,a);}`;
function ringsInit(){
 if(RG3.pool.length||!GFX.ok)return;const pg=new THREE.PlaneGeometry(1,1);pg.rotateX(-Math.PI/2);
 for(let i=0;i<RG3.max;i++){const m=new THREE.Mesh(pg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
  uniforms:{uC:{value:new THREE.Vector3(1,1,1)},uP:{value:0},uA:{value:1}},vertexShader:GRND_VS,fragmentShader:RG_FS}));
  m.visible=false;m.renderOrder=9;m.layers.enable(GLOW);m.frustumCulled=false;GFX.S.add(m);RG3.pool.push(m)}
 // ember marks: the hot middle of a blast glows on the floor and cools in a few seconds (the scorched land itself is drawn by the floor)
 const sg=new THREE.PlaneGeometry(1,1);sg.rotateX(-Math.PI/2);
 for(let i=0;i<RG3.scMax;i++){const m=new THREE.Mesh(sg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,
  uniforms:{uA:{value:1},uSeed:{value:i*7.3}},vertexShader:GRND_VS,
  fragmentShader:`uniform float uA,uSeed;varying vec2 vUv;float h(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
   float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
   void main(){vec2 d=vUv*2.-1.;float r=length(d),an=atan(d.y,d.x);float rag=.7+.2*n(vec2(an*2.,uSeed))+.12*n(vec2(an*7.,uSeed+3.));
    float body=smoothstep(rag,rag*.3,r),gr=n(d*6.+uSeed);float heat=body*(.55+.45*gr)*uA;
    gl_FragColor=vec4(mix(vec3(.5,.05,.0),vec3(2.2,.75,.15),heat*uA)*heat,1.);}`}));
  m.visible=false;m.renderOrder=3;m.frustumCulled=false;m.layers.enable(GLOW);GFX.S.add(m);RG3.sc.push(m)}}
function ringsFrame(){
 ringsInit();if(!RG3.pool.length)return;let k=0;
 for(let i=RINGS.length-1;i>=0;i--){const r=RINGS[i],dur=r.dur||.65,age=(clk-r.t0)/dur;if(age>=1){RINGS.splice(i,1);continue}if(age<0||k>=RG3.max)continue;
  const m=RG3.pool[k++],R=(r.r||4.6)*2,c=colOf(r.c);m.visible=true;m.position.set(r.x,.08,r.y);m.scale.set(R,1,R);const u=m.material.uniforms;u.uC.value.set(c[0],c[1],c[2]);u.uP.value=age;u.uA.value=r.a||1}
 for(;k<RG3.max;k++)RG3.pool[k].visible=false;
 let j=0;for(let i=SCORCH.length-1;i>=0&&j<RG3.scMax;i--){const s=SCORCH[i],age=clk-s.t0;if(age>3.2){SCORCH.splice(i,1);continue}const m=RG3.sc[j++];m.visible=true;m.position.set(s.x,.045,s.y);const R=s.r*2.3;m.scale.set(R,1,R);m.material.uniforms.uA.value=Math.min(1,age*8)*Math.pow(1-age/3.2,1.6)}
 for(;j<RG3.scMax;j++)RG3.sc[j].visible=false}
// a capture: the ground flashes outward from the point, with a ring
function capFlash(x,y,id,n){CAPW.push({x,y,t0:clk,c:id,n});if(CAPW.length>4)CAPW.shift();RINGS.push({x,y,t0:clk,c:COLS[id],r:Math.min(6,2.5+n*.004),dur:.6})}
// ---------- 3D renderer, part 5: shells, blades, drones, plasma mines, strike reticles, railgun beams, laser wires, fault lines, black holes, the ring under your car ----------
// The game keeps these as small lists (SHV shells, BLV blades, MSV drones, MNV mines, STV strikes; WIRES, FAULTS, HOLES straight from the match);
// here each one gets a model, taken from a pool. Everything that shines is drawn additively and also feeds the bloom (GLOW layer).
const PJ={ok:0,shell:[],blade:[],miss:[],mine:[],strike:[],rail:[],wire:[],fault:[],hole:[],spot:[],pilot:null};
let MARKSEL=0;   // the ring under your own car: 0 ring with arrows, 1 thin ring, 2 none
const RAILV=[],FAULTV=[];   // beams that are fading, cracks that are still glowing (with the fault they belong to)
const _pv=new THREE.Vector3();
const GRND_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const ADDB={transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor};
// a strike reticle: four brackets that turn, a ring that closes in as the strike falls, a crosshair, and a flash as it lands
const STRIKE_FS=`uniform vec3 uC;uniform float uP,uT,uA;varying vec2 vUv;
float ln(float x,float w){return smoothstep(w,0.,abs(x));}
void main(){vec2 d=vUv*2.-1.;float r=length(d),an=atan(d.y,d.x);
 float br=step(.62,fract((an+uT*1.4)/1.5708));
 float edge=ln(r-.93,.028)*(.25+.75*br)+ln(r-.985,.01)*.5;
 float closing=ln(r-mix(.9,.1,uP),.03)*(.45+.55*uP);
 float cross=(ln(d.x,.014)*step(abs(d.y),.2)+ln(d.y,.014)*step(abs(d.x),.2));
 float tick=step(.85,fract(an/6.2832*36.))*ln(r-.8,.04)*.7;
 float fill=smoothstep(.95,0.,r)*.1*uP*uP+step(.94,uP)*smoothstep(1.,0.,r)*.35;
 float pul=.7+.3*sin(uT*18.);
 gl_FragColor=vec4(uC*((edge*pul+closing+cross+tick)*1.5+fill)*uA*smoothstep(1.,.97,r),1.);}`;
const PILOT_FS=`uniform vec3 uC;uniform float uT,uS,uA,uM;varying vec2 vUv;
float ln(float x,float w){return smoothstep(w,w*.3,abs(x));}
void main(){vec2 d=(vUv*2.-1.);float r=length(d);float an=atan(d.y,d.x);
 float ring=ln(r-.5,mix(.02,.014,uM));
 float seg=smoothstep(.02,.0,abs(fract(an/6.2832*3.+uT*.28)-.5)-.3)*ln(r-.555,.022)*(1.-uM);
 float halo=ln(r-.5,.06)*.4*(1.-uM);
 // chevrons running ahead (to +x in the plane's own space); the thin ring keeps a single still one
 float ch=0.;for(int k=0;k<3;k++){float u=mix(fract(uT*(.8+uS*.9)+float(k)/3.),.3,uM);float cx=.58+u*.36;float w=abs(d.y)*1.0;float s=smoothstep(.03,.0,abs(cx-d.x-w*.9))*smoothstep(.3,.0,abs(d.y))*sin(u*3.1416);ch+=s*(k==0?1.:1.-uM);}
 float line=clamp(ring*.9+seg*.8+ch*.9,0.,1.);
 gl_FragColor=vec4(uC*(line*1.25+halo)*uA*smoothstep(1.,.9,r),1.);}`;
// a beam of light along +x of a flat quad: a white-hot core in a coloured glow. uF: flicker (laser wire), uH: a bright head running along it (0..1, or <0 for none)
const BEAM_FS2=`uniform vec3 uC;uniform float uA,uT,uF,uH;varying vec2 vUv;
void main(){float v=abs(vUv.y*2.-1.);float core=exp(-v*v*90.),glow=exp(-v*v*7.)*.6+exp(-v*v*30.)*.4;
 float fl=1.-uF*(.35+.35*sin(uT*61.+vUv.x*40.))*step(.5,fract(uT*13.));
 float head=uH>=0.?exp(-pow((vUv.x-uH)*9.,2.))*1.6:0.;
 float ends=smoothstep(0.,.02,vUv.x)*smoothstep(1.,.98,vUv.x);
 gl_FragColor=vec4((uC*(glow+core*.5+head)+vec3(1.)*core*(.9+head))*uA*fl*ends,1.);}`;
// a fault line: a jagged glowing crack along +x; the front (uD, 0..1 of the quad) is white-hot
const FAULT_FS=`uniform vec3 uC;uniform float uA,uT,uD,uL,uS;varying vec2 vUv;
float h1(float x){return fract(sin(x*127.1+uS)*43758.5453);}
float n1(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h1(i),h1(i+1.),f);}
void main(){float u=vUv.x*uL;if(vUv.x>uD)discard;
 float j=(n1(u*1.7)-.5)*.55+(n1(u*5.3+9.)-.5)*.22;float v=vUv.y*2.-1.-j;
 float core=exp(-v*v*140.),glow=exp(-v*v*9.)*.55;float br=1.-smoothstep(0.,.9,vUv.x/max(uD,1e-3)-1.+.15);
 float tip=exp(-pow((vUv.x-uD)*uL*.9,2.));
 vec3 hot=mix(uC*1.4,vec3(2.6,1.6,.7),tip);
 gl_FragColor=vec4((hot*(glow+core)+vec3(1.)*core*(.4+tip*1.5))*uA*(.55+.45*br),1.);}`;
// a black hole: spiral arms of light pulled in toward a black core, with a bright ring at its edge
const HOLE_FS=`uniform vec3 uC;uniform float uT,uA,uR;varying vec2 vUv;
void main(){vec2 d=vUv*2.-1.;float r=length(d),an=atan(d.y,d.x);
 float sw=pow(.5+.5*sin(an*3.+2.6/(r+.08)-uT*10.),5.);
 float disk=smoothstep(1.,.35,r)*smoothstep(uR*1.05,uR*1.9,r);
 float ring=exp(-pow((r-uR*1.08)/.022,2.));
 float outer=exp(-pow((r-.97)/.015,2.))*.35;
 gl_FragColor=vec4((uC*(sw*disk*.55+disk*.04+outer)+vec3(.9,.95,1.)*ring*1.1)*uA,1.);}`;
function pjMat(fs,uni,blend){return new THREE.ShaderMaterial(Object.assign({uniforms:uni,vertexShader:GRND_VS,fragmentShader:fs},blend||ADDB))}
function pjInit(){
 if(PJ.ok||!GFX.ok)return;PJ.ok=1;
 const S=GFX.S,add=(o,l)=>{o.frustumCulled=false;if(l)o.layers.enable(l);S.add(o);o.visible=false;return o},flat=()=>{const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);return g};
 const sp=spotTex(),fg=flat();
 // a pool of light spots on the floor under things that fly
 for(let i=0;i<36;i++){const m=new THREE.Mesh(fg,new THREE.MeshBasicMaterial({map:sp,color:0xffffff,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));m.position.y=.04;m.renderOrder=2;add(m,GLOW);PJ.spot.push(m)}
 PJ.spN=0;
 // shells: a slug of light with a hot tail
 const sg=gP(new THREE.CapsuleGeometry(.17,.8,3,10),0,0,0,0,0,Math.PI/2),sm=new THREE.MeshBasicMaterial({color:new THREE.Color(2.6,1.7,.9),toneMapped:false}),
  tg=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),new THREE.MeshBasicMaterial({color:new THREE.Color(3.2,1.5,.45),toneMapped:false}));
 for(let i=0;i<10;i++){const g=new THREE.Group(),m=new THREE.Mesh(sg,sm),t=tg.clone();t.position.x=-.52;t.scale.set(1.4,1,1);g.add(m,t);add(g);m.layers.enable(GLOW);t.layers.enable(GLOW);PJ.shell.push(g)}
 // ricochet blades: a four-point star in the owner's colour with a white-hot middle
 const sh=new THREE.Shape(),R0=.86,R1=.28;for(let k=0;k<8;k++){const a=k/8*6.2832,r=k&1?R1:R0;k?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r)}sh.closePath();
 const hole=new THREE.Path();hole.absarc(0,0,.13,0,6.2832,true);sh.holes.push(hole);
 const bg=new THREE.ExtrudeGeometry(sh,{depth:.07,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:1});bg.rotateX(-Math.PI/2);bg.translate(0,-.035,0);
 for(let i=0;i<16;i++){const g=new THREE.Group(),m1=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,1),toneMapped:false})),m2=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,1),toneMapped:false}));
  m2.scale.set(1.0,1,1.0);m1.scale.set(.5,1.6,.5);g.add(m2,m1);g.userData={m1,m2};add(g);m2.layers.enable(GLOW);m1.layers.enable(GLOW);PJ.blade.push(g)}
 // swarm drones: a small rocket in the owner's colour with a flame
 const metal=new THREE.MeshStandardMaterial({color:0xcfd6e2,roughness:.3,metalness:.85,envMapIntensity:1});
 for(let i=0;i<15;i++){const g=new THREE.Group(),col=new THREE.MeshBasicMaterial({color:0x1fbf75,toneMapped:false}),
   body=new THREE.Mesh(gP(new THREE.CylinderGeometry(.17,.17,1.05,12),0,0,0,0,0,Math.PI/2),metal),nose=new THREE.Mesh(gP(new THREE.ConeGeometry(.17,.46,12),.74,0,0,0,0,-Math.PI/2),col);
  const fins=[];for(let k=0;k<4;k++){const f=new THREE.Mesh(new THREE.BoxGeometry(.34,.03,.3),col);f.rotation.x=k*1.5708;f.position.set(-.42,Math.cos(k*1.5708)*.16,Math.sin(k*1.5708)*.16);fins.push(f)}
  const fl=new THREE.Mesh(gP(new THREE.ConeGeometry(.15,1.1,8,1,true),-.6,0,0,0,0,Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(3,1.6,.6),transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide}));
  g.add(body,nose,fl,...fins);g.userData={col,fl};add(g);fl.layers.enable(GLOW);nose.layers.enable(GLOW);g.position.y=.6;PJ.miss.push(g)}
 // plasma mines: a dark puck holding a ball of plasma in the owner's colour
 const dark=new THREE.MeshStandardMaterial({color:0x1a1f2a,roughness:.45,metalness:.8,envMapIntensity:.9});
 const puck=new THREE.CylinderGeometry(.5,.6,.16,20),orbG=new THREE.SphereGeometry(.24,16,12),ringG=new THREE.TorusGeometry(.48,.045,6,28);
 for(let i=0;i<36;i++){const g=new THREE.Group(),b=new THREE.Mesh(puck,dark),orb=new THREE.Mesh(orbG,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})),
   ring=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));
  b.position.y=.08;orb.position.y=.3;ring.rotation.x=Math.PI/2;ring.position.y=.17;orb.layers.enable(GLOW);ring.layers.enable(GLOW);
  g.add(b,orb,ring);g.userData={ring,orb};add(g);PJ.mine.push(g)}
 // strike reticles and a column of light that grows as the strike falls
 const bm=new THREE.CylinderGeometry(.5,.5,50,16,1,true);bm.translate(0,25,0);
 for(let i=0;i<26;i++){const m=new THREE.Mesh(fg,pjMat(STRIKE_FS,{uC:{value:new THREE.Vector3(1,.14,.2)},uP:{value:0},uT:GFX.U.time,uA:{value:1}}));m.renderOrder=9;
  const beam=new THREE.Mesh(bm,new THREE.ShaderMaterial(Object.assign({side:THREE.DoubleSide,uniforms:{uC:{value:new THREE.Vector3(1,.2,.2)},uP:{value:0}},
   vertexShader:'varying float vH;void main(){vH=position.y/50.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 uC;uniform float uP;varying float vH;void main(){float a=smoothstep(0.,.3,vH)*(1.-vH)*uP*uP*.6;gl_FragColor=vec4(uC*a,1.);}'},ADDB)));
  const g=new THREE.Group();g.add(m,beam);g.userData={m,beam};add(g,GLOW);m.layers.enable(GLOW);beam.layers.enable(GLOW);PJ.strike.push(g)}
 // railgun beams and laser wires (the same beam of light; a wire flickers and stands on two little posts)
 for(let i=0;i<8;i++){const m=new THREE.Mesh(fg,pjMat(BEAM_FS2,{uC:{value:new THREE.Vector3(1,1,1)},uA:{value:1},uT:GFX.U.time,uF:{value:0},uH:{value:-1}}));m.renderOrder=10;add(m,GLOW);PJ.rail.push(m)}
 const postG=gP(cyl(.11,.16,.9,10),0,.45,0),capG=new THREE.SphereGeometry(.22,12,8);
 for(let i=0;i<12;i++){const g=new THREE.Group(),m=new THREE.Mesh(fg,pjMat(BEAM_FS2,{uC:{value:new THREE.Vector3(1,1,1)},uA:{value:1},uT:GFX.U.time,uF:{value:1},uH:{value:-1}}));m.renderOrder=10;m.layers.enable(GLOW);
  const capM=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),posts=[];for(let k=0;k<2;k++){const ps=new THREE.Mesh(postG,dark),cp=new THREE.Mesh(capG,capM);cp.position.y=.95;cp.layers.enable(GLOW);const pg=new THREE.Group();pg.add(ps,cp);posts.push(pg);g.add(pg)}
  g.add(m);g.userData={m,posts,capM};add(g);PJ.wire.push(g)}
 // fault lines
 for(let i=0;i<8;i++){const m=new THREE.Mesh(fg,pjMat(FAULT_FS,{uC:{value:new THREE.Vector3(1,1,1)},uA:{value:1},uT:GFX.U.time,uD:{value:1},uL:{value:14},uS:{value:i*3.7}}));m.renderOrder=8;add(m,GLOW);PJ.fault.push(m)}
 // black holes: the swirl, and a black core that hides the floor under it
 for(let i=0;i<5;i++){const g=new THREE.Group(),sw=new THREE.Mesh(fg,pjMat(HOLE_FS,{uC:{value:new THREE.Vector3(1,1,1)},uT:GFX.U.time,uA:{value:1},uR:{value:.3}})),
   core=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0x000000,depthWrite:false,toneMapped:false})),
   shade=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:sp,color:0x000000,transparent:true,opacity:.92,depthWrite:false,toneMapped:false}));
  core.rotation.x=-Math.PI/2;core.position.y=.075;core.renderOrder=9;shade.rotation.x=-Math.PI/2;shade.position.y=.07;shade.renderOrder=8;sw.position.y=.09;sw.renderOrder=10;sw.layers.enable(GLOW);core.layers.enable(GLOW);shade.layers.enable(GLOW);
  g.add(shade,core,sw);g.userData={sw,core,shade};add(g);PJ.hole.push(g)}
 // the ring that follows the car you drive
 const pm=new THREE.Mesh(fg,pjMat(PILOT_FS,{uC:{value:new THREE.Vector3(1,1,1)},uT:GFX.U.time,uS:{value:0},uA:{value:1},uM:{value:0}}));pm.renderOrder=6;
 const pg=new THREE.Group();pg.add(pm);add(pg,GLOW);pm.layers.enable(GLOW);pg.userData={m:pm};PJ.pilot=pg}
const ownerC=o=>(COLLIN[o]||[1,1,1]);
// a pool spot of light on the floor, in colour c, of size sz
function pjSpot(x,y,c,sz,a){const m=PJ.spot[PJ.spN++];if(!m)return;m.visible=true;m.position.x=x;m.position.z=y;m.scale.set(sz,1,sz);m.material.color.setRGB(c[0]*a,c[1]*a,c[2]*a)}
// a beam from (x0,y0) to (x1,y1) at height h, w wide
function pjBeam(m,x0,y0,x1,y1,h,w){const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||.01;m.position.set((x0+x1)/2,h,(y0+y1)/2);m.rotation.set(0,-Math.atan2(dy,dx),0);m.scale.set(L,1,w)}
const STRIKEC=[1,.16,.24];
function pjFrame(dt){
 pjInit();if(!PJ.ok)return;PJ.spN=0;
 // shells
 for(let i=0;i<PJ.shell.length;i++){const g=PJ.shell[i],s=SHV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1];g.position.set(x,.75,y);g.rotation.y=-Math.atan2(s[3],s[2]);g.scale.setScalar(1.6);pjSpot(x,y,[1,.55,.2],3,.55);
  if(QL.fx>.3&&!FF)FX.push({x:x-s[2]*.012,y:y-s[3]*.012,h:.75,vh:.2,vx:-s[2]*.02,vy:-s[3]*.02,l:.3,l0:.3,c:'#ff8a20',k:1,s:.8,r:0,vr:0})}
 // blades
 for(let i=0;i<PJ.blade.length;i++){const g=PJ.blade[i],s=BLV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1],c=ownerC(s[4]);g.position.set(x,.7,y);g.rotation.y=clk*26+i;g.scale.setScalar(1.45);pjSpot(x,y,c,2.6,.7);
  g.userData.m2.material.color.setRGB(c[0]*1.5+.08,c[1]*1.5+.08,c[2]*1.5+.08);g.userData.m1.material.color.setRGB(2,2,2);
  if(QL.fx>.3&&!FF)FX.push({x:x-s[2]*.01,y:y-s[3]*.01,h:.7,vh:0,vx:0,vy:0,l:.3,l0:.3,c:COLS[s[4]]||'#ff4d5e',k:1,s:.8,r:0,vr:0})}
 // drones
 for(let i=0;i<PJ.miss.length;i++){const g=PJ.miss[i],s=MSV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1],c=ownerC(s[3]);g.position.set(x,.8,y);g.rotation.y=-s[2];g.scale.setScalar(1.35);pjSpot(x,y,c,2.4,.6);
  g.userData.col.color.setRGB(c[0]*1.6,c[1]*1.6,c[2]*1.6);const f=g.userData.fl;f.scale.set(.8+.5*Math.sin(clk*70+i),1,1);
  if(QL.fx>.3&&!FF)FX.push({x:x-Math.cos(s[2])*.7,y:y-Math.sin(s[2])*.7,h:.75,vh:0,vx:0,vy:0,l:.28,l0:.28,c:COLS[s[3]]||'#ff9a3a',k:1,s:.55,r:0,vr:0})}
 // plasma mines (armed ones pulse fast)
 for(let i=0;i<PJ.mine.length;i++){const g=PJ.mine[i],s=MNV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1],c=ownerC(s[2]),k=(s[4]?.8:1)*1.45;g.position.set(x,.02,y);g.scale.setScalar(k);
  const pu=s[3]?.7+.6*(.5+.5*Math.sin(clk*12+i)):.45;g.userData.ring.material.color.setRGB(c[0]*1.4+.05,c[1]*1.4+.05,c[2]*1.4+.05);g.userData.orb.material.color.setRGB(c[0]*2.2*pu+.2,c[1]*2.2*pu+.2,c[2]*2.2*pu+.2);
  g.userData.orb.scale.setScalar(.85+.25*pu);pjSpot(x,y,c,2.2*k,.35*pu)}
 // strikes: red for a rival's, your colour for your own
 for(let i=0;i<PJ.strike.length;i++){const g=PJ.strike[i],s=STV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1],r=s[4]||2.6,p=Math.max(0,Math.min(1,1-Math.max(0,s[2])/1.4)),c=s[3]===VS&&!RPL?ownerC(VS):STRIKEC;
  g.position.set(x,.09,y);const R=r*2.25;g.userData.m.scale.set(R,1,R);const u=g.userData.m.material.uniforms;u.uC.value.set(c[0],c[1],c[2]);u.uP.value=p;u.uA.value=Math.min(1,p*4+.3);
  const bu=g.userData.beam.material.uniforms;bu.uC.value.set(c[0]*1.2,c[1]*1.2+.1,c[2]*1.2+.1);bu.uP.value=p;g.userData.beam.scale.set(r*.4,1,r*.4)}
 // railgun beams (fired in the last half second)
 {let k=0;for(let i=RAILV.length-1;i>=0;i--){const b=RAILV[i],age=(clk-b.t0)/.5;if(age>=1){RAILV.splice(i,1);continue}if(k>=PJ.rail.length)continue;const m=PJ.rail[k++];m.visible=true;
   pjBeam(m,b.x0,b.y0,b.x1,b.y1,.7,1.6*(1-age*.6));const u=m.material.uniforms;u.uC.value.set(b.c[0]*1.3,b.c[1]*1.3,b.c[2]*1.3);u.uA.value=Math.pow(1-age,1.5)*1.3;u.uH.value=age<.35?age/.35:-1}
  for(;k<PJ.rail.length;k++)PJ.rail[k].visible=false}
 // laser wires
 {let k=0;for(const w of WIRES){if(k>=PJ.wire.length)break;const g=PJ.wire[k++],c=ownerC(w.o),u=g.userData;g.visible=true;g.position.set(0,0,0);
   pjBeam(u.m,w.x1,w.y1,w.x2,w.y2,.62,1.1);const mu=u.m.material.uniforms,fade=Math.min(1,w.t/.6);mu.uC.value.set(c[0]*1.4,c[1]*1.4,c[2]*1.4);mu.uA.value=fade*(w.t<1.2?(.6+.4*Math.sin(clk*40)):1);
   u.posts[0].position.set(w.x1,0,w.y1);u.posts[1].position.set(w.x2,0,w.y2);u.capM.color.setRGB(c[0]*2.4+.3,c[1]*2.4+.3,c[2]*2.4+.3);
   pjSpot(w.x1,w.y1,c,2,.5);pjSpot(w.x2,w.y2,c,2,.5)}
  for(;k<PJ.wire.length;k++)PJ.wire[k].visible=false}
 // fault lines: the crack races ahead, then glows for a moment once it stops
 {for(const f of FAULTS){if(!FAULTV.some(v=>v.f===f))FAULTV.push({f,x:f.x,y:f.y,c:f.c,s:f.s,o:f.o,d:f.d,end:0})}
  let k=0;for(let i=FAULTV.length-1;i>=0;i--){const v=FAULTV[i];if(!v.end&&!FAULTS.includes(v.f)){v.end=clk;v.d=Math.max(v.d,v.f.d)}if(!v.end)v.d=v.f.d;
   const age=v.end?(clk-v.end)/.9:0;if(age>=1){FAULTV.splice(i,1);continue}const dd=Math.min(v.d,v.f.e===undefined?BAL.faultL:v.f.e);if(k>=PJ.fault.length)continue;const m=PJ.fault[k++],L=BAL.faultL,c=ownerC(v.o);m.visible=true;
   pjBeam(m,v.x,v.y,v.x+v.c*L,v.y+v.s*L,.06,2.2);const u=m.material.uniforms;u.uC.value.set(c[0],c[1],c[2]);u.uD.value=Math.max(.001,dd/L);u.uL.value=L;u.uA.value=Math.pow(1-age,1.3);
   if(!v.end&&!FF&&QL.fx>.3){const fx=v.x+v.c*dd,fy=v.y+v.s*dd;for(let j=0;j<2;j++){const a=Math.random()*6.28;FX.push({x:fx,y:fy,h:.2,vh:2+Math.random()*3,vx:Math.cos(a)*3+v.c*6,vy:Math.sin(a)*3+v.s*6,l:.5,l0:.5,c:j?'#ffd27a':COLS[v.o]||'#ffb020',k:j?4:3,s:j?.18:.16,r:Math.random()*6,vr:8})}}}
  for(;k<PJ.fault.length;k++)PJ.fault[k].visible=false}
 // black holes
 {let k=0;for(const h of HOLES){if(k>=PJ.hole.length)break;const g=PJ.hole[k++],u=g.userData,c=ownerC(h.o),R=Math.max(.5,(h.r||1)*1.9),life=Math.min(1,h.t/.35);g.visible=true;g.position.set(h.x,0,h.y);
   u.sw.scale.set(R*2,1,R*2);const su=u.sw.material.uniforms;su.uC.value.set(c[0]*1.3,c[1]*1.3,c[2]*1.3);su.uR.value=BAL.holeCore*1.15/R;su.uA.value=life;u.core.scale.setScalar(BAL.holeCore*1.15*(.6+.4*life));u.shade.scale.setScalar(R*.85*life);
   if(!FF&&QL.fx>.3)for(let j=0;j<3;j++){const a=Math.random()*6.283,rr=R*(.7+Math.random()*.4),px=h.x+Math.cos(a)*rr,py=h.y+Math.sin(a)*rr,tx=-Math.sin(a),ty=Math.cos(a);
    FX.push({x:px,y:py,h:.15,vh:0,vx:tx*9-Math.cos(a)*7,vy:ty*9-Math.sin(a)*7,l:.35,l0:.35,c:j?COLS[h.o]||'#ffffff':'#ffffff',k:1,s:.2,r:0,vr:0})}}
  for(;k<PJ.hole.length;k++)PJ.hole[k].visible=false}
 for(let i=PJ.spN;i<PJ.spot.length;i++)PJ.spot[i].visible=false;
 // your own car's ring
 const pg=PJ.pilot,mp=me;if(pg){const show=mp&&mp.alive&&(state==='play'||state==='replay')&&VS>=1&&MARKSEL<2;pg.visible=!!show;
  if(show){pg.position.set(mp.rx,.07,mp.ry);pg.rotation.y=-mp.ra;const R=10,m=pg.userData.m;m.scale.set(R,1,R);const u=m.material.uniforms,c=COLLIN[VS]||[1,1,1];u.uC.value.set(Math.min(1.2,c[0]*1.2+.12),Math.min(1.2,c[1]*1.2+.12),Math.min(1.2,c[2]*1.2+.12));u.uS.value=(boost&&en>0)?1:0;u.uA.value=.85;u.uM.value=MARKSEL===1?1:0}}}
// a railgun shot: the beam (drawn for half a second), sparks along it and a flash where it stops
function railFx(id,x0,y0,x1,y1){if(FF||!GFX.ok)return;const c=ownerC(id);RAILV.push({x0,y0,x1,y1,c,t0:clk});if(RAILV.length>8)RAILV.shift();
 const L=Math.hypot(x1-x0,y1-y0)||1,ux=(x1-x0)/L,uy=(y1-y0)/L,n=Math.round(L*.9*QL.fx);
 for(let i=0;i<n;i++){const t=Math.random()*L,a=Math.random()*6.28,v=1+Math.random()*3;FX.push({x:x0+ux*t,y:y0+uy*t,h:.7,vh:Math.random()*2,vx:Math.cos(a)*v+ux*4,vy:Math.sin(a)*v+uy*4,l:.4,l0:.4,c:Math.random()<.5?'#ffffff':COLS[id]||'#5ee1ff',k:1,s:.14,r:0,vr:0})}
 burst(x1,y1,COLS[id]||'#ffffff',16,10,.6);RINGS.push({x:x1,y:y1,t0:clk,c:COLS[id],r:2.4,dur:.35});RINGS.push({x:x0,y:y0,t0:clk,c:'#ffffff',r:1.8,dur:.25})}
// the burst when a car is lost: sparks, a flash and an ember mark; the car itself tumbles and shrinks (see carsFrame)
function wreckFx(p){const w=p.wreck;if(!w||w.fx)return;w.fx=1;if(FF)return;const c=COLS[p.id];
 for(let i=0;i<14*QL.fx;i++){const a=Math.random()*6.28,v=2+Math.random()*8;FX.push({x:w.x,y:w.y,h:.5,vh:2+Math.random()*5,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:.6+Math.random()*.7,l0:1.3,c:Math.random()<.5?c:'#ffffff',k:Math.random()<.5?1:4,s:.18,r:0,vr:0})}
 for(let i=0;i<5*QL.fx;i++){const a=Math.random()*6.28,v=Math.random()*2.4;FX.push({x:w.x,y:w.y,h:.5,vh:1.4+Math.random()*1.6,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1+Math.random()*.8,l0:1.8,c:'#262c3a',k:2,s:.6+Math.random()*.6,r:Math.random()*6,vr:1})}
 FX.push({x:w.x,y:w.y,h:.8,vh:0,vx:0,vy:0,l:.26,l0:.26,c:'#ffffff',k:0,s:4.6,r:0,vr:0});
 SCORCH.push({x:w.x,y:w.y,r:1.5,t0:clk});if(SCORCH.length>22)SCORCH.shift();RINGS.push({x:w.x,y:w.y,t0:clk,c,r:4.6,dur:.55})}
// ---------- 3D renderer, part 6: screen size, the camera, the cars on screen and one frame; plain 2D picture for phones without WebGL2 ----------
let LASTRB=-9,CAPW=[],TEXOK=0,SPDFX=0,HURT=0,CAMK=1;
const CP={pitch:66*Math.PI/180,fov:34};
const CARI=[null,null,null,null,null,null];
const _pr=new THREE.Vector3();
// world point (x, y on the ground, h above it) -> pixels on screen [x, y, depth]; and a screen pixel -> the ground point under it
function w2s(x,y,h){if(!GFX.ok)return[vw/2+(x-CAM.x)*CAM.z,vh/2+(y-CAM.y)*CAM.z,0];_pr.set(x,h||0,y).project(GFX.cam);return[(_pr.x*.5+.5)*vw,(-_pr.y*.5+.5)*vh,_pr.z]}
function s2w(sx,sy,h){if(!GFX.ok)return[CAM.x+(sx-vw/2)/CAM.z,CAM.y+(sy-vh/2)/CAM.z];_pr.set(sx/vw*2-1,-(sy/vh)*2+1,.5).unproject(GFX.cam);const c=GFX.cam.position,dy=_pr.y-c.y;if(Math.abs(dy)<1e-6)return[CAM.x,CAM.y];const t=((h||0)-c.y)/dy;return[c.x+(_pr.x-c.x)*t,c.z+(_pr.z-c.z)*t]}
// screen vector (pixels) -> heading on the ground: the picture is foreshortened up and down, so the vertical part is stretched back (the flat fallback picture is not)
function screenAngle(vx,vy){return Math.atan2(GFX.ok?vy/Math.sin(CP.pitch):vy,vx)}

function fit(){if(IS_SRV)return;const wr=$('wrap');vw=Math.max(200,wr.clientWidth);vh=Math.max(200,wr.clientHeight);cs=Math.min(vw,vh)/40;dpr=Math.min(devicePixelRatio||1,2);
 cv.style.width=vw+'px';cv.style.height=vh+'px';cv.width=Math.round(vw*dpr);cv.height=Math.round(vh*dpr);
 if(GFX.ok){GFX.cam.fov=CP.fov;gfxFit(vw,vh)}
 MDIRTY=true}

// ---------- the camera: north is up, high above and tilted, following your car and looking a little ahead of it ----------
function camStep(dt){const t=camTarget(),fy=CAM.fy===undefined?.5:CAM.fy;
 const asp=vw/vh,tv=Math.tan(CP.fov*Math.PI/360),thh=tv*asp;
 if(t){const k=1-Math.exp(-dt*8);
  const la=state==='menu'?0:4.8+(boost&&en>0?2.2:0),ax=(t.ra!==undefined?Math.cos(t.ra):0)*la,ay=(t.ra!==undefined?Math.sin(t.ra):0)*la;
  CAM.lx=(CAM.lx||0)+(ax-(CAM.lx||0))*(1-Math.exp(-dt*2.2));CAM.ly=(CAM.ly||0)+(ay-(CAM.ly||0))*(1-Math.exp(-dt*2.2));
  const hh0=(CAM.d||50)*tv/Math.sin(CP.pitch);
  CAM.x+=(t.rx+CAM.lx-CAM.x)*k;CAM.y+=(t.ry+CAM.ly+(.5-fy)*2*hh0-CAM.y)*k}
 const area=(CN[VS]||0)/(MC*MC),V=(state==='menu'?54:Math.min(58,39+Math.sqrt(area)*.22+(boost&&en>0?3.2:0)))/CAMK;CAM.vz+=(V-CAM.vz)*(1-Math.exp(-dt*2));
 const d=asp<1?CAM.vz/(2*thh):CAM.vz*Math.sin(CP.pitch)/(2*tv);CAM.d=d;CAM.z=Math.min(vw,vh)/CAM.vz;
 // the picture may run past the rim into the void by half its size, so a car at the rim stays well inside the screen (clear of the clock and the buttons)
 const hw=thh*d,hh=tv*d/Math.sin(CP.pitch),mx=Math.max(3,hw*.5),my=Math.max(3,hh*.5);
 CAM.x=hw*2>WW+6?WW/2:Math.min(WW+mx-hw,Math.max(hw-mx,CAM.x));CAM.y=hh*2>WH+6?WH/2:Math.min(WH+my-hh,Math.max(hh-my,CAM.y))}
const _sd=new THREE.Vector3();
function camApply(dt){
 const sk=state==='menu'?0:shake,kx=sk>.3?(Math.random()-.5)*sk*.05:0,ky=sk>.3?(Math.random()-.5)*sk*.05:0,d=CAM.d||50,c=GFX.cam,tx=CAM.x+kx,tz=CAM.y+ky;
 c.position.set(tx,d*Math.sin(CP.pitch),tz+d*Math.cos(CP.pitch));c.up.set(0,0,-1);c.lookAt(tx,0,tz);c.near=Math.max(1,d*.25);c.far=d*8+200;c.updateProjectionMatrix();c.updateMatrixWorld();
 // the sun's shadow window follows the camera, snapped so that shadows do not shimmer
 const sn=.5,sx=Math.round(tx/sn)*sn,sz=Math.round(tz/sn)*sn,th=GFX.theme;
 if(th){_sd.copy(GFX.U.sunDir.value);GFX.sun.position.set(sx+_sd.x*90,_sd.y*90,sz+_sd.z*90);GFX.sun.target.position.set(sx,0,sz);GFX.sun.target.updateMatrixWorld();
  const e=Math.max(26,d*.78);const s=GFX.sun.shadow.camera;if(Math.abs(s.right-e)>.5){s.left=-e;s.right=e;s.top=e;s.bottom=-e;s.updateProjectionMatrix()}
  // haze starts beyond the picture, so the land you drive on keeps its contrast
  const fn=d*(th.fogN/48),ff=d*(th.fogF/48);GFX.S.fog.near=fn;GFX.S.fog.far=ff;GFX.U.fogNear.value=fn;GFX.U.fogFar.value=ff}}

// ---------- when territory changes: the ground picture, the minimap and the capture flash ----------
let LANDV=-1,MINIT=-9,MINID=0;
function rebuildLand(){if(IS_SRV)return;
 // your land count (kept by the match offline, counted online) decides the capture flash
 {let c=0;if(!MP)c=CNI[VS]||0;else for(let i=0;i<own.length;i++)if(own[i]===VS)c++;
  if(LANDV>=0&&c-LANDV>20&&me&&me.alive&&state==='play')capFlash(me.rx,me.ry,VS,c-LANDV);LANDV=c}
 if(GFX.ok){if(GW.texOwn)GW.texOwn.needsUpdate=true;GW.maskDirty=1;GW.scDirty=1}else fbPaint();
 ZMY=ZN.map(z=>{let n=0;for(let k=0;k<z.c.length;k++)if(own[z.c[k]]===VS)n++;return z.c.length?n/z.c.length:0});
 MINID=1;miniPaint()}
// the minimap picture: the arena dark, land in the owners' colours, outside the arena clear
function miniPaint(force){if(!MINID||(!force&&clk-MINIT<.15&&MINIT>=0))return;MINID=0;MINIT=clk;
 if(!MINI){MINI=mkc(WW*2,WH*2);MINI.g=MINI.getContext('2d');MINI.img=MINI.g.createImageData(WW*2,WH*2);MINI.cl=COLS.map(c=>c?rgbOf(c):[200,214,232])}
 const L=(GFX.theme&&GFX.theme.mini)||[16,20,32],d=MINI.img.data,cl=MINI.cl,W2=WW*2;
 for(let y=0;y<WH*2;y++){const r=((y*1.5+.75)|0)*MW;for(let x=0;x<W2;x++){const i=r+((x*1.5+.75)|0),o=own[i],k=(y*W2+x)*4;
  if(o){const c=cl[o];d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=235}else if(ISL[i]){d[k]=L[0];d[k+1]=L[1];d[k+2]=L[2];d[k+3]=225}else d[k+3]=0}}
 MINI.g.putImageData(MINI.img,0,0)}
function buildIsland(){if(IS_SRV||!LANDI)return;
 LASTRB=-9;LANDV=-1;MINID=1;FLASH=null;CAPW.length=0;RAILV.length=0;FAULTV.length=0;SCORCH.length=0;RINGS.length=0;
 for(let i=1;i<=5;i++){const p=P[i];if(p){p.ghost=null;p.wreck=null}}
 if(GFX.ok){tierApply();gwBuild();gfxCompile(GFX.S,GFX.cam)}else fbMap();
 MDIRTY=true}
// compile() builds the shader variant that fits the renderer's state at that moment, and the picture is drawn either straight to the screen with
// tone mapping (low tier) or into the scene target without it (the others). Set up the same way first, or the variants built are never used.
function gfxCompile(scene,cam){const R=GFX.R,old=R.getRenderTarget();
 try{if(QL.post&&GFX.rtA)R.setRenderTarget(GFX.rtA);else{R.setRenderTarget(null);R.toneMapping=THREE.ACESFilmicToneMapping}R.compile(scene,cam)}catch(e){}
 R.toneMapping=THREE.NoToneMapping;R.setRenderTarget(old)}

// ---------- loading steps for the start screen ----------
function buildTexSteps(){return[
 ['Starting the 3D engine...',()=>{const ok=gfxInit($('gl'));if(ok){gfxSetTheme(gfxThemeFor(1));fit()}else{$('gl').style.display='none';TEXOK=1}}],
 ['Building the arena...',()=>{if(!GFX.ok)return;genMap(20241008);gwBuild();gfxSetTheme(0)}],
 ['Tuning the engines...',()=>{if(!GFX.ok)return;trInit();ptInit();ringsInit();pjInit();for(let c=0;c<4;c++){const C=carBuild(c,CLS[c].col,'sport',0);C.root.position.set(WW/2+c*3,0,WH/2);GFX.S.add(C.root);CARI[0]=CARI[0]||[];CARI[0].push(C)}
   // every shader the game uses is built now, behind the loading screen: the scene, the effects, the glow and finishing passes (one real frame does the last ones)
   camSet(WW/2+4,WH/2);camApply(0);gfxWarm(CARI[0]);
   for(const C of CARI[0]){GFX.S.remove(C.root);carFree(C)}CARI[0]=null;gwDispose();TEXOK=1}]]}
function buildTexAll(){for(const s of buildTexSteps())s[1]()}
// compile() only builds shaders for what is visible, and the GPU finishes a shader the first time something is drawn with it. Effects stay hidden
// until something happens (shells, blades, drones, mines, strikes, beams, wires, cracks, black holes, light spots, the ring under your car, rings,
// scorch marks, trails, sparks, the cars' class parts), so they are shown for one compile and one picture here, then hidden again.
// Otherwise each would be built the first time it appears in a match: a hitch of a fraction of a second on a phone, seconds in the simulator.
function gfxWarm(cars){
 // drawn even when off screen (so each gets the shader variant the real picture uses: tone mapping and colour output depend on where it is drawn)
 const shown=[],culled=[],show=o=>{if(!o)return;if(!o.visible){o.visible=true;shown.push(o)}if(o.frustumCulled){o.frustumCulled=false;culled.push(o)}},deep=o=>{if(o)o.traverse(show)};
 for(const k of ['shell','blade','miss','mine','strike','rail','wire','fault','hole','spot'])deep((PJ[k]||[])[0]);
 deep(PJ.pilot);deep(RG3.pool[0]);deep(RG3.sc[0]);
 for(const C of cars||[])deep(C.root);
 let tm=null;if(TR3.ok){tm=trMesh(0);trBuild(tm,[WW/2,WH/2,WW/2+3,WH/2+1],undefined,undefined,trVis(),.42,.075);tm.sh.visible=false;tm.ln.visible=true;tm.grp.visible=true}
 if(PT.ok)for(const S of [PT.A,PT.N])S.g.instanceCount=1;
 if(GW.rtA){GW.maskDirty=1;gwMask()}
 try{gfxRender(GFX.S,GFX.cam)}catch(e){}
 for(const o of shown)o.visible=false;for(const o of culled)o.frustumCulled=true;
 if(tm){tm.g.setDrawRange(0,0);tm.grp.visible=false}
 if(PT.ok)for(const S of [PT.A,PT.N])S.g.instanceCount=0}
function camSet(x,y){CAM.x=x;CAM.y=y;CAM.vz=40;const asp=vw/vh,tv=Math.tan(CP.fov*Math.PI/360);CAM.d=asp<1?40/(2*tv*asp):40*Math.sin(CP.pitch)/(2*tv)}

// ---------- the cars: a model per slot, rebuilt when the class, colour or finish changes ----------
function visFlags(p,fl){p.fl=fl;p.fSlow=fl&2;p.fMv=(fl&4)?((fl>>16)&3):0;p.fSpr=fl&8;p.fPlt=fl&16;p.fSh=fl&32;p.fPrt=(fl>>6)&15;p.fHold=(fl>>10)&15;p.fUlt=fl&16384;p.fInv=fl&32768}
function carsFrame(dt){
 const night=GFX.theme?GFX.theme.night:0;
 for(let q=1;q<=5;q++){
  const p=P[q];let C=CARI[q];
  const w=p&&p.wreck,age=w?clk-w.t0:9,show=p&&(p.alive||(w&&age<.9));
  if(!show){if(C)C.root.visible=false;continue}
  const cl=CLSI[q]||0,sk=(COS[q]||[])[0],skin=SKINL[sk]?sk:'sport',key=cl+'|'+skin+'|'+COLS[q];
  if(!C||C.key!==key){if(C){GFX.S.remove(C.root);carFree(C)}C=CARI[q]=carBuild(cl,COLS[q],skin,q);C.key=key;GFX.S.add(C.root);C.lastA=p.ra||0;C.px=undefined}
  C.root.visible=true;
  if(p.alive){
   const born=p.born!==undefined?clk-p.born:9,sc=born<.4?.35+.65*Math.sin(born/.4*1.5708):1;
   carFrame(C,p,dt,clk,night);C.root.scale.setScalar(sc*CAR_K);
   if(born<.5&&!p.bfx&&!FF){p.bfx=1;RINGS.push({x:p.rx,y:p.ry,t0:clk,c:COLS[q],r:3.2,dur:.55})}if(born>.6)p.bfx=0}
  else{ // a lost car: it flips up, spins and shrinks while the flames burn
   wreckFx(p);const h=gfxGround(w.x,w.y),u=age/.9;
   C.root.position.set(w.x,h+.1+Math.max(0,5.5*age-12*age*age),w.y);C.root.rotation.set(age*6,-w.a+age*5,age*9);C.root.scale.setScalar(Math.max(.05,1-u*.85)*CAR_K);
   C.contact.visible=false}
  if(p.alive)C.contact.visible=true}}

// ---------- one frame ----------
function frame3d(dt){
 GFX.time=clk;
 camStep(dt);camApply(dt);
 // look from the ground up: every moving thing is placed first, then the scene is drawn
 carsFrame(dt);trailsFrame();particlesFrame();ringsFrame();pjFrame(dt);gwFrame(dt);
 const U=GFX.mComp.uniforms,spTarget=(me&&me.alive&&boost&&en>0&&state==='play')?1:0;SPDFX+=(spTarget-SPDFX)*Math.min(1,dt*6);U.uSpeed.value=SPDFX*(QL.hi?1:0);
 HURT*=Math.pow(.02,dt);U.uHurt.value=HURT;
 const t0=performance.now();gfxRender(GFX.S,GFX.cam);GFX.stats.ms+=(performance.now()-t0-GFX.stats.ms)*.1}

// ---------- the plain 2D picture (only for phones that cannot do WebGL2) ----------
let FBC=null,FBL=null;
function fbMap(){if(!FBC)FBC=mkc(MW,MH);
 const m=mkc(MW,MH),g=m.getContext('2d'),img=g.createImageData(MW,MH),d=img.data;for(let i=0;i<ISL.length;i++){const k=i*4,v=ISL[i]?255:0;d[k]=d[k+1]=d[k+2]=v;d[k+3]=255}g.putImageData(img,0,0);
 FBL=mkc(MW*3,MH*3);const b=FBL.getContext('2d');b.imageSmoothingEnabled=true;b.imageSmoothingQuality='high';b.filter='blur(5px) contrast(9)';b.drawImage(m,0,0,MW*3,MH*3);b.filter='none';
 const id=b.getImageData(0,0,MW*3,MH*3),q=id.data;for(let i=0;i<q.length;i+=4){const l=q[i]/255,e=Math.max(0,1-Math.abs(l-.5)*6);q[i]=4+10*l+40*e;q[i+1]=6+14*l+150*e;q[i+2]=10+24*l+190*e;q[i+3]=255}b.putImageData(id,0,0);
 fbPaint()}
function fbPaint(){if(!FBC)return;const g=FBC.getContext('2d'),img=g.createImageData(MW,MH),d=img.data,cl=COLS.map(c=>c?rgbOf(c):[0,0,0]);
 for(let i=0;i<own.length;i++){const o=own[i],k=i*4;if(o){const c=cl[o];d[k]=c[0]*.85+30;d[k+1]=c[1]*.85+30;d[k+2]=c[2]*.85+30;d[k+3]=255}}
 g.putImageData(img,0,0)}
function frame2d(dt){
 const asp=vw/vh;CAM.vz=44;CAM.z=Math.min(vw,vh)/CAM.vz;camStep2d(dt);const z=CAM.z,ox=vw/2-CAM.x*z,oy=vh/2-CAM.y*z;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#000000';ctx.fillRect(0,0,cv.width,cv.height);
 ctx.setTransform(dpr*z,0,0,dpr*z,dpr*ox,dpr*oy);ctx.imageSmoothingEnabled=true;
 if(FBL)ctx.drawImage(FBL,0,0,WW,WH);if(FBC)ctx.drawImage(FBC,0,0,WW,WH);
 ctx.lineCap=ctx.lineJoin='round';
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.tr.length)continue;const tr=(q===1&&MP)?ncTrail(p):p.tr;ctx.strokeStyle=COLS[q];ctx.lineWidth=.45;ctx.globalAlpha=.85;ctx.beginPath();for(let i=0;i<tr.length;i+=2)i?ctx.lineTo(tr[i],tr[i+1]):ctx.moveTo(tr[i],tr[i+1]);if(p.alive)ctx.lineTo(p.rx,p.ry);ctx.stroke();ctx.globalAlpha=1}
 for(let zi=0;zi<ZN.length;zi++){const zz=ZN[zi],o=ZOWN[zi]||0;ctx.strokeStyle=o?COLS[o]:'#ffffff';ctx.lineWidth=.3;ctx.beginPath();ctx.arc(zz.x,zz.y,ZR,0,7);ctx.stroke()}
 for(const s of SHV){ctx.fillStyle='#ffd27a';ctx.beginPath();ctx.arc(s[0],s[1],.3,0,7);ctx.fill()}
 for(const s of BLV){ctx.fillStyle=COLS[s[4]]||'#fff';ctx.beginPath();ctx.arc(s[0],s[1],.35,0,7);ctx.fill()}
 for(const s of MSV){ctx.fillStyle=COLS[s[3]]||'#fff';ctx.beginPath();ctx.arc(s[0],s[1],.4,0,7);ctx.fill()}
 for(const s of STV){ctx.strokeStyle='#ff3b5e';ctx.lineWidth=.2;ctx.beginPath();ctx.arc(s[0],s[1],s[4]||2.6,0,7);ctx.stroke()}
 for(const m of MNV){ctx.fillStyle=COLS[m[2]]||'#fff';ctx.beginPath();ctx.arc(m[0],m[1],.5,0,7);ctx.fill()}
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.alive)continue;ctx.save();ctx.translate(p.rx,p.ry);ctx.rotate(p.ra);ctx.fillStyle=COLS[q];ctx.strokeStyle='#fff';ctx.lineWidth=.14;ctx.beginPath();ctx.roundRect(-1.2,-.65,2.4,1.3,.4);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(.5,-.4,.5,.8);ctx.restore()}
 ctx.setTransform(dpr,0,0,dpr,0,0)}
function camStep2d(dt){const t=camTarget();if(t){const k=1-Math.exp(-dt*8);CAM.x+=(t.rx-CAM.x)*k;CAM.y+=(t.ry-CAM.y)*k}const hw=vw/2/CAM.z,hh=vh/2/CAM.z,mx=Math.max(3,hw*.5),my=Math.max(3,hh*.5);CAM.x=hw*2>WW+6?WW/2:Math.min(WW+mx-hw,Math.max(hw-mx,CAM.x));CAM.y=hh*2>WH+6?WH/2:Math.min(WH+my-hh,Math.max(hh-my,CAM.y))}

function draw(){
 if(!TEXOK&&!GFX.ok)buildTexAll();
 const dt=Math.max(0,Math.min(.1,clk-(draw.lt===undefined?clk:draw.lt)));draw.lt=clk;
 if(MDIRTY&&(clk-LASTRB>=.05||LASTRB<0)){rebuildLand();MDIRTY=false;LASTRB=clk}
 miniPaint();
 if(GFX.ok&&GFX.mode==='world'){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);frame3d(dt)}
 else if(GFX.ok&&GFX.mode==='garage')garageFrame(dt);
 else if(!GFX.ok)frame2d(dt);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 if(GFX.mode==='world')drawHUD(vw,vh)}
// ---------- 3D renderer, part 7: the garage. A car on a turntable under studio light, shown behind the class and garage screens ----------
// GFX.mode is 'world' (the match and the menu showreel) or 'garage' (this scene). The screens in 44_screens.js choose what is on the turntable through GGUI.
const GG={S:null,cam:null,sun:null,turn:null,car:null,key:'',ang:.7,vel:.9,auto:.45,drag:0,lx:0,lt:0,dv:0,t:0,pop:1,ring:null,ringM:null,ticks:null,snow:null,pools:[],hemi:null};
const GGUI={cl:0,skin:'sport',col:COLS[1]};
function ggPlatTex(){const N=512,c=mkc(N,N),g=c.getContext('2d');g.fillStyle='#232d47';g.fillRect(0,0,N,N);g.translate(N/2,N/2);
 // brushed metal: many faint arcs
 for(let i=0;i<340;i++){const r=Math.random()*N/2,a=Math.random()*6.283,l=.2+Math.random()*.7;g.strokeStyle='rgba(255,255,255,'+(.012+Math.random()*.035)+')';g.lineWidth=.7+Math.random()*1.3;g.beginPath();g.arc(0,0,r,a,a+l);g.stroke()}
 g.strokeStyle='rgba(150,195,255,.22)';g.lineWidth=1.6;for(const r of [238,214,152,98]){g.beginPath();g.arc(0,0,r,0,6.2832);g.stroke()}
 g.lineWidth=1;g.strokeStyle='rgba(150,195,255,.13)';for(let k=0;k<48;k++){const a=k/48*6.2832;g.beginPath();g.moveTo(Math.cos(a)*100,Math.sin(a)*100);g.lineTo(Math.cos(a)*212,Math.sin(a)*212);g.stroke()}
 g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.arc(0,0,92,0,6.2832);g.fill();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function ggFloorTex(){const N=512,c=mkc(N,N),g=c.getContext('2d');g.fillStyle=rg(g,N/2,N/2,0,N/2,N/2,N/2,[[0,'#0f2650'],[.3,'#081736'],[.62,'#030a1c'],[1,'#000000']]);g.fillRect(0,0,N,N);
 g.translate(N/2,N/2);g.strokeStyle='rgba(56,180,255,.16)';g.lineWidth=1.2;for(let r=40;r<N/2;r+=34){g.beginPath();g.arc(0,0,r,0,6.2832);g.stroke()}
 for(let k=0;k<32;k++){const a=k/32*6.2832;g.beginPath();g.moveTo(Math.cos(a)*40,Math.sin(a)*40);g.lineTo(Math.cos(a)*N/2,Math.sin(a)*N/2);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function ggTickTex(){const N=512,c=mkc(N,N),g=c.getContext('2d');g.translate(N/2,N/2);g.strokeStyle='#fff';g.lineCap='round';
 for(let k=0;k<96;k++){const a=k/96*6.2832,big=k%8===0,r1=N/2-6,r0=r1-(big?20:9);g.lineWidth=big?4:2.2;g.globalAlpha=big?1:.55;g.beginPath();g.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);g.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);g.stroke()}
 g.globalAlpha=.8;g.lineWidth=3;for(let k=0;k<4;k++){const a=k*1.5708+.4;g.beginPath();g.arc(0,0,N/2-46,a,a+.7);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function ggInit(){
 if(GG.S||!GFX.ok)return;
 const S=GG.S=new THREE.Scene(),R0=2.75;
 S.background=cLin('#01030a');S.fog=new THREE.Fog(cLin('#01030a'),16,46);
 GG.cam=new THREE.PerspectiveCamera(30,1,.5,90);
 S.environment=gfxEnv(GTH[0]);S.environmentIntensity=.95;
 // light: a warm key from the front right with shadows, cold and pink edge lights from behind, a soft fill
 const sun=GG.sun=new THREE.DirectionalLight(0xfff0dc,3.4);sun.position.set(4.5,8,5.5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 const sc=sun.shadow.camera;sc.near=2;sc.far=26;sc.left=-4.2;sc.right=4.2;sc.top=4.2;sc.bottom=-4.2;sun.shadow.bias=-.0005;sun.shadow.normalBias=.02;sun.shadow.radius=3;S.add(sun,sun.target);
 GG.hemi=new THREE.HemisphereLight(0x8fb4ff,0x0a1226,.8);S.add(GG.hemi);
 const rimA=new THREE.DirectionalLight(0x4fd0ff,2.6);rimA.position.set(-7,3,-6);S.add(rimA);
 const rimB=new THREE.DirectionalLight(0xff5c8a,1.8);rimB.position.set(7,2.5,-5);S.add(rimB);
 const fill=new THREE.DirectionalLight(0xbcd2ff,.9);fill.position.set(-6,4,6);S.add(fill);
 // the floor is a picture of pooled light; the platform on top of it is real metal
 const fl=new THREE.Mesh(new THREE.CircleGeometry(22,64),new THREE.MeshBasicMaterial({map:ggFloorTex(),fog:false}));fl.rotation.x=-Math.PI/2;fl.position.y=-.26;S.add(fl);
 const turn=GG.turn=new THREE.Group();S.add(turn);
 const plat=new THREE.Mesh(new THREE.CylinderGeometry(R0,R0+.14,.26,96,1),new THREE.MeshStandardMaterial({color:0xffffff,map:ggPlatTex(),metalness:.92,roughness:.36,envMapIntensity:1.1}));plat.position.y=-.13;plat.receiveShadow=true;turn.add(plat);
 // glowing rim in the colour of the class
 GG.ringM=new THREE.MeshBasicMaterial({color:new THREE.Color(2,2,2),toneMapped:false});
 const ring=GG.ring=new THREE.Mesh(new THREE.RingGeometry(R0-.2,R0-.09,128),GG.ringM);ring.rotation.x=-Math.PI/2;ring.position.y=.006;ring.layers.enable(GLOW);turn.add(ring);
 const ring2=new THREE.Mesh(new THREE.RingGeometry(R0+.02,R0+.07,128),GG.ringM);ring2.rotation.x=-Math.PI/2;ring2.position.y=-.01;ring2.layers.enable(GLOW);turn.add(ring2);
 // a slowly counter-turning dial around the platform
 GG.ticks=new THREE.Mesh(new THREE.CircleGeometry(R0+.95,128),new THREE.MeshBasicMaterial({map:ggTickTex(),transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,color:new THREE.Color(.7,1.2,2)}));GG.ticks.rotation.x=-Math.PI/2;GG.ticks.position.y=-.24;S.add(GG.ticks);
 // pools of coloured light on the floor and drifting snow
 const sp=spotTex();
 for(const [x,z,c,s] of [[-5.5,-3.5,[.12,.5,1],8],[5.8,-2.5,[.7,.2,1],9],[-4.5,5.5,[.1,.8,.9],7],[6,5,[1,.3,.5],6],[0,-8,[.2,.4,1],11]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(s,s),new THREE.MeshBasicMaterial({map:sp,color:new THREE.Color(c[0],c[1],c[2]),transparent:true,opacity:.34,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false}));
  m.rotation.x=-Math.PI/2;m.position.set(x,-.22,z);S.add(m);GG.pools.push(m)}
 const N=320,pos=new Float32Array(N*3),sd=new Float32Array(N*3);for(let i=0;i<N;i++){const a=Math.random()*6.283,r=1+Math.random()*7;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=Math.random()*7-.2;pos[i*3+2]=Math.sin(a)*r;sd[i*3]=.2+Math.random()*.5;sd[i*3+1]=Math.random()*6.28;sd[i*3+2]=.5+Math.random()}
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
 GG.snow=new THREE.Points(pg,new THREE.PointsMaterial({map:sp,size:.12,sizeAttenuation:true,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending,color:0xcfe6ff,fog:false}));GG.snow.frustumCulled=false;GG.snow.userData.sd=sd;S.add(GG.snow);
 ggPtr()}
// drag the car round with a finger or the mouse; it keeps its swing and eases back to a slow turn
let GGP=0;
function ggPtr(){if(GGP)return;GGP=1;
 document.addEventListener('pointerdown',e=>{if(GFX.mode!=='garage'||(e.target&&e.target.closest&&e.target.closest('#card')))return;GG.drag=1;GG.lx=e.clientX;GG.lt=performance.now();GG.vel=0;GG.dv=0});
 document.addEventListener('pointermove',e=>{if(!GG.drag)return;const now=performance.now(),dx=e.clientX-GG.lx,dt=Math.max(4,now-GG.lt);GG.lx=e.clientX;GG.lt=now;GG.ang+=dx*.012;GG.dv=GG.dv*.6+(dx*.012/(dt/1000))*.4});
 const up=()=>{if(GG.drag){GG.drag=0;GG.vel=Math.max(-9,Math.min(9,GG.dv||0))}};
 document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up)}
// which car stands on the turntable
function ggSync(){
 const g=GGUI,key=g.cl+'|'+g.skin+'|'+g.col;
 if(GG.key!==key){
  if(GG.car){GG.turn.remove(GG.car.root);carFree(GG.car);GG.car=null}
  const C=GG.car=carBuild(g.cl,g.col,SKINL[g.skin]?g.skin:'sport',0);C.root.position.set(0,0,0);C.contact.visible=false;C.setHeadlights(0);C.under.material.opacity=.7;GG.turn.add(C.root);GG.key=key;GG.pop=0;
  const lc=linOf(CLS[g.cl].col),m=GG.ringM.color;m.setRGB(lc[0]*2.6+.1,lc[1]*2.6+.1,lc[2]*2.6+.1);
  if(GG.carRim)GG.carRim=null}}
function ggEnter(){const C=GFX.mComp.uniforms;C.uExpo.value=1.04;C.uSat.value=1.16;C.uCon.value=1.1;C.uVig.value=.42;C.uGlow.value=.45;C.uTint.value.set(.98,1,1.04);C.uSpeed.value=0;C.uHurt.value=0;
 GG.drag=0;GG.vel=1.1;GG.pop=0;GG.key='';ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height)}
function ggLeave(){GG.drag=0;if(GFX.theme)gfxSetTheme(GFX.thIdx)}
function gfxMode(m){
 if(!GFX.ok){GFX.mode='world';return}
 if(m===GFX.mode)return;
 if(m==='garage'){ggInit();GFX.mode='garage';ggEnter()}
 else{GFX.mode='world';ggLeave()}}
// where the car sits on screen: the part of the picture that the card does not cover
function ggLayout(){
 const asp=vw/vh,c=GG.cam,tv=Math.tan(c.fov*Math.PI/360),land=asp>1.1;
 const fw=land?.52:1,fh=land?.96:.4,cx=land?.26:.5,cy=land?.5:.2;
 const d=Math.max(4.7/(fw*2*tv*asp),3.3/(fh*2*tv));
 c.aspect=asp;c.setViewOffset(vw,vh,(.5-cx)*vw,(.5-cy)*vh,vw,vh);
 const el=land?20:25,e=el*Math.PI/180,az=Math.sin(GG.t*.35)*.06;
 c.position.set(Math.sin(az)*d*Math.cos(e),d*Math.sin(e)+.45,Math.cos(az)*d*Math.cos(e));c.up.set(0,1,0);c.lookAt(0,.45,0);c.updateProjectionMatrix();c.updateMatrixWorld()}
function garageFrame(dt){
 if(!GG.S)ggInit();if(!GG.S)return;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
 GG.t+=dt;ggSync();
 if(!GG.drag)GG.vel+=(GG.auto-GG.vel)*Math.min(1,dt*1.3);
 GG.ang+=GG.vel*dt;GG.turn.rotation.y=GG.ang;
 // the car pops in when it is swapped
 GG.pop=Math.min(1,GG.pop+dt*3.2);const e=1-Math.pow(1-GG.pop,3),sc=.82+.18*e+(GG.pop<1?Math.sin(GG.pop*3.14159)*.04:0);
 const C=GG.car;if(C){C.root.scale.setScalar(sc);C.body.position.y=Math.sin(GG.t*1.7)*.008;C.mGlow.visible=true;
  if(C.bladeL){C.bex=.3+.15*Math.sin(GG.t*1.3);C.bladeL.position.z=-.5-.45*C.bex;C.bladeR.position.z=.5+.45*C.bex;C.bladeL.scale.set(1+.5*C.bex,1,1);C.bladeR.scale.set(1+.5*C.bex,1,1)}
  if(C.barrel)C.barrel.position.x=0}
 GG.ring.scale.setScalar(1+(1-e)*.06);GG.ticks.rotation.z=-GG.t*.12;
 // snow
 const a=GG.snow.geometry.attributes.position,p=a.array,sd=GG.snow.userData.sd;
 for(let i=0;i<p.length;i+=3){sd[i+1]+=dt*sd[i];p[i+1]-=dt*sd[i+2]*.6;p[i]+=Math.sin(sd[i+1])*dt*.18;p[i+2]+=Math.cos(sd[i+1]*.8)*dt*.14;if(p[i+1]<-.2){p[i+1]=7;}}
 a.needsUpdate=true;
 GG.sun.castShadow=QL.shadow>0;
 GG.cam.layers.set(0);ggLayout();
 const t0=performance.now();gfxRender(GG.S,GG.cam);GFX.stats.ms+=(performance.now()-t0-GFX.stats.ms)*.1}