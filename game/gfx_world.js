// ---------- 3D renderer, part 2b: what makes the island a place ----------
// A research station on a flat islet (modules on legs, a radome, fuel tanks, containers, a mast, a helipad with a helicopter, a wind turbine),
// an icebreaker sailing round the island with its wake, penguins on the islets, and a cargo plane that crosses the sky now and then.
// None of it stands on the land you drive on, so the game itself never sees any of it.
const PR={grp:null,mats:null,rot:[],blink:[],ship:null,path:null,plen:0,ps:0,wake:null,peng:null,pengD:[],plane:null,pl:null,planeNext:14,padTex:null};

function prMats(){if(PR.mats)return PR.mats;
 const S=(c,r,m,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:m,envMapIntensity:.7},o||{}));
 PR.mats={white:S(0xe6ebf2,.55,.05),orange:S(0xd8482a,.5,.15),red:S(0xae2528,.45,.2),dark:S(0x272d39,.55,.6),steel:S(0x9aa3b2,.38,.85),yellow:S(0xf0bd2c,.45,.2),blue:S(0x2f63c8,.5,.2),
  black:S(0x14171d,.5,.2),deck:S(0x59606d,.8,.3,{side:THREE.DoubleSide}),glass:S(0x16212e,.15,.3,{emissive:new THREE.Color(1,.78,.45),emissiveIntensity:0}),
  lamp:new THREE.MeshBasicMaterial({color:new THREE.Color(3,.25,.2),toneMapped:false}),lampG:new THREE.MeshBasicMaterial({color:new THREE.Color(.2,2.6,.6),toneMapped:false}),lampW:new THREE.MeshBasicMaterial({color:new THREE.Color(3,3,3),toneMapped:false})};
 PR.mats.hull=PR.mats.red.clone();PR.mats.hull.side=THREE.DoubleSide;
 return PR.mats}
// parts that share a material become one mesh
function prMesh(list,mat,cast){const m=new THREE.Mesh(gMerge(list),mat);m.castShadow=cast!==false;m.receiveShadow=true;return m}
function prLamp(par,mat,x,y,z,r,blink){const m=new THREE.Mesh(new THREE.SphereGeometry(r||.1,10,8),mat);m.position.set(x,y,z);m.layers.enable(GLOW);par.add(m);if(blink)PR.blink.push({o:m,ph:blink});return m}
// a helipad: dark disc, white circle and the letter H
function prPadTex(){if(PR.padTex)return PR.padTex;const N=256,c=mkc(N,N),g=c.getContext('2d');g.fillStyle='#363c48';g.fillRect(0,0,N,N);
 g.strokeStyle='#f0f2f6';g.lineWidth=12;g.beginPath();g.arc(N/2,N/2,N*.4,0,7);g.stroke();g.strokeStyle='#f2c230';g.lineWidth=6;g.beginPath();g.arc(N/2,N/2,N*.47,0,7);g.stroke();
 g.fillStyle='#f0f2f6';g.fillRect(N*.33,N*.3,N*.08,N*.4);g.fillRect(N*.59,N*.3,N*.08,N*.4);g.fillRect(N*.33,N*.46,N*.34,N*.08);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return PR.padTex=t}
function prHelipad(r){const M=prMats();const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.04,.14,40),[M.dark,new THREE.MeshStandardMaterial({map:prPadTex(),roughness:.7,metalness:.1}),M.dark]);m.receiveShadow=true;m.castShadow=true;return m}

// ---------- the research station ----------
function prStation(){
 const M=prMats(),g=new THREE.Group(),W=[],O=[],D=[],ST=[],GL=[],Y=[],B=[];
 // main module on short legs: orange walls, white roof, a band of windows
 O.push(gP(box(3.8,1.3,1.9,.06),0,1.15,0));W.push(gP(box(3.96,.14,2.06,.04),0,1.86,0));
 GL.push(gP(box(3.3,.3,.05),0,1.32,.96),gP(box(3.3,.3,.05),0,1.32,-.96),gP(box(.05,.3,1.2),1.91,1.32,0));
 for(const sx of [-1.6,0,1.6])for(const sz of [-.75,.75])D.push(gP(cyl(.09,.09,.55,6),sx,.27,sz));
 ST.push(gP(box(.6,.28,.55,.03),-1.1,2.07,.35),gP(box(.6,.28,.55,.03),-.3,2.07,.35),gP(cyl(.2,.2,.32,12),1.1,2.08,-.45));
 D.push(gP(box(.55,.08,1.0),2.3,.5,.45,0,0,-.55));
 // second module, white with a blue band, joined by a short corridor
 W.push(gP(box(2.4,1.1,1.5,.06),.7,1.0,2.45));B.push(gP(box(2.46,.22,1.56,.02),.7,1.2,2.45));GL.push(gP(box(1.8,.24,.05),.7,.98,3.21));
 W.push(gP(box(.7,.7,.7,.04),.7,1.0,1.35));
 for(const sx of [-.3,1.7])for(const sz of [1.9,3.0])D.push(gP(cyl(.08,.08,.5,6),sx,.25,sz));
 // radome on a round tower
 W.push(gP(new THREE.SphereGeometry(.85,20,14),-2.7,2.25,2.2),gP(cyl(.55,.62,1.4,16),-2.7,.7,2.2));
 // fuel tanks on cradles
 Y.push(gP(cyl(.4,.4,1.9,16),2.7,.55,-1.7,0,0,Math.PI/2),gP(cyl(.4,.4,1.9,16),2.7,.55,-2.65,0,0,Math.PI/2));
 D.push(gP(box(.2,.3,2.0),1.95,.15,-2.17),gP(box(.2,.3,2.0),3.45,.15,-2.17));
 // stacked containers
 B.push(gP(box(1.5,.62,.66,.02),-2.4,.31,-1.4));O.push(gP(box(1.5,.62,.66,.02),-2.3,.93,-1.4,0,.08,0));Y.push(gP(box(1.5,.62,.66,.02),-2.4,.31,-2.15));
 // antenna mast with cross arms and a dish
 ST.push(gP(cyl(.05,.08,3.8,6),-.9,3.75,-.35),gP(box(.9,.04,.04),-.9,4.6,-.35),gP(box(.04,.04,.7),-.9,5.1,-.35),gP(cyl(.24,.24,.04,14),-.9,4.2,-.1,1.2,0,0));
 g.add(prMesh(W,M.white),prMesh(O,M.orange),prMesh(D,M.dark),prMesh(ST,M.steel),prMesh(GL,M.glass,false),prMesh(Y,M.yellow),prMesh(B,M.blue));
 prLamp(g,M.lamp,-.9,5.72,-.35,.11,1);
 // helipad with a parked helicopter, rotor idling
 const hp=prHelipad(1.4);hp.position.set(3.7,.07,2.4);g.add(hp);
 const hc=new THREE.Group(),HB=[],HD=[];
 HB.push(gP(new THREE.SphereGeometry(.42,16,12),0,.52,0,0,0,0,1.3,.85,.85),gP(box(1.4,.14,.14),-.95,.62,0),gP(box(.32,.42,.06),-1.6,.78,0));
 HD.push(gP(box(1.2,.05,.07),0,.05,.32),gP(box(1.2,.05,.07),0,.05,-.32),gP(box(.05,.3,.05),.3,.2,.3),gP(box(.05,.3,.05),-.3,.2,.3),gP(box(.05,.3,.05),.3,.2,-.3),gP(box(.05,.3,.05),-.3,.2,-.3));
 hc.add(prMesh(HB,M.red),prMesh(HD,M.dark));
 const rot=new THREE.Mesh(gMerge([gP(box(2.7,.025,.13),0,0,0),gP(box(2.7,.025,.13),0,0,0,0,Math.PI/2,0)]),M.dark);rot.position.set(0,1.0,0);rot.castShadow=true;hc.add(rot);
 hc.position.set(3.7,.14,2.4);hc.rotation.y=.6;g.add(hc);PR.rot.push({o:rot,ax:'y',sp:1.4});
 // wind turbine
 const wt=new THREE.Group();wt.add(prMesh([gP(cyl(.1,.17,4.6,10),0,2.3,0)],M.white),prMesh([gP(box(.75,.34,.34,.06),0,4.7,0)],M.white));
 const hub=new THREE.Group();hub.position.set(.42,4.7,0);const bl=[];
 for(let k=0;k<3;k++){const b0=box(.05,1.95,.2);b0.translate(0,1.02,0);bl.push(gP(b0,0,0,0,k*2.0944,0,0))}bl.push(new THREE.SphereGeometry(.14,10,8));
 const rr=prMesh(bl,M.white);hub.add(rr);wt.add(hub);PR.rot.push({o:rr,ax:'x',sp:2.1});
 wt.position.set(-3.8,0,-2.9);wt.rotation.y=.5;g.add(wt);
 // a flag
 const fl=new THREE.Group();fl.add(prMesh([gP(cyl(.03,.03,2.4,6),0,1.2,0)],M.steel));const fm=new THREE.Mesh(new THREE.PlaneGeometry(.9,.55,6,1),new THREE.MeshStandardMaterial({color:0x2f63c8,roughness:.8,side:THREE.DoubleSide}));fm.position.set(.45,2.1,0);fm.castShadow=true;fl.add(fm);
 fl.position.set(2.3,0,-.6);g.add(fl);PR.flag=fm;
 return g}

// ---------- the icebreaker ----------
function prWakeTex(){const W=256,H=128,c=mkc(W,H),g=c.getContext('2d'),im=g.createImageData(W,H),d=im.data;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/W,v=y/H-.5,i=(y*W+x)*4,sp=(1-u)*.42+.05,l1=Math.exp(-Math.pow((Math.abs(v)-sp)/(.025+.04*(1-u)),2)),wash=Math.exp(-v*v/(.004+.03*(1-u)))*(.35+.65*u),
  n=.6+.4*Math.sin(x*.9+Math.sin(y*.7)*3)*Math.sin(y*1.3+x*.2),a=Math.min(1,(l1*.9+wash*.8)*n)*Math.pow(u,1.4);d[i]=d[i+1]=d[i+2]=255;d[i+3]=Math.round(a*230)}
 g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function prShip(){
 const M=prMats(),g=new THREE.Group();
 // hull: smooth sections, keel down (the water hides what is below the waterline)
 let st=spStations([{x:-8,w:1.35,y0:-.6,y1:1.0,k:5},{x:-6.6,w:1.7,y0:-.9,y1:1.0,k:5.5},{x:2,w:1.75,y0:-.9,y1:1.0,k:5.5},{x:5,w:1.45,y0:-.8,y1:1.1,k:4.5},{x:7,w:.8,y0:-.5,y1:1.25,k:3.4},{x:8.3,w:.1,y0:.1,y1:1.35,k:2.4}],40);
 st=st.map(s=>({x:s.x,w:s.w,y0:s.y1,y1:s.y0,k:s.k}));
 const hull=new THREE.Mesh(loft(st,18,0),M.hull);hull.castShadow=true;hull.receiveShadow=true;g.add(hull);
 // deck: the outline of the hull at deck height
 const sh=new THREE.Shape();st.forEach((s,i)=>i?sh.lineTo(s.x,s.w*.97):sh.moveTo(s.x,s.w*.97));for(let i=st.length-1;i>=0;i--)sh.lineTo(st[i].x,-st[i].w*.97);sh.closePath();
 const dg=new THREE.ShapeGeometry(sh);dg.rotateX(-Math.PI/2);const dk=new THREE.Mesh(dg,M.deck);dk.position.y=1.0;dk.receiveShadow=true;g.add(dk);
 const W=[],R=[],D=[],ST=[],GL=[],Y=[],B=[],O=[];
 // superstructure, bridge, wings, funnel, mast, crane, containers, lifeboats
 W.push(gP(box(3.4,1.4,2.8,.05),-2.2,1.7,0),gP(box(2.6,1.0,2.4,.05),-2.0,2.9,0),gP(box(.9,.12,3.8,.02),-1.2,3.42,0));
 GL.push(gP(box(.05,.34,2.2),-.69,3.0,0),gP(box(2.2,.3,.05),-2.0,3.0,1.21),gP(box(2.2,.3,.05),-2.0,3.0,-1.21),gP(box(3,.24,.05),-2.2,1.85,1.41),gP(box(3,.24,.05),-2.2,1.85,-1.41));
 Y.push(gP(cyl(.48,.56,1.8,18),-3.7,2.75,0));R.push(gP(cyl(.5,.5,.32,18),-3.7,3.35,0));D.push(gP(cyl(.4,.4,.06,18),-3.7,3.66,0));
 ST.push(gP(cyl(.05,.07,2.6,6),-1.6,4.6,0),gP(box(.08,.06,1.2),-1.6,5.3,0),gP(cyl(.14,.17,1.4,10),3.6,1.7,.95),gP(box(3.3,.13,.13),4.9,2.55,.95,0,0,-.45));
 B.push(gP(box(1.7,.72,.72,.02),2.4,1.36,-.62));O.push(gP(box(1.7,.72,.72,.02),2.4,1.36,.18));Y.push(gP(box(1.7,.72,.72,.02),2.4,2.08,-.25));
 O.push(gP(new THREE.CapsuleGeometry(.24,.9,3,10),-2.4,2.0,1.62,0,0,Math.PI/2),gP(new THREE.CapsuleGeometry(.24,.9,3,10),-2.4,2.0,-1.62,0,0,Math.PI/2));
 g.add(prMesh(W,M.white),prMesh(R,M.red),prMesh(D,M.dark),prMesh(ST,M.steel),prMesh(GL,M.glass,false),prMesh(Y,M.yellow),prMesh(B,M.blue),prMesh(O,M.orange));
 const hp=prHelipad(1.25);hp.position.set(-6.6,1.07,0);g.add(hp);
 prLamp(g,M.lamp,-1.6,5.95,0,.1,2);prLamp(g,M.lamp,-1.2,3.5,-1.9,.08);prLamp(g,M.lampG,-1.2,3.5,1.9,.08);prLamp(g,M.lampW,8.1,1.6,0,.08);
 // wake behind and foam at the bow
 const wk=new THREE.Mesh(new THREE.PlaneGeometry(18,6.5),new THREE.MeshBasicMaterial({map:prWakeTex(),transparent:true,depthWrite:false,opacity:.85,toneMapped:false,color:new THREE.Color(1,1,1)}));
 wk.rotation.x=-Math.PI/2;wk.position.set(-17,.03,0);wk.renderOrder=1;g.add(wk);
 const bw=new THREE.Mesh(new THREE.PlaneGeometry(2.6,4.2),new THREE.MeshBasicMaterial({map:spotTex(),transparent:true,depthWrite:false,opacity:.7,toneMapped:false}));bw.rotation.x=-Math.PI/2;bw.position.set(7.4,.04,0);bw.renderOrder=1;g.add(bw);
 return g}
// a loop round the island in open water: on rays from the middle, the first point past the last land where the sea is deep enough; smoothed
function prShipPath(){const S=GW.SD;if(!S)return null;let cx=0,cy=0,n=0;for(let y=0;y<MH;y+=3)for(let x=0;x<MW;x+=3)if(ISL[y*MW+x]){cx+=x;cy+=y;n++}if(!n)return null;cx=cx/n/MC;cy=cy/n/MC;
 const N=96,pts=[];for(let i=0;i<N;i++){const a=i/N*6.2832,ca=Math.cos(a),sa=Math.sin(a);let last=0;for(let t=0;t<260;t+=.5){if(gfxSD(cx+ca*t,cy+sa*t)>-.5)last=t}
  let t=last;while(t<last+60&&gfxSD(cx+ca*t,cy+sa*t)>-10.5)t+=.5;pts.push([cx+ca*t,cy+sa*t])}
 for(let k=0;k<4;k++){const q=pts.map(p=>p.slice());for(let i=0;i<N;i++){const a=q[(i+N-1)%N],b=q[i],c=q[(i+1)%N];pts[i]=[(a[0]+b[0]*2+c[0])/4,(a[1]+b[1]*2+c[1])/4]}}
 const L=[0];for(let i=1;i<=N;i++){const a=pts[i-1],b=pts[i%N];L.push(L[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}
 return{pts,L,len:L[N]}}
function prPathAt(P,s){const N=P.pts.length;s=((s%P.len)+P.len)%P.len;let lo=0,hi=N;while(hi-lo>1){const m=(lo+hi)>>1;if(P.L[m]<=s)lo=m;else hi=m}
 const a=P.pts[lo],b=P.pts[(lo+1)%N],t=(s-P.L[lo])/Math.max(1e-6,P.L[lo+1]-P.L[lo]);return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,Math.atan2(b[1]-a[1],b[0]-a[0])]}

// ---------- penguins ----------
function prPengGeo(){const parts=[[new THREE.SphereGeometry(.2,10,8),[0,.33,0],[1,1.55,.9],'#15181f'],[new THREE.SphereGeometry(.17,10,8),[.075,.3,0],[.8,1.35,.8],'#f2f1ea'],[new THREE.SphereGeometry(.13,10,8),[.02,.67,0],[1,1,1],'#15181f'],
  [new THREE.ConeGeometry(.045,.15,6),[.16,.66,0],[1,1,1],'#f0a020',[0,0,-Math.PI/2]],[new THREE.SphereGeometry(.06,6,4),[.06,.03,.08],[1.5,.5,1],'#f0a020'],[new THREE.SphereGeometry(.06,6,4),[.06,.03,-.08],[1.5,.5,1],'#f0a020'],
  [new THREE.SphereGeometry(.07,8,6),[.11,.5,.11],[1,1,.6],'#f6c64a'],[new THREE.SphereGeometry(.07,8,6),[.11,.5,-.11],[1,1,.6],'#f6c64a']];
 const list=parts.map(([g0,p,s,c,r])=>{const g=gP(g0,p[0],p[1],p[2],r?r[0]:0,r?r[1]:0,r?r[2]:0,s[0],s[1],s[2]);g.deleteAttribute('uv');const n=g.attributes.position.count,col=new Float32Array(n*3),l=linOf(c);for(let i=0;i<n;i++){col[i*3]=l[0];col[i*3+1]=l[1];col[i*3+2]=l[2]}g.setAttribute('color',new THREE.BufferAttribute(col,3));return g});
 const m=THREE.mergeGeometries(list,false);for(const g of list)g.dispose();return m}

// ---------- the cargo plane ----------
function prPlane(){const M=prMats(),g=new THREE.Group(),W=[],R=[],D=[];
 W.push(gP(cyl(.62,.62,8.2,16),0,0,0,0,0,Math.PI/2),gP(new THREE.SphereGeometry(.62,16,10),4.1,0,0,0,0,0,1.6,1,1),gP(new THREE.ConeGeometry(.62,2.4,16),-5.3,.12,0,0,0,Math.PI/2,1,1,.85),gP(box(1.8,.14,12.6,.05),.4,.18,0));
 R.push(gP(box(1.1,.1,4.2,.03),-5.6,.42,0),gP(box(1.5,1.8,.14,.03),-5.75,1.15,0),gP(box(2.2,.16,12.62,.02),.4,.2,0,0,0,0,.3,1,1));
 for(const z of [-2.3,-4.1,2.3,4.1])D.push(gP(cyl(.24,.24,1.15,10),.95,-.12,z,0,0,Math.PI/2));
 g.add(prMesh(W,M.white),prMesh(R,M.red),prMesh(D,M.dark));
 prLamp(g,M.lamp,.4,.2,-6.35,.12);prLamp(g,M.lampG,.4,.2,6.35,.12);PR.strobe=prLamp(g,M.lampW,-5.9,2.1,0,.12);
 g.visible=false;return g}

// ---------- build / tick / dispose ----------
function gwProps(){
 gwPropsDispose();if(!GFX.ok)return;const R=mulberry32((SEED^0x7A11)>>>0);
 PR.grp=new THREE.Group();GFX.S.add(PR.grp);
 const si=GW.islets.find(o=>o.st);
 if(si){const st=prStation();st.position.set(si.x,si.h*.98,si.y);st.rotation.y=R()*6.28;st.scale.setScalar(1.3);PR.grp.add(st)}
 // the ship and its loop
 PR.path=null;PR.ships=[];if(PR.path&&PR.path.len>40){PR.ps=R()*PR.path.len;for(let k=0;k<(PR.path.len>500?2:1);k++){const sh=prShip();sh.userData.off=k*PR.path.len/2;PR.ships.push(sh);PR.grp.add(sh)}PR.ship=PR.ships[0]}
 // penguins: a small colony on the shore of each islet
 const spots=[];for(const o of GW.islets){const n=o.st?9:4+((R()*4)|0),a0=R()*6.28;for(let k=0;k<n;k++){const a=a0+(R()-.5)*1.4,rr=o.r*(o.st?.86:.55+R()*.25),x=o.x+Math.cos(a)*rr+(R()-.5)*.8,y=o.y+Math.sin(a)*rr+(R()-.5)*.8,h=gfxH(x,y);if(h<.15)continue;spots.push({x,y,h,yaw:a+Math.PI+(R()-.5)*.8,ph:R()*6.28,s:.85+R()*.3})}}
 if(spots.length){const im=new THREE.InstancedMesh(prPengGeo(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:0,envMapIntensity:.5}),spots.length);im.castShadow=true;im.receiveShadow=false;im.frustumCulled=false;PR.peng=im;PR.pengD=spots;PR.grp.add(im)}
 PR.plane=prPlane();PR.grp.add(PR.plane);PR.pl=null;PR.planeNext=clk+10+R()*12;
 prTick(0)}
function gwPropsDispose(){if(!PR.grp)return;GFX.S.remove(PR.grp);
 PR.grp.traverse(o=>{if(o.isMesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(!Object.values(PR.mats||{}).includes(m)){if(m.map&&m.map!==PR.padTex&&m.map!==_spotTex)m.map.dispose()}}}});
 PR.grp=null;PR.rot=[];PR.blink=[];PR.ship=null;PR.ships=[];PR.peng=null;PR.pengD=[];PR.plane=null;PR.pl=null;PR.flag=null;PR.strobe=null}
const _rm=new THREE.Matrix4(),_rq=new THREE.Quaternion(),_re=new THREE.Euler(),_rv=new THREE.Vector3(),_rs=new THREE.Vector3();
function prTick(dt){
 if(!PR.grp)return;const t=GFX.time,th=GFX.theme||{night:0},M=PR.mats;
 M.glass.emissiveIntensity=th.night*1.9+(th.night>.1?.2:0);
 for(const r of PR.rot)r.o.rotation[r.ax]+=r.sp*dt;
 for(const b of PR.blink)b.o.visible=((t*1.1+b.ph*.37)%1)<.32;
 if(PR.flag)PR.flag.rotation.y=Math.sin(t*2.3)*.25;
 // the ship sails round the island
 if(PR.ships&&PR.path){PR.ps+=dt*2.4;for(const sh of PR.ships){const s0=PR.ps+sh.userData.off,[x,y]=prPathAt(PR.path,s0),[x2,y2]=prPathAt(PR.path,s0+3),ha=Math.atan2(y2-y,x2-x);
  sh.position.set(x,Math.sin(t*.9+sh.userData.off)*.05,y);sh.rotation.set(Math.sin(t*.7)*.015,-ha,Math.sin(t*.9)*.02)}}
 // penguins shuffle
 if(PR.peng){const im=PR.peng,D=PR.pengD;for(let i=0;i<D.length;i++){const p=D[i],w=Math.sin(t*2.2+p.ph);_re.set(0,-(p.yaw+w*.22),w*.06);_rq.setFromEuler(_re);_rv.set(p.x,p.h-.02+Math.max(0,Math.sin(t*4.4+p.ph))*.03,p.y);_rs.setScalar(p.s);_rm.compose(_rv,_rq,_rs);im.setMatrixAt(i,_rm)}im.instanceMatrix.needsUpdate=true}
 // a cargo plane crosses the view now and then (in matches and in the menu showreel)
 if(PR.plane){const P=PR.plane;
  if(PR.planeNext-t>150)PR.planeNext=t+12;
  if(!PR.pl&&t>PR.planeNext&&(state==='play'||state==='menu')){const a=Math.random()*6.28,off=(Math.random()-.5)*14,cx=CAM.x-Math.sin(a)*off,cy=CAM.y+Math.cos(a)*off;PR.pl={a,x0:cx-Math.cos(a)*80,y0:cy-Math.sin(a)*80,t0:t,dur:160/24}}
  if(PR.pl){const p=PR.pl,u=(t-p.t0)/p.dur;if(u>=1||u<0){PR.pl=null;P.visible=false;PR.planeNext=t+38+Math.random()*30}
   else{P.visible=true;const d=u*160;P.position.set(p.x0+Math.cos(p.a)*d,22,p.y0+Math.sin(p.a)*d);P.rotation.set(Math.sin(t*.8)*.04,-p.a,0);if(PR.strobe)PR.strobe.visible=(t%1)<.1}}}}
// ---------- 3D renderer, part 2: the plateau (ground with real hills), its cliffs, the mist below, rocks and the power pads ----------
// The land is a height field built from the match seed (same on every phone). It only decides how things look; the game itself runs on the flat map.
// There is no water anywhere: the playable land is the top of a plateau, and beyond its rim the ground falls away down cliffs into a valley of mist.
const GPAD=26;   // the ground is drawn this far beyond the map on every side (the cliffs and what lies below them)
const HRES=4;
const GW={built:0,HW:(WW+2*GPAD)*HRES+1,HH:(WH+2*GPAD)*HRES+1,H:null,SD:null,chunks:[],u:null,flash:[],rocks:[],pads:[],islets:[],texOwn:null,texTN:null,texShore:null};
// ---- small noise helpers (value noise from integer hashes) ----
function hash2(ix,iy,s){let h=(Math.imul(ix,374761393)+Math.imul(iy,668265263)+Math.imul(s,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295}
function vnoise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),a=hash2(ix,iy,s),b=hash2(ix+1,iy,s),c=hash2(ix,iy+1,s),d=hash2(ix+1,iy+1,s);return a+(b-a)*sx+(c-a+(a-b-c+d)*sx)*sy}
function fbm2(x,y,s,oct){let a=.5,f=1,t=0,n=0;for(let i=0;i<oct;i++){t+=vnoise(x*f,y*f,s+i*17)*a;n+=a;a*=.5;f*=2.03}return t/n}
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
// the same blur for wide radii, three running-sum box passes per direction (cost does not grow with the radius; looks the same for soft shading)
function boxPass(src,dst,w,h,r,horiz){const n=2*r+1;
 if(horiz){for(let y=0;y<h;y++){const o=y*w;let acc=0;for(let i=-r;i<=r;i++)acc+=src[o+(i<0?0:i>w-1?w-1:i)];for(let x=0;x<w;x++){dst[o+x]=acc/n;const xa=x+r+1,xb=x-r;acc+=src[o+(xa>w-1?w-1:xa)]-src[o+(xb<0?0:xb)]}}}
 else{for(let x=0;x<w;x++){let acc=0;for(let i=-r;i<=r;i++)acc+=src[(i<0?0:i>h-1?h-1:i)*w+x];for(let y=0;y<h;y++){dst[y*w+x]=acc/n;const ya=y+r+1,yb=y-r;acc+=src[(ya>h-1?h-1:ya)*w+x]-src[(yb<0?0:yb)*w+x]}}}}
function blurFast(a,w,h,sig){if(sig<3)return blurSep(a,w,h,sig);const r=Math.max(1,Math.round((Math.sqrt(4*sig*sig+1)-1)/2)),t=new Float32Array(a.length);
 for(let p=0;p<3;p++){boxPass(a,t,w,h,r,true);boxPass(t,a,w,h,r,false)}return a}
// a field on the padded grid (4 samples per unit, starting GPAD units before the map), read at a world point
function gridAt(F,x,y){let fx=(x+GPAD)*HRES,fy=(y+GPAD)*HRES;fx=fx<0?0:fx>GW.HW-1.001?GW.HW-1.001:fx;fy=fy<0?0:fy>GW.HH-1.001?GW.HH-1.001:fy;
 const ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy,i=iy*GW.HW+ix,a=F[i],b=F[i+1],c=F[i+GW.HW],d=F[i+GW.HW+1];return a+(b-a)*tx+(c-a+(a-b-c+d)*tx)*ty}
// the height of the ground at a world point, and how far that point is inside the rim of the plateau (units; negative beyond it)
function gfxH(x,y){return GW.H?gridAt(GW.H,x,y):0}
function gfxSD(x,y){return GW.SD?gridAt(GW.SD,x,y):0}
function interpH(H,x,y){return gridAt(H,x,y)}

// ---- the height field ----
function gwHeights(){
 const HW=GW.HW,HH=GW.HH,H=new Float32Array(HW*HH),SD=new Float32Array(HW*HH),S=SEED|0,RL=(GFX.theme&&GFX.theme.rel)||{};
 const aBig=RL.big===undefined?4.6:RL.big,aRid=RL.rid===undefined?1.2:RL.rid,aDn=RL.dn===undefined?.6:RL.dn,cD=RL.cliff===undefined?11:RL.cliff,fq=RL.fq||1,dF=RL.df||.072,dW=RL.dw===undefined?3.6:RL.dw,dS=RL.ds||.74,dK=RL.dk||0,rollK=RL.roll===undefined?.6:RL.roll;GW.low=-(cD+3);
 // distance from the rim of the playable land, smoothed so the rim is round instead of stepped
 const sdc=new Float32Array(MW*MH),inW=new Uint8Array(MW*MH);for(let i=0;i<inW.length;i++)inW[i]=ISL[i]?0:1;
 const dIn=edt2(inW,MW,MH),dOut=edt2(ISL,MW,MH);
 for(let i=0;i<sdc.length;i++)sdc[i]=(ISL[i]?dIn[i]-.5:-(dOut[i]-.5))/MC;
 blurSep(sdc,MW,MH,1.5);
 // beyond the map itself the distance carries on outward from the map's edge
 const sdAt=(x,y)=>{const cx=x<0?0:x>WW?WW:x,cy=y<0?0:y>WH?WH:y,ox=x-cx,oy=y-cy;let fx=cx*MC-.5,fy=cy*MC-.5;fx=fx<0?0:fx>MW-1.001?MW-1.001:fx;fy=fy<0?0:fy>MH-1.001?MH-1.001:fy;
  const ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy,i=iy*MW+ix,a=sdc[i],b=sdc[i+1],c=sdc[i+MW],d=sdc[i+MW+1],v=a+(b-a)*tx+(c-a+(a-b-c+d)*tx)*ty;return(ox||oy)?Math.min(v,0)-Math.sqrt(ox*ox+oy*oy):v};
 for(let j=0;j<HH;j++)for(let i=0;i<HW;i++){const x=i/HRES-GPAD,y=j/HRES-GPAD,d=sdAt(x,y);let h;
  if(d>0){ // on the plateau: level at the rim, then broad hills that stand on plains
   // (terms that come out as zero are not computed: this loop runs over half a million points at the start of every match)
   const m=sm01((d-1.2)/8),t=fbm2(x*.024*fq,y*.024*fq,S,3),hl=sm01((t-.46)/.42),rid=hl>0&&aRid>0?1-Math.abs(fbm2(x*.07*fq+9,y*.07*fq+4,S+5,3)*2-1):0,roll=rollK?(fbm2(x*.06,y*.06,S+3,2)-.5)*rollK:0;
   // drifts / dunes: rows across the wind, a long gentle side to the west and a short steep one to the east.
   // dk=0 gives rounded drifts (snow); dk=1 gives a dune: the windward side still climbing at the crest, a straight slip face with a curved foot
   let dn=0;if(aDn>0){const dm=sm01((fbm2(x*.03+3,y*.016,S+19,2)-.3)/.34);if(dm>0){const u=x*dF+(fbm2(x*.021,y*.021,S+7,2)-.5)*dW,ph=u-Math.floor(u),tw=ph/dS,tl=(ph-dS)/(1-dS),prS=ph<dS?sm01(tw):1-sm01(tl),prC=ph<dS?tw*tw*(2-tw):Math.pow(1-tl,1.7),pr=prS+(prC-prS)*dK;dn=pr*aDn*dm}}
   h=.22*sm01(d/1.5)+(hl*aBig+rid*rid*aRid*hl+roll+dn)*m}
  else{ // beyond the rim: a cliff with ledges and gullies, a slope of fallen rock, then the low country, which levels out toward the edge of what is drawn
   // (past 14.5 units every term that uses the cliff noise has settled, so it is only computed nearer the rim; same heights as before)
   const e=-d,g=e<14.5?fbm2(x*.31,y*.31,S+21,3):.5,w=1.6+2.8*g,c=sm01(e/w),c4=c*(1-c)*4,far=1-sm01((Math.max(-x,x-WW,-y,y-WH)-(GPAD-8))/6.5),g2=c4>0?fbm2(x*.95,y*.95,S+33,2):.5,fk=sm01((e-w-2)/8)*far;
   h=-cD*.74*c-(cD*.26+3)*sm01((e-w)/10)+Math.sin(c*11+g*7)*.3*c4+(g2-.5)*1.1*c4+(fk>0?((fbm2(x*.055,y*.055,S+41,3)-.5)*3.4+(fbm2(x*.21,y*.21,S+47,2)-.5)*.7)*fk:0)}
  H[j*HW+i]=h;SD[j*HW+i]=d}
 // level ground under the power pads so the platforms sit flat
 for(const z of ZN){let c=0,n=0;for(let a=0;a<8;a++){c+=gridAt(H,z.x+Math.cos(a)*1.2,z.y+Math.sin(a)*1.2);n++}c/=n;z.gh=c;
  const r1=ZR+3.2,x0=Math.max(0,Math.floor((z.x-r1+GPAD)*HRES)),x1=Math.min(HW-1,Math.ceil((z.x+r1+GPAD)*HRES)),y0=Math.max(0,Math.floor((z.y-r1+GPAD)*HRES)),y1=Math.min(HH-1,Math.ceil((z.y+r1+GPAD)*HRES));
  for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){const dd=Math.hypot(i/HRES-GPAD-z.x,j/HRES-GPAD-z.y),w=1-sm01((dd-(ZR+.2))/3);if(w>0)H[j*HW+i]+=(c-H[j*HW+i])*w}}
 GW.H=H;GW.SD=SD}
// baked light: normals, how hollow each spot is, and where the sun reaches (hills and the rim shade what lies behind them)
function gwBake(th){
 const HW=GW.HW,HH=GW.HH,H=GW.H,SD=GW.SD,px=new Uint8Array(HW*HH*4),sun=sunVec(th.az,th.el),hl=Math.hypot(sun.x,sun.z)||1,lx=sun.x/hl,lz=sun.z/hl,tanE=sun.y/hl;
 const bl=Float32Array.from(H);blurFast(bl,HW,HH,5);const b2=Float32Array.from(H);blurFast(b2,HW,HH,18);
 const STEPS=22,SL=.75;let Hmax=-1e9;for(let k=0;k<H.length;k++)if(H[k]>Hmax)Hmax=H[k];
 for(let j=0;j<HH;j++)for(let i=0;i<HW;i++){const k=j*HW+i,x=i/HRES-GPAD,y=j/HRES-GPAD,h=H[k];
  const hx0=H[j*HW+Math.max(0,i-1)],hx1=H[j*HW+Math.min(HW-1,i+1)],hy0=H[Math.max(0,j-1)*HW+i],hy1=H[Math.min(HH-1,j+1)*HW+i],dx=(hx1-hx0)*HRES/((i>0&&i<HW-1)?2:1),dz=(hy1-hy0)*HRES/((j>0&&j<HH-1)?2:1),l=1/Math.sqrt(dx*dx+dz*dz+1);
  const nx=-dx*l,nz=-dz*l;
  // march toward the sun; stop once the ray is above every hill, or the point is already fully in shade
  let ex=0;if(SD[k]>-14)for(let s=1;s<=STEPS;s++){const t=s*SL,rh=h+t*tanE;if(rh>Hmax)break;const e=gridAt(H,x+lx*t,y+lz*t)-rh;if(e>ex){ex=e;if(ex>=.55)break}}
  const vis=1-sm01(ex/.55),ao=Math.max(0,Math.min(1,.72+(h-bl[k])*.55+(h-b2[k])*.07));
  px[k*4]=Math.round((nx*.5+.5)*255);px[k*4+1]=Math.round((nz*.5+.5)*255);px[k*4+2]=Math.round(ao*255);px[k*4+3]=Math.round(vis*255)}
 if(GW.texTN)GW.texTN.dispose();
 GW.texTN=dtex(px,HW,HH,THREE.RGBAFormat,THREE.UnsignedByteType,{clamp:1});GW.u.uTN.value=GW.texTN}

// ---- materials ----
function gwUniforms(){
 const U=GFX.U,T=GFX.tex,V4=()=>new THREE.Vector4(),a4=()=>[V4(),V4(),V4(),V4()];
 GW.u={uOwn:{value:null},uTN:{value:null},uShore:{value:null},uNoise:{value:T.noise},uLA:{value:LAY.arrA},uLN:{value:LAY.arrN},
  uOwnSize:{value:new THREE.Vector2(MW,MH)},uWorld:{value:new THREE.Vector2(WW,WH)},uWorldP:{value:new THREE.Vector2(WW+2*GPAD,WH+2*GPAD)},uPad:{value:GPAD},
  uCol:{value:COLLIN.map(c=>new THREE.Vector3(c[0],c[1],c[2]))},
  uLS:{value:a4()},uLT:{value:a4()},uMa:{value:a4()},uMb:{value:a4()},uMc:{value:a4()},uLI:{value:[0,0,0,0]},
  uMacro:{value:.2},uCavK:{value:.26},uSpark:{value:0},uWrap:{value:0},uCloudK:{value:.2},uBnc:{value:new THREE.Vector3(0,0,0)},
  uTS:{value:V4()},uTS2:{value:V4()},uTrkC:{value:new THREE.Vector3(.8,.8,.8)},uTrkK:{value:new THREE.Vector2(.3,1)},
  uMist:{value:new THREE.Color(1,1,1)},uMistS:{value:new THREE.Color(.6,.7,.9)},uMistY:{value:-9},uMistD:{value:6},uMistK:{value:1},uMistN:{value:2.4},uRelK:{value:1.4},uTSn:{value:.5},uQ:{value:1},
  uTime:U.time,uMA:{value:null},uMB:{value:null},uTrk:{value:null},uTrkPx:{value:new THREE.Vector2(.001,.001)},
  uFlash:{value:[0,1,2,3].map(()=>new THREE.Vector4(0,0,1,0))},uSunDir:U.sunDir,uSunCol:U.sunCol,uCam:U.camPos}}
// the billows of the mist: the ground fades into exactly this picture as it drops, and the flat sheet below draws the same one
const MIST_FN=`vec3 mistCol(vec2 q){float a=textureLod(uNoise,q*.012+vec2(uTime*.0030,uTime*.0012),0.).r,b=textureLod(uNoise,q*.037+vec2(-uTime*.004,uTime*.0026),0.).g,c=textureLod(uNoise,q*.11+vec2(uTime*.006,0.),0.).b;
  return mix(uMistS,uMist,smoothstep(.2,.8,a*.5+b*.32+c*.18));}`;
function gwTerrainMat(){
 const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8,metalness:0,envMapIntensity:.45});
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,GW.u);
  sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>
   varying vec3 vWP;`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
   vWP=transformed;`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
   precision highp sampler2DArray;
   uniform sampler2DArray uLA,uLN;uniform sampler2D uTrk,uMA,uMB,uTN,uShore,uNoise;
   uniform vec2 uOwnSize,uWorld,uWorldP,uTrkPx,uTrkK;uniform vec3 uBnc;uniform float uPad,uTime,uMacro,uCavK,uSpark,uWrap,uCloudK,uMistY,uMistD,uMistK,uMistN,uRelK,uTSn,uQ;
   uniform vec3 uCol[6];uniform vec3 uSunDir,uSunCol,uTrkC,uMist,uMistS;
   uniform vec4 uLS[4],uLT[4],uMa[4],uMb[4],uMc[4];uniform float uLI[4];uniform vec4 uTS,uTS2;uniform vec4 uFlash[4];
   varying vec3 vWP;
   float h21(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
   vec2 rot2(vec2 v){return vec2(v.x*.8+v.y*.6,-v.x*.6+v.y*.8);}
   ${MIST_FN}
   // one ground material at a world point: colour, height and fine normal. A second, larger and turned copy is mixed in by a noise, so the pattern does not visibly repeat
   void lay(int i,vec2 wp,vec2 dx,vec2 dy,float nz,out vec3 al,out float ht,out vec3 nc){
    vec4 S=uLS[i];float li=uLI[i];
    vec4 a=textureGrad(uLA,vec3(wp*S.x,li),dx*S.x,dy*S.x);
    float k=0.;al=a.rgb;ht=a.a;
    if(uQ>.5){vec4 b=textureGrad(uLA,vec3(rot2(wp)*S.y+vec2(.37,.71),li),rot2(dx)*S.y,rot2(dy)*S.y);k=smoothstep(.3,.7,nz)*S.z;al=mix(a.rgb,b.rgb,k);ht=mix(a.a,b.a,k);}
    vec4 n=textureGrad(uLN,vec3(wp*S.x,li),dx*S.x,dy*S.x);nc=vec3((n.xy*2.-1.)*S.w*(1.-k*.6),n.z);}`)
  .replace('#include <color_fragment>',`#include <color_fragment>
   vec2 wp=vWP.xz,suv=(wp+uPad)/uWorldP,ouv=wp/uWorld;
   vec4 tn=texture2D(uTN,suv);vec2 nxz=tn.rg*2.-1.;float sl0=1.-sqrt(max(0.,1.-dot(nxz,nxz)));
   nxz*=uRelK;float nl=length(nxz);if(nl>.97)nxz*=.97/nl;vec3 N0=vec3(nxz.x,sqrt(max(0.,1.-dot(nxz,nxz))),nxz.y);
   float sdv=texture2D(uShore,suv).r*12.-6.;
   vec4 nA=texture2D(uNoise,wp*.0137),nB=texture2D(uNoise,wp*.047+vec2(.37,.11)),nC=texture2D(uNoise,wp*.19+vec2(.11,.53));
   // what decides where each material lies: slope, height, three sizes of patch, hollows, the rim of the plateau and the cliff below it
   vec4 mi0=vec4(clamp(sl0*3.,0.,1.),clamp(vWP.y*.16+.5,0.,1.),nA.r,nB.g);
   vec4 mi1=vec4(nC.b,1.-tn.b,smoothstep(2.2,0.,sdv)*step(0.,sdv),smoothstep(.15,-.9,sdv));
   vec2 gdx=dFdx(wp),gdy=dFdy(wp);float gyx=dFdx(vWP.y),gyy=dFdy(vWP.y);
   vec3 alb,nc;float ht;lay(0,wp,gdx,gdy,nB.r,alb,ht,nc);
   alb*=uLT[0].rgb;float rgh=uLT[0].a;vec2 nd=nc.xy;float cav=nc.z,w0=1.;
   for(int i=1;i<3;i++){
    float v=dot(uMa[i],mi0)+dot(uMb[i],mi1)+uMc[i].x,mk=smoothstep(uMc[i].y,uMc[i].z,v);
    if(mk>.004){vec3 a2,n2;float h2;lay(i,wp,gdx,gdy,i==1?nB.a:nA.b,a2,h2,n2);
     float e=abs(uMc[i].w),hs=uMc[i].w<0.?1.-ht:h2,mm=mk*(1.+2.*e)-e,w=smoothstep(1.-mm-e,1.-mm+e,hs);
     alb=mix(alb,a2*uLT[i].rgb,w);ht=mix(ht,h2,w);nd=mix(nd,n2.xy,w);cav=mix(cav,n2.z,w);rgh=mix(rgh,uLT[i].a,w);w0*=1.-w;}}
   // the cliff rock is laid on from the sides as well as from above, so its beds stay level whichever way a face looks
   {float v=dot(uMa[3],mi0)+dot(uMb[3],mi1)+uMc[3].x,mk=smoothstep(uMc[3].y,uMc[3].z,v);
    if(mk>.004){vec4 S=uLS[3];float li=uLI[3];
     vec3 bw=vec3(abs(N0.x),N0.y*.75,abs(N0.z));bw=bw*bw*bw;bw/=bw.x+bw.y+bw.z+1e-5;
     vec4 cx=textureGrad(uLA,vec3(vec2(wp.y,vWP.y)*S.x,li),vec2(gdx.y,gyx)*S.x,vec2(gdy.y,gyy)*S.x);
     vec4 cz=textureGrad(uLA,vec3(vec2(wp.x,vWP.y)*S.x,li),vec2(gdx.x,gyx)*S.x,vec2(gdy.x,gyy)*S.x);
     vec4 ct=textureGrad(uLA,vec3(wp*S.x,li),gdx*S.x,gdy*S.x);
     vec4 c3=cx*bw.x+ct*bw.y+cz*bw.z;
     float e=abs(uMc[3].w),mm=mk*(1.+2.*e)-e,w=smoothstep(1.-mm-e,1.-mm+e,c3.a);
     alb=mix(alb,c3.rgb*uLT[3].rgb,w);ht=mix(ht,c3.a,w);nd*=1.-w;cav=mix(cav,.3+c3.a*.4,w);rgh=mix(rgh,uLT[3].a,w);w0*=1.-w;}}
   alb*=1.+(nA.g-.5)*uMacro*1.3+(nB.b-.5)*uMacro*.7;
   alb*=mix(1.-uCavK,1.,smoothstep(.15,.6,cav));
   vec3 Nw=N0;Nw.xz+=nd;
   // tyre tracks: a picture the cars draw into as they drive, read back as pressed, darker ground
   float trk=texture2D(uTrk,ouv).r;
   if(trk>.003){vec2 tgr=vec2(texture2D(uTrk,ouv+vec2(uTrkPx.x,0.)).r-texture2D(uTrk,ouv-vec2(uTrkPx.x,0.)).r,texture2D(uTrk,ouv+vec2(0.,uTrkPx.y)).r-texture2D(uTrk,ouv-vec2(0.,uTrkPx.y)).r);
    alb=mix(alb,alb*uTrkC,trk*uTrkK.x);Nw.xz+=tgr*uTrkK.y;}
   // territory: smooth coverage fields of the five players (made on the GPU from the game's land map), so borders are round and clean at any zoom.
   // Land that belongs to somebody is SOLID colour: paint over the ground, optionally a raised slab with a wall on the near side and a shadow.
   vec4 mA=texture2D(uMA,ouv),mB=texture2D(uMB,ouv);float mt=mB.g,own=0.,dW=-9.,wall=0.,slabSh=0.;vec3 oc=vec3(0.);vec2 grd=vec2(0.);
   float aaW=max(length(fwidth(wp)),.012);
   if(mt>.004){
    int cid=1;float mxo=mA.x;if(mA.y>mxo){mxo=mA.y;cid=2;}if(mA.z>mxo){mxo=mA.z;cid=3;}if(mA.w>mxo){mxo=mA.w;cid=4;}if(mB.x>mxo){mxo=mB.x;cid=5;}
    oc=uCol[cid];
    vec2 e1=vec2(1./uOwnSize.x,0.),e2=vec2(0.,1./uOwnSize.y);
    grd=vec2(texture2D(uMB,ouv+e1).g-texture2D(uMB,ouv-e1).g,texture2D(uMB,ouv+e2).g-texture2D(uMB,ouv-e2).g)*.5;
    dW=(mt-.5)/max(length(grd),.03)/(uOwnSize.x/uWorld.x);
    own=smoothstep(-aaW,aaW,dW);}
   if(uTS.z>0.){
    // the camera looks down from the south, so a slab shows its southern wall: ground just south of owned land is covered by that wall
    vec2 ouN=ouv-vec2(0.,uTS.z*.445/uWorld.y);vec4 mA2=texture2D(uMA,ouN),mB2=texture2D(uMB,ouN);
    wall=smoothstep(.42,.58,mB2.g)*(1.-own);
    if(wall>.003){int c2=1;float mx2=mA2.x;if(mA2.y>mx2){mx2=mA2.y;c2=2;}if(mA2.z>mx2){mx2=mA2.z;c2=3;}if(mA2.w>mx2){mx2=mA2.w;c2=4;}if(mB2.x>mx2){mx2=mB2.x;c2=5;}
     alb=mix(alb,uCol[c2]*uTS.x*.46,wall);rgh=mix(rgh,.7,wall);Nw=mix(Nw,vec3(0.,.4,.92),wall);}
    vec2 so=uSunDir.xz/max(uSunDir.y,.3)*uTS.z;
    slabSh=smoothstep(.35,.65,texture2D(uMB,(wp+so)/uWorld).g)*(1.-own)*(1.-wall);}
   if(own>0.){
    vec3 paint=oc*uTS.x*(1.+(ht-.5)*uTS.y);
    paint*=1.-smoothstep(.2,0.,dW)*uTS.w;
    alb=mix(alb,paint,own);rgh=mix(rgh,uTS2.y,own);
    Nw.xz=mix(Nw.xz,N0.xz*uTSn+nd*uTS2.z,own);}
   Nw.xz-=grd*uTS2.w;Nw=normalize(Nw);
   diffuseColor.rgb=alb;`)
  .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=rgh;`)
  .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   normal=normalize((viewMatrix*vec4(Nw,0.)).xyz);`)
  .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   totalEmissiveRadiance+=oc*own*uTS2.x;
   for(int fi=0;fi<4;fi++){vec4 fl=uFlash[fi];if(fl.z<1.){float dd=length(vWP.xz-fl.xy),rr=fl.z*30.;float bd=exp(-pow((dd-rr)/1.5,2.))*(1.-fl.z);totalEmissiveRadiance+=uCol[int(fl.w+.5)]*bd*1.1*own;}}
   if(uSpark>0.){vec3 Vv=normalize(cameraPosition-vWP);vec2 cell=floor(wp*6.5);vec3 rv=vec3(h21(cell),h21(cell+17.3),h21(cell+41.9))*2.-1.;vec3 Ng=normalize(Nw+rv*.55);
    float gl=pow(max(dot(reflect(-Vv,Ng),uSunDir),0.),520.);totalEmissiveRadiance+=uSunCol*gl*uSpark*w0*(1.-own)*tn.a*.9*(1.-trk*.8);}`)
  .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
   {float clv=texture2D(uNoise,wp*.009+vec2(uTime*.004,uTime*.002)).a;float vis=mix(tn.a,mix(1.,tn.a,uTSn),own)*mix(1.,smoothstep(.3,.7,clv),uCloudK)*(1.-slabSh*.72);
    reflectedLight.directDiffuse*=vis;reflectedLight.directSpecular*=vis;
    // shade is never black out here: the bright ground all round throws light back into it
    {float lit=vis*clamp(dot(N0,uSunDir)/max(uSunDir.y,.2),0.,1.);reflectedLight.indirectDiffuse+=diffuseColor.rgb*uBnc*(1.-lit);}
    float aoK=mix(.5,1.,mix(tn.b,mix(1.,tn.b,uTSn),own))*(1.-slabSh*.25);reflectedLight.indirectDiffuse*=aoK;reflectedLight.indirectSpecular*=aoK*aoK;
    if(uWrap>0.){float ndl=dot(Nw,uSunDir);float wr=clamp((ndl+.4)/1.4,0.,1.);
     reflectedLight.indirectDiffuse+=diffuseColor.rgb*uSunCol*wr*wr*w0*(1.-own)*.075*uWrap*vis*vec3(.72,.95,1.2);}}`)
  .replace('#include <opaque_fragment>',`#include <opaque_fragment>
   {float mh=smoothstep(uMistY+uMistD,uMistY,vWP.y+(nB.a-.5)*uMistN)*uMistK;if(mh>0.)gl_FragColor.rgb=mix(gl_FragColor.rgb,mistCol(wp),mh);}`)};
 m.customProgramCacheKey=()=>'terrain6';return m}
// the mist that fills the valley round the plateau
function gwMistMat(){
 return new THREE.ShaderMaterial({uniforms:{uNoise:GW.u.uNoise,uTime:GW.u.uTime,uMist:GW.u.uMist,uMistS:GW.u.uMistS},
  vertexShader:'varying vec3 vWP;void main(){vec4 w=modelMatrix*vec4(position,1.);vWP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:`uniform sampler2D uNoise;uniform float uTime;uniform vec3 uMist,uMistS;varying vec3 vWP;
  ${MIST_FN}
  void main(){gl_FragColor=vec4(mistCol(vWP.xz),1.);
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

// ---- tyre tracks: the rear wheels draw soft grooves into a picture of the whole island (10 pixels per unit); the terrain reads it back ----
const TRK={rt:null,S:null,cam:null,geo:null,last:[],N:96,clear:1};
function trkInit(){
 if(TRK.rt||!QL.hi||!GFX.ok)return;const W=Math.round(WW*10),H=Math.round(WH*10);
 TRK.rt=new THREE.WebGLRenderTarget(W,H,{format:THREE.RedFormat,type:THREE.UnsignedByteType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false,generateMipmaps:false});
 TRK.cam=new THREE.OrthographicCamera(0,WW,WH,0,-10,10);TRK.cam.position.z=5;TRK.cam.updateProjectionMatrix();TRK.cam.updateMatrixWorld();
 const g=TRK.geo=new THREE.BufferGeometry(),N=TRK.N*6;g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3).setUsage(THREE.DynamicDrawUsage));
 g.setAttribute('aV',new THREE.BufferAttribute(new Float32Array(N),1).setUsage(THREE.DynamicDrawUsage));g.setAttribute('aI',new THREE.BufferAttribute(new Float32Array(N),1).setUsage(THREE.DynamicDrawUsage));g.setDrawRange(0,0);
 const m=new THREE.Mesh(g,new THREE.ShaderMaterial({depthTest:false,depthWrite:false,side:THREE.DoubleSide,blending:THREE.CustomBlending,blendEquation:THREE.MaxEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,
  vertexShader:'attribute float aV,aI;varying float vV,vI;void main(){vV=aV;vI=aI;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.);}',
  fragmentShader:'varying float vV,vI;void main(){float a=(1.-vV*vV)*vI;gl_FragColor=vec4(a,a,a,1.);}'}));m.frustumCulled=false;
 TRK.S=new THREE.Scene();TRK.S.add(m);
 // old tracks fade: every so often the whole picture is multiplied down a little (fresh snow drifting in)
 const fq=new THREE.Mesh(new THREE.PlaneGeometry(WW,WH),new THREE.ShaderMaterial({depthTest:false,depthWrite:false,side:THREE.DoubleSide,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.ZeroFactor,blendDst:202/*SrcColorFactor*/,
  vertexShader:'void main(){gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(.965,.965,.965,1.);}'}));fq.position.set(WW/2,WH/2,0);fq.frustumCulled=false;TRK.F=new THREE.Scene();TRK.F.add(fq);TRK.ft=0;
 GW.u.uTrk.value=TRK.rt.texture;GW.u.uTrkPx.value.set(1/W,1/H);TRK.clear=1}
const _tcc=new THREE.Color();
function trkFrame(){
 if(!QL.hi||!GW.built)return;trkInit();if(!TRK.rt)return;const R=GFX.R;
 if(TRK.clear){const old=R.getRenderTarget();R.getClearColor(_tcc);const ca=R.getClearAlpha();R.setRenderTarget(TRK.rt);R.setClearColor(0x000000,1);R.clear(true,false,false);R.setClearColor(_tcc,ca);R.setRenderTarget(old);TRK.clear=0;TRK.last=[]}
 const P3=TRK.geo.attributes.position.array,AV=TRK.geo.attributes.aV.array,AI=TRK.geo.attributes.aI.array;let n=0;
 const seg=(a,b,hw,I)=>{if(n>=TRK.N)return;const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<.02)return;const nx=-dy/l*hw,ny=dx/l*hw,v=n*6,
   c=[[a[0]-nx,a[1]-ny,-1],[a[0]+nx,a[1]+ny,1],[b[0]+nx,b[1]+ny,1],[a[0]-nx,a[1]-ny,-1],[b[0]+nx,b[1]+ny,1],[b[0]-nx,b[1]-ny,-1]];
  for(let k=0;k<6;k++){P3[(v+k)*3]=c[k][0];P3[(v+k)*3+1]=c[k][1];P3[(v+k)*3+2]=0;AV[v+k]=c[k][2];AI[v+k]=I}n++};
 for(let q=1;q<=5;q++){const p=P[q],C=CARI[q];if(!p||!p.alive||!C||!C.root.visible){TRK.last[q]=null;continue}
  const D=CARS3D[C.cl],cs=Math.cos(p.ra),sn=Math.sin(p.ra),k=CAR_K,rx=D.wx[1]*k,fx=D.wx[0]*k,wz=D.wz*k,hw=D.ww*k*.42,pts=[];
  for(const sd of [-1,1])pts.push([p.rx+cs*rx-sn*wz*sd,p.ry+sn*rx+cs*wz*sd]);for(const sd of [-1,1])pts.push([p.rx+cs*fx-sn*wz*sd,p.ry+sn*fx+cs*wz*sd]);
  const L=TRK.last[q];if(L&&Math.hypot(pts[0][0]-L[0][0],pts[0][1]-L[0][1])<3){const I=p.fSpr?.95:.8;for(let w=0;w<4;w++)seg(L[w],pts[w],hw,w<2?I:I*.6)}
  TRK.last[q]=pts}
 if(GFX.time-TRK.ft>.8||GFX.time<TRK.ft){TRK.ft=GFX.time;const old=R.getRenderTarget();R.setRenderTarget(TRK.rt);R.render(TRK.F,TRK.cam);R.setRenderTarget(old)}
 if(!n)return;TRK.geo.setDrawRange(0,n*6);TRK.geo.attributes.position.needsUpdate=TRK.geo.attributes.aV.needsUpdate=TRK.geo.attributes.aI.needsUpdate=true;
 const old=R.getRenderTarget();R.setRenderTarget(TRK.rt);R.render(TRK.S,TRK.cam);R.setRenderTarget(old)}

// ---- applying a look to the ground: which four materials, where each lies, how owned land is painted ----
const tintOf=t=>!t?[1,1,1]:typeof t==='string'?linOf(t):t;
function gwLook(th){
 const U=GW.u,NO=[0,0,0,0,0,0,0,0,-9,0,1,.1];
 for(let i=0;i<4;i++){const L=th.lay[i],t=tintOf(L[6]),M=(th.msk&&th.msk[i])||NO;
  U.uLI.value[i]=Math.max(0,LAY.names.indexOf(L[0]));U.uLS.value[i].set(1/L[1],1/L[2],L[3],L[4]);U.uLT.value[i].set(t[0],t[1],t[2],L[5]);
  U.uMa.value[i].set(M[0],M[1],M[2],M[3]);U.uMb.value[i].set(M[4],M[5],M[6],M[7]);U.uMc.value[i].set(M[8],M[9],M[10],M[11])}
 U.uMacro.value=th.macro===undefined?.2:th.macro;U.uCavK.value=th.cav===undefined?.26:th.cav;U.uSpark.value=th.spark||0;U.uWrap.value=th.wrap||0;U.uCloudK.value=th.cloud===undefined?.2:th.cloud;{const b=th.bnc||[.16,.16,.16];U.uBnc.value.set(b[0],b[1],b[2])}
 const T=Object.assign({},TERDEF,th.ter||{},TERSTY[TERSEL]||{});
 U.uTS.value.set(T.solid,T.tex,T.slab,T.rim);U.uTS2.value.set(T.emis,T.rough,T.det,T.bevel);U.uTSn.value=T.hill;
 const k=th.trk||{c:[.8,.8,.8],k:.4,n:1};U.uTrkC.value.set(k.c[0],k.c[1],k.c[2]);U.uTrkK.value.set(k.k,k.n);
 const mi=th.mist,mc=linOf(mi.c),ms=linOf(mi.s);U.uMist.value.setRGB(mc[0]*mi.i,mc[1]*mi.i,mc[2]*mi.i,THREE.LinearSRGBColorSpace);U.uMistS.value.setRGB(ms[0]*mi.i,ms[1]*mi.i,ms[2]*mi.i,THREE.LinearSRGBColorSpace);
 U.uMistY.value=mi.y;U.uMistD.value=mi.d;U.uMistK.value=mi.k===undefined?1:mi.k;U.uMistN.value=mi.n===undefined?2.4:mi.n;U.uRelK.value=th.relK===undefined?1.4:th.relK;
 U.uLA.value=LAY.arrA;U.uLN.value=LAY.arrN;U.uQ.value=QNAME==='high'?1:0}

// ---- building the plateau of this match ----
function gwBuild(){
 if(!GFX.ok||IS_SRV||!LANDI||!LAY.ok)return;
 const t0=performance.now();
 if(!GW.u)gwUniforms();
 gwDispose();
 gfxSetTheme(gfxThemeFor(SEED));const th=GFX.theme,U=GW.u;
 gwLook(th);
 gwHeights();gwBake(th);
 // ownership picture (the game's land map, uploaded as it is)
 if(!GW.texOwn){GW.texOwn=new THREE.DataTexture(own,MW,MH,THREE.RedFormat,THREE.UnsignedByteType);GW.texOwn.unpackAlignment=1;GW.texOwn.minFilter=GW.texOwn.magFilter=THREE.NearestFilter;GW.texOwn.generateMipmaps=false}
 GW.texOwn.needsUpdate=true;U.uOwn.value=GW.texOwn;gwMaskInit();GW.maskDirty=1;TRK.clear=1;
 // how far each point is inside the rim (8 bits over -6..6 units)
 const HW=GW.HW,HH=GW.HH,sp=new Uint8Array(HW*HH);for(let i=0;i<sp.length;i++)sp[i]=Math.max(0,Math.min(255,Math.round((GW.SD[i]+6)/12*255)));
 if(GW.texShore)GW.texShore.dispose();GW.texShore=dtex(sp,HW,HH,THREE.RedFormat,THREE.UnsignedByteType,{clamp:1});U.uShore.value=GW.texShore;
 // the ground in chunks (so what is off screen is not drawn), reaching GPAD units beyond the map
 const mat=GW.terrainMat||(GW.terrainMat=gwTerrainMat());
 const MS=QL.mesh||.5,VX=Math.round((WW+2*GPAD)/MS)+1,VZ=Math.round((WH+2*GPAD)/MS)+1,CX=4,CZ=6;
 for(let cj=0;cj<CZ;cj++)for(let ci=0;ci<CX;ci++){
  const i0=Math.round(ci*(VX-1)/CX),i1=Math.round((ci+1)*(VX-1)/CX),j0=Math.round(cj*(VZ-1)/CZ),j1=Math.round((cj+1)*(VZ-1)/CZ),nx=i1-i0+1,nz=j1-j0+1;
  const pos=new Float32Array(nx*nz*3),nor=new Float32Array(nx*nz*3),idx=new Uint32Array((nx-1)*(nz-1)*6);let p=0;
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=(i0+i)*MS-GPAD,y=(j0+j)*MS-GPAD,h=gfxH(x,y),e=.25,dx=gfxH(x+e,y)-gfxH(x-e,y),dz=gfxH(x,y+e)-gfxH(x,y-e),l=1/Math.sqrt(dx*dx/(4*e*e)+dz*dz/(4*e*e)+1);
   pos[p]=x;pos[p+1]=h;pos[p+2]=y;nor[p]=-dx/(2*e)*l;nor[p+1]=l;nor[p+2]=-dz/(2*e)*l;p+=3}
  let q=0;for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;idx[q++]=a;idx[q++]=c;idx[q++]=b;idx[q++]=b;idx[q++]=c;idx[q++]=d}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));g.setIndex(new THREE.BufferAttribute(idx,1));
  g.computeBoundingSphere();g.boundingSphere.radius+=1;
  const m=new THREE.Mesh(g,mat);m.receiveShadow=true;m.castShadow=false;GFX.S.add(m);GW.chunks.push(m)}
 // the low country carries on as one flat sheet beyond the drawn ground (same material, so there is no seam)
 const fg=new THREE.PlaneGeometry(WW+1600,WH+1600,1,1);fg.rotateX(-Math.PI/2);fg.translate(WW/2,GW.low-.06,WH/2);
 GW.far=new THREE.Mesh(fg,mat);GW.far.frustumCulled=false;GW.far.receiveShadow=false;GFX.S.add(GW.far);
 // a sheet of cloud over the valley, for looks that have one
 if(th.mist.k===undefined||th.mist.k>=1){const mg=new THREE.PlaneGeometry(WW+1600,WH+1600,1,1);mg.rotateX(-Math.PI/2);mg.translate(WW/2,U.uMistY.value-U.uMistN.value*.5-.02,WH/2);
  GW.mist=new THREE.Mesh(mg,GW.mistMat||(GW.mistMat=gwMistMat()));GW.mist.frustumCulled=false;GW.mist.renderOrder=-1;GFX.S.add(GW.mist)}
 gwRocks();gwPads();gwProps();
 GW.built=1;GW.buildMs=performance.now()-t0}
function gwDispose(){
 for(const m of GW.chunks){GFX.S.remove(m);m.geometry.dispose()}GW.chunks=[];
 if(GW.mist){GFX.S.remove(GW.mist);GW.mist.geometry.dispose();GW.mist=null}
 if(GW.far){GFX.S.remove(GW.far);GW.far.geometry.dispose();GW.far=null}
 if(GW.rockM){GFX.S.remove(GW.rockM);for(const o of GW.rockM.children)o.dispose&&o.dispose();GW.rockM=null}
 // pad shapes and materials are shared and kept (see carFree for why materials are not disposed)
 for(const g of GW.pads)GFX.S.remove(g);GW.pads=[];gwPropsDispose();GW.built=0}

// ---- rocks: boulders on the cliffs and stones along the rim (never on the land you drive on) ----
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3(),_s=new THREE.Vector3();
function vnoise3(x,y,z,s){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz),H=(a,b,c)=>hash2(a+c*57,b+c*113,s);
 const x00=H(ix,iy,iz)+(H(ix+1,iy,iz)-H(ix,iy,iz))*ux,x10=H(ix,iy+1,iz)+(H(ix+1,iy+1,iz)-H(ix,iy+1,iz))*ux,x01=H(ix,iy,iz+1)+(H(ix+1,iy,iz+1)-H(ix,iy,iz+1))*ux,x11=H(ix,iy+1,iz+1)+(H(ix+1,iy+1,iz+1)-H(ix,iy+1,iz+1))*ux;
 const y0=x00+(x10-x00)*uy,y1=x01+(x11-x01)*uy;return y0+(y1-y0)*uz}
// a boulder: a sphere pushed in and out by layered noise (ridged, so it has edges), a flat-ish underside, and creased normals so the faces catch the light
function rockGeo(seed,detail,sx,sy,sz,crease,tall){let g=new THREE.IcosahedronGeometry(1,detail);g.deleteAttribute('uv');g.deleteAttribute('normal');g=THREE.mergeVertices(g,1e-4);const p=g.attributes.position;
 for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const l=Math.hypot(x,y,z)||1;x/=l;y/=l;z/=l;
  let n=0,rd=0,a=.5,f=1.5;for(let o=0;o<4;o++){const v=vnoise3(x*f+seed,y*f+seed*.3,z*f,seed+o*7);n+=(v-.5)*a;rd+=(1-Math.abs(v*2-1))*a;a*=.5;f*=2.15}
  const r=Math.max(.35,1+n*.8+(rd-.4)*.5);let yy=y*r*sy;const fl=-.3*sy;if(yy<fl)yy=fl+(yy-fl)*.12;
  p.setXYZ(i,x*r*sx,yy*(tall?1+Math.max(0,y)*.3:1),z*r*sz)}
 g.computeVertexNormals();return crease?THREE.toCreasedNormals(g,crease):g}
function gwRockMat(){
 const rm=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:0,envMapIntensity:.4});
 rm.onBeforeCompile=sh=>{sh.uniforms.uLA=GW.u.uLA;Object.assign(sh.uniforms,GW.rockU);
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWN;varying vec3 vWPos;varying float vLY;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWN=normalize(mat3(modelMatrix*instanceMatrix)*normal);vWPos=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;vLY=position.y;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nprecision highp sampler2DArray;uniform sampler2DArray uLA;uniform vec4 uRL,uCap;uniform vec3 uRT;varying vec3 vWN;varying vec3 vWPos;varying float vLY;')
   .replace('#include <color_fragment>',`#include <color_fragment>
   {vec3 wn=normalize(vWN);vec3 bw=abs(wn);bw=bw*bw;bw/=bw.x+bw.y+bw.z;float rs=uRL.y;
    vec3 rc=texture(uLA,vec3(vWPos.zy*rs,uRL.x)).rgb*bw.x+texture(uLA,vec3(vWPos.xz*rs,uRL.x)).rgb*bw.y+texture(uLA,vec3(vWPos.xy*rs,uRL.x)).rgb*bw.z;
    rc*=uRT*mix(.58,1.,smoothstep(-.25,.45,vLY));
    float cap=smoothstep(.45,.8,wn.y)*uCap.a;
    diffuseColor.rgb=mix(rc,uCap.rgb,cap);}`)};
 rm.customProgramCacheKey=()=>'rock3';return rm}
function gwRocks(){
 const R=mulberry32((SEED^0xA0C5)>>>0),th=GFX.theme,L3=th.lay[3],t=tintOf(L3[6]),mi=th.mist,clouds=mi.k===undefined||mi.k>=1,vis=clouds?mi.y+mi.d*.55:-1e9;
 if(!GW.rockU)GW.rockU={uRL:{value:new THREE.Vector4()},uRT:{value:new THREE.Vector3(1,1,1)},uCap:{value:new THREE.Vector4(1,1,1,0)}};
 GW.rockU.uRL.value.set(Math.max(0,LAY.names.indexOf(L3[0])),1/(L3[1]*.4),0,0);GW.rockU.uRT.value.set(t[0],t[1],t[2]);
 if(th.cap){const c=linOf(th.cap[0]);GW.rockU.uCap.value.set(c[0],c[1],c[2],th.cap[1])}else GW.rockU.uCap.value.set(1,1,1,0);
 const rm=GW.rockMat||(GW.rockMat=gwRockMat());
 // two detailed shapes for the large rocks, two plain ones for the small stones
 const geos=GW.rockGeos||(GW.rockGeos=[rockGeo(11,2,1.1,.85,1,.5),rockGeo(23,2,1.25,.65,1.05,.45),rockGeo(37,1,.95,1.0,.95,.5),rockGeo(51,1,1,.7,1,.4)]);
 const spots=[],cen=[];
 // on the cliffs and at their foot: one large rock with smaller ones round it (only where the cliff shows above the cloud)
 for(let k=0;k<9000&&cen.length<46;k++){const x=-8+R()*(WW+16),y=-8+R()*(WH+16),d=gfxSD(x,y);if(d>-1.4||d<-9||gfxH(x,y)<vis)continue;if(cen.some(s=>Math.hypot(s.x-x,s.y-y)<7))continue;cen.push({x,y})}
 for(const c of cen){const n=2+((R()*3)|0);for(let j=0;j<n;j++){const a=R()*6.28,rr=j?.7+R()*2:0,x=c.x+Math.cos(a)*rr,y=c.y+Math.sin(a)*rr,d=gfxSD(x,y);if(d>-.9||gfxH(x,y)<vis)continue;spots.push({x,y,s:(j?.3+R()*.5:.7+R()*.9),k:j?2+((R()*2)|0):(R()*2)|0,r:R()*6.28})}}
 // boulders strewn over the low country (not under cloud)
 if(!clouds)for(let k=0,n=0;k<4000&&n<70;k++){const x=-GPAD+3+R()*(WW+2*GPAD-6),y=-GPAD+3+R()*(WH+2*GPAD-6),d=gfxSD(x,y);if(d>-9)continue;n++;spots.push({x,y,s:.4+R()*R()*1.5,k:(R()*4)|0,r:R()*6.28})}
 // small stones along the rim, just beyond the land
 for(let k=0,n=0;k<9000&&n<130;k++){const x=R()*WW,y=R()*WH,d=gfxSD(x,y);if(d>-.6||d<-1.5)continue;n++;spots.push({x,y,s:.16+R()*R()*.4,k:2+((R()*2)|0),r:R()*6.28})}
 const grp=new THREE.Group(),CELL=38,byKey=new Map();
 for(const sp of spots){const key=Math.floor((sp.x+GPAD)/CELL)+'_'+Math.floor((sp.y+GPAD)/CELL)+'_'+sp.k;let l=byKey.get(key);if(!l){l=[];byKey.set(key,l)}l.push(sp)}
 for(const [key,list] of byKey){const k=list[0].k,im=new THREE.InstancedMesh(geos[k],rm,list.length);
  list.forEach((sp,i)=>{const h=gfxH(sp.x,sp.y);_e.set((R()-.5)*.4,sp.r,(R()-.5)*.4);_q.setFromEuler(_e);_v.set(sp.x,h-sp.s*.14,sp.y);_s.set(sp.s*1.15,sp.s,sp.s*1.15);_m4.compose(_v,_q,_s);im.setMatrixAt(i,_m4)});
  im.castShadow=QNAME==='high';im.receiveShadow=true;im.computeBoundingSphere();grp.add(im)}
 GFX.S.add(grp);GW.rockM=grp}

// ---- power pads: a steel platform with a painted floor (hazard band, the pad's sign), lamps round the rim in the owner's colour, and a small machine in the middle ----
const PADCOL={cannon:'#ff8a3d',fort:'#4fd8ff',strike:'#ff4d5e',nitro:'#ffc83d'},PADIC={cannon:'cannon',fort:'fort',strike:'orbital',nitro:'bolt'},PADTEX={};
function padFloorTex(t){if(PADTEX[t])return PADTEX[t];const N=512,C=N/2,c=mkc(N,N),g=c.getContext('2d'),col=PADCOL[t];
 g.fillStyle='#1d232e';g.fillRect(0,0,N,N);
 // steel plates: six wedges, slightly different, with seams
 g.save();g.translate(C,C);for(let k=0;k<6;k++){g.fillStyle='rgba(255,255,255,'+(.015+.02*(k%3))+')';g.beginPath();g.moveTo(0,0);g.arc(0,0,C,k*1.0472,(k+1)*1.0472);g.closePath();g.fill();g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=3;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(k*1.0472)*C,Math.sin(k*1.0472)*C);g.stroke()}
 for(let i=0;i<900;i++){const r=Math.random()*C,a=Math.random()*6.283;g.fillStyle='rgba(255,255,255,'+(Math.random()*.035)+')';g.fillRect(Math.cos(a)*r,Math.sin(a)*r,1+Math.random()*3,1)}g.restore();
 // hazard band
 g.save();g.translate(C,C);g.beginPath();g.arc(0,0,C*.985,0,7);g.arc(0,0,C*.85,0,7,true);g.clip();g.fillStyle='#121419';g.fillRect(-C,-C,N,N);
 for(let k=0;k<44;k+=2){const a0=k/44*6.2832,a1=(k+1)/44*6.2832,d=.07;g.fillStyle='#f0bd2c';g.beginPath();g.moveTo(Math.cos(a0+d)*C*.85,Math.sin(a0+d)*C*.85);g.lineTo(Math.cos(a0)*C,Math.sin(a0)*C);g.lineTo(Math.cos(a1)*C,Math.sin(a1)*C);g.lineTo(Math.cos(a1+d)*C*.85,Math.sin(a1+d)*C*.85);g.closePath();g.fill()}g.restore();
 g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=4;g.beginPath();g.arc(C,C,C*.85,0,7);g.stroke();
 // the pad's colour: a ring and the sign, large, with a glow
 g.strokeStyle=col;g.lineWidth=7;g.beginPath();g.arc(C,C,C*.76,0,7);g.stroke();g.strokeStyle='rgba(255,255,255,.16)';g.lineWidth=2;g.beginPath();g.arc(C,C,C*.66,0,7);g.stroke();
 const svg=IC[PADIC[t]]||'',ds=[...svg.matchAll(/\sd="([^"]+)"/g)].map(m=>m[1]),ev=/evenodd/.test(svg);
 g.save();g.translate(C,C);const sc=N*.52/24;g.scale(sc,sc);g.translate(-12,-12);g.shadowColor=col;g.shadowBlur=26;g.fillStyle=col;
 for(const d of ds){try{g.fill(new Path2D(d),ev?'evenodd':'nonzero')}catch(e){}}g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.35)';for(const d of ds){try{g.fill(new Path2D(d),ev?'evenodd':'nonzero')}catch(e){}}g.restore();
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=8;return PADTEX[t]=tx}
function gwPadModel(t){
 const g=new THREE.Group(),M=prMats(),glow=new THREE.MeshBasicMaterial({color:cLin(PADCOL[t]).multiplyScalar(2.4),toneMapped:false});g.userData={};
 const add=(o,par)=>{o.castShadow=QNAME==='high';o.receiveShadow=true;(par||g).add(o);return o};
 if(t==='cannon'){ // a twin-barrel turret that scans round
  add(prMesh([gP(cyl(.62,.74,.3,20),0,.15,0)],M.dark));const tu=new THREE.Group();tu.position.y=.3;g.add(tu);
  add(prMesh([gP(box(.95,.42,.8,.08),0,.25,0)],M.steel),tu);add(prMesh([gP(box(.97,.08,.82,.02),0,.3,0)],new THREE.MeshStandardMaterial({color:PADCOL[t],roughness:.45,metalness:.3})),tu);
  add(prMesh([gP(cyl(.075,.075,1.25,10),.85,.3,.17,0,0,Math.PI/2),gP(cyl(.075,.075,1.25,10),.85,.3,-.17,0,0,Math.PI/2)],M.dark),tu);
  const tip=new THREE.Mesh(gMerge([gP(cyl(.09,.09,.08,10),1.47,.3,.17,0,0,Math.PI/2),gP(cyl(.09,.09,.08,10),1.47,.3,-.17,0,0,Math.PI/2)]),glow);tip.layers.enable(GLOW);tu.add(tip);g.userData.spin=tu}
 else if(t==='fort'){ // a pylon with a floating crystal
  add(prMesh([gP(cyl(.62,.74,.24,6),0,.12,0)],M.dark));const F=[];for(let k=0;k<3;k++){const a=k*2.0944;F.push(gP(box(.12,.85,.42,.03),Math.cos(a)*.34,.66,Math.sin(a)*.34,0,-a,0))}add(prMesh(F,M.steel));
  const cr=new THREE.Mesh(new THREE.OctahedronGeometry(.42,0),glow);cr.scale.set(.75,1.35,.75);cr.position.y=1.45;cr.layers.enable(GLOW);cr.castShadow=QNAME==='high';g.add(cr);g.userData.spin=cr;g.userData.bob=cr}
 else if(t==='strike'){ // an open silo with a missile inside
  add(prMesh([gP(new THREE.TorusGeometry(.6,.12,8,24),0,.12,0,Math.PI/2,0,0)],M.dark));add(prMesh([gP(box(1.15,.07,.55,.02),0,.4,.82,-1.15,0,0),gP(box(1.15,.07,.55,.02),0,.4,-.82,1.15,0,0)],M.steel));
  add(prMesh([gP(cyl(.22,.22,1.0,14),0,.62,0)],M.white));add(prMesh([gP(new THREE.ConeGeometry(.22,.48,14),0,1.36,0),gP(box(.04,.3,.36),0,.3,0),gP(box(.36,.3,.04),0,.3,0)],M.red));
  const bl=new THREE.Mesh(new THREE.SphereGeometry(.08,8,6),glow);bl.position.set(.62,.25,0);bl.layers.enable(GLOW);g.add(bl);g.userData.blink=bl}
 else{ // a fuel tank and a pump with a lit bolt
  add(prMesh([gP(new THREE.CapsuleGeometry(.32,.95,4,14),-.15,.36,.0,0,0,Math.PI/2)],M.yellow));add(prMesh([gP(box(.12,.1,1.0),-.55,.08,0),gP(box(.12,.1,1.0),.25,.08,0)],M.dark));
  add(prMesh([gP(box(.32,.85,.32,.05),.72,.43,0)],M.dark));const b=new THREE.Mesh(gMerge([gP(box(.05,.34,.2),.89,.6,0,0,0,.35)]),glow);b.layers.enable(GLOW);g.add(b)}
 return g}
// one model per kind of pad, built once and copied (the copies share shapes and materials)
const PADCACHE={},PADGEO={};
function padModelOf(t){let T=PADCACHE[t];
 if(!T){T=PADCACHE[t]=gwPadModel(t);const u=T.userData;if(u.spin)u.spin.name='pspin';if(u.bob&&u.bob!==u.spin)u.bob.name='pbob';if(u.blink)u.blink.name='pblink'}
 const m=T.clone(),u=T.userData,sp=m.getObjectByName('pspin')||null;m.userData={spin:u.spin?sp:null,bob:u.bob?(u.bob===u.spin?sp:m.getObjectByName('pbob')):null,blink:u.blink?m.getObjectByName('pblink'):null};
 m.traverse(o=>{if(o.isMesh)o.castShadow=QNAME==='high'&&!(o.layers.mask&(1<<GLOW))});return m}
function gwPads(){
 GW.pads=[];const R0=ZR*1.04;
 if(!PADGEO.base){PADGEO.base=new THREE.CylinderGeometry(R0,R0+.2,.26,64,1,true);PADGEO.top=new THREE.CircleGeometry(R0*.99,64);const L=[];for(let k=0;k<16;k++){const a=k/16*6.2832;L.push(gP(box(.2,.09,.2,.02),Math.cos(a)*R0*.925,.3,Math.sin(a)*R0*.925,0,-a,0))}PADGEO.lamps=gMerge(L);PADGEO.ring=new THREE.RingGeometry(R0*.745,R0*.775,96)}
 for(let zi=0;zi<ZN.length;zi++){const z=ZN[zi],g=new THREE.Group(),h=z.gh!==undefined?z.gh:gfxH(z.x,z.y),R=ZR*1.04;g.position.set(z.x,h+.02,z.y);
  const base=new THREE.Mesh(PADGEO.base,new THREE.MeshStandardMaterial({color:0x2a313d,roughness:.5,metalness:.75,envMapIntensity:.7}));base.position.y=.13;base.receiveShadow=true;base.castShadow=false;
  const top=new THREE.Mesh(PADGEO.top,new THREE.MeshStandardMaterial({map:padFloorTex(z.t),emissiveMap:padFloorTex(z.t),emissive:new THREE.Color(1,1,1),emissiveIntensity:.5,roughness:.5,metalness:.3,envMapIntensity:.7}));top.rotation.x=-Math.PI/2;top.position.y=.262;top.receiveShadow=true;
  const lampMat=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  const lm=new THREE.Mesh(PADGEO.lamps,lampMat);lm.layers.enable(GLOW);
  const ringMat=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,transparent:true,opacity:.95}),ring=new THREE.Mesh(PADGEO.ring,ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=.272;ring.layers.enable(GLOW);
  const mdl=padModelOf(z.t);mdl.position.y=.26;mdl.scale.setScalar(.95);
  g.add(base,top,lm,ring,mdl);g.userData={ring:ringMat,lamp:lampMat,mdl};GFX.S.add(g);GW.pads.push(g)}}
function gwPadTick(){
 for(let zi=0;zi<GW.pads.length;zi++){const g=GW.pads[zi],o=(typeof ZOWN!=='undefined'&&ZOWN[zi])||0,c=o?COLLIN[o]:[.9,.95,1],u=g.userData,m=u.mdl.userData,pul=.75+.25*Math.sin(GFX.time*3+zi);
  u.lamp.color.setRGB(c[0]*pul*2.2+.04,c[1]*pul*2.2+.04,c[2]*pul*2.2+.04);u.ring.color.setRGB(c[0]*1.5*pul,c[1]*1.5*pul,c[2]*1.5*pul);u.ring.opacity=o?.95:.5;
  if(m.spin)m.spin.rotation.y=GFX.time*(m.bob?1.2:.5)+zi;if(m.bob)m.bob.position.y=1.45+Math.sin(GFX.time*2+zi)*.1;if(m.blink)m.blink.visible=((GFX.time+zi*.3)%1)<.4}}

// ---- every frame: ownership picture, capture flashes, pads, tyre tracks, the things round the plateau ----
function gwFrame(dt){
 if(!GW.built)return;
 GFX.U.time.value=GFX.time;gwPadTick();gwMask();trkFrame();prTick(dt);
 // capture flashes (up to 4 at a time)
 const F=GW.u.uFlash.value;for(let i=0;i<4;i++){const c=CAPW[i];if(c){const age=(clk-c.t0)/.75;F[i].set(c.x,c.y,Math.min(1,age),c.c)}else F[i].z=1}}
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
 C.under=new THREE.Mesh(new THREE.PlaneGeometry(3.0,1.8),new THREE.MeshBasicMaterial({map:sp,color:new THREE.Color(C.lc[0]*1.5,C.lc[1]*1.5,C.lc[2]*1.5),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));C.under.rotation.x=-Math.PI/2;C.under.position.y=.05;C.under.renderOrder=3;C.under.visible=false;root.add(C.under);
 C.beam=new THREE.Mesh(new THREE.PlaneGeometry(6,3.2),new THREE.MeshBasicMaterial({map:sp,color:new THREE.Color(1.2,1.1,.9),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));C.beam.rotation.x=-Math.PI/2;C.beam.position.set(4,.06,0);C.beam.renderOrder=3;root.add(C.beam);
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
  const rr=new THREE.Mesh(new THREE.RingGeometry(1.64,1.76,72),new THREE.MeshBasicMaterial({color:new THREE.Color(Math.min(1.2,lc[0]*1.2+.1),Math.min(1.2,lc[1]*1.2+.1),Math.min(1.2,lc[2]*1.2+.1)),toneMapped:false,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));rr.rotation.x=-Math.PI/2;rr.position.y=.06;rr.layers.enable(GLOW);C.ring.add(rr);
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
 const lon=night>.25?1:0,brk=Math.abs(C.yaw)>2.5;C.setHeadlights(lon&&p.alive?.34*night:0);
 if(lon!==C.lampOn){C.lampOn=lon;if(lon){C.mLampF.material.color.setRGB(2.0,1.95,1.75);C.mLampF.layers.enable(GLOW)}else{C.mLampF.material.color.setRGB(.8,.82,.84);C.mLampF.layers.disable(GLOW)}}
 C.mLampR.material.color.setRGB(lon?1.5+(brk?2.4:0):brk?2.6:.62,lon?.07:.04,lon?.05:.03);if(lon||brk)C.mLampR.layers.enable(GLOW);else C.mLampR.layers.disable(GLOW);
 // flames at the exhaust: sprint, lunge, ultimate
 const fl=p.fSpr||p.fMv||0;C.flame+=((fl?1:0)-C.flame)*Math.min(1,dt*10);
 for(let i=0;i<C.flames.length;i++){const f=C.flames[i];f.visible=C.flame>.05;if(f.visible){const s=(.6+.5*Math.sin(tm*60+i*2))*C.flame,len=.8*s+.3;f.scale.set(1,len,1);f.position.x=CARS3D[C.cl].body[0].x-.1-len*.5;f.material.opacity=.8*C.flame}}
 // abilities
 const ul=p.fUlt?1:0;
 if(C.ring){C.ring.visible=!!ul;if(ul){const t=tm*7;for(let k=0;k<4;k++)for(let g=0;g<3;g++){const m=C.ringBl[k*3+g],a=t+k*1.5708-g*.2;m.position.set(Math.cos(a)*1.7,.5,Math.sin(a)*1.7);m.rotation.y=-tm*34+k}}}
 if(C.ramShield){const on=p.fMv===2?1:0;C.ramK=(C.ramK||0)+(on-(C.ramK||0))*Math.min(1,dt*16);C.ramShield.visible=C.ramK>.03;if(C.ramShield.visible){C.ramShield.material.opacity=.62*C.ramK;C.ramShield.scale.set(1,1+.1*Math.sin(tm*40),1)}}
 const dust=th.dust||'#dfe9fb';
 // dust (or snow) thrown up by the rear wheels: a little all the time at speed, a lot when the car slides through a turn or sprints
 if(!FF&&QL.fx>.5&&p.alive&&C.sp>10){const D=CARS3D[C.cl],slide=Math.abs(C.yaw)>2.3,pr=slide?.55:(p.fSpr?.5:.16);
  if(Math.random()<pr){const sd=slide?(C.yaw>0?-1:1):(Math.random()<.5?-1:1),rx=D.wx[1]*CAR_K,wz=D.wz*CAR_K;
   FX.push({x:x+cs*rx-sn*wz*sd,y:z+sn*rx+cs*wz*sd,h:.25,vh:slide?1.1:.7,vx:-cs*3-sn*sd*(slide?2.5:.6),vy:-sn*3+cs*sd*(slide?2.5:.6),l:slide?.6:.45,l0:slide?.6:.45,c:dust,k:2,s:slide?.55:.4,r:Math.random()*6,vr:1})}}
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
// ---------- 3D renderer, part 4: trails, tyre tracks, sparks and smoke, rings, scorch marks, drifting snow ----------
// The ground under a point: the hills, plus the small raise of land that belongs to somebody (the terrain shader does the same)
function covJS(x,y){const fx=x*MC-.5,fy=y*MC-.5,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;
 const g=(a,b)=>{a=a<0?0:a>=MW?MW-1:a;b=b<0?0:b>=MH?MH-1:b;return own[b*MW+a]?1:0};
 return(g(ix,iy)*(1-tx)+g(ix+1,iy)*tx)*(1-ty)+(g(ix,iy+1)*(1-tx)+g(ix+1,iy+1)*tx)*ty}
function gfxGround(x,y){return Math.max(-.2,gfxH(x,y))}
const colOf=c=>{if(c&&c.lc)return c.lc;return linOf(c&&c[0]==='#'?c:'#ffffff')};

// ---------- trails ----------
const TR3={pool:[],used:0,NV:5200,idx:null,ok:0};
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
  float edge=smoothstep(.6,1.,r);col=uCol*(uSunCol*lam*.66+hemi*.8)*(1.-.34*edge);
  col+=uSunCol*pow(nh,48.)*.16+F*uHor*.16;col=mix(col,col*1.22+.02,exp(-v*v*7.)*.5);col*=grain;halo=0.;
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
 g.attributes.position.needsUpdate=g.attributes.aN.needsUpdate=g.attributes.aV.needsUpdate=true;
 g.setDrawRange(0,Math.max(0,(n-2)*3));m.len=u;return n}
// the ground rectangle the camera sees (rough, for deciding what to subdivide)
function trVis(){const c=GFX.cam,x=c.position.x,z=c.position.z,r=Math.max(30,CAM.vw*1.5);return[CAM.x-r,CAM.y-r,CAM.x+r,CAM.y+r]}
const TRSTY={glow:0,neon:1,fire:2,track:3};
function trailsFrame(){
 trInit();if(!TR3.ok)return;const vis=trVis();let k=0;
 const use=(tr,hx,hy,c,st,al,kk,hw,lift)=>{if(k>=22)return;const m=trMesh(k);const n=trBuild(m,tr,hx,hy,vis,hw,lift);m.grp.visible=n>0;if(!n)return;k++;
  for(const o of [m.sh,m.ln]){const u=o.material.uniforms;u.uCol.value.set(c[0],c[1],c[2]);u.uStyle.value=TRSTY[st]|0;u.uAl.value=al;u.uK.value=kk;u.uL.value=m.len;u.uHW.value=hw}
  m.sh.visible=st!=='track'}
 // tyre tracks in the snow, then the ghosts of trails that were just closed, then the live trails
 if(QL.hi)for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.alive||!p.hist||p.hist.length<6)continue;use(p.hist,p.rx,p.ry,(GFX.theme&&GFX.theme.tread)||[.13,.2,.34],'track',p.fSlow?.5:1,1,.95,.035)}
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.ghost)continue;const a=1-(clk-p.ghost.t0)/.4;if(a<=0){p.ghost=null;continue}use(p.ghost.tr,undefined,undefined,COLLIN[q],'glow',a,.5,.42,.07)}
 for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.tr||!p.tr.length)continue;const st=(COS[q]||[])[1]||'glow',tr=(q===1&&MP)?ncTrail(p):p.tr;if(!tr.length)continue;
  use(tr,p.alive?p.rx:undefined,p.alive?p.ry:undefined,COLLIN[q],st,p.fSlow?.55:1,QL.glow?1:.6,.42,.075);
  if(st==='fire'&&QL.hi&&p.alive&&tr.length>4&&Math.random()<.5){const j=Math.max(0,tr.length-2-((Math.random()*Math.min(40,tr.length/2))|0)*2);FX.push({x:tr[j],y:tr[j+1],h:.1,vh:1.6+Math.random()*1.4,vx:(Math.random()-.5)*.6,vy:(Math.random()-.5)*.6,l:.6,l0:.6,c:'#ff9a3a',k:4,s:.16,r:0,vr:0})}}
 for(let j=k;j<TR3.pool.length;j++)TR3.pool[j].grp.visible=false}

// ---------- sparks, smoke and chips: two instanced sprite sets (glowing ones add up, smoke and chips blend normally) ----------
const PT={ok:0,max:900,A:null,N:null};
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
 for(const S of [PT.A,PT.N]){const G=S.g;G.instanceCount=S.n;for(const n of ['iP','iV','iC','iS'])G.attributes[n].needsUpdate=true}}

// ---------- rings, scorch marks, falling snow ----------
const RG3={pool:[],max:14,sc:[],scMax:22,snow:null};
const RG_FS=`uniform vec3 uC;uniform float uP,uA;varying vec2 vUv;
void main(){vec2 d=vUv*2.-1.;float r=length(d);float rad=.08+uP*.92;float w=.075+.06*(1.-uP);
 float ring=exp(-pow((r-rad)/w,2.)),core=exp(-pow((r-rad)/(w*.35),2.)),rim=exp(-pow((r-rad)/(w*1.9),2.));
 float fill=smoothstep(rad,rad*.1,r)*.28*(1.-uP);float edge=smoothstep(1.,.9,r);float fade=(1.-uP*uP)*uA*edge;
 float a=clamp(ring*.95+fill+rim*.32,0.,1.)*fade;
 vec3 col=mix(vec3(.03,.05,.1),uC*.85,clamp(ring*1.4+fill*2.,0.,1.));col=mix(col,vec3(1.),core*.55);
 gl_FragColor=vec4(col*a,a);}`;
function ringsInit(){
 if(RG3.pool.length||!GFX.ok)return;const pg=new THREE.PlaneGeometry(1,1);pg.rotateX(-Math.PI/2);
 for(let i=0;i<RG3.max;i++){const m=new THREE.Mesh(pg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
  uniforms:{uC:{value:new THREE.Vector3(1,1,1)},uP:{value:0},uA:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:RG_FS}));
  m.visible=false;m.renderOrder=9;m.layers.enable(GLOW);m.frustumCulled=false;GFX.S.add(m);RG3.pool.push(m)}
 const sg=new THREE.PlaneGeometry(1,1);sg.rotateX(-Math.PI/2);
 for(let i=0;i<RG3.scMax;i++){const m=new THREE.Mesh(sg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uA:{value:1},uSeed:{value:i*7.3}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform float uA,uSeed;varying vec2 vUv;float h(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
   float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
   void main(){vec2 d=vUv*2.-1.;float r=length(d);float an=atan(d.y,d.x);float rag=.72+.2*n(vec2(an*2.,uSeed))+.12*n(vec2(an*7.,uSeed+3.));float body=smoothstep(rag,rag*.55,r);float soot=smoothstep(1.,.2,r)*.55;float a=max(body*.62,soot*.4)*uA*(.8+.2*n(d*9.+uSeed));gl_FragColor=vec4(vec3(.015,.018,.03)*a,a);}`}));
  m.visible=false;m.renderOrder=3;m.frustumCulled=false;GFX.S.add(m);RG3.sc.push(m)}
 // falling snow: moved entirely on the graphics chip, always around the camera
 const N=420,pos=new Float32Array(N*3),seed=new Float32Array(N*2);for(let i=0;i<N;i++){pos[i*3]=Math.random();pos[i*3+1]=Math.random();pos[i*3+2]=Math.random();seed[i*2]=Math.random();seed[i*2+1]=Math.random()}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aS',new THREE.BufferAttribute(seed,2));g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1e5);
 RG3.snow=new THREE.Points(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
  uniforms:{uT:GFX.U.time,uC:{value:new THREE.Vector3(30,0,30)},uBox:{value:new THREE.Vector3(70,40,90)},uPx:{value:1},uK:{value:1}},
  vertexShader:`attribute vec2 aS;uniform float uT,uPx,uK;uniform vec3 uC,uBox;varying float vA;
   void main(){vec3 p=position*uBox;float sp=.7+aS.x*.8;p.y-=uT*(2.2+aS.y*2.4)*sp;p.x+=uT*(1.6+aS.x)+sin(uT*.8+aS.y*30.)*.7;p.z+=uT*.6+cos(uT*.7+aS.x*20.)*.7;
    p=mod(p,uBox);p+=uC-uBox*vec3(.5,0.,.5);vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
    float sz=(.07+aS.y*.09)*uPx*projectionMatrix[1][1]*.5*1000./max(-mv.z,1.);gl_PointSize=clamp(sz,1.,14.);vA=smoothstep(0.,6.,p.y)*uK*(.35+.5*aS.x);}`,
  fragmentShader:`varying float vA;void main(){vec2 d=gl_PointCoord*2.-1.;float a=smoothstep(1.,.2,length(d))*vA;gl_FragColor=vec4(vec3(1.)*a*1.4,a);}`}));
 RG3.snow.frustumCulled=false;RG3.snow.renderOrder=10;GFX.S.add(RG3.snow)}
function ringsFrame(){
 ringsInit();if(!RG3.pool.length)return;let k=0;
 for(let i=RINGS.length-1;i>=0;i--){const r=RINGS[i],dur=r.dur||.65,age=(clk-r.t0)/dur;if(age>=1){RINGS.splice(i,1);continue}if(k>=RG3.max)continue;
  const m=RG3.pool[k++],R=(r.r||4.6)*2,c=colOf(r.c);m.visible=true;m.position.set(r.x,gfxGround(r.x,r.y)+.08,r.y);m.scale.set(R,1,R);const u=m.material.uniforms;u.uC.value.set(c[0],c[1],c[2]);u.uP.value=age;u.uA.value=r.a||1}
 for(;k<RG3.max;k++)RG3.pool[k].visible=false;
 let j=0;for(let i=SCORCH.length-1;i>=0&&j<RG3.scMax;i--){const s=SCORCH[i],age=clk-s.t0;if(age>14){SCORCH.splice(i,1);continue}const m=RG3.sc[j++];m.visible=true;m.position.set(s.x,gfxGround(s.x,s.y)+.045,s.y);const R=s.r*2.3;m.scale.set(R,1,R);m.material.uniforms.uA.value=Math.min(1,age*6)*(1-Math.max(0,age-9)/5)}
 for(;j<RG3.scMax;j++)RG3.sc[j].visible=false;
 const th=GFX.theme||{night:0};RG3.snow.material.uniforms.uC.value.set(CAM.x,0,CAM.y);RG3.snow.material.uniforms.uPx.value=GFX.pr;RG3.snow.material.uniforms.uK.value=QL.fx>.5?(th.night?1:.55)*(th.snowfall||0):0;RG3.snow.visible=QL.fx>.3&&(th.snowfall||0)>0}
// a capture: the ground flashes outward from the point, with a ring
function capFlash(x,y,id,n){CAPW.push({x,y,t0:clk,c:id,n});if(CAPW.length>4)CAPW.shift();RINGS.push({x,y,t0:clk,c:COLS[id],r:Math.min(9,3+n*.012),dur:.75})}
// ---------- 3D renderer, part 5: shells, throwing blades, drones, mines, strike markers, the ring under your own car ----------
// The game keeps these as small lists (SHV shells, BLV blades, MSV drones, MNV mines, STV strikes); here each one gets a model, taken from a pool.
const PJ={ok:0,shell:[],blade:[],miss:[],mine:[],strike:[],pilot:null,beam:null};
let MARKSEL=0;   // the ring under your own car: 0 ring with arrows, 1 thin ring, 2 none
const _pv=new THREE.Vector3();
const GRND_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const STRIKE_FS=`uniform vec3 uC;uniform float uP,uT,uA;varying vec2 vUv;
float ln(float x,float w){return smoothstep(w,w*.3,abs(x));}
void main(){vec2 d=vUv*2.-1.;float r=length(d);float pul=.78+.22*sin(uT*18.);
 float an=atan(d.y,d.x);
 float edge=ln(r-.9,.06)*pul;
 float ring2=ln(r-.9*uP,.05);
 float fill=smoothstep(.9*uP+.02,.0,r)*.26*uP;
 float cross=(ln(d.x,.022)+ln(d.y,.022))*smoothstep(1.,.45,r)*.8;
 float tick=ln(fract(an*3.8197+uT*.7)-.5+.4,.07)*ln(r-.78,.07)*.9;
 float line=clamp(edge+ring2+cross+tick,0.,1.);
 float halo=clamp(ln(r-.9,.14)+ln(r-.9*uP,.11),0.,1.)*.55;
 float a=clamp(line+fill+halo,0.,1.)*smoothstep(1.,.88,r)*uA;
 vec3 col=mix(vec3(.10,.0,.03),uC,clamp(line*1.1+fill*1.5,0.,1.));col=mix(col,vec3(1.,.86,.7),ring2*.6);
 gl_FragColor=vec4(col*a,a);}`;
const PILOT_FS=`uniform vec3 uC;uniform float uT,uS,uA,uM;varying vec2 vUv;
float ln(float x,float w){return smoothstep(w,w*.3,abs(x));}
void main(){vec2 d=(vUv*2.-1.);float r=length(d);float an=atan(d.y,d.x);
 float ring=ln(r-.5,mix(.024,.016,uM));
 float seg=smoothstep(.02,.0,abs(fract(an/6.2832*3.+uT*.28)-.5)-.28)*ln(r-.56,.03)*(1.-uM);
 float halo=ln(r-.5,.07)*.5*(1.-uM);
 // chevrons running ahead (to +x in the plane's own space); the thin ring keeps a single still one
 float ch=0.;for(int k=0;k<3;k++){float u=mix(fract(uT*(.8+uS*.9)+float(k)/3.),.3,uM);float cx=.58+u*.36;float w=abs(d.y)*1.0;float s=smoothstep(.03,.0,abs(cx-d.x-w*.9))*smoothstep(.3,.0,abs(d.y))*sin(u*3.1416);ch+=s*(k==0?1.:1.-uM);}
 float line=clamp(ring*.9+seg*.8+ch*.9,0.,1.);
 float a=clamp(line+halo,0.,1.)*uA*smoothstep(1.,.9,r);
 vec3 col=mix(vec3(.04,.06,.14),uC,clamp(line*1.2,0.,1.));col=mix(col,vec3(1.),ring*.35*(1.-uM)+uM*.12);
 gl_FragColor=vec4(col*a,a);}`;
function pjMat(fs,uni){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,uniforms:uni,vertexShader:GRND_VS,fragmentShader:fs})}
function pjInit(){
 if(PJ.ok||!GFX.ok)return;PJ.ok=1;
 const S=GFX.S,add=(o,l)=>{o.frustumCulled=false;if(l)o.layers.enable(l);S.add(o);o.visible=false;return o};
 const sp=spotTex();
 // a soft dark spot on the ground under things that fly (they sit above the snow, so without it they look as if they float)
 PJ.sh=[];for(let i=0;i<40;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:sp,color:0x0c1830,transparent:true,opacity:.34,depthWrite:false,toneMapped:false}));m.rotation.x=-Math.PI/2;m.renderOrder=2;add(m);PJ.sh.push(m)}
 PJ.shN=0;
 // shells: dark steel with a glowing tail
 const sg=gP(new THREE.CapsuleGeometry(.17,.8,3,10),0,0,0,0,0,Math.PI/2),sm=new THREE.MeshStandardMaterial({color:0x2c3340,roughness:.32,metalness:.85,envMapIntensity:1}),
  tg=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),new THREE.MeshBasicMaterial({color:new THREE.Color(3.2,1.5,.45),toneMapped:false}));
 for(let i=0;i<16;i++){const g=new THREE.Group(),m=new THREE.Mesh(sg,sm),t=tg.clone();t.position.x=-.52;t.scale.set(1.4,1,1);m.castShadow=true;g.add(m,t);add(g);t.layers.enable(GLOW);PJ.shell.push(g)}
 // blades: a four-point throwing star, in the owner's colour with a bright middle
 const sh=new THREE.Shape(),R0=.86,R1=.28;for(let k=0;k<8;k++){const a=k/8*6.2832,r=k&1?R1:R0;k?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r)}sh.closePath();
 const hole=new THREE.Path();hole.absarc(0,0,.13,0,6.2832,true);sh.holes.push(hole);
 const bg=new THREE.ExtrudeGeometry(sh,{depth:.07,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:1});bg.rotateX(-Math.PI/2);bg.translate(0,-.035,0);
 for(let i=0;i<14;i++){const g=new THREE.Group(),m1=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,1),toneMapped:false})),m2=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,1),toneMapped:false}));
  m2.scale.set(1.0,1,1.0);m1.scale.set(.5,1.6,.5);g.add(m2,m1);g.userData={m1,m2};add(g);m2.layers.enable(GLOW);PJ.blade.push(g)}
 // drones: a small rocket with a flame
 const metal=new THREE.MeshStandardMaterial({color:0xcfd6e2,roughness:.3,metalness:.85,envMapIntensity:1});
 for(let i=0;i<8;i++){const g=new THREE.Group(),col=new THREE.MeshStandardMaterial({color:0x1fbf75,roughness:.35,metalness:.3}),
   body=new THREE.Mesh(gP(new THREE.CylinderGeometry(.17,.17,1.05,12),0,0,0,0,0,Math.PI/2),metal),nose=new THREE.Mesh(gP(new THREE.ConeGeometry(.17,.46,12),.74,0,0,0,0,-Math.PI/2),col);
  const fins=[];for(let k=0;k<4;k++){const f=new THREE.Mesh(new THREE.BoxGeometry(.34,.03,.3),col);f.rotation.x=k*1.5708;f.position.set(-.42,Math.cos(k*1.5708)*.16,Math.sin(k*1.5708)*.16);fins.push(f)}
  const fl=new THREE.Mesh(gP(new THREE.ConeGeometry(.15,1.1,8,1,true),-.6,0,0,0,0,Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(3,1.6,.6),transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide}));
  g.add(body,nose,fl,...fins);g.userData={col,fl};body.castShadow=true;add(g);fl.layers.enable(GLOW);g.position.y=.6;PJ.miss.push(g)}
 // mines
 const dark=new THREE.MeshStandardMaterial({color:0x2a303c,roughness:.5,metalness:.7,envMapIntensity:.7});
 for(let i=0;i<30;i++){const g=new THREE.Group(),b=new THREE.Mesh(new THREE.CylinderGeometry(.5,.58,.16,18),dark),top=new THREE.Mesh(new THREE.CylinderGeometry(.34,.4,.07,18),dark),
   ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.055,6,24),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})),led=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),new THREE.MeshBasicMaterial({color:0xff2030,toneMapped:false}));
  b.position.y=.08;top.position.y=.19;ring.rotation.x=Math.PI/2;ring.position.y=.17;led.position.y=.28;b.castShadow=true;ring.layers.enable(GLOW);led.layers.enable(GLOW);
  const spikes=[];for(let k=0;k<6;k++){const spk=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.13),dark);const an=k/6*6.2832;spk.position.set(Math.cos(an)*.56,.1,Math.sin(an)*.56);spikes.push(spk)}
  g.add(b,top,ring,led,...spikes);g.userData={ring,led};add(g);PJ.mine.push(g)}
 // strike markers: a ring that tightens and a column of light
 const bm=new THREE.CylinderGeometry(.5,.5,50,16,1,true);bm.translate(0,25,0);
 for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),pjMat(STRIKE_FS,{uC:{value:new THREE.Vector3(1,.14,.2)},uP:{value:0},uT:GFX.U.time,uA:{value:1}}));m.rotation.x=-Math.PI/2;m.renderOrder=9;
  const beam=new THREE.Mesh(bm,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,uniforms:{uC:{value:new THREE.Vector3(1,.2,.2)},uP:{value:0}},
   vertexShader:'varying float vH;void main(){vH=position.y/50.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 uC;uniform float uP;varying float vH;void main(){float a=smoothstep(0.,.35,vH)*(1.-vH)*uP*uP*.55;gl_FragColor=vec4(uC*a,a);}'}));
  const g=new THREE.Group();g.add(m,beam);g.userData={m,beam};add(g,GLOW);m.layers.enable(GLOW);beam.layers.enable(GLOW);PJ.strike.push(g)}
 // the ring that follows the car you drive
 const pm=new THREE.Mesh(new THREE.PlaneGeometry(1,1),pjMat(PILOT_FS,{uC:{value:new THREE.Vector3(1,1,1)},uT:GFX.U.time,uS:{value:0},uA:{value:1},uM:{value:0}}));pm.rotation.x=-Math.PI/2;pm.renderOrder=6;
 const pg=new THREE.Group();pg.add(pm);add(pg,GLOW);pm.layers.enable(GLOW);pg.userData={m:pm};PJ.pilot=pg}
const ownerC=o=>(COLLIN[o]||[1,1,1]);
function pjShadow(x,y,h,sz){const m=PJ.sh[PJ.shN++];if(!m)return;m.visible=true;const L=GFX.U.sunDir.value,k=h/Math.max(L.y,.25);m.position.set(x-L.x*k,gfxGround(x,y)+.05,y-L.z*k);m.scale.set(sz*1.3,sz,1)}
function pjFrame(dt){
 pjInit();if(!PJ.ok)return;PJ.shN=0;for(const m of PJ.sh)m.visible=false;
 // shells
 for(let i=0;i<PJ.shell.length;i++){const g=PJ.shell[i],s=SHV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1];g.position.set(x,gfxGround(x,y)+.75,y);g.rotation.y=-Math.atan2(s[3],s[2]);g.scale.setScalar(1.7);pjShadow(x,y,.75,2);
  if(QL.fx>.3&&!FF){FX.push({x:x-s[2]*.012,y:y-s[3]*.012,h:.75,vh:.2,vx:-s[2]*.02,vy:-s[3]*.02,l:.34,l0:.34,c:'#ff8a20',k:1,s:.8,r:0,vr:0});
   if(Math.random()<.6)FX.push({x,y,h:.7,vh:.6,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,l:.8,l0:.8,c:'#ffffff',k:2,s:.34,r:Math.random()*6,vr:1})}}
 // blades
 for(let i=0;i<PJ.blade.length;i++){const g=PJ.blade[i],s=BLV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1],c=ownerC(s[4]);g.position.set(x,gfxGround(x,y)+.7,y);g.rotation.y=clk*26+i;g.scale.setScalar(1.5);pjShadow(x,y,.7,1.4);
  g.userData.m2.material.color.setRGB(c[0]*1.1+.05,c[1]*1.1+.05,c[2]*1.1+.05);g.userData.m1.material.color.setRGB(1.6,1.6,1.6);
  if(QL.fx>.3&&!FF)FX.push({x:x-s[2]*.01,y:y-s[3]*.01,h:.7,vh:0,vx:0,vy:0,l:.34,l0:.34,c:COLS[s[4]]||'#ff4d5e',k:1,s:.8,r:0,vr:0})}
 // drones
 for(let i=0;i<PJ.miss.length;i++){const g=PJ.miss[i],s=MSV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1],c=ownerC(s[3]);g.position.set(x,gfxGround(x,y)+.8,y);g.rotation.y=-s[2];g.scale.setScalar(1.4);pjShadow(x,y,.8,1.4);
  g.userData.col.color.setRGB(c[0],c[1],c[2]);const f=g.userData.fl;f.scale.set(.8+.5*Math.sin(clk*70+i),1,1);
  if(QL.fx>.3&&!FF){FX.push({x:x-Math.cos(s[2])*.8,y:y-Math.sin(s[2])*.8,h:.7,vh:.4,vx:0,vy:0,l:1,l0:1,c:'#ffffff',k:2,s:.4,r:Math.random()*6,vr:1});FX.push({x:x-Math.cos(s[2])*.7,y:y-Math.sin(s[2])*.7,h:.7,vh:0,vx:0,vy:0,l:.2,l0:.2,c:'#ff9a3a',k:1,s:.5,r:0,vr:0})}}
 // mines
 for(let i=0;i<PJ.mine.length;i++){const g=PJ.mine[i],s=MNV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1],c=ownerC(s[2]),k=(s[4]?.8:1)*1.5;g.position.set(x,gfxGround(x,y)+.02,y);g.scale.setScalar(k);
  g.userData.ring.material.color.setRGB(c[0]*1.3+.05,c[1]*1.3+.05,c[2]*1.3+.05);
  const on=s[3]?(Math.sin(clk*14+i)>0):(Math.sin(clk*3)>.6);g.userData.led.material.color.setRGB(on?(s[3]?4:1.6):.12,on?(s[3]?.2:1.1):.05,on?.2:.05)}
 // strikes
 for(let i=0;i<PJ.strike.length;i++){const g=PJ.strike[i],s=STV[i];if(!s){g.visible=false;continue}g.visible=true;const x=s[0],y=s[1],r=s[4]||2.6,p=Math.max(0,Math.min(1,1-Math.max(0,s[2])/1.45));
  g.position.set(x,gfxGround(x,y)+.09,y);const R=r*2.3;g.userData.m.scale.set(R,R,1);const u=g.userData.m.material.uniforms;u.uC.value.set(.95,.06+.16*p,.1);u.uP.value=p;u.uA.value=1;
  const bu=g.userData.beam.material.uniforms;bu.uC.value.set(1,.22+.3*p,.2);bu.uP.value=p;g.userData.beam.scale.set(r*.45,1,r*.45)}
 // your own car's ring
 const pg=PJ.pilot,mp=me;if(pg){const show=mp&&mp.alive&&(state==='play'||state==='replay')&&VS>=1&&MARKSEL<2;pg.visible=!!show;
  if(show){pg.position.set(mp.rx,gfxGround(mp.rx,mp.ry)+.07,mp.ry);pg.rotation.y=-mp.ra;const R=10,m=pg.userData.m;m.scale.set(R,R,1);const u=m.material.uniforms,c=COLLIN[VS]||[1,1,1];u.uC.value.set(Math.min(1,c[0]*1.1+.12),Math.min(1,c[1]*1.1+.12),Math.min(1,c[2]*1.1+.12));u.uS.value=(boost&&en>0)?1:0;u.uA.value=.9;u.uM.value=MARKSEL===1?1:0}}}
// the burst when a car is lost: flames, smoke and a scorch mark; the car itself tumbles and shrinks (see carsFrame)
function wreckFx(p){const w=p.wreck;if(!w||w.fx)return;w.fx=1;if(FF)return;const c=COLS[p.id];
 for(let i=0;i<12*QL.fx;i++){const a=Math.random()*6.28,v=2+Math.random()*7;FX.push({x:w.x,y:w.y,h:.5,vh:2+Math.random()*5,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:.7+Math.random()*.8,l0:1.4,c:Math.random()<.5?'#ff9a3a':'#ffd070',k:4,s:.2,r:0,vr:0})}
 for(let i=0;i<7*QL.fx;i++){const a=Math.random()*6.28,v=Math.random()*2.4;FX.push({x:w.x,y:w.y,h:.5,vh:1.4+Math.random()*1.6,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1.2+Math.random()*.9,l0:2,c:'#3a4050',k:2,s:.6+Math.random()*.6,r:Math.random()*6,vr:1})}
 FX.push({x:w.x,y:w.y,h:.8,vh:0,vx:0,vy:0,l:.28,l0:.28,c:'#fff0cc',k:0,s:4.6,r:0,vr:0});
 SCORCH.push({x:w.x,y:w.y,r:1.5,t0:clk});if(SCORCH.length>22)SCORCH.shift();RINGS.push({x:w.x,y:w.y,t0:clk,c,r:4.2,dur:.6})}
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
  const la=state==='menu'?0:3.4+(boost&&en>0?1.4:0),ax=(t.ra!==undefined?Math.cos(t.ra):0)*la,ay=(t.ra!==undefined?Math.sin(t.ra):0)*la;
  CAM.lx=(CAM.lx||0)+(ax-(CAM.lx||0))*(1-Math.exp(-dt*2.2));CAM.ly=(CAM.ly||0)+(ay-(CAM.ly||0))*(1-Math.exp(-dt*2.2));
  const hh0=(CAM.d||50)*tv/Math.sin(CP.pitch);
  CAM.x+=(t.rx+CAM.lx-CAM.x)*k;CAM.y+=(t.ry+CAM.ly+(.5-fy)*2*hh0-CAM.y)*k}
 const area=(CN[VS]||0)/(MC*MC),V=(state==='menu'?42:Math.min(45,29+Math.sqrt(area)*.3+(boost&&en>0?2.6:0)))/CAMK;CAM.vz+=(V-CAM.vz)*(1-Math.exp(-dt*2));
 const d=asp<1?CAM.vz/(2*thh):CAM.vz*Math.sin(CP.pitch)/(2*tv);CAM.d=d;CAM.z=Math.min(vw,vh)/CAM.vz;
 const hw=thh*d,hh=tv*d/Math.sin(CP.pitch);
 CAM.x=hw*2>WW+6?WW/2:Math.min(WW+3-hw,Math.max(hw-3,CAM.x));CAM.y=hh*2>WH+6?WH/2:Math.min(WH+3-hh,Math.max(hh-3,CAM.y))}
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
function rebuildLand(){if(IS_SRV)return;
 if(PREV&&me&&state==='play'){let n=0;for(let i=0;i<own.length;i++)if(own[i]===VS&&PREV[i]!==VS)n++;
  if(n>20&&me.alive)capFlash(me.rx,me.ry,VS,n)}
 if(GFX.ok){if(GW.texOwn)GW.texOwn.needsUpdate=true;GW.maskDirty=1}else fbPaint();
 PREV=own.slice();ZMY=ZN.map(z=>{let n=0;for(let k=0;k<z.c.length;k++)if(own[z.c[k]]===VS)n++;return z.c.length?n/z.c.length:0});
 if(!MINI){MINI=mkc(WW*2,WH*2);MINI.g=MINI.getContext('2d');MINI.img=MINI.g.createImageData(WW*2,WH*2);MINI.cl=COLS.map(c=>c?rgbOf(c):[200,214,232])}
 MINI.land=(GFX.theme&&GFX.theme.mini)||[218,229,243];MINI.out=[38,44,56];
 {const d=MINI.img.data,cl=MINI.cl,W2=WW*2;for(let y=0;y<WH*2;y++){const r=((y*1.5+.75)|0)*MW;for(let x=0;x<W2;x++){const i=r+((x*1.5+.75)|0),c=own[i]?cl[own[i]]:(ISL[i]?MINI.land:MINI.out),k=(y*W2+x)*4;d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=255}}
  MINI.g.putImageData(MINI.img,0,0)}}
function buildIsland(){if(IS_SRV||!LANDI)return;
 LASTRB=-9;PREV=null;FLASH=null;CAPW.length=0;SCORCH.length=0;RINGS.length=0;
 for(let i=1;i<=5;i++){const p=P[i];if(p){p.hist=[];p.ghost=null;p.wreck=null}}
 if(GFX.ok){tierApply();gwBuild();try{GFX.R.compile(GFX.S,GFX.cam)}catch(e){}}else fbMap();
 MDIRTY=true}

// ---------- loading steps for the start screen ----------
function buildTexSteps(){return[
 ['Starting the 3D engine...',()=>{const ok=gfxInit($('gl'));if(ok){gfxSetTheme(gfxThemeFor(1));fit()}else{$('gl').style.display='none';TEXOK=1}}],
 ['Unpacking the ground...',async()=>{if(!GFX.ok)return;await layLoad(async(k,n)=>{if(typeof BSTEP==='function')BSTEP(20+Math.round(k/n*26),'Unpacking the ground... '+k+'/'+n);await tick()});if(LAY.miss)setTimeout(()=>{try{toast(LAY.miss+' ground pictures did not load: the ground will look plain',6000)}catch(e){}},1500)}],
 ['Raising the plateau...',()=>{if(!GFX.ok)return;genMap(20241008);gwBuild();gfxSetTheme(gfxThemeFor(SEED))}],
 ['Tuning the engines...',()=>{if(!GFX.ok)return;trInit();ptInit();ringsInit();pjInit();for(let c=0;c<4;c++){const C=carBuild(c,CLS[c].col,'sport',0);C.root.position.set(WW/2+c*3,0,WH/2);GFX.S.add(C.root);CARI[0]=CARI[0]||[];CARI[0].push(C)}
   // every shader the game uses is built now, behind the loading screen: the scene, the shadow pass, the glow and finishing passes (one real frame does the last ones)
   camSet(WW/2+4,WH/2);camApply(0);try{GFX.R.compile(GFX.S,GFX.cam);gfxRender(GFX.S,GFX.cam)}catch(e){}
   for(const C of CARI[0]){GFX.S.remove(C.root);carFree(C)}CARI[0]=null;gwDispose();TEXOK=1}]]}
function buildTexAll(){for(const s of buildTexSteps())s[1]()}
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
   // a little history of where the car has been, for the tyre tracks
   {const h=p.hist||(p.hist=[]),n=h.length;if(!n||Math.hypot(p.rx-h[n-2],p.ry-h[n-1])>.4){if(n&&Math.hypot(p.rx-h[n-2],p.ry-h[n-1])>3)h.length=0;h.push(p.rx,p.ry);if(h.length>360)h.splice(0,2)}}
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
 const id=b.getImageData(0,0,MW*3,MH*3),q=id.data;for(let i=0;i<q.length;i+=4){const l=q[i]/255;q[i]=30+(236-30)*l;q[i+1]=96+(242-96)*l;q[i+2]=140+(250-140)*l;q[i+3]=255}b.putImageData(id,0,0);
 fbPaint()}
function fbPaint(){if(!FBC)return;const g=FBC.getContext('2d'),img=g.createImageData(MW,MH),d=img.data,cl=COLS.map(c=>c?rgbOf(c):[0,0,0]);
 for(let i=0;i<own.length;i++){const o=own[i],k=i*4;if(o){const c=cl[o];d[k]=c[0]*.85+30;d[k+1]=c[1]*.85+30;d[k+2]=c[2]*.85+30;d[k+3]=255}}
 g.putImageData(img,0,0)}
function frame2d(dt){
 const asp=vw/vh;CAM.vz=44;CAM.z=Math.min(vw,vh)/CAM.vz;camStep2d(dt);const z=CAM.z,ox=vw/2-CAM.x*z,oy=vh/2-CAM.y*z;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#1e6088';ctx.fillRect(0,0,cv.width,cv.height);
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
function camStep2d(dt){const t=camTarget();if(t){const k=1-Math.exp(-dt*8);CAM.x+=(t.rx-CAM.x)*k;CAM.y+=(t.ry-CAM.y)*k}const hw=vw/2/CAM.z,hh=vh/2/CAM.z;CAM.x=hw*2>WW+6?WW/2:Math.min(WW+3-hw,Math.max(hw-3,CAM.x));CAM.y=hh*2>WH+6?WH/2:Math.min(WH+3-hh,Math.max(hh-3,CAM.y))}

function draw(){
 if(!TEXOK&&!GFX.ok)buildTexAll();
 const dt=Math.max(0,Math.min(.1,clk-(draw.lt===undefined?clk:draw.lt)));draw.lt=clk;
 if(MDIRTY&&(clk-LASTRB>=.05||LASTRB<0)){rebuildLand();MDIRTY=false;LASTRB=clk}
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
function ggFloorTex(){const N=512,c=mkc(N,N),g=c.getContext('2d');g.fillStyle=rg(g,N/2,N/2,0,N/2,N/2,N/2,[[0,'#27508f'],[.3,'#18386f'],[.62,'#0c1f46'],[1,'#040a1a']]);g.fillRect(0,0,N,N);
 g.translate(N/2,N/2);g.strokeStyle='rgba(120,180,255,.10)';g.lineWidth=1.2;for(let r=40;r<N/2;r+=34){g.beginPath();g.arc(0,0,r,0,6.2832);g.stroke()}
 for(let k=0;k<32;k++){const a=k/32*6.2832;g.beginPath();g.moveTo(Math.cos(a)*40,Math.sin(a)*40);g.lineTo(Math.cos(a)*N/2,Math.sin(a)*N/2);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function ggTickTex(){const N=512,c=mkc(N,N),g=c.getContext('2d');g.translate(N/2,N/2);g.strokeStyle='#fff';g.lineCap='round';
 for(let k=0;k<96;k++){const a=k/96*6.2832,big=k%8===0,r1=N/2-6,r0=r1-(big?20:9);g.lineWidth=big?4:2.2;g.globalAlpha=big?1:.55;g.beginPath();g.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);g.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);g.stroke()}
 g.globalAlpha=.8;g.lineWidth=3;for(let k=0;k<4;k++){const a=k*1.5708+.4;g.beginPath();g.arc(0,0,N/2-46,a,a+.7);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function ggInit(){
 if(GG.S||!GFX.ok)return;
 const S=GG.S=new THREE.Scene(),R0=2.75;
 S.background=cLin('#071022');S.fog=new THREE.Fog(cLin('#071022'),16,46);
 GG.cam=new THREE.PerspectiveCamera(30,1,.5,90);
 S.environment=gfxEnv(GTH[2]);S.environmentIntensity=.95;
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