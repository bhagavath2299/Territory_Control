// ---------- on-screen display: markers over the cars, edge pointers, minimap, timer, standings, feed ----------
// Look: graphite glass panels with a fine grain (the same grain the menus use), colour only where it means a player.
let GRAIN=null,GRAINP=null;
function grainTile(){if(GRAIN)return GRAIN;const N=128,c=mkc(N,N),g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data,cl=new Float32Array(N*N/4);
 for(let i=0;i<cl.length;i++)cl[i]=Math.random();
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=(y*N+x)*4,v=Math.random()*.6+cl[(y>>1)*(N>>1)+(x>>1)]*.4,a=Math.abs(v-.5)*2;d[i]=d[i+1]=d[i+2]=v>.5?255:0;d[i+3]=Math.round(a*a*58)}
 g.putImageData(im,0,0);return GRAIN=c}
// the same grain, handed to the page styles: --grain for panels, --grain2 (half as strong) for coloured buttons
function grainCss(){try{const t=grainTile(),c=mkc(96,96),g=c.getContext('2d');g.drawImage(t,0,0,96,96,0,0,96,96);
 const root=document.documentElement.style;root.setProperty('--grain','url('+c.toDataURL('image/png')+')');
 const c2=mkc(96,96),g2=c2.getContext('2d');g2.globalAlpha=.5;g2.drawImage(c,0,0);root.setProperty('--grain2','url('+c2.toDataURL('image/png')+')')}catch(e){}}
const nmClean=n=>(n||'').replace(/^\u{1F916}\s*/u,''),nmBot=n=>!!n&&n.codePointAt(0)===0x1F916;
const HF=(wt,px)=>wt+' '+px+'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
// a dark glass panel with grain, a bright top edge and a soft contact shadow so it reads on white snow as well as on water
function hpanel(x,y,w,h,r,a,acc){const g=ctx;if(!GRAINP)GRAINP=g.createPattern(grainTile(),'repeat');
 g.fillStyle='rgba(24,38,70,.10)';g.beginPath();g.roundRect(x-1,y+3,w+2,h+2,r+1);g.fill();g.fillStyle='rgba(24,38,70,.07)';g.beginPath();g.roundRect(x-3,y+5,w+6,h+4,r+3);g.fill();
 g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=lg(g,0,y,0,y+h,[[0,'rgba(38,46,62,'+a+')'],[1,'rgba(14,18,28,'+a+')']]);g.fill();
 g.save();g.clip();g.fillStyle=GRAINP;g.fillRect(x,y,w,h);g.fillStyle=lg(g,0,y,0,y+h*.55,[[0,'rgba(255,255,255,.16)'],[1,'rgba(255,255,255,0)']]);g.fillRect(x,y,w,h*.55);
 if(acc){g.fillStyle=acc;g.fillRect(x,y,w,Math.max(2,h*.07))}g.restore();
 g.lineWidth=1;g.strokeStyle='rgba(255,255,255,.20)';g.beginPath();g.roundRect(x+.5,y+.5,w-1,h-1,r);g.stroke()}
function crownIcon(x,y,s){ctx.fillStyle='#ffd54a';ctx.beginPath();ctx.moveTo(x-s,y+s*.6);ctx.lineTo(x-s,y-s*.5);ctx.lineTo(x-s*.5,y);ctx.lineTo(x,y-s*.7);ctx.lineTo(x+s*.5,y);ctx.lineTo(x+s,y-s*.5);ctx.lineTo(x+s,y+s*.6);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(x-s,y+s*.3,s*2,s*.14)}
// a small car seen from above, nose to the right
function carChip(x,y,s,col,a,gg){const g=gg||ctx;g.save();g.translate(x,y);if(a)g.rotate(a);
 g.fillStyle='rgba(0,0,0,.30)';g.beginPath();g.roundRect(-s*1.08,-s*.5,s*2.2,s*1.14,s*.42);g.fill();
 g.fillStyle=col;g.beginPath();g.roundRect(-s*1.1,-s*.58,s*2.2,s*1.16,s*.42);g.fill();
 g.fillStyle='rgba(255,255,255,.30)';g.beginPath();g.roundRect(-s*.98,-s*.5,s*1.96,s*.36,s*.3);g.fill();
 g.fillStyle='rgba(8,12,22,.84)';g.beginPath();g.roundRect(-s*.28,-s*.38,s*.72,s*.76,s*.18);g.fill();
 g.fillStyle='rgba(255,255,255,.9)';g.fillRect(s*.66,-s*.44,s*.2,s*.2);g.fillRect(s*.66,s*.24,s*.2,s*.2);g.restore()}
function botGlyph(x,y,s,col){const g=ctx;g.fillStyle=col;g.beginPath();g.roundRect(x-s,y-s*.8,s*2,s*1.6,s*.45);g.fill();g.fillStyle='rgba(8,12,22,.85)';g.beginPath();g.arc(x-s*.4,y-s*.1,s*.26,0,7);g.arc(x+s*.4,y-s*.1,s*.26,0,7);g.fill();g.fillRect(x-s*.5,y+s*.32,s,s*.14);g.fillRect(x-s*.06,y-s*1.25,s*.12,s*.5)}
function homeGlyph(x,y,s,col){const g=ctx;g.fillStyle=col;g.beginPath();g.moveTo(x-s,y);g.lineTo(x,y-s*.95);g.lineTo(x+s,y);g.lineTo(x+s*.7,y);g.lineTo(x+s*.7,y+s*.85);g.lineTo(x-s*.7,y+s*.85);g.lineTo(x-s*.7,y);g.closePath();g.fill()}
function stext(t,x,y,fill,line,lw){ctx.lineJoin='round';ctx.lineWidth=lw;ctx.strokeStyle=line;ctx.strokeText(t,x,y);ctx.fillStyle=fill;ctx.fillText(t,x,y)}

// ---------- markers in the world ----------
// the car you drive: a turning ring around it and chevrons that run ahead of it
function drawPilot(p,sx,sy,z,q){const g=ctx,col=COLS[q],R=2.5*z,boosting=q===VS&&boost&&en>0,ph=clk*(boosting?2.4:1.3);
 g.save();g.translate(sx,sy);
 g.lineCap='round';
 for(let k=0;k<3;k++){const a0=clk*.55+k*2.094+.28,a1=a0+1.28;g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=4.2;g.beginPath();g.arc(0,0,R,a0,a1);g.stroke();g.strokeStyle=col;g.lineWidth=2.4;g.beginPath();g.arc(0,0,R,a0,a1);g.stroke()}
 g.rotate(p.ra||0);
 const n=boosting?3:2;
 for(let k=0;k<n;k++){const u=((ph*.8+k/n)%1),d=R+z*(.55+u*1.7),a=Math.sin(u*3.1416)*(.95-k*.05),s=z*(.62+.1*(1-u));
  g.globalAlpha=a;g.lineWidth=z*.5;g.strokeStyle='rgba(255,255,255,.95)';g.beginPath();g.moveTo(d-s,-s*1.05);g.lineTo(d,0);g.lineTo(d-s,s*1.05);g.stroke();
  g.lineWidth=z*.3;g.strokeStyle=col;g.beginPath();g.moveTo(d-s,-s*1.05);g.lineTo(d,0);g.lineTo(d-s,s*1.05);g.stroke()}
 g.restore();g.globalAlpha=1}
// a name plate over a rival: colour edge, bot or crown mark, name and share of the land. A thin bar beneath it shows how long their trail is.
function drawPlate(sx,sy,q,fs,lead,w,h){const p=P[q],nm=nmClean(NM[q]),bot=nmBot(NM[q]),pc=(CN[q]*100/LANDN).toFixed(0)+'%',g=ctx;
 g.font=HF(800,fs);const nw=g.measureText(nm).width;g.font=HF(700,fs*.92);const pw=g.measureText(pc).width;
 const ph=fs*1.62,gl=bot?fs*1.0:0,cw=lead?fs*1.15:0,pwid=fs*.9+gl+cw+nw+fs*.7+pw+fs*.8;
 let x=sx-pwid/2,y=sy-ph/2;x=Math.max(4,Math.min(w-pwid-4,x));y=Math.max(4,Math.min(h-ph-4,y));
 hpanel(x,y,pwid,ph,ph/2,.78);
 g.save();g.beginPath();g.roundRect(x,y,pwid,ph,ph/2);g.clip();g.fillStyle=COLS[q];g.fillRect(x,y,fs*.5,ph);g.restore();
 let cx=x+fs*.9;
 if(lead){crownIcon(cx+fs*.45,y+ph/2,fs*.4);cx+=cw}
 if(bot){botGlyph(cx+fs*.3,y+ph/2,fs*.34,'rgba(190,205,230,.9)');cx+=gl}
 g.textAlign='left';g.textBaseline='middle';g.font=HF(800,fs);g.fillStyle='#ffffff';g.fillText(nm,cx,y+ph/2+.5);cx+=nw+fs*.7;
 g.font=HF(700,fs*.92);g.fillStyle=tint(COLS[q],.5);g.fillText(pc,cx,y+ph/2+.5);
 if(p&&p.out&&p.tr.length>8){const L=Math.min(1,p.tr.length/160),bw=pwid*.82;g.fillStyle='rgba(14,18,28,.55)';g.beginPath();g.roundRect(sx-bw/2,y+ph+3,bw,4,2);g.fill();
  g.fillStyle=L>.6?'#ff5a4a':L>.3?'#ffb020':COLS[q];g.beginPath();g.roundRect(sx-bw/2,y+ph+3,bw*Math.max(.08,L),4,2);g.fill()}}
// a badge on the screen edge for a rival (or your land) that is off screen, turned toward it
function drawEdge(x,y,ang,q,al,near,home){const g=ctx,R=cs*1.3,col=home?COLS[VS]:COLS[q];g.save();g.translate(x,y);g.globalAlpha=al;
 if(near){const k=.5+.5*Math.sin(clk*9);g.strokeStyle='rgba(255,70,80,'+(.25+.45*k)+')';g.lineWidth=3;g.beginPath();g.arc(0,0,R+cs*.55+k*cs*.4,0,7);g.stroke()}
 g.save();g.rotate(ang);g.lineJoin='round';g.fillStyle=col;g.strokeStyle='rgba(255,255,255,.96)';g.lineWidth=1.8;g.beginPath();g.moveTo(R+cs*.95,0);g.lineTo(R*.62,-R*.62);g.lineTo(R*.62,R*.62);g.closePath();g.fill();g.stroke();g.restore();
 g.fillStyle='rgba(16,22,34,.92)';g.beginPath();g.arc(0,0,R,0,7);g.fill();g.lineWidth=2.6;g.strokeStyle=col;g.stroke();
 if(home)homeGlyph(0,-cs*.1,cs*.62,'#fff');else{g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.font=HF(900,cs*1.25);g.fillText(nmClean(NM[q]).charAt(0).toUpperCase(),0,cs*.05)}
 g.restore()}
let HOMEP=null,HOMET=-9;
function nearestOwn(px,py){let best=1e9,bx=0,by=0;const st=6;for(let cy=3;cy<MH;cy+=st){const row=cy*MW;for(let cx=3;cx<MW;cx+=st)if(own[row+cx]===VS){const dx=cx/MC-px,dy=cy/MC-py,d=dx*dx+dy*dy;if(d<best){best=d;bx=cx/MC;by=cy/MC}}}return best<1e9?[bx,by,Math.sqrt(best)]:null}

function drawHUD(w,h,z,labels,zl,S){
 const vg=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.5,w/2,h/2,Math.max(w,h)*.82);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(30,48,90,'+(MOOD.vig*.55).toFixed(3)+')');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);
 const fs=Math.max(10,cs*1.1);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=HF(700,fs);
 const rkAll=[1,2,3,4,5].filter(q=>NM[q]);
 let mxn=0;for(const q of rkAll)mxn=Math.max(mxn,ctx.measureText(nmClean(NM[q])).width+(nmBot(NM[q])?fs*1.0:0));const LBW=Math.min(w*.58,Math.max(fs*9.2,fs*1.9+mxn+fs*4.0+16)),RH=fs*1.62;
 const HUDON=state==='play'||state==='over'||state==='replay';
 // screen rectangles the panels cover, so that labels and pointers fade out under them instead of overlapping
 const mw0=Math.min(84,w*.21),mh0=mw0*WH/WW,KO=[];
 if(HUDON){if(MINI)KO.push([2,2,mw0+18,mh0+18]);KO.push([w-LBW-12,4,LBW+14,RH*rkAll.length+18]);
  if(FD.length){let fw=0;for(const d of FD)fw=Math.max(fw,ctx.measureText(d.t).width);const fy0=MINI?mh0+28:14;KO.push([4,fy0-fs,fw+fs*2.4,FD.length*fs*1.75+fs*.5])}
  if(state==='play'){KO.push([w/2-cs*8.6,4,cs*17.2,cs*3.4+16+(MP?cs*2.4:0)]);KO.push([w-200,h-210,200,210]);KO.push([0,h-84,128,84])}}
 const fade=(bx,by,bw2,bh2,m)=>{let fa=1;for(const r of KO){const dx=Math.max(r[0]-(bx+bw2),bx-(r[0]+r[2]),0),dy=Math.max(r[1]-(by+bh2),by-(r[1]+r[3]),0);fa=Math.min(fa,Math.hypot(dx,dy)/m)}return fa};
 // power-pad labels
 ctx.font=HF(800,Math.max(9,cs*.9));
 for(const [lx,ly,t,o] of zl){const u=t.toUpperCase(),tw=ctx.measureText(u).width+cs*1.5,fa=fade(lx-tw/2,ly-cs*.65,tw,cs*1.3,cs*1.4);
  if(fa<=.02)continue;ctx.globalAlpha=.94*Math.min(1,fa);hpanel(lx-tw/2,ly-cs*.65,tw,cs*1.3,cs*.65,.8,o?COLS[o]:null);ctx.globalAlpha=Math.min(1,fa);ctx.fillStyle='#ffffff';ctx.fillText(u,lx,ly+.5)}
 ctx.globalAlpha=1;
 // markers: your own car, plates over the rivals, pointers to the ones that are off screen
 if(state==='play'||state==='replay'){
  const lead=rkAll.slice().sort((a,b)=>CN[b]-CN[a])[0];
  for(const q of rkAll){const p=P[q];if(!p||!p.alive)continue;const [sx,sy]=S(p.rx,p.ry);
   if(q===VS){drawPilot(p,sx,sy,z,q);continue}
   const inside=sx>-8&&sx<w+8&&sy>-8&&sy<h+8;
   if(inside){const dd=Math.hypot(sx-w/2,sy-h/2);drawPlate(sx,sy-2.0*z-fs*1.0,q,fs,q===lead&&CN[q]>0,w,h)}
   else{const dx=sx-w/2,dy=sy-h/2,pad=cs*2.3,padT=cs*5.4,t=Math.min((w/2-pad)/Math.abs(dx||1e-3),(h/2-Math.max(pad,padT*.5))/Math.abs(dy||1e-3)),ex=w/2+dx*t,ey=h/2+dy*t,ey2=Math.max(padT,Math.min(h-pad-cs*3,ey));
    const dist=me?Math.hypot(p.rx-me.rx,p.ry-me.ry):99,near=dist<24&&p.out,al=Math.max(.5,Math.min(1,1.25-dist/90))*Math.min(1,fade(ex-cs*1.4,ey2-cs*1.4,cs*2.8,cs*2.8,cs*1.6));
    if(al>.03)drawEdge(Math.max(pad,Math.min(w-pad,ex)),ey2,Math.atan2(dy,dx),q,al,near,0)}}
  // a way back to your land when you are out in the open and none of it is on screen
  if(me&&me.alive&&me.out&&state==='play'){if(clk-HOMET>.2){HOMET=clk;HOMEP=nearestOwn(me.rx,me.ry)}
   if(HOMEP){const hp=HOMEP,[sx,sy]=S(hp[0],hp[1]);if(!(sx>-8&&sx<w+8&&sy>-8&&sy<h+8)){const dx=sx-w/2,dy=sy-h/2,pad=cs*2.3,padT=cs*5.4,t=Math.min((w/2-pad)/Math.abs(dx||1e-3),(h/2-Math.max(pad,padT*.5))/Math.abs(dy||1e-3)),ex=Math.max(pad,Math.min(w-pad,w/2+dx*t)),ey=Math.max(padT,Math.min(h-pad-cs*3,h/2+dy*t));
     const al=Math.min(1,fade(ex-cs*1.4,ey-cs*1.4,cs*2.8,cs*2.8,cs*1.6));if(al>.03)drawEdge(ex,ey,Math.atan2(dy,dx),VS,al,0,1)}}}}
 // floating messages
 ctx.textAlign='center';
 for(const q of PO){const [px,py]=S(q.x,q.y),k=Math.min(1,(q.l0-q.l)*7),sc=.7+.3*Math.min(1,k*1.4);ctx.globalAlpha=Math.min(1,q.l*1.6);ctx.font=HF('900 italic',Math.round(cs*2*sc));const hw2=ctx.measureText(q.t).width/2+8,tx=Math.min(w-hw2,Math.max(hw2,px)),ty=Math.max(cs*3,py);stext(q.t,tx,ty,q.c,'rgba(12,22,48,.9)',cs*.5)}
 ctx.globalAlpha=1;
 // minimap
 if(MINI&&HUDON){const mw=mw0,mh=mh0,mx=10,my=10;hpanel(mx-5,my-5,mw+10,mh+10,13,.82);
  ctx.save();ctx.beginPath();ctx.roundRect(mx,my,mw,mh,8);ctx.clip();ctx.drawImage(MINI,mx,my,mw,mh);
  ctx.fillStyle=GRAINP;ctx.globalAlpha=.7;ctx.fillRect(mx,my,mw,mh);ctx.globalAlpha=1;
  for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.tr||p.tr.length<4)continue;ctx.strokeStyle=COLS[q];ctx.lineWidth=q===VS?1.8:1.3;ctx.lineJoin='round';ctx.beginPath();const t=p.tr;for(let i=0;i<t.length;i+=4)i?ctx.lineTo(mx+t[i]/WW*mw,my+t[i+1]/WH*mh):ctx.moveTo(mx+t[i]/WW*mw,my+t[i+1]/WH*mh);if(p.alive)ctx.lineTo(mx+p.rx/WW*mw,my+p.ry/WH*mh);ctx.stroke()}
  for(let zi=0;zi<ZN.length;zi++){const zz=ZN[zi],o=ZOWN[zi]||0,zx=mx+zz.x/WW*mw,zy=my+zz.y/WH*mh;ctx.fillStyle=o?COLS[o]:'#ffffff';ctx.strokeStyle='#10162a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(zx,zy-3.8);ctx.lineTo(zx+3.8,zy);ctx.lineTo(zx,zy+3.8);ctx.lineTo(zx-3.8,zy);ctx.closePath();ctx.fill();ctx.stroke()}
  const vx=(CAM.x-w/2/z)/WW*mw,vy=(CAM.y-h/2/z)/WH*mh;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=1.2;ctx.strokeRect(mx+vx,my+vy,w/z/WW*mw,h/z/WH*mh);
  for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.alive)continue;const px=mx+p.rx/WW*mw,py=my+p.ry/WH*mh,me2=q===VS,s=me2?4.6:3.4;
   if(me2){const k=.5+.5*Math.sin(clk*5);ctx.fillStyle='rgba(255,255,255,'+(.25+.25*k)+')';ctx.beginPath();ctx.arc(px,py,s+2.4+k*2,0,7);ctx.fill()}
   ctx.save();ctx.translate(px,py);ctx.rotate(p.ra||0);ctx.fillStyle=COLS[q];ctx.strokeStyle=me2?'#ffffff':'rgba(10,14,26,.9)';ctx.lineWidth=me2?1.6:1.1;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(s*1.25,0);ctx.lineTo(-s*.85,-s*.85);ctx.lineTo(-s*.4,0);ctx.lineTo(-s*.85,s*.85);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
  ctx.restore()}
 // clock and your land
 if(state==='play'){const t=Math.max(0,Math.ceil(tl)),ts=(t/60|0)+':'+String(t%60).padStart(2,'0'),pc=(CN[VS]*100/LANDN),pcs=pc.toFixed(1)+'%',low=t<=10;
  ctx.font=HF(900,Math.round(cs*1.9));const tw1=ctx.measureText(ts).width;ctx.font=HF(800,Math.round(cs*1.45));const tw2=ctx.measureText(pcs).width;
  const ph=cs*3.4,pwid=tw1+tw2+cs*6.4,px0=w/2-pwid/2,py0=10;hpanel(px0,py0,pwid,ph,ph/2,.82);
  // the sweep of the minute around the clock
  const ccx=px0+cs*1.9,ccy=py0+ph/2,cr=cs*.95;ctx.lineWidth=cs*.3;ctx.lineCap='round';ctx.strokeStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.arc(ccx,ccy,cr,0,7);ctx.stroke();
  ctx.strokeStyle=low?'#ff5a6e':'#ffffff';ctx.beginPath();ctx.arc(ccx,ccy,cr,-1.5708,-1.5708+6.2832*Math.max(0,Math.min(1,tl/TL)));ctx.stroke();
  ctx.textAlign='left';const pulse=low?.65+.35*Math.sin(fr/3):1;ctx.fillStyle=low?'rgba(255,90,110,'+pulse+')':'#ffffff';ctx.font=HF(900,Math.round(cs*1.9));ctx.fillText(ts,px0+cs*3.4,ccy+.5);
  const lx=px0+cs*4.3+tw1;ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(lx-cs*.45,py0+ph*.24,1,ph*.52);
  ctx.fillStyle=tint(COLS[VS],.4);ctx.font=HF(800,Math.round(cs*1.45));ctx.fillText(pcs,lx+cs*.3,ccy+.5);
  const bw=w*Math.max(0,tl)/TL;ctx.fillStyle=lg(ctx,0,0,w,0,[[0,'#7fb0ff'],[.6,'#b99bff'],[1,'#ff8aa6']]);ctx.fillRect(0,0,bw,3);ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(Math.max(0,bw-2),0,2,3);
  // connection: how long a round trip to the server takes, so a slow link is easy to tell from a slow phone
  let pingOn=0;if(MP&&NC.hasSnap&&(NC.ping>0||NC.rtt>0)){const pg=Math.round(NC.ping>0?NC.ping:NC.rtt),pc2=pg<90?'#46d37a':pg<160?'#ffd24a':pg<260?'#ff9a3d':'#ff5a6e';pingOn=1;
   ctx.font=HF(800,Math.round(cs*1.0));const ptx=pg+' ms',pw=ctx.measureText(ptx).width+cs*2.5,ph2=cs*1.9,pxx=w/2-pw/2,pyy=py0+ph+6;hpanel(pxx,pyy,pw,ph2,ph2/2,.72);
   ctx.fillStyle=pc2;ctx.beginPath();ctx.arc(pxx+cs*.95,pyy+ph2/2,cs*.34,0,7);ctx.fill();ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.fillText(ptx,pxx+cs*1.65,pyy+ph2/2+.5)}
  if(MYHOLD&8){const names=['Nitro +15%'];ctx.font=HF(800,Math.round(cs*1.05));const ws=names.map(n=>ctx.measureText(n).width+cs*1.6),tw=ws.reduce((a,b)=>a+b,0)+(names.length-1)*cs*.5;let cx0=w/2-tw/2;const cy0=py0+ph+6+(pingOn?cs*2.4:0);
   names.forEach((n,k)=>{ctx.fillStyle='rgba(255,176,32,.96)';ctx.beginPath();ctx.roundRect(cx0,cy0,ws[k],cs*1.9,cs*.95);ctx.fill();ctx.fillStyle='#1b1206';ctx.textAlign='center';ctx.fillText(n,cx0+ws[k]/2,cy0+cs*.98);cx0+=ws[k]+cs*.5})}}
 if(state==='play'&&tl<=30&&tl>0){const a=.07+.05*Math.sin(fr/5)+(tl<=10?.07:0),g2=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.34,w/2,h/2,Math.max(w,h)*.75);g2.addColorStop(0,'rgba(255,40,80,0)');g2.addColorStop(1,'rgba(255,40,80,'+a+')');ctx.fillStyle=g2;ctx.fillRect(0,0,w,h);ctx.textAlign='center';
  if(tl>27){ctx.globalAlpha=Math.min(1,tl-27);ctx.font=HF('900 italic',Math.round(cs*3.2));stext('FINAL RUSH',w/2,h*.3,'#ffffff','rgba(255,36,72,.95)',cs*.7)}
  if(tl<=10){ctx.globalAlpha=.5+.2*Math.sin(fr/3);ctx.font=HF('900 italic',Math.round(cs*10));stext(String(Math.ceil(tl)),w/2,h/2,'#ffffff','rgba(255,36,72,.9)',cs*1.1)}
  ctx.globalAlpha=1}
 // standings
 if(HUDON){const rk=rkAll.slice().sort((a,b)=>CN[b]-CN[a]),pw=LBW,L=LANDN,top=CN[rk[0]]||1,x0=w-pw-8,y0=8;
  hpanel(x0,y0,pw,RH*rk.length+10,12,.80);
  rk.forEach((q,k)=>{const y=y0+5+RH*(k+.5),me2=q===VS;ctx.save();ctx.beginPath();ctx.roundRect(x0+4,y-RH*.46,pw-8,RH*.92,fs*.5);ctx.clip();
   ctx.fillStyle=COLS[q];ctx.globalAlpha=me2?.46:.26;ctx.fillRect(x0+4,y-RH*.46,(pw-8)*Math.max(.05,CN[q]/top),RH*.92);ctx.globalAlpha=1;ctx.restore();
   if(me2){ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1.2;ctx.beginPath();ctx.roundRect(x0+4,y-RH*.46,pw-8,RH*.92,fs*.5);ctx.stroke()}
   if(k===0&&CN[q]>0)crownIcon(x0+fs*.95,y-.5,fs*.4);else{ctx.font=HF(800,fs*.86);ctx.fillStyle='rgba(255,255,255,.55)';ctx.textAlign='center';ctx.fillText(String(k+1),x0+fs*.95,y+.5)}
   carChip(x0+fs*2.35,y,fs*.46,COLS[q]);
   let nx=x0+fs*3.35;if(nmBot(NM[q])){botGlyph(nx+fs*.34,y,fs*.3,'rgba(190,205,230,.85)');nx+=fs*.95}
   ctx.fillStyle='#ffffff';ctx.font=HF(me2?800:600,fs);ctx.textAlign='left';ctx.fillText(nmClean(NM[q]),nx,y+.5);ctx.textAlign='right';ctx.font=HF(800,fs);ctx.fillText((CN[q]*100/L).toFixed(1)+'%',x0+pw-12,y+.5)});
  ctx.textAlign='left';ctx.font=HF(700,fs);const fy=(MINI?mh0+28:14);
  FD.forEach((d,k)=>{ctx.globalAlpha=Math.min(1,d.l);const t=d.t,tw=ctx.measureText(t).width,yy=fy+k*fs*1.75;hpanel(8,yy-fs*.8,tw+fs*1.9,fs*1.6,fs*.8,.78);ctx.fillStyle=d.c||'#fff';ctx.beginPath();ctx.arc(8+fs*.8,yy,fs*.27,0,7);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillText(t,8+fs*1.4,yy+.5)});ctx.globalAlpha=1;
  if(me&&!me.alive&&state==='play'){ctx.font=HF(800,Math.round(cs*1.6));ctx.textAlign='center';const t1=DEATH||'Wiped out',tw=Math.max(ctx.measureText(t1).width,cs*12)+cs*3;hpanel(w/2-tw/2,h/2-cs*2.4,tw,cs*4.8,cs*1.1,.88,COLS[VS]);ctx.fillStyle='#ffffff';ctx.fillText(t1,w/2,h/2-cs*.7);
   ctx.fillStyle='#aab6d3';ctx.font=HF(700,Math.round(cs*1.2));ctx.fillText('Respawning...',w/2,h/2+cs*1.1);
   const bw2=tw-cs*3,k=(clk*.9)%1;ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(w/2-bw2/2,h/2+cs*1.95,bw2,3);ctx.fillStyle=COLS[VS];ctx.fillRect(w/2-bw2/2+bw2*Math.max(0,k-.25),h/2+cs*1.95,bw2*(Math.min(1,k+.001)-Math.max(0,k-.25)),3)}}
 ctx.textBaseline='alphabetic';
 if(me&&me.alive&&state==='play'&&ptr.type==='mouse'&&ptr.sx!==undefined){ctx.strokeStyle='rgba(20,30,55,.8)';ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(ptr.sx,ptr.sy,7,0,7);ctx.moveTo(ptr.sx-11,ptr.sy);ctx.lineTo(ptr.sx+11,ptr.sy);ctx.moveTo(ptr.sx,ptr.sy-11);ctx.lineTo(ptr.sx,ptr.sy+11);ctx.stroke()}}
