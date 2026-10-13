// ---------- on-screen display: name plates, edge pointers, minimap with the clock, the joystick ----------
// Look: dark glass panels with cut corners and a thin bright edge. Colour only where it means a player.
let SAFE={t:0,b:0,l:0,r:0};
function readSafe(){try{const d=document.createElement('div');d.style.cssText='position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';document.body.appendChild(d);const s=getComputedStyle(d);SAFE={t:parseFloat(s.paddingTop)||0,r:parseFloat(s.paddingRight)||0,b:parseFloat(s.paddingBottom)||0,l:parseFloat(s.paddingLeft)||0};d.remove()}catch(e){}}
const HF=(wt,px)=>wt+' '+px+'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
function cutPath(g,x,y,w,h,c){g.beginPath();g.moveTo(x+c,y);g.lineTo(x+w,y);g.lineTo(x+w,y+h-c);g.lineTo(x+w-c,y+h);g.lineTo(x,y+h);g.lineTo(x,y+c);g.closePath()}
// a panel with two cut corners, a faint top glow and a hairline edge; acc: a colour strip on the left
function hpanel(x,y,w,h,r,a,acc){const g=ctx,c=Math.min(r*.9,h*.5,w*.3);
 cutPath(g,x+1,y+3,w,h,c);g.fillStyle='rgba(6,12,28,.28)';g.fill();
 cutPath(g,x,y,w,h,c);g.fillStyle=lg(g,0,y,0,y+h,[[0,'rgba(30,42,66,'+a+')'],[1,'rgba(10,15,28,'+a+')']]);g.fill();
 g.save();g.clip();g.fillStyle=lg(g,0,y,0,y+h*.5,[[0,'rgba(160,200,255,.16)'],[1,'rgba(160,200,255,0)']]);g.fillRect(x,y,w,h*.5);if(acc){g.fillStyle=acc;g.fillRect(x,y+c*.5,Math.max(2.5,h*.06),h)}g.restore();
 cutPath(g,x+.5,y+.5,w-1,h-1,c);g.lineWidth=1;g.strokeStyle='rgba(190,215,255,.26)';g.stroke()}
function crownIcon(x,y,s){ctx.fillStyle='#ffd54a';ctx.beginPath();ctx.moveTo(x-s,y+s*.6);ctx.lineTo(x-s,y-s*.5);ctx.lineTo(x-s*.5,y);ctx.lineTo(x,y-s*.7);ctx.lineTo(x+s*.5,y);ctx.lineTo(x+s,y-s*.5);ctx.lineTo(x+s,y+s*.6);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(x-s,y+s*.3,s*2,s*.14)}
function botGlyph(x,y,s,col){const g=ctx;g.fillStyle=col;g.beginPath();g.roundRect(x-s,y-s*.8,s*2,s*1.6,s*.45);g.fill();g.fillStyle='rgba(8,12,22,.85)';g.beginPath();g.arc(x-s*.4,y-s*.1,s*.26,0,7);g.arc(x+s*.4,y-s*.1,s*.26,0,7);g.fill();g.fillRect(x-s*.5,y+s*.32,s,s*.14);g.fillRect(x-s*.06,y-s*1.25,s*.12,s*.5)}
function homeGlyph(x,y,s,col){const g=ctx;g.fillStyle=col;g.beginPath();g.moveTo(x-s,y);g.lineTo(x,y-s*.95);g.lineTo(x+s,y);g.lineTo(x+s*.7,y);g.lineTo(x+s*.7,y+s*.85);g.lineTo(x-s*.7,y+s*.85);g.lineTo(x-s*.7,y);g.closePath();g.fill()}
function stext(t,x,y,fill,line,lw){ctx.lineJoin='round';ctx.lineWidth=lw;ctx.strokeStyle=line;ctx.strokeText(t,x,y);ctx.fillStyle=fill;ctx.fillText(t,x,y)}
// the mark of each class: Striker = star blade, Titan = shield, Gunner = sights, Sapper = mine
function clsGlyph(cl,x,y,s,col,g2){const g=g2||ctx;g.save();g.translate(x,y);g.fillStyle=col;g.strokeStyle=col;g.lineJoin='round';g.lineCap='round';
 if(cl===0){g.beginPath();for(let k=0;k<8;k++){const a=k/8*6.2832-1.5708,r=k&1?s*.36:s;k?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill()}
 else if(cl===1){g.beginPath();g.moveTo(0,-s);g.lineTo(s*.88,-s*.55);g.lineTo(s*.78,s*.2);g.quadraticCurveTo(s*.42,s*.8,0,s);g.quadraticCurveTo(-s*.42,s*.8,-s*.78,s*.2);g.lineTo(-s*.88,-s*.55);g.closePath();g.fill()}
 else if(cl===2){g.lineWidth=s*.26;g.beginPath();g.arc(0,0,s*.6,0,7);g.stroke();g.beginPath();g.moveTo(-s,0);g.lineTo(-s*.32,0);g.moveTo(s*.32,0);g.lineTo(s,0);g.moveTo(0,-s);g.lineTo(0,-s*.32);g.moveTo(0,s*.32);g.lineTo(0,s);g.stroke();g.beginPath();g.arc(0,0,s*.14,0,7);g.fill()}
 else{g.beginPath();for(let k=0;k<6;k++){const a=k/6*6.2832;k?g.lineTo(Math.cos(a)*s,Math.sin(a)*s):g.moveTo(Math.cos(a)*s,Math.sin(a)*s)}g.closePath();g.fill();g.fillStyle='rgba(8,12,22,.85)';g.beginPath();g.arc(0,0,s*.32,0,7);g.fill()}
 g.restore()}

// ---------- markers in the world ----------
// a name plate over a rival: class mark, name, share of the land. A thin bar beneath shows how long their trail is.
function drawPlate(sx,sy,q,fs,lead,w,h){const p=P[q],nm=nmClean(NM[q]),pc=(CN[q]*100/LANDN).toFixed(0)+'%',g=ctx,cl=CLSI[q]||0;
 g.font=HF(800,fs*.95);const nw=g.measureText(nm).width;g.font=HF(700,fs*.85);const pw=g.measureText(pc).width;
 const ph=fs*1.5,gl=fs*1.25,cw=lead?fs*1.1:0,pwid=fs*.55+gl+cw+nw+fs*.5+pw+fs*.75;
 let x=sx-pwid/2,y=sy-ph/2;x=Math.max(SAFE.l+4,Math.min(w-pwid-4-SAFE.r,x));y=Math.max(4,Math.min(h-ph-4,y));
 g.fillStyle='rgba(3,5,10,.6)';g.beginPath();g.roundRect(x,y,pwid,ph,ph/2);g.fill();g.strokeStyle=rgba(COLS[q],.5);g.lineWidth=1;g.stroke();
 let cx=x+fs*.55;clsGlyph(cl,cx+fs*.42,y+ph/2,fs*.4,COLS[q]);cx+=gl;
 if(lead){crownIcon(cx+fs*.4,y+ph/2,fs*.36);cx+=cw}
 g.textAlign='left';g.textBaseline='middle';g.font=HF(800,fs*.95);g.fillStyle='#fff';g.fillText(nm,cx,y+ph/2+.5);cx+=nw+fs*.5;
 g.font=HF(700,fs*.85);g.fillStyle=tint(COLS[q],.45);g.fillText(pc,cx,y+ph/2+.5);
 if(p&&p.out&&p.tr.length>8){const L=Math.min(1,p.tr.length/160),bw=pwid*.7;g.fillStyle='rgba(255,255,255,.12)';g.fillRect(sx-bw/2,y+ph+3,bw,2);
  g.fillStyle=L>.6?'#ff5a4a':L>.3?'#ffb020':COLS[q];g.fillRect(sx-bw/2,y+ph+3,bw*Math.max(.08,L),2)}}
// a badge on the screen edge for a rival (or your land) that is off screen, turned toward it
function drawEdge(x,y,ang,q,al,near,home){const g=ctx,R=cs*1.3,col=home?COLS[VS]:COLS[q];g.save();g.translate(x,y);g.globalAlpha=al;
 if(near){const k=.5+.5*Math.sin(clk*9);g.strokeStyle='rgba(255,70,80,'+(.25+.45*k)+')';g.lineWidth=3;g.beginPath();g.arc(0,0,R+cs*.55+k*cs*.4,0,7);g.stroke()}
 g.save();g.rotate(ang);g.lineJoin='round';g.fillStyle=col;g.strokeStyle='rgba(255,255,255,.96)';g.lineWidth=1.8;g.beginPath();g.moveTo(R+cs*.95,0);g.lineTo(R*.62,-R*.62);g.lineTo(R*.62,R*.62);g.closePath();g.fill();g.stroke();g.restore();
 g.fillStyle='rgba(12,18,32,.94)';g.beginPath();g.arc(0,0,R,0,7);g.fill();g.lineWidth=2.6;g.strokeStyle=col;g.stroke();
 if(home)homeGlyph(0,-cs*.1,cs*.62,'#fff');else clsGlyph(CLSI[q]||0,0,0,cs*.68,'#fff');
 g.restore()}
let HOMEP=null,HOMET=-9;
function nearestOwn(px,py){let best=1e9,bx=0,by=0;const st=6;for(let cy=3;cy<MH;cy+=st){const row=cy*MW;for(let cx=3;cx<MW;cx+=st)if(own[row+cx]===VS){const dx=cx/MC-px,dy=cy/MC-py,d=dx*dx+dy*dy;if(d<best){best=d;bx=cx/MC;by=cy/MC}}}return best<1e9?[bx,by,Math.sqrt(best)]:null}

// a name cut to fit with an ellipsis (the font is already set)
function nmFit(t,maxW){if(ctx.measureText(t).width<=maxW)return t;let s=t;while(s.length>2&&ctx.measureText(s+'\u2026').width>maxW)s=s.slice(0,-1);return s+'\u2026'}
// ---------- the match screen: kept clean. Minimap with the clock and your share under it (top left), the joystick (left), the buttons (right, in the page),
// a pause button (top right, in the page). In the world: compact plates over rivals, pointers to rivals and to your land when they are off screen.
// The standings list, the kill feed and the labels over the power pads are gone; the result screen still has the full table.
function joyR(){return Math.round(Math.max(46,Math.min(64,Math.min(vw,vh)*.15)))}
function miniSize(w,h){let mw=Math.round(Math.max(70,Math.min(96,Math.min(w,h)*.24)));const mh=mw*WH/WW,lim=h*.34;if(mh>lim)mw=Math.max(56,Math.round(lim*WW/WH));return[mw,mw*WH/WW]}
function drawHUD(w,h){
 const S=w2s,fs=Math.max(9,cs*.95),SL=SAFE.l,SR=SAFE.r,ST=SAFE.t,SB=SAFE.b;
 ctx.textAlign='center';ctx.textBaseline='middle';
 const rkAll=[1,2,3,4,5].filter(q=>NM[q]);
 const HUDON=state==='play'||state==='over'||state==='replay',[mw0,mh0]=miniSize(w,h),stripH=Math.round(cs*2.5),KO=[];
 // places the world markers keep clear of: the minimap block, the buttons, the joystick
 if(HUDON){if(MINI)KO.push([SL+2,ST+2,mw0+22,mh0+22]);if(state==='play')KO.push([w/2-cs*9,ST,cs*18,cs*7]);
  if(state==='play'){KO.push([w-SR-250,h-SB-230,250,230+SB]);KO.push([SL,h-SB-joyR()*2-60,joyR()*2+70,joyR()*2+60+SB]);KO.push([w-SR-58,ST,58,58])}}
 const fade=(bx,by,bw2,bh2,m)=>{let fa=1;for(const r of KO){const dx=Math.max(r[0]-(bx+bw2),bx-(r[0]+r[2]),0),dy=Math.max(r[1]-(by+bh2),by-(r[1]+r[3]),0);fa=Math.min(fa,Math.hypot(dx,dy)/m)}return fa};
 // markers: plates over the rivals, pointers to the ones that are off screen
 if(state==='play'||state==='replay'){
  const lead=rkAll.slice().sort((a,b)=>CN[b]-CN[a])[0];
  for(const q of rkAll){const p=P[q];if(!p||!p.alive||q===VS)continue;
   const [sx,sy]=S(p.rx,p.ry,1.4);
   const inside=sx>-8&&sx<w+8&&sy>-8&&sy<h+8;
   if(inside){const al=Math.min(1,fade(sx-fs*4,sy-cs*4.5-fs,fs*8,fs*2,fs*2));if(al>.03){ctx.globalAlpha=al;drawPlate(sx,sy-cs*4.2,q,fs,q===lead&&CN[q]>0,w,h);ctx.globalAlpha=1}}
   else{const dx=sx-w/2,dy=sy-h/2,pad=cs*2.1,padT=ST+cs*2.6,t=Math.min((w/2-pad)/Math.abs(dx||1e-3),(h/2-Math.max(pad,padT*.5))/Math.abs(dy||1e-3)),ex=w/2+dx*t,ey=h/2+dy*t,ey2=Math.max(padT,Math.min(h-pad-cs*2,ey));
    const dist=me?Math.hypot(p.rx-me.rx,p.ry-me.ry):99,near=dist<24&&p.out,al=Math.max(.5,Math.min(1,1.25-dist/90))*Math.min(1,fade(ex-cs*1.3,ey2-cs*1.3,cs*2.6,cs*2.6,cs*1.6));
    if(al>.03)drawEdge(Math.max(pad,Math.min(w-pad,ex)),ey2,Math.atan2(dy,dx),q,al,near,0)}}
  // a way back to your land when you are out in the open and none of it is on screen
  if(me&&me.alive&&me.out&&state==='play'){if(clk-HOMET>.2){HOMET=clk;HOMEP=nearestOwn(me.rx,me.ry)}
   if(HOMEP){const hp=HOMEP,[sx,sy]=S(hp[0],hp[1],0);if(!(sx>-8&&sx<w+8&&sy>-8&&sy<h+8)){const dx=sx-w/2,dy=sy-h/2,pad=cs*2.1,padT=ST+cs*2.6,t=Math.min((w/2-pad)/Math.abs(dx||1e-3),(h/2-Math.max(pad,padT*.5))/Math.abs(dy||1e-3)),ex=Math.max(pad,Math.min(w-pad,w/2+dx*t)),ey=Math.max(padT,Math.min(h-pad-cs*2,h/2+dy*t));
     const al=Math.min(1,fade(ex-cs*1.3,ey-cs*1.3,cs*2.6,cs*2.6,cs*1.6));if(al>.03)drawEdge(ex,ey,Math.atan2(dy,dx),VS,al,0,1)}}}}
 // floating messages
 ctx.textAlign='center';
 for(const q of PO){const [px,py]=S(q.x,q.y,2.2),k=Math.min(1,(q.l0-q.l)*7),sc=.7+.3*Math.min(1,k*1.4);ctx.globalAlpha=Math.min(1,q.l*1.6);ctx.font=HF('900 italic',Math.round(cs*1.7*sc));const hw2=ctx.measureText(q.t).width/2+8,tx=Math.min(w-hw2,Math.max(hw2,px)),ty=Math.max(cs*3,py);stext(q.t,tx,ty,q.c,'rgba(6,12,28,.92)',cs*.45)}
 ctx.globalAlpha=1;
 // minimap in a thin glass frame (top left)
 if(MINI&&HUDON){const mw=mw0,mh=mh0,mx=SL+12,my=ST+12;
  ctx.fillStyle='rgba(3,5,10,.5)';ctx.beginPath();ctx.roundRect(mx-4,my-4,mw+8,mh+8,10);ctx.fill();ctx.strokeStyle='rgba(140,210,255,.16)';ctx.lineWidth=1;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.roundRect(mx,my,mw,mh,7);ctx.clip();ctx.drawImage(MINI,mx,my,mw,mh);
  for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.tr||p.tr.length<4)continue;ctx.strokeStyle=COLS[q];ctx.lineWidth=q===VS?1.6:1.1;ctx.lineJoin='round';ctx.beginPath();const t=(q===VS&&MP)?ncTrail(p):p.tr;for(let i=0;i<t.length;i+=4)i?ctx.lineTo(mx+t[i]/WW*mw,my+t[i+1]/WH*mh):ctx.moveTo(mx+t[i]/WW*mw,my+t[i+1]/WH*mh);if(p.alive)ctx.lineTo(mx+p.rx/WW*mw,my+p.ry/WH*mh);ctx.stroke()}
  for(let zi=0;zi<ZN.length;zi++){const zz=ZN[zi],o=ZOWN[zi]||0,zx=mx+zz.x/WW*mw,zy=my+zz.y/WH*mh;ctx.fillStyle=o?COLS[o]:'rgba(255,255,255,.75)';ctx.beginPath();ctx.moveTo(zx,zy-2.8);ctx.lineTo(zx+2.8,zy);ctx.lineTo(zx,zy+2.8);ctx.lineTo(zx-2.8,zy);ctx.closePath();ctx.fill()}
  {const tl2=s2w(0,0,0),tr2=s2w(w,0,0),bl2=s2w(0,h,0),br2=s2w(w,h,0),pts=[tl2,tr2,br2,bl2];ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1;ctx.beginPath();pts.forEach((v,i)=>{const X=mx+Math.max(-2,Math.min(WW+2,v[0]))/WW*mw,Y=my+Math.max(-2,Math.min(WH+2,v[1]))/WH*mh;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y)});ctx.closePath();ctx.stroke()}
  for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.alive)continue;const px=mx+p.rx/WW*mw,py=my+p.ry/WH*mh,me2=q===VS,s=me2?4:3;
   if(me2){const k=.5+.5*Math.sin(clk*5);ctx.fillStyle='rgba(255,255,255,'+(.18+.22*k)+')';ctx.beginPath();ctx.arc(px,py,s+2+k*2,0,7);ctx.fill()}
   ctx.save();ctx.translate(px,py);ctx.rotate(p.ra||0);ctx.fillStyle=COLS[q];ctx.strokeStyle=me2?'#ffffff':'rgba(3,5,10,.9)';ctx.lineWidth=me2?1.4:1;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(s*1.25,0);ctx.lineTo(-s*.85,-s*.85);ctx.lineTo(-s*.4,0);ctx.lineTo(-s*.85,s*.85);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
  ctx.restore();
  // small pills under it: the ping (online) and the nitro bonus
  if(state==='play'){let cy=my+mh+10;const chip=(tx,dotc,fill,ink)=>{ctx.font=HF(800,Math.round(cs*.9));const cw=ctx.measureText(tx).width+cs*(dotc?2.3:1.6),chh=cs*1.6,cx0=mx-4;
    ctx.fillStyle=fill||'rgba(3,5,10,.55)';ctx.beginPath();ctx.roundRect(cx0,cy,cw,chh,chh/2);ctx.fill();
    let tx0=cx0+cs*.8;if(dotc){ctx.fillStyle=dotc;ctx.beginPath();ctx.arc(cx0+cs*.8,cy+chh/2,cs*.28,0,7);ctx.fill();tx0=cx0+cs*1.4}
    ctx.fillStyle=ink||'#ffffff';ctx.textAlign='left';ctx.fillText(tx,tx0,cy+chh/2+.5);cy+=chh+cs*.35};
   if(MP&&NC.hasSnap&&(NC.ping>0||NC.rtt>0)){const pg=Math.round(NC.ping>0?NC.ping:NC.rtt),pc2=pg<90?'#46d37a':pg<160?'#ffd24a':pg<260?'#ff9a3d':'#ff5a6e';chip(pg+' ms',pc2)}
   if(MYHOLD&8)chip('Nitro +15%',null,'rgba(255,176,32,.92)','#1b1206')}}
 // the clock and your share of the land: a pill at the top in the middle; under it, what just happened to you
 if(state==='play'){const t=Math.max(0,Math.ceil(tl)),ts=(t/60|0)+':'+String(t%60).padStart(2,'0'),low=t<=10,pc=(CN[VS]*100/LANDN).toFixed(1)+'%',f1=Math.round(cs*1.45),f2=Math.round(cs*1.15);
  ctx.font=HF('900 italic',f1);const tw=ctx.measureText(ts).width;ctx.font=HF('800 italic',f2);const pw2=ctx.measureText(pc).width;
  const ph=Math.round(cs*2.3),W2=tw+pw2+cs*3.6,x0=w/2-W2/2,y0=ST+10;
  ctx.fillStyle='rgba(3,5,10,.55)';ctx.beginPath();ctx.roundRect(x0,y0,W2,ph,ph/2);ctx.fill();ctx.strokeStyle=low?'rgba(255,80,100,'+(.45+.3*Math.sin(fr/3))+')':'rgba(140,210,255,.16)';ctx.lineWidth=1;ctx.stroke();
  {const k=Math.max(0,Math.min(1,tl/TL)),bw=(W2-ph)*k;ctx.fillStyle=low?'rgba(255,90,110,.9)':'rgba(255,255,255,.35)';ctx.fillRect(x0+ph/2,y0+ph-2.5,bw,1.5)}
  ctx.textAlign='left';ctx.font=HF('900 italic',f1);ctx.fillStyle=low?'rgba(255,90,110,'+(.65+.35*Math.sin(fr/3))+')':'#ffffff';ctx.fillText(ts,x0+cs*1.1,y0+ph/2+1);
  ctx.fillStyle=COLS[VS];ctx.beginPath();ctx.arc(x0+cs*1.1+tw+cs*.7,y0+ph/2,cs*.2,0,7);ctx.fill();
  ctx.font=HF('800 italic',f2);ctx.fillStyle=tint(COLS[VS],.45);ctx.fillText(pc,x0+cs*1.1+tw+cs*1.4,y0+ph/2+1);
  let fy=y0+ph+cs*.55;ctx.textAlign='center';
  for(const d of FD){if(!d.me)continue;const age=clk-(d.t0===undefined?clk:d.t0),a=Math.min(1,age*7)*Math.min(1,d.l/.6);if(a<=.01)continue;
   ctx.globalAlpha=a;ctx.font=HF(800,Math.round(cs*.98));const tw3=ctx.measureText(d.t).width,fh=cs*1.85,fx=w/2-tw3/2-cs*1,sl=(1-Math.min(1,age*7))*-8;
   ctx.fillStyle='rgba(3,5,10,.62)';ctx.beginPath();ctx.roundRect(fx,fy+sl,tw3+cs*2,fh,fh/2);ctx.fill();ctx.fillStyle=d.c;ctx.beginPath();ctx.arc(fx+cs*.75,fy+sl+fh/2,cs*.22,0,7);ctx.fill();
   ctx.fillStyle='#ffffff';ctx.fillText(d.t,w/2+cs*.25,fy+sl+fh/2+1);fy+=fh+cs*.3;ctx.globalAlpha=1}}
 ctx.textAlign='center';
 if(state==='play'&&tl<=30&&tl>0){const a=.07+.05*Math.sin(fr/5)+(tl<=10?.07:0),g2=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.34,w/2,h/2,Math.max(w,h)*.75);g2.addColorStop(0,'rgba(255,40,80,0)');g2.addColorStop(1,'rgba(255,40,80,'+a+')');ctx.fillStyle=g2;ctx.fillRect(0,0,w,h);
  if(tl>27){ctx.globalAlpha=Math.min(1,tl-27);ctx.font=HF('900 italic',Math.round(cs*3));stext('FINAL RUSH',w/2,h*.3,'#ffffff','rgba(255,36,72,.95)',cs*.65)}
  if(tl<=10){ctx.globalAlpha=.45+.2*Math.sin(fr/3);ctx.font=HF('900 italic',Math.round(cs*9));stext(String(Math.ceil(tl)),w/2,h/2,'#ffffff','rgba(255,36,72,.9)',cs)}
  ctx.globalAlpha=1}
 if(me&&!me.alive&&state==='play'){ctx.font=HF(800,Math.round(cs*1.6));ctx.textAlign='center';const t1=DEATH||'Wiped out',tw=Math.max(ctx.measureText(t1).width,cs*12)+cs*3;hpanel(w/2-tw/2,h/2-cs*2.4,tw,cs*4.8,cs*1.1,.9,COLS[VS]);ctx.fillStyle='#ffffff';ctx.fillText(t1,w/2,h/2-cs*.7);
  ctx.fillStyle='#aab6d3';ctx.font=HF(700,Math.round(cs*1.2));ctx.fillText('Respawning...',w/2,h/2+cs*1.1);
  const bw2=tw-cs*3,k=(clk*.9)%1;ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(w/2-bw2/2,h/2+cs*1.95,bw2,3);ctx.fillStyle=COLS[VS];ctx.fillRect(w/2-bw2/2+bw2*Math.max(0,k-.25),h/2+cs*1.95,bw2*(Math.min(1,k+.001)-Math.max(0,k-.25)),3)}
 drawJoy(w,h);
 ctx.textBaseline='alphabetic';
 if(me&&me.alive&&state==='play'&&ptr.type==='mouse'&&ptr.sx!==undefined){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(ptr.sx,ptr.sy,7,0,7);ctx.moveTo(ptr.sx-11,ptr.sy);ctx.lineTo(ptr.sx+11,ptr.sy);ctx.moveTo(ptr.sx,ptr.sy-11);ctx.lineTo(ptr.sx,ptr.sy+11);ctx.stroke();ctx.strokeStyle='rgba(10,20,40,.7)';ctx.lineWidth=1;ctx.stroke()}}
// the joystick: a ring where the thumb came down and a knob that follows it (the ring is pulled along if the thumb goes past its edge).
// While no finger is down a faint one rests in the bottom-left corner, so a new player sees where to steer. Touch screens only.
let JOYT=0;
function drawJoy(w,h){
 if(!(state==='play'&&!RPL&&me&&me.alive)||ptr.type==='mouse'||PAUSED)return;
 const R=joyR(),g=ctx,act=!!(ptr.down&&ptr.id!=null);let ax,ay,kx,ky;
 if(act){ax=ptr.ax;ay=ptr.ay;let vx=ptr.px-ax,vy=ptr.py-ay;const L=Math.hypot(vx,vy);if(L>R){vx*=R/L;vy*=R/L}kx=ax+vx;ky=ay+vy;JOYT=clk}
 else{ax=SAFE.l+R+28;ay=h-SAFE.b-R-34;kx=ax;ky=ay}
 const a=act?1:Math.min(.5,Math.max(0,(clk-JOYT-.4)*1.5));if(a<=.01)return;
 g.globalAlpha=a;g.beginPath();g.arc(ax,ay,R,0,7);g.fillStyle='rgba(8,14,28,.3)';g.fill();g.lineWidth=2;g.strokeStyle='rgba(255,255,255,.5)';g.stroke();
 g.beginPath();g.arc(ax,ay,R*.62,0,7);g.lineWidth=1;g.strokeStyle='rgba(255,255,255,.16)';g.stroke();
 g.beginPath();g.arc(kx,ky,R*.4,0,7);g.fillStyle=act?'rgba(255,255,255,.9)':'rgba(255,255,255,.65)';g.fill();g.lineWidth=2;g.strokeStyle=COLS[VS]||'#fff';g.stroke();
 g.globalAlpha=1}
// ---------- input: finger, mouse and keys ----------
// Buttons: 1 and 2 are the class abilities (a switched-off one is hidden), 3 the ultimate, 4 Boost (hold). Steering: drag a finger anywhere, or move the mouse.
const pe=e=>{if(e.pointerType!=='mouse'&&ptr.id!=null&&e.pointerId!==ptr.id)return;ptr.type=e.pointerType==='mouse'?'mouse':'touch';
 if(ptr.type==='mouse'){const r=cv.getBoundingClientRect();ptr.sx=e.clientX-r.left;ptr.sy=e.clientY-r.top}
 else{ptr.px=e.clientX;ptr.py=e.clientY}};
document.addEventListener('pointerdown',e=>{au();if(e.pointerType==='mouse'){pe(e);if(e.button===0)abDown(4);return}
 if(ptr.id!=null||(state==='play'&&nearButton(e.clientX,e.clientY)))return;ptr.id=e.pointerId;pe(e);ptr.down=1;ptr.ax=ptr.px;ptr.ay=ptr.py});
// a thumb that lands just beside a button is a missed press, not steering
function nearButton(x,y){const L=document.querySelectorAll('.gb.on,#pz.on');for(const b of L){const r=b.getBoundingClientRect();if(!r.width)continue;if(x>r.left-20&&x<r.right+20&&y>r.top-20&&y<r.bottom+20)return true}return false}
document.addEventListener('pointermove',pe);
const up=e=>{if(e.pointerType==='mouse')abUp(4);else if(e.pointerId===ptr.id){ptr.down=0;ptr.id=null}};
document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
document.addEventListener('contextmenu',e=>{if(state==='play')e.preventDefault()});
const ABB=[$('ab1'),$('ab2'),$('ab3'),$('spr')];
ABB.forEach((b,j)=>{b.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();au();abDown(j+1)});['pointerup','pointercancel','pointerleave'].forEach(k=>b.addEventListener(k,()=>abUp(j+1)))});
const PWB=[$('pw0'),$('pw1'),$('pw2')];PWB.forEach((b,j)=>b.addEventListener('pointerdown',e=>{e.stopPropagation();au();firePow(PK[j])}));
addEventListener('keydown',e=>{if(e.repeat||(e.target&&e.target.tagName==='INPUT'))return;if(RPL){if(e.code==='Space'){rpToggle();e.preventDefault()}return}
 const k=(e.key||'').toLowerCase();
 if(e.code==='Space'||e.key==='Shift'){abDown(4);e.preventDefault()}
 else if(k==='q'||k==='1'||k==='j')abDown(1);else if(k==='e'||k==='2'||k==='k')abDown(2);else if(k==='r'||k==='3'||k==='l')abDown(3);
 else if(k==='z')firePow('cannon');else if(k==='x')firePow('fort');else if(k==='c')firePow('strike')});
addEventListener('keyup',e=>{if(e.code==='Space'||e.key==='Shift')abUp(4)});
addEventListener('resize',()=>{if(P){readSafe();fit()}});
function abDown(s){if(state!=='play'||RPL)return;
 if(s===4){setBoost(1);abFlash(4);return}
 if(MP){if(!ncUse(s))snd('deny');else abFlash(s);return}
 if(IN[1]){if(!ABU(1,s))snd('deny');else abFlash(s)}}
// a quick pop of the button that fired
function abFlash(s){const b=ABB[s-1];if(!b)return;b.classList.remove('fire');void b.offsetWidth;b.classList.add('fire');clearTimeout(b._ft);b._ft=setTimeout(()=>b.classList.remove('fire'),340)}
function abUp(s){if(s===4)setBoost(0)}
function firePow(k){if(state!=='play'||!me||!me.alive||RPL)return;if(MP)tx({t:'pw',k});else PWU(1,k)}
function aim(){if(!me)return;const hx=me.rx,hy=me.ry;
 if(ptr.type==='mouse'){if(ptr.sx===undefined)return;const g=GFX.ok?s2w(ptr.sx,ptr.sy,0):[CAM.x+(ptr.sx-vw/2)/CAM.z,CAM.y+(ptr.sy-vh/2)/CAM.z];tg.x=g[0];tg.y=g[1];if(dhyp(tg.x-hx,tg.y-hy)>.8)tg.a=Math.atan2(tg.y-hy,tg.x-hx)}
 else if(ptr.down){const R=joyR(),vx=ptr.px-ptr.ax,vy=ptr.py-ptr.ay,L=Math.hypot(vx,vy);if(L>R){ptr.ax+=vx*(1-R/L);ptr.ay+=vy*(1-R/L)}if(L>8)tg.a=GFX.ok?screenAngle(vx,vy):Math.atan2(vy,vx)}}

// ---------- one shared fixed-step loop for practice, the menu showreel and replays ----------
// Every match advances in exact 1/30 s steps. What you see is drawn between two steps, so motion stays smooth at 60 or 120 Hz.
let ACC=0,ALPHA=0,wasAlive=true,DEATH='',RPL=null,QUIET=0;
function snapPrev(){for(let i=1;i<=5;i++){const p=P[i];p.ox=p.x;p.oy=p.y;p.oa=p.a}}
function interp(a){for(let i=1;i<=5;i++){const p=P[i];if(p.ox===undefined||!p.alive){p.rx=p.x;p.ry=p.y;p.ra=p.a;continue}
 const dx=p.x-p.ox,dy=p.y-p.oy;if(dx*dx+dy*dy>6.25){p.rx=p.x;p.ry=p.y;p.ra=p.a}else{p.rx=p.ox+dx*a;p.ry=p.oy+dy*a;p.ra=p.oa+angd(p.oa,p.a)*a}}}
function humanInput(){const t=IN[1];if(!t||!me)return;aim();if(me.alive&&!wasAlive)tg.a=me.a;wasAlive=me.alive;INP(1,Math.round(Math.max(-7,Math.min(7,tg.a))*50),boost?1:0)}
function drainEV(){while(EV.length){const e=EV.shift();if(e[0]==='ko')koMsg(e[1],e[2],e[3],e[4]);else if(e[0]==='rail'){railFx(e[1],e[2],e[3],e[4],e[5]);evFx('rail',e[1],e[4],e[5])}else if(e[0]==='zone')zoneEv(e[1],e[2],e[3]);else if(e[0]==='seize')seizeEv(e[1],e[2],e[3]);else if(e[0]==='strike'||e[0]==='orbital')strikeEv(e[0],e[1],e[2]);else evFx(e[0],e[1],e[2],e[3])}}
function syncVisual(){
 for(let i=1;i<=5;i++){const p=P[i];visFlags(p,snapFlags(i,p));PRV[i]=PROT[i];HOLDV[i]=HOLD[i]}
 MNV=MINES.map(m=>[m.x,m.y,m.o,m.arm>0?0:1,m.k]);ZOWN=ZN.map(z=>z.own);
 const a=ACC;
 SHV=SHL.map(s=>[s.x+s.vx*a,s.y+s.vy*a,s.vx,s.vy,s.o]);BLV=BLD.map(s=>[s.x+s.vx*a,s.y+s.vy*a,s.vx,s.vy,s.o]);
 MSV=MSL.map(m=>[m.x+dcos(m.a)*BAL.missV*a,m.y+dsin(m.a)*BAL.missV*a,m.a,m.o]);STV=STR.map(s=>[s.x,s.y,s.t-a,s.o,s.r]);
 MYHOLD=HOLD[VS];MYPW=PWC[VS].map((c,j)=>1-c/ZCD[PK[j]]);
 if(IN[VS]){RDY=rdyOf(VS);en=RDY[3];MYUT=Math.max(0,IN[VS].ut)}}
function localFrame(dt){
 fxStep(dt);
 if(state!=='play'&&state!=='menu'&&state!=='replay')return;
 const rp=RPL;
 if(rp){if(rp.seek!=null){seekStep();return}if(rp.paused||rp.done){interp(ACC/STEP);syncVisual();return}}
 ACC+=dt*(rp?rp.speed:1);let n=0;const mx=rp?rp.speed*3+2:4;
 while(ACC>=STEP&&n<mx){ACC-=STEP;n++;snapPrev();
  if(rp){const o=rp.rec.ops;while(rp.oi<o.length&&o[rp.oi][0]<=TK)APPLY(o[rp.oi++])}else if(state==='play')humanInput();
  STEPF();if(EV.length)drainEV();
  if(rp){if(TK>=rp.rec.ticks){const o=rp.rec.ops;while(rp.oi<o.length)APPLY(o[rp.oi++]);hud(1);rp.done=true;rpEnded();break}}
  else if(state==='play'&&tl<=0){tl=0;hud(1);finish();break}}
 if(ACC>STEP*3)ACC=STEP*3;
 interp(ACC/STEP);syncVisual()}

// ---------- menu showreel: bots play on a live island behind the menu ----------
const SR={t0:0,tgt:2,tt:0,fading:0};
function bgStart(){MP=0;VS=1;FF=0;RPL=null;QUIET=1;NM=['','Zed','Blaze','Mira','Kabir','Nova'];RDY=[1,1,0,1];resetCos();CLSI.length=0;MPS(0,true);buildIsland();me=P[1];state='menu';wasAlive=true;ACC=0;
 SR.t0=clk;SR.tt=0;SR.tgt=2;CAM.fy=.34;FX=[];PO=[];FD=[];SCORCH=[];RINGS=[];snapPrev();interp(0);syncVisual();const t=P[SR.tgt];CAM.x=t.x;CAM.y=t.y;CAM.vz=44}
function srDirector(dt){SR.tt-=dt;
 const cur=P[SR.tgt];
 if(SR.tt<=0||!cur||!cur.alive){SR.tt=7+Math.random()*5;let b=-1,bs=-1;for(let i=1;i<=5;i++){const p=P[i];if(!p.alive)continue;const sc=(p.out?2:0)+CN[i]/LANDN*4+Math.random()*1.5+(i===SR.tgt?-1.2:0);if(sc>bs){bs=sc;b=i}}if(b>0)SR.tgt=b}
 if(!SR.fading&&(clk-SR.t0>80)){SR.fading=1;const f=$('fade');f.className='s';setTimeout(()=>{if(state==='menu')bgStart();f.className='';SR.fading=0},520)}}
function camTarget(){if(state==='menu')return P[SR.tgt];return me&&me.alive?me:null}

// ---------- practice match (offline, against bots) ----------
function localMatch(nb,kind){MP=0;VS=1;FF=0;RPL=null;QUIET=0;KIND=kind||'local';NM=['','You'];const bn=['Blaze','Mira','Kabir','Nova'];for(let i=0;i<nb;i++)NM.push('\u{1F916} '+bn[i]);while(NM.length<6)NM.push('');
 RDY=[1,1,0,1];resetCos();au();
 DEATH='';SCORCH=[];RINGS=[];CAM.fy=.5;CLSI.length=0;CLSI[1]=LOAD.cls|0;MPS(1,true,nb);recStart();buildIsland();me=P[1];tg.x=ptr.x=me.x;tg.y=ptr.y=me.y;tg.a=me.a;boost=0;en=1;shake=0;lastSec=99;wasAlive=true;score=kills=streak=0;ACC=0;snapPrev();interp(0);syncVisual();
 CAM.x=me.x;CAM.y=me.y;CAM.vz=60;hideOv();scr='play';snd('start')}

// ---------- online: see 32_netc.js. Each frame the phone reads the steering, moves your car at once and shows the others a few ticks in the past ----------
function mpStep(dt){
 fxStep(dt);
 if(state!=='play')return;
 aim();
 for(const s of STV)s[2]-=dt;
 ncFrame(dt)}

// ---------- replays: the same engine, fed the recorded seed and inputs ----------
function replayBase(rec,slot){MP=0;FF=0;QUIET=0;KIND=rec.kind||'replay';const S=slot>=1&&slot<=5?slot:((rec.hum&&rec.hum[0]&&rec.hum[0][0])||1);
 TL=rec.tl;CLSI.length=0;MPS(rec.h,rec.bots,rec.nb,rec.seed,rec.cl);REC=null;VS=S;me=P[VS];
 NM=['','','','','',''];COS=[null];for(let i=1;i<=5;i++){NM[i]=(rec.names&&rec.names[i])||'';COS[i]=(rec.cos&&rec.cos[i])||['sport','glow']}
 SCORCH=[];RINGS=[];FX=[];PO=[];FD=[];DEATH='';MYHOLD=0;ACC=0;buildIsland();snapPrev();interp(0);syncVisual();CAM.fy=.5;CAM.x=me.x;CAM.y=me.y;CAM.vz=56;hideOv()}
function startReplay(rec,slot,meta){
 if(!rec||!rec.ops||!rec.seed||!rec.fin){toast('This replay cannot be played');return false}
 if(rec.v>EVER){toast('Update the game to watch this replay');return false}
 if(rec.v<EVER){toast('This match was recorded before the class update, so it cannot be replayed',4500);return false}
 replayBase(rec,slot);RPL={rec,oi:0,speed:1,paused:false,done:false,seek:null,meta:meta||{},auto:false,evT:0};state='replay';scr='replay';
 rpBar(true);return true}
function rpToggle(){if(!RPL)return;if(RPL.done){rpRestart();return}RPL.paused=!RPL.paused;rpUpd()}
function rpRestart(){if(!RPL)return;const r=RPL;replayBase(r.rec,VS);r.oi=0;r.done=false;r.paused=false;r.seek=null;hideOv();rpUpd()}
function rpSeek(frac){if(!RPL)return;const t=Math.max(0,Math.min(RPL.rec.ticks-1,Math.round(frac*RPL.rec.ticks)));
 if(t<TK){const r=RPL;replayBase(r.rec,VS);r.oi=0;r.done=false}
 RPL.seek=t;RPL.wasPaused=RPL.paused;FF=1}
function seekStep(){const r=RPL;let n=0;
 while(TK<r.seek&&n<400){n++;snapPrev();const o=r.rec.ops;while(r.oi<o.length&&o[r.oi][0]<=TK)APPLY(o[r.oi++]);STEPF();EV.length=0}
 if(TK>=r.seek){FF=0;r.seek=null;r.paused=r.wasPaused;FX=[];PO=[];FD=[];SCORCH=[];RINGS=[];ACC=0;snapPrev();interp(0);syncVisual();CAM.x=me.x;CAM.y=me.y;rpUpd()}else interp(0)}
function rpView(s){if(!RPL||s<1||s>5||!P[s])return;VS=s;me=P[s];LANDV=-1;MINID=1;MDIRTY=true;CAM.x=me.rx;CAM.y=me.ry;rpBar(false);syncVisual()}
function rpClose(){RPL=null;FF=0;rpBar(null);backToMenu()}
function rpSpeed(){if(!RPL)return;RPL.speed=RPL.speed===1?2:RPL.speed===2?4:1;rpUpd()}
function rpEnded(){rpUpd();const fin=RPL.rec.fin,N=fin.N||LANDN,rk=[1,2,3,4,5].filter(i=>(RPL.rec.names||[])[i]).sort((a,b)=>fin.cn[b]-fin.cn[a]);
 show('<div class="big-t">Replay finished</div><p class="hint">Final result of this match</p>'+rk.map((i,k)=>'<div class="rw'+(i===VS?' me':'')+'"><b>'+(k+1)+'</b><i class="d" style="--c:'+COLS[i]+'"></i><span>'+esc(NM[i])+'</span><em>'+Math.round(fin.cn[i]*1000/N)/10+'%</em></div>').join('')
  +'<button class="btn" data-a="rprestart">'+IC.replay+'Watch again</button><button class="btn ghost" data-a="rpclose">Back to menu</button>','rpend')}
// the three liveries, three trails; the four classes come from the shared engine (CLS)
const CARS=['sport','muscle','f1'],TRAILS=['glow','neon','fire'];
const CARDEF={sport:'Stock',muscle:'Twin stripe',f1:'Carbon'},TRLDEF={glow:'Glow',neon:'Neon',fire:'Fire'};
// ---------- icons (24x24, filled) ----------
const I=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
const IC={
 play:I('<path d="M8 4.5v15l12-7.5z"/>'),
 bolt:I('<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>'),
 bots:I('<path fill-rule="evenodd" d="M11 2h2v3h4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h4zM8.5 10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8 15h8v1.5H8z"/>'),
 friends:I('<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 21c0-4 3-7 7-7s7 3 7 7zm14-6c3 0 6 2 6 6h-5c0-2-.4-4-1-6z"/>'),
 replay:I('<path d="M12 4a8 8 0 1 0 7.7 10h-2.1A6 6 0 1 1 12 6c1.7 0 3.2.7 4.3 1.7L13 11h7V4l-2.3 2.3A8 8 0 0 0 12 4zm-1.5 5.5v6l5-3z"/>'),
 garage:I('<path fill-rule="evenodd" d="M5 11l2-5h10l2 5h1a2 2 0 0 1 2 2v4h-2a2.5 2.5 0 0 1-5 0H9a2.5 2.5 0 0 1-5 0H2v-4a2 2 0 0 1 2-2zm3.2-3-1.2 3h10l-1.2-3z"/>'),
 gear:I('<path fill-rule="evenodd" d="M10.3 2h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 3-2 1.7c.1.6.1 1.2 0 1.8l2 1.7-1.7 3-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-3 2-1.7a6 6 0 0 1 0-1.8l-2-1.7 1.7-3 2.5.9c.5-.4 1.1-.7 1.7-.9zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" transform="translate(0 1.2)"/>'),
 how:I('<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 15h2v2h-2zm1-11a4 4 0 0 1 2 7.5c-.8.5-1 1-1 1.5v.5h-2V15c0-1.2.6-2 1.6-2.6A2 2 0 1 0 10 10H8a4 4 0 0 1 4-4z"/>'),
 back:I('<path d="M15.7 5.3 14.3 3.9 6.2 12l8.1 8.1 1.4-1.4L9 12z"/>'),
 share:I('<path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.9a3 3 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.3 9.6a3 3 0 1 0 0 4.8l6.8 3.9A3 3 0 1 0 18 16z"/>'),
 pause:I('<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>'),
 restart:I('<path d="M12 5V2L7 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z"/>'),
 eye:I('<path d="M12 5C6.5 5 2.7 9 1.5 12c1.2 3 5 7 10.500 7s9.300-4 10.500-7C21.300 9 17.500 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6.200a2.200 2.200 0 1 0 0 4.400 2.200 2.200 0 0 0 0-4.400z"/>'),
 trophy:I('<path fill-rule="evenodd" d="M7 3h10v5a5 5 0 0 1-10 0zM10 14h4v3h3v4H7v-4h3zM3 4h3v3a3 3 0 0 1-3-3zM21 4h-3v3a3 3 0 0 0 3-3z"/>'),
 war:I('<path fill-rule="evenodd" d="M5 2h2v20H5zM8 3h11l-2.5 4.500L19 12H8z"/>'),
 stats:I('<path d="M4 20h4V10H4zm6 0h4V4h-4zm6 0h4v-7h-4z"/>'),
 gift:I('<path fill-rule="evenodd" d="M3 9h18v4H3zm1 5h7v7H4zm9 0h7v7h-7zM12 9C9 5 6 4 6 6.500S9 9 12 9zm0 0c3-4 6-5 6-2.500S15 9 12 9z"/>'),
 // class abilities
 sprint:I('<path d="M4 5l8 7-8 7V5zm8 0 8 7-8 7V5z"/>'),
 blade:I('<path d="M21 3 10 8.500 6 18l2.500 2.500L18 16 21 3z"/><path d="M1.500 8.500H7v1.800H1.500zM3 12.500h4v1.800H3z"/>'),
 fan:I('<path d="M12 2.500l1.900 5.600 5.600 1.900-5.600 1.900L12 17.500l-1.900-5.600L4.500 10l5.600-1.900z"/><path d="M5 15.500l.9 2.100 2.100.9-2.100.9L5 21.500l-.9-2.100-2.100-.9 2.100-.9zM19 15.500l.9 2.100 2.100.9-2.100.9-.9 2.100-.9-2.100-2.100-.9 2.100-.9z"/>'),
 storm:I('<path fill-rule="evenodd" d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2.400a3.600 3.600 0 1 1 0 7.200 3.600 3.600 0 0 1 0-7.200z"/><path d="M12 .8l1.700 3.700h-3.400zM12 23.200l-1.700-3.700h3.400zM.8 12l3.700-1.700v3.400zM23.200 12l-3.700 1.700v-3.400zM4.100 4.100l4 1-3 3zM19.900 19.900l-4-1 3-3zM4.100 19.900l1-4 3 3zM19.900 4.100l-1 4-3-3z"/>'),
 ram:I('<path d="M1.500 5.500H11L22.500 12 11 18.500H1.500l3.500-6.500z"/>'),
 shock:I('<path fill-rule="evenodd" d="M12 2.500a9.500 9.500 0 1 0 0 19 9.500 9.500 0 0 0 0-19zm0 2.200a7.300 7.300 0 1 1 0 14.600 7.300 7.300 0 0 1 0-14.600zm0 3.300a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><circle cx="12" cy="12" r="1.700"/>'),
 mortar:I('<path d="M5 2.500h2V9H5zM11 6.500h2V13h-2zM17 2.500h2V9h-2z"/><circle cx="6" cy="11.200" r="2.500"/><circle cx="12" cy="15.200" r="2.500"/><circle cx="18" cy="11.200" r="2.500"/><path d="M2 20.500h20V22H2z"/>'),
 orbital:I('<path fill-rule="evenodd" d="M12 9.500a5.800 5.800 0 1 0 0 11.600 5.800 5.800 0 0 0 0-11.600zm0 2.200a3.600 3.600 0 1 1 0 7.200 3.600 3.600 0 0 1 0-7.200z"/><path d="M11 1h2v9h-2zM11.100 13.300h1.800v1.800h-1.800z"/>'),
 mine:I('<path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.200 4.200l1.400-1.400 2.100 2.100-1.400 1.400zM16.300 16.300l1.400-1.400 2.100 2.100-1.400 1.400zM4.200 19.800l2.100-2.100 1.400 1.400-2.100 2.100zM16.300 7.700l2.100-2.100 1.400 1.400-2.100 2.100z"/>'),
 drone:I('<path d="M21 3c-6 .2-9.500 3-11.500 7.500l4 4C18.500 12.500 20.800 9 21 3z"/><path d="M8 11.500 3.500 12.800l-1.500 4 4.500-1zM12.500 16 11.200 20.500l-4 1.500 1-4.500z"/>'),
 rico:I('<path d="M8.500 2.500l1.700 4.300 4.300 1.700-4.300 1.700-1.700 4.300-1.700-4.300L2.500 8.500l4.300-1.700z"/><path d="M14 21.500l3.200-6.800 1.300 3.100 3-1.200-3.200 6.800-1.300-3.100z" opacity=".85"/><path d="M12.500 13.600l1.400-1.400 3.200 3.200-1.400 1.400z"/>'),
 wire:I('<path d="M3 7h3v14H3zM18 7h3v14h-3z"/><circle cx="4.500" cy="5" r="2.200"/><circle cx="19.500" cy="5" r="2.200"/><path d="M6 11.300l2.400-1.300 2.400 2.600 2.400-2.600 2.400 2.600L18 11.300v2.200l-2.400 1.300-2.400-2.600-2.400 2.600-2.400-2.600L6 13.500z"/>'),
 fault:I('<path d="M14.500 1.500 9 9.500l4.200 1.800L7.500 22.500 17 11.200l-4.300-1.900L17.500 1.500z"/><path d="M1.500 20.500h5v2h-5zM17.500 20.500h5v2h-5z"/>'),
 rail:I('<path d="M2 10h12.500v4.500H2z"/><path d="M14.500 8.800h3v7h-3z"/><path d="M17.500 11.400H23v1.700h-5.500z"/><path d="M4.500 14.500h3.200V19H4.500z"/><path d="M3 7.200h8v1.600H3z" opacity=".7"/>'),
 hole:I('<path fill-rule="evenodd" d="M12 2.500a9.500 9.500 0 1 0 9.500 9.500h-2.600A6.900 6.900 0 1 1 12 5.100zm0 4.300a5.200 5.200 0 1 0 5.200 5.200h-2.500a2.700 2.700 0 1 1-2.700-2.700z"/><circle cx="12" cy="12" r="1.300"/>'),
 field:I('<circle cx="12" cy="12" r="2.600"/><circle cx="12" cy="4.200" r="1.800"/><circle cx="17.500" cy="6.500" r="1.800"/><circle cx="19.800" cy="12" r="1.800"/><circle cx="17.500" cy="17.500" r="1.800"/><circle cx="12" cy="19.800" r="1.800"/><circle cx="6.500" cy="17.500" r="1.800"/><circle cx="4.200" cy="12" r="1.800"/><circle cx="6.500" cy="6.500" r="1.800"/>'),
 cannon:I('<path d="M3 15a3 3 0 1 0 6 0 3 3 0 0 0-6 0zm4-4.500 9-5 2 3.500-9 5zM19 6l2-1 1 2-2 1z"/>'),
 fort:I('<path d="M12 2 4 5v6c0 5 3.400 9.200 8 11 4.600-1.800 8-6 8-11V5zm0 4 4 1.500V11c0 2.600-1.600 5-4 6.200C9.600 16 8 13.600 8 11V7.500z"/>'),
 strike:I('<path fill-rule="evenodd" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 3a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm-1 1v3H8v2h3v3h2v-3h3v-2h-3V7z"/>'),
 lock:I('<path d="M6 10V8a6 6 0 1 1 12 0v2h1v12H5V10zm2 0h8V8a4 4 0 1 0-8 0z"/>'),
 check:I('<path d="M9 16.200 4.800 12l-1.400 1.400L9 19 21 7l-1.400-1.400z"/>'),
 x:I('<path d="M6.400 5 5 6.400 10.600 12 5 17.600 6.400 19 12 13.400 17.600 19 19 17.600 13.400 12 19 6.400 17.600 5 12 10.600z"/>'),
 cam:I('<path d="M9 4 7.500 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.500L15 4zm3 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>'),
 star:I('<path d="m12 2 2.900 6.300 6.900.8-5.100 4.700 1.400 6.800L12 17.300 5.900 20.600l1.400-6.800L2.200 9.100l6.900-.8z"/>')};
// ---------- game events -> messages, sounds, sparks and explosions ----------
let lastSec=99,KIND='',MYUT=0,RDY=[1,1,0,1];
const isMe=q=>q===VS&&!RPL;
const ZPOW_ICON={cannon:'cannon',fort:'fort',strike:'orbital'};
// ability buttons: icon, name and a ring that fills as the ability recharges
let ABK='',ABV=[-1,-1,-1,-1],ABT=['','','',''];
const ABSHORT={rico:'Blades',wire:'Wire',storm:'Cyclone',fault:'Fault',shock:'Shock',fort:'Juggernaut',rail:'Railgun',mortar:'Mortar',orbital:'Orbital',mine:'Mines',drone:'Swarm',hole:'Black hole'};
function setAbLabels(){const cl=CLSI[VS]||0,C=CLS[cl],ids=[C.ab[0].id,C.ab[1].id,C.ab[2].id,'sprint'],nm=[ABSHORT[C.ab[0].id]||C.ab[0].n,ABSHORT[C.ab[1].id]||C.ab[1].n,ABSHORT[C.ab[2].id]||C.ab[2].n,'Boost'],kb=['Q','E','R','Space'];
 ABB.forEach((b,j)=>{b.innerHTML=(IC[ids[j]]||'')+'<b class="cd"></b><span>'+nm[j]+'</span><em class="kb">'+kb[j]+'</em>';b.style.setProperty('--pc',j===3?'#ffb020':j===2?'#ffe08a':C.col);b.dataset.cl=cl});
 ABV=[-1,-1,-1,-1];ABT=['','','','']}
function abHud(){
 const pl=state==='play'&&!RPL,key=pl?(CLSI[VS]||0)+'|'+VS:'off';
 // the match screen keeps only what you use: a switched-off ability has no button, and quitting goes through the pause button
 if(key!==ABK){ABK=key;$('qt').style.display='none';if(!pl){ABB.forEach(b=>b.classList.remove('on'));$('pz').classList.remove('on');pauseSet(0)}else{const C=CLS[CLSI[VS]||0];setAbLabels();ABB.forEach((b,j)=>b.classList.toggle('on',!(j<2&&C.ab[j].off)));$('pz').classList.add('on')}}
 if(!pl)return;
 const C=CLS[CLSI[VS]||0],r=RDY,cds=[C.ab[0].cd,C.ab[1].cd,0,0];
 for(let j=0;j<4;j++){const v=j===3?r[3]:r[j];if(Math.abs(v-ABV[j])>.012||(v>=.999)!==(ABV[j]>=.999)){ABV[j]=v;ABB[j].style.setProperty('--e',v.toFixed(3));ABB[j].classList.toggle('rdy',j<3&&v>=.999)}
  let t='';if(j<2&&v<.999)t=String(Math.ceil((1-v)*cds[j]));else if(j===2){if(MYUT>0)t=MYUT.toFixed(1);else if(v<.999)t=Math.floor(v*100)+'%'}else if(j===3&&v<.2)t='low';
  if(t!==ABT[j]){ABT[j]=t;ABB[j].querySelector('.cd').textContent=t}
  ABB[j].classList.toggle('run',j===2&&MYUT>0)}}
function explode(x,y,r,col){if(FF)return;const c=col||'#ffb020';
 for(let i=0;i<4;i++){const a=Math.random()*6.28,v=Math.random()*(2+r);FX.push({x:x+Math.cos(a)*r*.25,y:y+Math.sin(a)*r*.25,h:.9+Math.random()*.4,vh:1.2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:.34+Math.random()*.2,l0:.54,c:'#ffb050',k:5,s:r*1.5+.7,r:Math.random()*6,vr:0})}
 FX.push({x,y,h:.9,vh:0,vx:0,vy:0,l:.22,l0:.22,c:'#fff0cc',k:5,s:r*2.3+.8,r:0,vr:0});
 burst(x,y,c,Math.round(18+r*8),9+r*3,.4);burst(x,y,'#ff7a1a',Math.round(8+r*4),7+r*2,.4);
 for(let i=0;i<Math.round(4*QL.fx);i++){const a=Math.random()*6.28,v=Math.random()*3;FX.push({x,y,h:.6,vh:1.2+Math.random()*1.4,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1+Math.random()*.8,l0:1.8,c:'#4a5160',k:2,s:.6+r*.35,r:Math.random()*6,vr:1})}
 RINGS.push({x,y,t0:clk,c:'#ffb050',r:r*2.2,dur:.5});SCORCH.push({x,y,r:r*.85,t0:clk});if(SCORCH.length>24)SCORCH.shift()}
function shakeAt(x,y,k,far){const dd=me?Math.hypot(me.rx-x,me.ry-y):99;if(dd<far)shake=Math.max(shake,k*(1-dd/far));return dd}
function evFx(ty,id,x,y){
 const mine=isMe(id),c=COLS[id]||'#ffffff';
 switch(ty){
  case 'blade':burst(x,y,c,22,16);burst(x,y,'#ffffff',10,12);RINGS.push({x,y,t0:clk,c,r:3.4,dur:.45});snd('blade');if(mine){buzz(25);shake=Math.max(shake,3)}break;
  case 'ram':burst(x,y,'#ffb020',26,13);burst(x,y,'#ffffff',10,10);RINGS.push({x,y,t0:clk,c:'#ffb020',r:4.4,dur:.5});snd('ram');if(mine){buzz(35);shake=Math.max(shake,5)}break;
  case 'fan':burst(x,y,c,14,11);RINGS.push({x,y,t0:clk,c,r:2,dur:.3});snd('fan');if(mine)buzz(15);break;
  case 'storm':RINGS.push({x,y,t0:clk,c,r:7.5,dur:.7});RINGS.push({x,y,t0:clk+.08,c:'#ffffff',r:5,dur:.5});burst(x,y,c,40,13);burst(x,y,'#ffffff',16,10);snd('storm');if(mine){buzz(70);shake=Math.max(shake,6)}break;
  case 'shock':RINGS.push({x,y,t0:clk,c:'#ffb020',r:BAL.shockR*1.05,dur:.7});RINGS.push({x,y,t0:clk+.07,c:'#ffffff',r:BAL.shockR*.65,dur:.55});burst(x,y,'#e8f4ff',54,16,.2);burst(x,y,'#ffb020',24,12);snd('shock');shakeAt(x,y,11,22);if(mine)buzz(90);break;
  case 'fortress':RINGS.push({x,y,t0:clk,c:'#5ee1ff',r:6,dur:.65});burst(x,y,'#5ee1ff',30,10);snd('fortress');if(mine){buzz(60);shake=Math.max(shake,4)}break;
  case 'fpulse':RINGS.push({x,y,t0:clk,c:'#5ee1ff',r:BAL.fortR*2.1,dur:.5});snd('fpulse');shakeAt(x,y,3,12);break;
  case 'fire':burst(x,y,'#ffd27a',14,10);FX.push({x,y,h:.8,vh:0,vx:0,vy:0,l:.16,l0:.16,c:'#fff0cc',k:5,s:1.5,r:0,vr:0});snd('fire');if(mine){shake=Math.max(shake,4);buzz(20)}break;
  case 'mortar':burst(x,y,'#ffd27a',16,9);RINGS.push({x,y,t0:clk,c:'#ffd27a',r:2,dur:.3});snd('mortar');if(mine)buzz(25);break;
  case 'mine':burst(x,y,c,10,4);snd('mine');break;
  case 'boom':explode(x,y,2.4,'#ffb020');snd('boom');shakeAt(x,y,12,22);if(mine||(me&&Math.hypot(me.rx-x,me.ry-y)<5))buzz(120);break;
  case 'boom2':{explode(x,y,2.1,'#ffb020');const dd=shakeAt(x,y,9,16);if(dd<14)snd('boom2');else if(dd<32)snd('boom2far');break}
  case 'bhit':burst(x,y,c,18,13);burst(x,y,'#ffffff',8,10);snd('bhit');break;
  case 'drone':burst(x,y,c,16,8);RINGS.push({x,y,t0:clk,c,r:2.4,dur:.35});snd('drone');if(mine)buzz(20);break;
  case 'fizz':burst(x,y,'#9aa4b6',10,4);break;
  case 'rbounce':burst(x,y,c,10,10,.6);burst(x,y,'#ffffff',5,8,.6);RINGS.push({x,y,t0:clk,c,r:1.4,dur:.25});snd('rbounce');break;
  case 'rail':snd('rail');if(mine){buzz(35);shake=Math.max(shake,5)}else shakeAt(x,y,4,14);break;
  case 'wire':burst(x,y,c,12,6,.6);snd('wire');if(mine)buzz(20);break;
  case 'wcut':burst(x,y,'#ffffff',14,12,.6);burst(x,y,c,14,9,.6);RINGS.push({x,y,t0:clk,c,r:2.2,dur:.3});snd('wcut');break;
  case 'fault':RINGS.push({x,y,t0:clk,c,r:3,dur:.4});burst(x,y,'#ffd27a',18,10,.2);snd('fault');shakeAt(x,y,mine?9:6,20);if(mine)buzz(60);break;
  case 'fend':burst(x,y,'#ffb050',14,8,.2);snd('fend');break;
  case 'hole':RINGS.push({x,y,t0:clk,c,r:6,dur:.5});RINGS.push({x,y,t0:clk+.1,c:'#ffffff',r:3,dur:.4});burst(x,y,'#ffffff',20,4,.4);snd('hole');shakeAt(x,y,6,24);if(mine)buzz(80);break;
  case 'hcrush':RINGS.push({x,y,t0:clk,c:'#ffffff',r:2.6,dur:.3});burst(x,y,c,24,12,.5);snd('hcrush');break;
  case 'pop':burst(x,y,'#5ee1ff',40,12);RINGS.push({x,y,t0:clk,c:'#5ee1ff',r:4,dur:.5});snd('pop');if(mine){shake=10;buzz(60)}break;
  case 'plate':RINGS.push({x,y,t0:clk,c:'#5ee1ff',r:3,dur:.5});snd('plate');break;
  case 'fort':RINGS.push({x,y,t0:clk,c:'#5ee1ff',r:5,dur:.6});burst(x,y,'#5ee1ff',20,7);snd('fortify');break;
 }}
const KOW={rail:'a railgun',blade:'a blade',fault:'a fault line',hole:'a black hole',storm:'the blade cyclone',wire:'a laser wire',bomb:'a blast',shell:'a shell',missile:'a drone'};
function koMsg(v,b,why,tr){if(!v)return;const vn=NM[v]||'Player',bn=NM[b]||'',mine=isMe(v),kb=isMe(b);
 const by=b?(kb?'You':bn):'',bys=b?(kb?'Your':bn+"'s"):'';
 if(tr&&b&&KOW[why]){const t=by+(mine?' cut your trail':' cut '+vn+"'s trail")+' with '+KOW[why];FD.push({t,c:COLS[b],l:4,t0:clk,me:mine||kb});if(FD.length>3)FD.shift();if(mine)DEATH=t;return}
 const T={self:mine?'You crossed your own trail':vn+' crossed their own trail',
  noland:b?(by+(mine?' took all your land':' took all of '+vn+"'s land")):(mine?'You lost all your land':vn+' lost all their land'),
  enclosed:by+(mine?' trapped your trail':' trapped '+vn),blast:by+(mine?' blew up all your land':' blew up all of '+vn+"'s land"),
  mine:b?(kb?'Your':bn+"'s")+' mine got '+(mine?'you':vn):'',cut:by+(mine?' cut your trail':' cut '+vn),
  shell:by+' shelled '+(mine?'you':vn),blade:by+' sliced '+(mine?'you':vn),ram:by+' crushed '+(mine?'you':vn),
  missile:bys+' drone hit '+(mine?'you':vn),bomb:by+(mine?' blasted you':' blasted '+vn),
  rail:by+' railgunned '+(mine?'you':vn),wire:bys+' laser wire cut down '+(mine?'you':vn),fault:by+' split the ground under '+(mine?'you':vn),
  hole:bys+' black hole swallowed '+(mine?'you':vn),storm:bys+' blade cyclone shredded '+(mine?'you':vn)};
 let t=T[why];if(!t||(why!=='self'&&why!=='noland'&&!b))t=b?by+(mine?' eliminated you':' eliminated '+vn):(mine?'You were eliminated':vn+' was eliminated');
 FD.push({t,c:COLS[b||v],l:4,t0:clk,me:mine||kb});if(FD.length>3)FD.shift();if(mine)DEATH=t}
function zoneEv(zi,o,old){const z=ZN[zi];if(!z)return;const nm=ZNAME[z.t];
 if(isMe(o)){FD.push({t:'You took the '+nm+': '+ZPOW[z.t]+' ready',c:COLS[VS],l:4,t0:clk,me:1});if(me)pop(me.rx,me.ry-3.2,ZPOW[z.t].toUpperCase()+' ONLINE','#ffb020',1.6);snd('zone');buzz(30)}
 else if(isMe(old))FD.push({t:'You lost the '+nm,c:COLS[o]||'#c8d1e6',l:4,t0:clk,me:1});
 else if(o&&NM[o])FD.push({t:NM[o]+' took the '+nm,c:COLS[o],l:4});
 if(FD.length>3)FD.shift();RINGS.push({x:z.x,y:z.y,t0:clk,c:COLS[o]||'#ffffff'})}
function seizeEv(h,v,n){const pc=(n*100/LANDN).toFixed(1);
 if(isMe(h)&&me){pop(me.rx,me.ry-2.5,'+'+pc+'% seized','#ffd54a',1.5);snd('seize')}
 if(h&&v&&NM[h]&&NM[v]){FD.push({t:(isMe(h)?'You':NM[h])+' seized '+(isMe(v)?'your':NM[v]+"'s")+' land',c:COLS[h],l:4,t0:clk,me:isMe(h)||isMe(v)});if(FD.length>3)FD.shift()}}
function strikeEv(kind,i,t){if(!i||!t||!NM[i]||!NM[t])return;const what=kind==='orbital'?'an orbital barrage':'an airstrike';
 FD.push({t:(isMe(i)?'You':NM[i])+' called '+what+' on '+(isMe(t)?'you!':NM[t]),c:'#ff3b5e',l:4,t0:clk,me:isMe(i)||isMe(t)});if(FD.length>3)FD.shift();snd(kind==='orbital'?'orbital':'strike');if(isMe(t)){buzz(120);pop(me.rx,me.ry-3,'INCOMING','#ff3b5e',1.4)}}
function rush(){if(state!=='play'){lastSec=99;return}const s=Math.ceil(tl);if(s!==lastSec){if(s<=10&&s>0){snd('tick',10-s);buzz(12)}else if(s===30){snd('rush');buzz(60)}lastSec=s}}
(function(){const d=[[IC.cannon,'Fire'],[IC.fort,'Fortify'],[IC.orbital,'Strike']];PWB.forEach((b,j)=>{b.innerHTML=d[j][0]+'<span>'+d[j][1]+'</span>'})})();
function updatePowDock(pl){const hb=pl&&me&&me.alive?MYHOLD:0,key=hb+'|'+(PRV[VS]>0?Math.ceil(PRV[VS]):0);
 if(key!==DOCKS){DOCKS=key;$('pwd').style.display=(hb&7)?'flex':'none';for(let j=0;j<3;j++)PWB[j].className='gb'+((hb&(1<<j))?' on':'');const sp=PWB[1].querySelector('span');if(sp)sp.textContent=PRV[VS]>0?Math.ceil(PRV[VS])+'s':'Fortify'}
 if(hb&7)for(let j=0;j<3;j++)if(hb&(1<<j))PWB[j].style.setProperty('--e',Math.max(0,Math.min(1,MYPW[j]||0)))}
// ---------- who you are, and the line to the server ----------
const BROWSER=typeof WebSocket!=='undefined'&&typeof location!=='undefined';
let pid='',myName='';
try{pid=localStorage.getItem('ct-pid')||'';if(!pid){pid=crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now();localStorage.setItem('ct-pid',pid)}myName=localStorage.getItem('ct-name')||''}catch(e){pid=pid||String(Math.random()).slice(2)+Date.now()}
const PROTO=16;
let ws,online=0,MAP=[0,1,2,3,4,5],rcode='',room0='',replay0='',SERVER="none",lastMsg=0,tries=0,rcT=0,scr='',LB=null,ST2=null,NETSTAT='off',WARD=null,LASTPC=0,LASTREP=null,RPLIST=null,netT0=0;
let ME={name:'',lv:1,pr:0,coins:0,games:0,wins:0,kills:0,deaths:0,best:0,streak:0,bstreak:0,dst:0,dok:true,ach:[],db:'',city:'',state:'',locked:false,rating:800,tier:'Bronze',rgames:0,peak:800,cls:0,rdays:7,skin:'sport',trail:'glow'};
let COS=[null,['sport','glow'],['muscle','neon'],['f1','fire'],['sport','neon'],['muscle','glow']];
// what you picked in the garage; kept on the phone too so it works offline
const LOAD={skin:'sport',trail:'glow',cls:0,dirty:0};
try{const o=JSON.parse(lsGet('ct-load16','null'));if(o){if(CARS.includes(o.skin))LOAD.skin=o.skin;if(TRAILS.includes(o.trail))LOAD.trail=o.trail;if(o.cls>=0&&o.cls<=3)LOAD.cls=o.cls|0}}catch(e){}
function saveLoad(){lsSet('ct-load16',JSON.stringify({skin:LOAD.skin,trail:LOAD.trail,cls:LOAD.cls}))}
function resetCos(){COS=[null,[LOAD.skin,LOAD.trail],['muscle','neon'],['f1','fire'],['sport','neon'],['muscle','glow']]}
const tx=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
function httpBase(){if(SERVER==='none'||!BROWSER)return null;if(!SERVER)return location.origin;return SERVER.replace(/^ws/,'http').replace(/\/+$/,'')}
function wake(){try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}}
function setNet(s){NETSTAT=s;const e=document.getElementById('nst');if(e)e.innerHTML=netLine()}
function netLine(){return '<i class="dot '+(NETSTAT==='on'?'on':NETSTAT==='wake'?'wk':'off')+'"></i>'+(NETSTAT==='on'?'Online':NETSTAT==='wake'?'Waking the server...':SERVER==='none'?'Offline build: practice against bots':'Offline')}
function conn(){
 if(SERVER==='none'){setNet('off');return}
 clearTimeout(rcT);if(!netT0)netT0=Date.now();
 try{if(ws){ws.onclose=ws.onmessage=ws.onopen=null;ws.close()}}catch(e){}
 try{const w=ws=new WebSocket(SERVER||((location.protocol==='https:'?'wss://':'ws://')+location.host));
  w.onopen=()=>{tries=0;lastMsg=Date.now();w.send(JSON.stringify({t:'hello',pid,name:myName.trim(),v:PROTO}))};
  w.onmessage=e=>{lastMsg=Date.now();try{net(JSON.parse(e.data))}catch(x){console.error(x)}};
  w.onclose=()=>{if(ws===w)lost()}}catch(e){lost()}}
function lost(){const was=online;online=0;setNet(Date.now()-netT0>3500?'wake':'off');if(was){$('rc').style.display='block';if(scr==='menu')menu()}clearTimeout(rcT);rcT=setTimeout(conn,Math.min(4000,400*(1<<Math.min(tries++,4))))}
setInterval(()=>{if(!ws||ws.readyState!==1)return;ws.send('{"t":"p","c":'+Math.round(now())+'}');if(Date.now()-lastMsg>9000){try{ws.onclose=null;ws.close()}catch(e){}lost()}},3000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;wake();if(SERVER!=='none'&&(!ws||ws.readyState!==1||Date.now()-lastMsg>6000)){tries=0;conn()}});
function unrle(r){let k=0;for(let i=0;i+1<r.length;i+=2){const n=r[i+1],v=MAP[r[i]]||0;own.fill(v,k,Math.min(own.length,k+n));if(OWNS)OWNS.fill(v,k,Math.min(own.length,k+n));k+=n}MDIRTY=true}
function net(m){
 $('rc').style.display='none';
 if(m.t==='me'){const first=!online;online=1;ME=m;setNet('on');
  if(LOAD.dirty){LOAD.dirty=0;tx({t:'skin',v:LOAD.skin});tx({t:'trail',v:LOAD.trail});tx({t:'cls',v:LOAD.cls})}
  else{if(CARS.includes(m.skin))LOAD.skin=m.skin;if(TRAILS.includes(m.trail))LOAD.trail=m.trail;if(m.cls>=0&&m.cls<=3)LOAD.cls=m.cls|0;saveLoad()}
  if(m.name&&!myName){myName=m.name}
  if(first&&room0){const c=room0;room0='';try{history.replaceState(null,'',location.pathname)}catch(e){}tx({t:'join',room:c,make:1});waitUI()}
  else if(scr==='menu')menu();else if(scr==='rewards')rewardsUI();else if(scr==='stats')statsUI();else if(scr==='garage')garageUI(1)}
 else if(m.t==='p'){const d=now()-m.c;if(d>=0&&d<5000)NC.ping=NC.ping?NC.ping+(d-NC.ping)*.3:d}
 else if(m.t==='old'){online=0;setNet('off');try{ws.onclose=null;ws.close()}catch(e){}show('<div class="big-t">Update needed</div><p>A newer version of the game is available. Reload this page to get it.</p><button class="btn" data-a="reload">Reload</button>','old')}
 else if(m.t==='stats'){ST2=m;if(scr==='stats')statsUI()}
 else if(m.t==='war'){WARD=m;if(scr==='war')warUI()}
 else if(m.t==='ch'){rcode=m.room;shareChallenge()}
 else if(m.t==='replays'){RPLIST=m;if(scr==='replays')replaysUI()}
 else if(m.t==='rep'){LASTREP={id:m.id,exp:m.exp,days:m.days,slot:m.slot};if(scr==='result')resultReplay()}
 else if(m.t==='err'){show('<div class="big-t">Oops</div><p>'+esc(m.msg)+'</p><button class="btn ghost" data-a="menu">Back</button>','err')}
 else if(m.t==='full'){show('<div class="big-t">Room full</div><p>This room is full.</p><button class="btn ghost" data-a="menu">Back</button>','err')}
 else if(m.t==='rew'){const e=$('rw');if(scr==='result'&&e&&!m.daily)e.textContent='+'+m.xp+' XP, +'+m.coins+' coins'+(m.lv1>m.lv0?'. Level up! Level '+m.lv1:'')+(m.rd?'. Rating '+(m.rd>0?'+':'')+m.rd+' ('+m.tier+' '+m.rating+')':'')+(m.cpts?'. +'+m.cpts+' points for '+m.city:'')+(m.ach&&m.ach.length?'. Unlocked: '+m.ach.map(a=>ACHL[a]).join(', '):'')}
 else if(m.t==='lobby'){rcode=m.room;LB=m;if(!lobbyOK())return;lobbyUI()}
 else if(m.t==='wait'){rcode=m.room||rcode;if(!lobbyOK())return;show('<div class="big-t">Match in progress</div><p>You join the next round in about '+m.left+'s.</p><button class="btn ghost" data-a="leave">Leave room</button>','wait')}
 else if(m.t==='start'){
  if(RPL){RPL=null;FF=0;rpBar(null)}
  MP=1;VS=1;FF=0;QUIET=0;LASTREP=null;
  W=WW;H=WH;fit();genMap(m.seed||1);buildIsland();MINES.length=0;MNV=[];ZOWN=[];SHV=[];BLV=[];MSV=[];STV=[];SCORCH=[];RINGS=[];MYHOLD=0;MYUT=0;PRV.fill(0);HOLDV.fill(0);own.fill(0);MDIRTY=true;P=[null];for(let i=1;i<=5;i++)P.push(newP(i));
  me=P[1];MAP=[0];let k=2;for(let s=1;s<=5;s++)MAP[s]=s===m.you?1:k++;
  NM=['','','','','',''];for(let s=1;s<=5;s++)NM[MAP[s]]=s===m.you?'You':(m.names[s]||'');
  COS=[null];for(let s=1;s<=5;s++)COS[MAP[s]]=(m.cos&&m.cos[s])||['sport','glow'];
  CLSI.length=0;for(let s=1;s<=5;s++)CLSI[MAP[s]]=((m.cls&&m.cls[s])|0)%4;
  RDY=[1,1,0,1];lastSec=99;ncReset(m.you);
  KIND=m.kind||'quick';DEATH='';CAM.vz=60;CAM.fy=.5;FX=[];PO=[];FD=[];score=kills=streak=0;en=1;boost=0;shake=0;state='play';scr='play';hideOv();snd('start');wake()}
 else if(m.t==='s'&&state==='play'){ncOnSnap(m)}
 else if(m.t==='end'&&state==='play'){tl=0;hud(1);finish()}}
// ---------- screens: main menu, class select, garage, lobby, replays, settings, results ----------
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
// features that are built but not shown yet (switch on when they are ready to launch)
const FEAT={ranked:0,war:0,stats:0,rewards:0};
const ACHL={first:'First win',m10:'10 matches played',w10:'10 wins',k25:'25 takedowns',h50:'Held 50% of the map',s3:'3 wins in a row'};
const CITYL=['Hyderabad','Bengaluru','Chennai','Mumbai','Delhi','Pune','Kolkata','Ahmedabad','Jaipur','Lucknow','Kochi','Visakhapatnam','Vijayawada','Coimbatore','Indore','Chandigarh','Surat','Nagpur','Patna','Bhubaneswar','Guwahati','Warangal','Mysuru','Thiruvananthapuram'];
const MODEN={ranked:'Ranked',quick:'Quick match',private:'With friends',bots:'Practice',local:'Practice'};
const CLSIC=['fan','fort','strike','mine'];   // the icon that stands for each class
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n);
function show(h,s,cls,keep){scr=s;const o=$('ov'),c=$('card'),st=keep?c.scrollTop:0;if(cls==='gar'&&!GFX.ok)cls='pn';c.innerHTML=h;c.scrollTop=st;o.className=cls||'pn';
 if(!keep){c.style.animation='none';void c.offsetWidth;c.style.animation=''}
 gfxMode(cls==='gar'?'garage':'world')}
function hideOv(){$('ov').className='h';gfxMode('world')}
let toastT=0;function toast(t,ms){const e=$('toast');e.textContent=t;e.className='s';clearTimeout(toastT);toastT=setTimeout(()=>{e.className=''},ms||2400)}
const hdr=(t,a)=>'<div class="hd"><button class="back" data-a="'+(a||'menu')+'" aria-label="Back">'+IC.back+'</button><div class="ttl">'+t+'</div></div>';
const LOGO='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fe0ff"/><stop offset="1" stop-color="#7a4dff"/></linearGradient><linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a5c"/><stop offset="1" stop-color="#ff3d6b"/></linearGradient></defs><path d="M8 24C8 13 15 8 25 8h16c11 0 17 6 17 16v16c0 11-6 16-17 16H25C14 56 8 51 8 40z" fill="url(#lg1)"/><path d="M8 24C8 13 15 8 25 8h16c11 0 17 6 17 16v16c0 11-6 16-17 16H25C14 56 8 51 8 40z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/><path d="M34 8h7c11 0 17 6 17 16v8H34z" fill="url(#lg2)" opacity=".95"/><path d="M18 42 18 26 30 26 30 36 46 36 46 22" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="21" r="4.5" fill="#fff"/></svg>';
function initial(){const n=(myName||ME.name||'P').trim();return esc(n.charAt(0).toUpperCase()||'P')}
// ---------- main menu: a clear screen over the live showreel ----------
function classStrip(){const cl=LOAD.cls|0,C=CLS[cl];
 return '<button class="ccard" data-a="cls" style="--cc:'+C.col+'" aria-label="Change class"><span class="gl">'+IC[CLSIC[cl]]+'</span><span style="flex:1;min-width:0"><span class="chg">Your class &middot; tap to change</span><b>'+C.n+'</b><small>'+C.role+'</small></span><span class="ab3">'+C.ab.map(a=>'<i>'+IC[a.id]+'</i>').join('')+'</span></button>'}
function menu(){const m=ME,nm=esc(myName||m.name||'Player');
 const on=online,cnt=replayCount();
 show('<div class="mm-top"><button class="chip" data-a="garage" aria-label="Garage and profile"><span class="av">'+initial()+'</span><div style="flex:1;min-width:0"><b>'+nm+'</b><span class="sub">'+(on?'Level '+m.lv+' &middot; '+m.coins+' coins':'Tap to set up your car')+'</span>'+(on?'<div class="xp"><i style="width:'+m.pr+'%"></i></div>':'')+'</div></button><button class="ibtn" data-a="settings" aria-label="Settings">'+IC.gear+'</button></div>'
 +'<div class="logo">'+LOGO+'<h1 style="margin:0">'+(wmURL()?'<img class="wmi" alt="Territory Control" src="'+wmURL()+'">':'<span class="wmt">TERRITORY<b>CONTROL</b></span>')+'</h1><p class="tag">Claim the map</p></div>'
 +'<div class="mm-btns">'+classStrip()
 +'<button class="btn play" data-a="quick">'+IC.play+'<span class="tx">PLAY<small>'+(on?'Online match &middot; 2 min':'Offline &middot; vs bots')+'</small></span></button>'
 +'<div class="row">'+(on?'<button class="btn" data-a="bots">'+IC.bots+'<span class="tx">Practice<small>vs bots</small></span></button>':'')
 +'<button class="btn vio'+(on?'':' off')+'" data-a="friends">'+IC.friends+'<span class="tx">Friends<small>'+(on?'Private room':'Needs server')+'</small></span></button></div>'
 +(FEAT.ranked?'<button class="btn alt" data-a="ranked">'+IC.trophy+'<span class="tx">Ranked 1v1</span></button>':'')
 +'<div class="tri"><button class="tile" data-a="replays">'+(cnt?'<i>'+cnt+'</i>':'')+IC.replay+'Replays</button><button class="tile" data-a="garage">'+IC.garage+'Garage</button><button class="tile" data-a="how">'+IC.how+'How to play</button></div>'
 +'<div class="mm-foot" id="nst">'+netLine()+'</div></div>','menu','mm')}
function friendsUI(){show(hdr('Play with friends')+'<button class="btn gr" data-a="create">'+IC.friends+'Create a room</button><p class="hint">or enter a room code</p><input id="cd" class="inp code" maxlength="8" placeholder="ROOM CODE" autocomplete="off" autocapitalize="characters"><button class="btn" data-a="joincode">Join room</button>','friends')}
function waitUI(){show('<div class="big-t">Finding a match</div><div class="spin"></div><p class="hint">One moment...</p><button class="btn ghost" data-a="leave">Cancel</button>','conn')}
function lobbyUI(){const m=LB;if(!m)return menu();const rk=m.kind==='ranked';
 show('<div class="big-t">'+(rk?'Ranked 1v1':m.kind==='quick'?'Quick match':'Room <span class="code">'+esc(m.room)+'</span>')+'</div><p>'+(rk?(m.n<2?'Searching for an opponent...':'Opponent found.'):m.n+(m.n===1?' player':' players')+' here.')+' '
 +(m.cd>=0?'Match starts in <b style="color:#fff">'+m.cd+'s</b>.':(m.fl>0?'Bots join in <b style="color:#fff">'+m.fl+'s</b> if nobody else comes.':(!rk&&m.n<2&&m.kind!=='quick'?'Share the invite.':'')))+'</p>'
 +m.pl.map((a,i)=>'<div class="rw"><i class="d" style="--c:'+COLS[i+1]+'"></i><span>'+esc(a[0])+'</span><em>'+(rk?a[3]+' rating':'Lv '+a[1])+'</em></div>').join('')
 +(rk?'':'<button class="btn" data-a="invite">'+IC.share+'Share invite</button>'+(m.host?(m.n>1?'<button class="btn gr" data-a="go">Start now</button>':'')+'<button class="btn alt" data-a="gob">Start with bots</button>':''))
 +'<button class="btn ghost" data-a="leave">'+(rk?'Cancel':'Leave room')+'</button>','lobby')}
function howUI(){const r=(n,t)=>'<div class="rw" style="align-items:flex-start"><b style="width:22px;color:#7fe3ff;opacity:1">'+n+'</b><span style="white-space:normal;line-height:1.35">'+t+'</span></div>';
 show(hdr('How to play')
 +r(1,'<b>Steer</b> by dragging anywhere. Your car always drives forward.')
 +r(2,'Leave your land to draw a <b>trail</b>. Loop back home and everything inside is yours.')
 +r(3,'If a rival touches your trail you are out. Cut theirs first.')
 +r(4,'Take a rival out and <b>all of their land becomes yours</b>.')
 +r(5,'Pick a <b>class</b>: Striker, Titan, Gunner or Sapper. Each has two quick abilities and an <b>Ultimate</b> that charges as you capture land and take rivals out.')
 +r(6,'<b>Exposed</b>: weapons only hurt cars that are <u>outside</u> their own land. Home is safe, but your trail is not.')
 +r(7,'Weapons <b>blow land apart</b>. Destroyed land stays <b>scorched</b> for 15 seconds: closing a loop round it will not fill it, only driving over it wins it back.')
 +r(8,'Hold <b>Boost</b> to go faster. It drains the bar, and recharges when you let go.')
 +r(9,'Own half of a <b>power zone</b> to unlock a power: Cannon, Fortify, Airstrike or Nitro.')
 +'<p class="hint">Keyboard: mouse to steer, Q / E abilities, R ultimate, Space boost, Z X C zone powers.<br>Matches last 2 minutes. The most land wins.</p>','how')}
// ---------- class select: four classes, each with its own weapons ----------
function classTabs(cl,act){return CLS.map((c,i)=>'<button class="ctab'+(i===cl?' on':'')+'" data-a="'+act+'" data-v="'+i+'" style="--cc:'+c.col+'"><span class="gl">'+IC[CLSIC[i]]+'</span>'+c.n+'</button>').join('')}
function classUI(keep){const lo=LOAD,cl=lo.cls|0,C=CLS[cl];
 GGUI.cl=cl;GGUI.skin=lo.skin;GGUI.col=COLS[1];
 const stN=['Speed','Armour','Firepower','Control'];
 const stats=C.st.map((v,i)=>'<span>'+stN[i]+'</span><span class="bar">'+[1,2,3,4,5].map(k=>'<i'+(k<=v?' class="f"':'')+'></i>').join('')+'</span>').join('');
 const abs=C.ab.map((a,j)=>a.off?'':'<div class="abl"><span class="ic">'+IC[a.id]+'</span><span style="flex:1;min-width:0"><b>'+a.n+'</b><small>'+a.d+'</small></span><span class="cdn">'+(j<2?a.cd+'s<br>recharge':'ULTIMATE<br>'+(a.ut?a.ut+'s':'instant'))+'</span></div>').join('');
 show(hdr('Choose your class')+(GFX.ok?'':'<canvas class="pvf" id="gpv" width="480" height="240"></canvas>')+'<div class="ctabs">'+classTabs(cl,'pick')+'</div>'
 +'<div class="cdet" style="--cc:'+C.col+'"><div class="nm"><b>'+C.n+'</b><span>'+C.role+'</span></div><p>'+C.d+'</p><div class="stats">'+stats+'</div>'+abs+'</div>'
 +'<button class="btn gr" data-a="menu">'+IC.check+'<span class="tx c">Use '+C.n+'</span></button>','cls','gar',keep);
 pvFallback()}
function pvFallback(){const c=document.getElementById('gpv');if(!c)return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.fillStyle=lg(g,0,0,0,c.height,[[0,'#22345a'],[1,'#0d1630']]);g.fillRect(0,0,c.width,c.height);carChip(c.width/2,c.height/2,c.height*.2,COLS[1],-.3,g)}
// ---------- garage: name, class, paint and trail, with the car turning above ----------
function skinThumb(c,skin,cl,col){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);
 g.fillStyle=lg(g,0,0,0,H,[[0,'#24375f'],[1,'#0c1530']]);g.fillRect(0,0,W,H);g.fillStyle=rg(g,W/2,H*.5,0,W/2,H*.5,W*.5,[[0,'rgba(120,190,255,.30)'],[1,'rgba(120,190,255,0)']]);g.fillRect(0,0,W,H);
 const L=W*.74,B=H*.54,x0=(W-L)/2,y0=(H-B)/2,lv=liveryCanvas(col,skin,cl);
 g.fillStyle='#07080b';for(const fx of [.2,.78])for(const sy of [-1,1]){g.beginPath();g.roundRect(x0+L*fx-L*.085,H/2+sy*B*.5-(sy>0?B*.07:B*.09),L*.17,B*.16,B*.05);g.fill()}
 g.save();g.shadowColor='rgba(0,0,0,.6)';g.shadowBlur=H*.08;g.shadowOffsetY=H*.03;g.beginPath();g.roundRect(x0,y0,L,B,B*.42);g.fillStyle='#000';g.fill();g.restore();
 g.save();g.beginPath();g.roundRect(x0,y0,L,B,B*.42);g.clip();g.drawImage(lv,x0,y0,L,B);
 g.fillStyle='rgba(8,14,26,.88)';g.beginPath();g.roundRect(x0+L*.3,y0+B*.16,L*.34,B*.68,B*.2);g.fill();
 g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.roundRect(x0+L*.33,y0+B*.2,L*.17,B*.17,B*.07);g.fill();
 g.fillStyle=lg(g,0,y0,0,y0+B,[[0,'rgba(255,255,255,.38)'],[.45,'rgba(255,255,255,0)']]);g.fillRect(x0,y0,L,B);g.restore();
 g.fillStyle='#fff7d8';for(const sy of [-1,1]){g.beginPath();g.roundRect(x0+L*.94,H/2+sy*B*.27-B*.06,L*.04,B*.12,B*.04);g.fill()}
 g.fillStyle='#ff3b3b';for(const sy of [-1,1]){g.beginPath();g.roundRect(x0+L*.02,H/2+sy*B*.27-B*.05,L*.03,B*.1,B*.03);g.fill()}}
function trailThumb(c,k,col){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);
 g.fillStyle=lg(g,0,0,0,H,[[0,'#1a2b4d'],[1,'#0a1328']]);g.fillRect(0,0,W,H);
 const pts=[];for(let i=0;i<=40;i++){const u=i/40;pts.push([W*(.1+.8*u),H*(.5+Math.sin(u*6.1)*.2*Math.sin(u*3.14))])}
 const path=()=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]))};g.lineCap=g.lineJoin='round';
 if(k==='glow'){for(const [w,a] of [[.36,.16],[.24,.28],[.13,.55]]){g.strokeStyle=rgba(col,a);g.lineWidth=H*w;path();g.stroke()}g.strokeStyle='#fff';g.lineWidth=H*.05;path();g.stroke()}
 else if(k==='neon'){g.strokeStyle=rgba(col,.28);g.lineWidth=H*.3;path();g.stroke();g.strokeStyle=col;g.lineWidth=H*.16;path();g.stroke();g.strokeStyle='#fff';g.lineWidth=H*.05;path();g.stroke();
  g.strokeStyle=rgba('#000000',.55);g.lineWidth=H*.025;for(let i=3;i<pts.length-2;i+=4){const p=pts[i],q=pts[i+1],a=Math.atan2(q[1]-p[1],q[0]-p[0]);g.beginPath();g.moveTo(p[0]-Math.cos(a-1)*H*.07,p[1]-Math.sin(a-1)*H*.07);g.lineTo(p[0],p[1]);g.lineTo(p[0]-Math.cos(a+1)*H*.07,p[1]-Math.sin(a+1)*H*.07);g.stroke()}}
 else{for(const [w,c2] of [[.34,'rgba(255,70,10,.28)'],[.2,'#ff6a14'],[.1,'#ffb02e'],[.04,'#fff0b0']]){g.strokeStyle=c2;g.lineWidth=H*w;path();g.stroke()}
  for(let i=0;i<22;i++){const p=pts[(i*7+3)%pts.length],a=i*2.4;g.fillStyle=i%2?'#ffd27a':'#ff7a1a';g.beginPath();g.arc(p[0]+Math.cos(a)*H*.2,p[1]-Math.abs(Math.sin(a))*H*.22-H*.05,H*.016+((i*5)%3)*H*.008,0,7);g.fill()}}}
function garageUI(keep){const lo=LOAD,cl=lo.cls|0;
 GGUI.cl=cl;GGUI.skin=lo.skin;GGUI.col=COLS[1];
 show(hdr('Garage')+(GFX.ok?'':'<canvas class="pvf" id="gpv" width="480" height="240"></canvas>')
 +'<input id="nm" class="inp" maxlength="12" placeholder="Your name" autocomplete="off" autocapitalize="words" value="'+esc(myName||(online?ME.name:'')||'')+'">'
 +'<div class="sec">Class</div><div class="ctabs">'+classTabs(cl,'pick')+'</div>'
 +'<div class="sec">Paint</div><div class="grid3">'+CARS.map(k=>'<button class="opt'+(lo.skin===k?' on':'')+'" data-a="skin" data-v="'+k+'"><canvas width="240" height="120" data-car="'+k+'"></canvas>'+CARDEF[k]+'</button>').join('')+'</div>'
 +'<div class="sec">Trail</div><div class="grid3">'+TRAILS.map(k=>'<button class="opt'+(lo.trail===k?' on':'')+'" data-a="trail" data-v="'+k+'"><canvas width="240" height="120" data-trl="'+k+'"></canvas>'+TRLDEF[k]+'</button>').join('')+'</div>'
 +'<p class="hint">Paint and trails are cosmetic. Nothing here changes how strong you are.</p>','garage','gar',keep);
 for(const c of $('card').querySelectorAll('canvas[data-car]'))skinThumb(c,c.dataset.car,cl,COLS[1]);for(const c of $('card').querySelectorAll('canvas[data-trl]'))trailThumb(c,c.dataset.trl,COLS[1]);
 pvFallback()}
function setLoad(k,v){LOAD[k]=v;saveLoad();if(online)tx({t:k,v});else LOAD.dirty=1;ME[k]=v;resetCos();if(k==='cls')snd('ui');if(scr==='cls')classUI(1);else garageUI(1)}
// ---------- settings ----------
function saveSet(){lsSet('ct-set',JSON.stringify(SET))}
function settingsUI(){const sw=(k,t,s)=>'<button class="sw" data-a="set" data-v="'+k+'" style="width:100%"><b>'+t+(s?'<small>'+s+'</small>':'')+'</b><span class="tg'+(SET[k]?' on':'')+'"></span></button>';
 const QN={auto:'Auto',high:'High',med:'Medium',low:'Low'};
 show(hdr('Settings')+sw('music','Music','The soundtrack follows the match')+'<div class="sw"><b>Music volume</b><input type="range" id="mvol" min="0" max="100" value="'+Math.round(SET.mvol*100)+'" aria-label="Music volume"></div>'+sw('sfx','Sound effects','')+sw('vib','Vibration','Haptics on supported phones')
 +'<div class="sw" style="flex-wrap:wrap"><b style="flex:1 1 100%">Graphics<small>Auto picks the sharpest picture your phone can keep smooth'+(SET.q==='auto'?' (now: '+QN[QNAME]+')':'')+'</small></b><span class="seg" style="width:100%">'+['auto','high','med','low'].map(q=>'<button style="flex:1" class="'+(SET.q===q?'on':'')+'" data-a="qual" data-v="'+q+'">'+QN[q]+'</button>').join('')+'</span></div>'
 +sw('fps','Show frame rate','For testing: FPS, picture size, draw calls and ping')
 +'<button class="btn ghost" data-a="clearrp">Delete replays saved on this device</button><p class="hint">Territory Control v'+VER+' &middot; replays are kept for '+(ME.rdays||7)+' days</p>','settings')}
// ---------- replays: matches are recorded and kept for a few days ----------
function localIdx(){try{const a=JSON.parse(lsGet('ct-rpx','[]'));return Array.isArray(a)?a:[]}catch(e){return[]}}
function purgeLocal(){const now=Date.now(),keep=[];for(const r of localIdx()){if(r.exp>now&&lsGet('ct-rp-'+r.id,null)!==null)keep.push(r);else lsDel('ct-rp-'+r.id)}lsSet('ct-rpx',JSON.stringify(keep))}
function saveLocalReplay(json,meta){const id='l'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),days=+ME.rdays||7;let ok=lsSet('ct-rp-'+id,json);const a=localIdx();
 while(!ok&&a.length){const o=a.pop();lsDel('ct-rp-'+o.id);ok=lsSet('ct-rp-'+id,json)}
 if(!ok)return null;const exp=Date.now()+days*864e5;a.unshift({id,t:Date.now(),exp,place:meta.place,pct:meta.pct,kind:meta.kind});
 while(a.length>6){const o=a.pop();lsDel('ct-rp-'+o.id)}lsSet('ct-rpx',JSON.stringify(a));return{local:id,exp,days,slot:1}}
function replayCount(){const n=RPLIST&&RPLIST.list?RPLIST.list.length:0;return n+localIdx().length}
const left=exp=>{const h=(exp-Date.now())/36e5;return h>=24?Math.ceil(h/24)+'d left':Math.max(1,Math.ceil(h))+'h left'};
function when(t){const d=new Date(t),n=new Date(),tm=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});if(d.toDateString()===n.toDateString())return 'Today '+tm;const y=new Date(n-864e5);if(d.toDateString()===y.toDateString())return 'Yesterday '+tm;return d.toLocaleDateString([],{day:'numeric',month:'short'})+' '+tm}
function replaysUI(){purgeLocal();const rows=[];
 if(RPLIST&&RPLIST.list)for(const a of RPLIST.list)rows.push({id:a[0],t:a[1],exp:a[2],kind:a[3],place:a[4],pct:a[5],slot:a[6]});
 for(const r of localIdx())rows.push({id:r.id,local:1,t:r.t,exp:r.exp,kind:r.kind,place:r.place,pct:r.pct,slot:1});
 rows.sort((a,b)=>b.t-a.t);
 show(hdr('Replays')+'<p class="hint" style="margin-top:0;text-align:left">Every match is recorded. Watch it again from any player, at any speed. Kept for '+(ME.rdays||(RPLIST&&RPLIST.days)||7)+' days, then deleted.</p>'
 +(rows.length?rows.map(r=>'<div class="rw"><b style="width:auto;opacity:1;color:'+(r.place===1?'#ffd54a':'#fff')+'">#'+(r.place||'-')+'</b><span style="line-height:1.25">'+(MODEN[r.kind]||r.kind)+' &middot; '+r.pct+'%<br><small style="opacity:.7;font-weight:500">'+when(r.t)+' &middot; '+left(r.exp)+(r.local?' &middot; this device':'')+'</small></span>'
  +(r.local?'':'<button class="sh" data-a="rpshare" data-v="'+r.id+'" aria-label="Share">'+IC.share+'</button>')+'<button class="go" data-a="rpwatch" data-v="'+r.id+'" data-l="'+(r.local?1:0)+'" data-s="'+r.slot+'">Watch</button></div>').join('')
  :'<div class="empty">'+(online||RPLIST?'No replays yet. Play a match and it shows up here.':'Play a practice match and it shows up here.')+'</div>')
 +(online&&!RPLIST?'<div class="spin"></div>':''),'replays');
 if(online&&!RPLIST)tx({t:'replays'})}
async function openReplay(id,local,slot){if(online&&LB&&KIND!=='private'){tx({t:'leave'});LB=null}show('<div class="big-t">Loading replay</div><div class="spin"></div>','load');
 try{let txt;
  if(local){txt=lsGet('ct-rp-'+id,null);if(txt==null){toast('That replay is gone');replaysUI();return}}
  else{const b=httpBase();if(!b){toast('Needs the server');replaysUI();return}const r=await fetch(b+'/r/'+encodeURIComponent(id),{cache:'no-store'});
   if(r.status===404){show('<div class="big-t">Replay expired</div><p>Replays are deleted after '+(ME.rdays||7)+' days.</p><button class="btn ghost" data-a="menu">Back</button>','gone');return}
   if(!r.ok)throw new Error('http '+r.status);txt=await r.text()}
  const rec=JSON.parse(txt);if(!startReplay(rec,slot,{id,local})){replaysUI()}}
 catch(e){console.error(e);toast('Could not load the replay');if(scr==='load')replaysUI()}}
function shareReplay(id){const u=location.origin+location.pathname+'?replay='+encodeURIComponent(id),t='Watch my Territory Control match!';
 try{if(navigator.share)navigator.share({title:'Territory Control',text:t,url:u}).catch(()=>{});else{navigator.clipboard.writeText(u).then(()=>toast('Link copied'),()=>toast(u,5000))}}catch(e){toast(u,5000)}}
// ---------- replay controls (shown over the replayed match) ----------
let skDrag=0;
function rpBar(mode){const b=$('rpb');
 if(mode===null){b.style.display='none';b.innerHTML='';return}
 b.style.display='block';
 if(mode===true||!b.firstChild){b.innerHTML='<div class="t"><span id="rpt0">0:00</span><div class="sk" id="rpsk"><i></i><u></u><s></s></div><span id="rpt1">0:00</span></div><div class="bt"><button data-a="rppause" id="rppp" aria-label="Pause">'+IC.pause+'</button><button data-a="rprestart" aria-label="Restart">'+IC.restart+'</button><button data-a="rpspeed" id="rpsp">1x</button><div class="vs" id="rpvs"></div><button data-a="rpclose" aria-label="Close">'+IC.x+'</button></div>';
  const sk=$('rpsk'),f=e=>{const r=sk.getBoundingClientRect();return Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))};
  sk.addEventListener('pointerdown',e=>{e.stopPropagation();skDrag=1;sk.setPointerCapture(e.pointerId);rpThumb(f(e))});
  sk.addEventListener('pointermove',e=>{if(skDrag)rpThumb(f(e))});
  sk.addEventListener('pointerup',e=>{if(skDrag){skDrag=0;rpSeek(f(e))}});sk.addEventListener('pointercancel',()=>{skDrag=0})}
 const vs=$('rpvs');if(vs&&RPL)vs.innerHTML=[1,2,3,4,5].filter(i=>NM[i]).map(i=>'<button class="'+(i===VS?'on':'')+'" style="--c:'+COLS[i]+'" data-a="rpview" data-v="'+i+'"><i></i>'+esc(NM[i].replace('\u{1F916} ',''))+'</button>').join('');
 rpUpd()}
function rpThumb(f){const sk=$('rpsk');if(!sk)return;sk.querySelector('u').style.width=f*100+'%';sk.querySelector('s').style.left=f*100+'%'}
function rpUpd(){if(!RPL)return;const pp=$('rppp');if(pp)pp.innerHTML=RPL.paused&&!RPL.done?IC.play:IC.pause;const sp=$('rpsp');if(sp)sp.textContent=RPL.speed+'x'}
let rpT=0;function rpProg(){if(!RPL||skDrag)return;const f=Math.min(1,TK/Math.max(1,RPL.rec.ticks));rpThumb(f);const a=$('rpt0'),b=$('rpt1'),s=Math.floor(TK/30),e=Math.floor(RPL.rec.ticks/30);if(a)a.textContent=(s/60|0)+':'+String(s%60).padStart(2,'0');if(b)b.textContent=(e/60|0)+':'+String(e%60).padStart(2,'0')}
// ---------- results ----------
function finish(){
 if(state!=='play')return;state='over';
 const rk=[1,2,3,4,5].filter(i=>NM[i]).sort((a,b)=>CN[b]-CN[a]),r=rk.indexOf(VS)+1,pc=Math.round(CN[VS]*1000/LANDN)/10;LASTPC=pc;if(KIND==='ranked')LB=null;
 LASTREP=null;if(!MP&&REC){try{const j=recEnd();if(j){const o=JSON.parse(j);o.names=NM.slice();o.cos=COS.map(c=>c?c.slice():c);o.kind='bots';o.hum=[[1,myName||'You']];o.t1=Date.now();LASTREP=saveLocalReplay(JSON.stringify(o),{place:r,pct:pc,kind:'bots'})}}catch(e){console.error(e)}}
 resultUI(rk,r,pc);
 if(r===1){burst(me.rx,me.ry,'#ffd54a',80,14);snd('win')}else snd('lose')}
function resultUI(rk,r,pc){const ord=['','1st','2nd','3rd','4th','5th'][r]||r+'th',win=r===1;
 show('<div class="res-p'+(win?' w':'')+'">'+ord+'</div><p style="margin-top:0">'+(win?'Victory! ':'')+'You held <b style="color:#fff">'+pc+'%</b> of the map</p>'
  +rk.map((i,k)=>'<div class="rw'+(i===VS?' me':'')+'"><b>'+(k+1)+'</b><i class="d" style="--c:'+COLS[i]+'"></i><span>'+esc(NM[i])+'</span>'+(CLSI[i]!==undefined?'<span class="cg" style="--c:'+CLS[CLSI[i]|0].col+'" title="'+CLS[CLSI[i]|0].n+'">'+IC[CLSIC[CLSI[i]|0]]+'</span>':'')+'<em>'+Math.round(CN[i]*100/LANDN)+'%</em></div>').join('')
  +'<p id="rw" class="hint">'+(MP?'Saving rewards...':'')+'</p><div id="rpslot"></div>'
  +(MP?(KIND==='ranked'?'<button class="btn vio" data-a="ranked">Play ranked again</button>':'<button class="btn gr" data-a="cont">'+(KIND==='quick'?'Next match':'Continue')+'</button>'):'<button class="btn gr" data-a="again">Play again</button>')
  +'<button class="btn" data-a="cls">'+IC.fan+'<span class="tx c">Change class</span></button><button class="btn ghost" data-a="menu2">Menu</button>','result');resultReplay()}
function resultReplay(){const e=$('rpslot');if(!e)return;
 if(!LASTREP){e.innerHTML=MP?'<p class="hint" style="margin:0">Saving the replay...</p>':'';return}
 e.innerHTML='<button class="btn vio" data-a="watchlast">'+IC.replay+'<span class="tx">Watch replay<small>Saved for '+(LASTREP.days||7)+' days</small></span></button>'}
// the server keeps sending lobby updates to a player who is still in a room; they may only take over the screen when the player is waiting
const NOTAKE={result:1,replay:1,rpend:1,load:1,replays:1,garage:1,cls:1,settings:1,rewards:1,stats:1,war:1,how:1,gone:1};
function lobbyOK(){return state!=='play'&&state!=='replay'&&!RPL&&!NOTAKE[scr]}
// pause: a practice match stops while the menu is up; an online match carries on (the server does not wait), so it is only a menu there
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play'&&!MP&&!RPL)pauseSet(1)});
// a short dark curtain while the arena is built (about a second on a phone): the start is a clean cut, not a menu that freezes
// on a phone a match takes the whole screen (Android hides the browser bars; an iPhone browser cannot, the home-screen app can) and keeps the screen awake
let WAKE=null;
function phoneMode(){if(!PHONE)return;
 try{const st=matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches,el=document.documentElement;if(!st&&!document.fullscreenElement&&el.requestFullscreen){const r=el.requestFullscreen({navigationUI:'hide'});if(r&&r.catch)r.catch(()=>{})}}catch(e){}
 try{if(navigator.wakeLock&&!WAKE)navigator.wakeLock.request('screen').then(w=>{WAKE=w;w.addEventListener('release',()=>{WAKE=null})},()=>{})}catch(e){}}
function curtain(fn){const f=$('fade');if(!f||!GFX.ok){fn();return}f.innerHTML='<b>Loading the arena\u2026</b>';f.style.transition='none';f.style.opacity='1';
 setTimeout(()=>{try{fn()}finally{setTimeout(()=>{f.style.transition='opacity .45s';f.style.opacity='0';setTimeout(()=>{f.style.removeProperty('opacity');f.style.removeProperty('transition');f.innerHTML=''},520)},90)}},60)}
function pauseSet(v){v=v?1:0;const m=$('pzm');if(m)m.classList.toggle('on',!!v);PAUSED=v&&!MP?1:0;if(v){ptr.down=0;ptr.id=null;setBoost(0)}}
function backToMenu(){if(online&&LB){tx({t:'leave'});LB=null}hideOv();RPL=null;FF=0;rpBar(null);bgStart();menu();musicScene()}
function shareInv(){const u=location.origin+location.pathname+'?room='+rcode;try{if(navigator.share)navigator.share({title:'Territory Control',text:'Join my match!',url:u}).catch(()=>{});else{navigator.clipboard.writeText(u).then(()=>toast('Link copied'),()=>toast(u,5000))}}catch(e){toast(u,5000)}}
function shareChallenge(){const u=location.origin+location.pathname+(rcode?'?room='+rcode:''),t='I captured '+LASTPC+'%'+(ME.city?' for '+ME.city:'')+'. Can you beat me?';
 try{if(navigator.share)navigator.share({title:'Territory Control',text:t,url:u}).catch(()=>{});else navigator.clipboard.writeText(t+' '+u).catch(()=>{})}catch(e){}}
// ---------- features that are built but switched off for now ----------
function statsUI(){const m=ME,t=ST2;show(hdr('Your stats')+'<div class="sg"><div><b>'+m.games+'</b>matches</div><div><b>'+m.wins+'</b>wins</div><div><b>'+(m.games?Math.round(m.wins*100/m.games):0)+'%</b>win rate</div><div><b>'+m.best+'%</b>best share</div><div><b>'+m.kills+'</b>takedowns</div><div><b>'+m.deaths+'</b>deaths</div></div>'
 +'<div class="sec">Recent matches</div>'+(t&&t.recent.length?t.recent.map(a=>'<div class="rw"><b>#'+a[2]+'</b><span>'+(MODEN[a[1]]||a[1])+', '+a[4]+'%</span><em>'+new Date(a[0]).toLocaleDateString()+'</em></div>').join(''):'<p class="hint">No matches yet.</p>')
 +'<div class="sec">Top players</div>'+(t&&t.top.length?t.top.map((a,k)=>'<div class="rw"><b>'+(k+1)+'</b><span>'+esc(a[0])+'</span><em>Lv '+a[1]+', '+a[2]+' wins</em></div>').join(''):'<p class="hint">No leaderboard yet.</p>'),'stats')}
function rewardsUI(){show(hdr('Rewards')+'<button class="btn"'+(ME.dok?'':' disabled')+' data-a="daily">'+(ME.dok?'Claim daily reward':'Daily reward claimed')+'</button><p class="hint">Day streak: '+ME.dst+'. Come back tomorrow for more.</p>'
 +'<div class="sec">Achievements</div>'+Object.keys(ACHL).map(k=>{const d=ME.ach.includes(k);return '<div class="rw"><i class="d" style="--c:'+(d?'#1fbf75':'#555')+'"></i><span>'+ACHL[k]+'</span><em>'+(d?'Done':'+100 coins')+'</em></div>'}).join('')+'<p class="hint">Coins and XP are in-game rewards only. They have no cash value.</p>','rewards')}
const DEMOWAR={season:'2026-10',demo:1,cities:[['Hyderabad','Telangana',128400],['Bengaluru','Karnataka',121300],['Chennai','Tamil Nadu',108900],['Mumbai','Maharashtra',97200],['Delhi','Delhi',80100],['Pune','Maharashtra',62000]],states:[['Maharashtra',159200],['Karnataka',141000],['Telangana',131200],['Tamil Nadu',118400],['Delhi',80100]],top:[['Arjun',1842,'Hyderabad'],['Meera',1790,'Bengaluru'],['Kabir',1733,'Chennai'],['Isha',1688,'Mumbai'],['Rohan',1651,'Pune']],my:{}};
function warUI(){const w=WARD,m=ME,my=(w&&w.my)||{};
 show(hdr('City War')+'<p class="hint">'+(w&&w.demo?'Demo data. ':'')+(w?'Season '+w.season+'. ':'')+'Quick and ranked matches score points for '+esc(m.city||'your city')+'.</p><select id="city" class="inp"><option value="">Choose your city</option>'+CITYL.map(c=>'<option'+(m.city===c?' selected':'')+'>'+c+'</option>').join('')+'</select>'
 +'<div class="sg"><div><b>'+(my.india?'#'+my.india:'-')+'</b>India</div><div><b>'+(my.state?'#'+my.state:'-')+'</b>'+esc(m.state||'State')+'</div><div><b>'+(my.city?'#'+my.city:'-')+'</b>'+esc(m.city||'City')+'</div></div>'
 +'<div class="sec">Cities</div>'+(w&&w.cities.length?w.cities.map((a,k)=>'<div class="rw"><b>'+(k+1)+'</b><span>'+esc(a[0])+'</span><em>'+fmt(a[2])+'</em></div>').join(''):'<p class="hint">No points yet this season.</p>')
 +'<div class="sec">States</div>'+(w&&w.states.length?w.states.map((a,k)=>'<div class="rw"><b>'+(k+1)+'</b><span>'+esc(a[0])+'</span><em>'+fmt(a[1])+'</em></div>').join(''):'<p class="hint">No points yet this season.</p>'),'war')}
// ---------- buttons ----------
function act(a,v,el){
 switch(a){
  case 'start':bootStart();break;
  case 'reload':location.reload();break;
  case 'quick':if(online){tx({t:'quick'});waitUI()}else localMatch(4,'bots');break;
  case 'ranked':if(online){tx({t:'ranked'});waitUI()}else localMatch(1,'ranked');break;
  case 'bots':phoneMode();curtain(()=>localMatch(4,'bots'));break;
  case 'friends':if(online)friendsUI();else toast('Playing with friends needs the server');break;
  case 'create':tx({t:'create'});waitUI();break;
  case 'joincode':{const c=String($('cd').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(c){tx({t:'join',room:c});waitUI()}break}
  case 'stats':ST2=null;statsUI();tx({t:'stats'});break;
  case 'war':WARD=online?null:DEMOWAR;warUI();if(online)tx({t:'war'});break;
  case 'garage':garageUI();break;
  case 'cls':classUI();break;
  case 'settings':settingsUI();break;
  case 'replays':replaysUI();break;
  case 'how':howUI();break;
  case 'rewards':rewardsUI();break;
  case 'daily':tx({t:'daily'});break;
  case 'pick':if((+v|0)!==(LOAD.cls|0))setLoad('cls',+v|0);break;
  case 'skin':case 'trail':if(v!==LOAD[a])setLoad(a,v);break;
  case 'set':SET[v]=SET[v]?0:1;saveSet();if(AUD)AUD.apply();if(v==='fps')fpsShow();settingsUI();break;
  case 'qual':SET.q=v;saveSet();GFX.scale=1;GFX.cap=1;applyQuality();settingsUI();break;
  case 'clearrp':for(const r of localIdx())lsDel('ct-rp-'+r.id);lsSet('ct-rpx','[]');toast('Deleted');break;
  case 'challenge':if(online&&MP)tx({t:'challenge'});else shareChallenge();break;
  case 'invite':shareInv();break;
  case 'go':tx({t:'go',bots:0});break;
  case 'gob':tx({t:'go',bots:1});break;
  case 'leave':tx({t:'leave'});LB=null;backToMenu();break;
  case 'cont':if(online&&KIND==='quick'){tx({t:'quick'});waitUI()}else LB?lobbyUI():backToMenu();break;
  case 'again':localMatch(4,'bots');break;
  case 'back':case 'menu':backToMenu();break;
  case 'menu2':case 'quit':pauseSet(0);if(MP||online)tx({t:'leave'});LB=null;backToMenu();break;
  case 'pause':pauseSet(1);break;
  case 'resume':pauseSet(0);break;
  case 'watchlast':if(LASTREP)openReplay(LASTREP.id||LASTREP.local,!!LASTREP.local,LASTREP.slot||1);break;
  case 'rpwatch':openReplay(v,el&&el.dataset.l==='1',+(el&&el.dataset.s)||1);break;
  case 'rpshare':shareReplay(v);break;
  case 'rppause':rpToggle();break;
  case 'rprestart':hideOv();rpRestart();break;
  case 'rpspeed':rpSpeed();break;
  case 'rpview':rpView(+v);break;
  case 'rpclose':rpClose();break;
 }}
document.addEventListener('click',e=>{const b=e.target&&e.target.closest?e.target.closest('[data-a]'):null;if(!b||b.disabled)return;au();uis();act(b.dataset.a,b.dataset.v,b)});
document.addEventListener('input',e=>{const t=e.target;if(t&&t.id==='mvol'){SET.mvol=t.value/100;saveSet();if(AUD)AUD.apply()}});
document.addEventListener('change',e=>{const t=e.target;if(!t)return;
 if(t.id==='nm'){myName=String(t.value).trim().slice(0,12);lsSet('ct-name',myName);tx({t:'name',name:myName})}
 else if(t.id==='city')tx({t:'city',city:t.value})});
// ---------- sound: a small synthesiser, the sound effects and the adaptive music (nothing is downloaded) ----------
// Everything is built from oscillators and noise, so the whole soundtrack costs zero bytes of audio files.
// makeAudio(ctx) works on a live AudioContext and on an OfflineAudioContext (used by the tests to render and measure the music).
const MIDI=n=>440*Math.pow(2,(n-69)/12),fold=(m,lo)=>lo+(((m-lo)%12)+12)%12;
// three musical moods that match the island lighting: Day, Golden hour, Dusk.  k = key note, pen = melody scale, ar = arpeggio order,
// ch = eight chords [semitones above the key, chord tones]: bars 1-4 ask, bars 5-8 answer
const MUSD=[
 {n:'Day',k:48,pen:[0,2,4,7,9],ar:[0,1,2,3,2,1,2,3,0,1,2,3,2,1,3,2],
  ch:[[0,[0,4,7,11]],[7,[0,4,7,14]],[9,[0,3,7,10]],[5,[0,4,7,11]],[0,[0,4,7,11]],[7,[0,4,7,14]],[5,[0,4,7,11]],[7,[0,5,7,10]]]},
 {n:'Golden hour',k:50,pen:[0,2,4,7,9],ar:[0,2,1,3,2,3,1,2,0,2,1,3,2,3,1,3],
  ch:[[0,[0,4,7,11]],[9,[0,3,7,10]],[5,[0,4,7,11]],[7,[0,4,7,14]],[5,[0,4,7,11]],[7,[0,4,7,14]],[0,[0,4,7,11]],[9,[0,3,7,10]]]},
 {n:'Dusk',k:57,pen:[0,3,5,7,10],ar:[0,1,2,1,3,2,1,2,0,1,2,1,3,2,3,1],
  ch:[[0,[0,3,7,10]],[8,[0,4,7,11]],[3,[0,4,7,14]],[10,[0,4,7,14]],[0,[0,3,7,10]],[5,[0,3,7,10]],[8,[0,4,7,11]],[7,[0,3,7,10]]]}];
const MRH=[[0,3,6,10,12],[0,4,8,12],[0,2,4,8,10,14],[0,6,8,14],[0,3,8,11,14],[0,8],[0,4,6,8,12],[0,3,6,8,11]];
const BP1=[0,3,6,8,11,14];
// a melody for one bar: a seeded walk on the pentatonic scale that lands on chord tones on the strong beats, so each mood has its own theme
function melodyFor(mi,b8,pcs){const m=MUSD[mi],T=fold(m.k,66),sc=[];for(let o=-1;o<=2;o++)for(const d of m.pen){const n=T+d+12*o;if(n>=T-5&&n<=T+19)sc.push(n)}
 const pos=(b8>=4&&b8<7)?b8-4:b8,R=mulberry32((0x9E3779B1^(mi*7919+pos*104729+0x51ED))>>>0),rh=MRH[(R()*MRH.length)|0],tp=m.k%12;
 const near=(i,want)=>{let best=-1,bd=99;for(let j=0;j<sc.length;j++){const pc=sc[j]%12,ok=want!=null?pc===want:pcs.indexOf(pc)>=0;if(ok&&Math.abs(j-i)<bd){bd=Math.abs(j-i);best=j}}return best<0?i:best};
 const out=new Array(16).fill(null);let ix=near(Math.max(1,Math.min(sc.length-2,((sc.length*.45)|0)+((R()*5)|0)-2)));
 for(let j=0;j<rh.length;j++){const s=rh[j],nx=j+1<rh.length?rh[j+1]:16;
  if(j>0){const cn=(sc.length*.45)|0,pull=ix>cn+2?-1:ix<cn-2?1:0;ix=Math.max(0,Math.min(sc.length-1,ix+[-2,-1,-1,0,1,1,2,2][(R()*8)|0]+(R()<.5?pull:0)));if(s===8||(s%4===0&&R()<.5))ix=near(ix)}
  if(j===rh.length-1&&b8===7)ix=near(((sc.length*.45)|0),tp);else if(j===rh.length-1&&b8===3)ix=near(((sc.length*.5)|0),(tp+7)%12);
  out[s]=[sc[ix],Math.min(nx-s,6)]}
 return out}
// how loud each layer is, for every scene.  i = match intensity 0..1, d = danger 0..1, r = final rush, res = result (1 won, -1 lost)
function mlev(sc,i,d,r,res){
 if(sc==='boot')return{bpm:78,pad:.8,bass:0,kick:0,snare:0,hat:0,arp:0,lead:.4,sp:.5,lv:0,cut:700};
 if(sc==='lobby')return{bpm:104,pad:.85,bass:.55,kick:.55,snare:0,hat:.42,arp:.58,lead:.45,sp:.35,lv:1,cut:1500};
 if(sc==='results')return res<0?{bpm:80,pad:1,bass:.25,kick:0,snare:0,hat:0,arp:.32,lead:.65,sp:.3,lv:0,cut:900}:{bpm:92,pad:1,bass:.42,kick:.35,snare:0,hat:.24,arp:.5,lead:1,sp:.6,lv:0,cut:1700};
 if(sc==='match'||sc==='replay'){const rp=sc==='replay',x=Math.min(1,i+(rp?.2:0));
  return{bpm:Math.round((rp?106:118)+12*i+(r?10:0)),pad:.9-.3*x,bass:.45+.4*x,kick:.6+.4*x,snare:x>.22?.35+.5*x:0,hat:Math.min(1,.3+.6*x+(r?.2:0)+d*.15),arp:.3+.7*x,lead:x>.3?Math.min(.9,(x-.3)*1.3):0,sp:rp?.3:0,lv:1,cut:900+1700*x}}
 return{bpm:96,pad:1,bass:.4,kick:.38,snare:0,hat:.3,arp:.4,lead:.9,sp:.55,lv:0,cut:1300}}
const SFXDB={ui:5.6,logo:-1.9,start:1.9,boost:13,dash:11,shield:-4.9,pop:2.9,recall:6.7,ghost:7.2,mine:4.2,boom:0,boom2:0,boom2far:1.1,emp:7.6,grab:4,fire:.9,fort:-.5,zone:5.3,seize:5.9,strike:9.9,tick:7.4,rush:1.1,kill:7.4,die:1.3,ko:4.4,capture:2.6,win:3.8,lose:2.3,
 blade:8,ram:3,fan:8,storm:6,shock:2,fortress:1,fpulse:4,mortar:3,bhit:7,drone:8,field:6,plate:6,fortify:-.5,orbital:9,deny:6,rail:6,wire:5,fault:3,hole:4,rbounce:4,wcut:6,hcrush:3,fend:4},SFXG={};for(const k in SFXDB)SFXG[k]=Math.pow(10,SFXDB[k]/20);
const SFXCD={ui:.03,ko:.1,kill:.05,capture:.07,tick:0,pop:.06,boom:.08,boom2:.1,boom2far:.1,die:.3,win:1,lose:1,start:.5,boost:.12,dash:.1,fire:.08,
 blade:.1,ram:.1,fan:.1,storm:.3,shock:.2,fortress:.3,fpulse:.35,mortar:.1,bhit:.05,drone:.15,field:.3,plate:.15,fortify:.3,orbital:.5,deny:.15,rail:.1,wire:.2,fault:.2,hole:.4,rbounce:.06,wcut:.08,hcrush:.15,fend:.15};
const SFXDUCK={rail:.2,fault:.25,hole:.3,boom:.3,boom2:.5,boom2far:.12,die:.5,win:.55,lose:.5,rush:.3,strike:.12,capture:.1,kill:.12,shock:.35,fortress:.2,orbital:.15,ram:.15};

function makeAudio(ctx,opt){opt=opt||{};const A={ctx,live:!!opt.live},rnd0=mulberry32(0x5EED5EED),SR=ctx.sampleRate;
 // ---- the mixing desk ----
 const master=ctx.createGain(),comp=ctx.createDynamicsCompressor(),clip=ctx.createWaveShaper();comp.threshold.value=-10;comp.knee.value=10;comp.ratio.value=3.5;comp.attack.value=.006;comp.release.value=.22;
 {const N=2049,c=new Float32Array(N);for(let i=0;i<N;i++){const x=i/(N-1)*2-1,ax=Math.abs(x);c[i]=(ax<.7?x:Math.sign(x)*(.7+.3*Math.tanh((ax-.7)/.3)))}clip.curve=c}
 master.connect(comp);comp.connect(clip);clip.connect(ctx.destination);
 const G=v=>{const g=ctx.createGain();g.gain.value=v;return g};
 const mbus=G(0),mduck=G(1),sbus=G(0),MD=G(1),SD=G(1),rev=ctx.createConvolver(),revOut=G(.8),mrev=G(.22),srev=G(.2);
 const mhp=ctx.createBiquadFilter();mhp.type='highpass';mhp.frequency.value=48;mhp.Q.value=.7;MD.connect(mduck);mduck.connect(mhp);mhp.connect(mbus);mbus.connect(master);SD.connect(sbus);sbus.connect(master);
 MD.connect(mrev);SD.connect(srev);mrev.connect(rev);srev.connect(rev);rev.connect(revOut);revOut.connect(master);
 {const len=Math.floor(SR*1.3),b=ctx.createBuffer(2,len,SR),R=mulberry32(0xBEEF);for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;for(let i=0;i<len;i++){const w=R()*2-1;lp+=(w-lp)*.55;d[i]=lp*Math.pow(1-i/len,2.6)}}rev.buffer=b}
 const NB=ctx.createBuffer(1,SR*2,SR);{const d=NB.getChannelData(0),R=mulberry32(0xA11CE);for(let i=0;i<d.length;i++)d[i]=R()*2-1}
 // each music layer has its own bus, so the sidechain pump and the ping-pong panning stay cheap
 const PD=G(1),PDduck=G(1),BD=G(1),KD=G(1),HD=G(1),LD=G(1),ARL=G(1),ARR=G(1);
 const padHP=ctx.createBiquadFilter();padHP.type='highpass';padHP.frequency.value=190;padHP.Q.value=.6;PD.connect(padHP);padHP.connect(PDduck);PDduck.connect(MD);BD.connect(MD);KD.connect(MD);HD.connect(MD);LD.connect(MD);
 let stL=null,stR=null;if(ctx.createStereoPanner){stL=ctx.createStereoPanner();stR=ctx.createStereoPanner();stL.pan.value=-.38;stR.pan.value=.38;ARL.connect(stL);ARR.connect(stR);stL.connect(MD);stR.connect(MD)}else{ARL.connect(MD);ARR.connect(MD)}
 const dly=ctx.createDelay(1.5),dfb=G(.34),dlp=ctx.createBiquadFilter(),dwet=G(.3);dlp.type='lowpass';dlp.frequency.value=4300;LD.connect(dly);dly.connect(dlp);dlp.connect(dfb);dfb.connect(dly);dlp.connect(dwet);dwet.connect(MD);dly.delayTime.value=.3;
 // ---- building blocks ----
 const env=(g,t,at,dc,pk)=>{const p=g.gain;p.setValueAtTime(.0001,t);p.linearRampToValueAtTime(pk,t+at);p.exponentialRampToValueAtTime(.0001,t+at+dc)};
 function osc(ty,f0,f1,t,d,vol,dest,o){o=o||{};const os=ctx.createOscillator(),g=ctx.createGain(),at=o.at||.004;os.type=ty;os.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)os.frequency.exponentialRampToValueAtTime(f1,t+d*(o.fd||1));if(o.det)os.detune.value=o.det;
  env(g,t,at,d,vol);let n=os;if(o.lp){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;f.Q.value=o.q||.7;os.connect(f);n=f}
  n.connect(g);g.connect(dest);os.start(t);os.stop(t+at+d+.04)}
 function nz(t,d,vol,dest,o){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),at=o.at||.003;s.buffer=NB;s.loop=true;f.type=o.ty||'bandpass';f.frequency.setValueAtTime(o.f0||1000,t);
  if(o.f1)f.frequency.exponentialRampToValueAtTime(o.f1,t+d*(o.fd||1));f.Q.value=o.q||.8;env(g,t,at,d,vol);s.connect(f);f.connect(g);g.connect(dest);s.start(t,rnd0()*1.5);s.stop(t+at+d+.04)}
 // drum hits are baked once into short sample buffers: a hit then costs two nodes instead of five, with no automation
 const bq=(d,n,ty,f0,q)=>{const w=2*Math.PI*f0/SR,c=Math.cos(w),al=Math.sin(w)/(2*q);let b0,b1,b2;if(ty==='hp'){b0=(1+c)/2;b1=-(1+c);b2=(1+c)/2}else if(ty==='lp'){b0=(1-c)/2;b1=1-c;b2=(1-c)/2}else{b0=al;b1=0;b2=-al}
  const a0=1+al,a1=-2*c/a0,a2=(1-al)/a0;b0/=a0;b1/=a0;b2/=a0;let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<n;i++){const x=d[i],y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;d[i]=y}};
 const norm=(d,n,pk)=>{let m=1e-9;for(let i=0;i<n;i++)m=Math.max(m,Math.abs(d[i]));for(let i=0;i<n;i++)d[i]*=pk/m};
 const mkbuf=(sec,fn)=>{const n=Math.floor(SR*sec),b=ctx.createBuffer(1,n,SR),d=b.getChannelData(0);fn(d,n);return b},R2=mulberry32(0xD00D);
 const KB=mkbuf(.26,(d,n)=>{let ph=0;for(let i=0;i<n;i++){const t=i/SR,f=52+120*Math.exp(-t/.022);ph+=6.2832*f/SR;d[i]=Math.sin(ph)*Math.exp(-t/.065)+(i<SR*.007?(R2()*2-1)*.7*(1-i/(SR*.007)):0)}norm(d,n,1)});
 const SB=mkbuf(.24,(d,n)=>{let ph=0;for(let i=0;i<n;i++)d[i]=R2()*2-1;bq(d,n,'bp',1900,.7);norm(d,n,.8);for(let i=0;i<n;i++){const t=i/SR;ph+=6.2832*(150+60*Math.exp(-t/.02))/SR;d[i]=d[i]*Math.exp(-t/.055)+Math.sin(ph)*.45*Math.exp(-t/.05)}norm(d,n,1)});
 const CB=mkbuf(.2,(d,n)=>{for(let i=0;i<n;i++)d[i]=R2()*2-1;bq(d,n,'bp',1500,1.1);norm(d,n,1);for(let i=0;i<n;i++){const t=i/SR;d[i]*=Math.exp(-t/.012)*(t<.011?1:.55)+(t>=.022?Math.exp(-(t-.022)/.04)*.85:0)}norm(d,n,1)});
 const mkhat=(sec,tau)=>mkbuf(sec,(d,n)=>{for(let i=0;i<n;i++)d[i]=R2()*2-1;bq(d,n,'hp',7000,.7);for(let i=0;i<n;i++)d[i]*=Math.exp(-(i/SR)/tau);norm(d,n,1)}),HB=mkhat(.07,.011),HO=mkhat(.24,.055);
 const play=(buf,t,v,dest,rate)=>{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;if(rate)s.playbackRate.value=rate;g.gain.value=v;s.connect(g);g.connect(dest);s.start(t)};
 const kick=(t,v,d,rate)=>play(KB,t,v,d,rate),snare=(t,v,d)=>play(SB,t,v,d),clap=(t,v,d)=>play(CB,t,v,d),hat=(t,v,d,open)=>play(open?HO:HB,t,v,d);
 function pluck(f,t,d,v,dest,br){const o1=ctx.createOscillator(),o2=ctx.createOscillator(),fl=ctx.createBiquadFilter(),g=ctx.createGain();o1.type='sawtooth';o2.type='square';o1.frequency.value=o2.frequency.value=f;o2.detune.value=8;
  fl.type='lowpass';fl.Q.value=2;fl.frequency.setValueAtTime(br,t);fl.frequency.exponentialRampToValueAtTime(Math.max(260,br*.16),t+d*.8);env(g,t,.003,d,v);o1.connect(fl);o2.connect(fl);fl.connect(g);g.connect(dest);o1.start(t);o2.start(t);o1.stop(t+d+.05);o2.stop(t+d+.05)}
 function pluck1(f,t,d,v,dest,br){const o=ctx.createOscillator(),fl=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=f;fl.type='lowpass';fl.Q.value=1.4;fl.frequency.value=br;env(g,t,.003,d,v);o.connect(fl);fl.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.05)}
 const bell=(f,t,d,v,dest)=>{for(const p of [[1,1,1],[2.01,.42,.55],[2.76,.26,.33],[4.07,.13,.2],[5.4,.06,.13]])osc('sine',f*p[0],0,t,d*p[2],v*p[1],dest,{at:.002})};
 const bass=(f,t,d,v,dest)=>{osc('sine',f,0,t,d,v,dest,{at:.006});osc('sawtooth',f,0,t,d*.7,v*.5,dest,{at:.006,lp:820})};
 function pad(notes,t,d,v,dest,cut){const fl=ctx.createBiquadFilter(),g=ctx.createGain();fl.type='lowpass';fl.frequency.value=cut;fl.Q.value=.5;fl.connect(g);g.connect(dest);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+Math.min(.45,d*.22));g.gain.setValueAtTime(v,t+d*.82);g.gain.linearRampToValueAtTime(.0001,t+d+.45);
  for(const n of notes)for(const dt of [-9,9]){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=MIDI(n);o.detune.value=dt;o.connect(fl);o.start(t);o.stop(t+d+.5)}}
 // ---- sound effects ----
 const M={scene:'menu',i:0,ti:0,d:0,td:0,r:0,mood:0,res:0};
 const duck=(amt,hold,at)=>{const n=at==null?ctx.currentTime:at,p=mduck.gain;p.cancelScheduledValues(n);p.setTargetAtTime(1-amt,n,.02);p.setTargetAtTime(1,n+hold,.25)};
 const cap=(g,m)=>{const mm=MUSD[M.mood],T=fold(mm.k,60),n=Math.max(2,Math.min(7,2+Math.floor(Math.log2(Math.max(8,g||8)/8))));return[mm,T,n]};
 let OUT=SD;
 const X={
  ui(t){osc('sine',900,1500,t,.05,.06,OUT,{at:.002,fd:.8});nz(t,.015,.025,OUT,{ty:'highpass',f0:4000,at:.001})},
  logo(t){nz(t,1,.16,OUT,{ty:'bandpass',f0:400,f1:5200,q:1.2,at:.55});[0,7,12,16,19].forEach((n,i)=>bell(MIDI(72+n),t+.55+i*.07,1.7,.06,OUT));kick(t+.55,.8,OUT);osc('sine',55,0,t+.55,1.3,.22,OUT,{at:.01})},
  start(t){[0,4,7,12].forEach((n,i)=>pluck(MIDI(60+n),t+i*.09,.35,.12,OUT,3500));nz(t,.5,.09,OUT,{ty:'bandpass',f0:300,f1:3000,q:1,at:.25})},
  boost(t){nz(t,.45,.15,OUT,{ty:'bandpass',f0:500,f1:3200,q:1.4,at:.04});osc('sawtooth',130,380,t,.4,.06,OUT,{at:.03,lp:1400})},
  dash(t){nz(t,.22,.13,OUT,{ty:'bandpass',f0:900,f1:5000,q:1.1,at:.01});osc('sine',500,1700,t,.16,.07,OUT,{at:.005,fd:.9})},
  shield(t){osc('sine',520,880,t,.35,.08,OUT,{at:.02});bell(MIDI(84),t+.05,.8,.05,OUT);nz(t,.3,.04,OUT,{ty:'highpass',f0:5000,at:.05})},
  pop(t){nz(t,.14,.2,OUT,{ty:'bandpass',f0:2400,f1:600,q:.8,at:.001});osc('sine',1000,200,t,.12,.16,OUT,{at:.001,fd:.6});bell(MIDI(96),t,.4,.04,OUT)},
  recall(t){osc('sine',280,1250,t,.6,.08,OUT,{at:.06});osc('sine',420,1880,t,.6,.05,OUT,{at:.06});bell(MIDI(79),t+.45,1,.06,OUT);nz(t,.5,.06,OUT,{ty:'bandpass',f0:600,f1:4200,q:1.5,at:.2})},
  ghost(t){osc('sine',720,360,t,.7,.07,OUT,{at:.08});osc('sine',723,362,t,.7,.06,OUT,{at:.08});nz(t,.7,.05,OUT,{ty:'bandpass',f0:2200,f1:900,q:2.5,at:.2})},
  mine(t){osc('sine',150,70,t,.18,.2,OUT,{at:.002,fd:.5});osc('square',900,0,t+.06,.05,.04,OUT,{at:.001});osc('square',900,0,t+.16,.05,.04,OUT,{at:.001})},
  boom(t){nz(t,.9,.45,OUT,{ty:'lowpass',f0:3600,f1:140,q:.7,at:.002,fd:.9});osc('sine',110,34,t,.7,.45,OUT,{at:.002,fd:.5});nz(t,.06,.25,OUT,{ty:'highpass',f0:2500,at:.001})},
  boom2(t){nz(t,1.3,.5,OUT,{ty:'lowpass',f0:2800,f1:90,q:.7,at:.002,fd:.9});osc('sine',90,28,t,1,.5,OUT,{at:.002,fd:.5});nz(t,.08,.3,OUT,{ty:'highpass',f0:2200,at:.001})},
  boom2far(t){nz(t+.1,1.1,.2,OUT,{ty:'lowpass',f0:900,f1:80,q:.7,at:.01,fd:.9});osc('sine',70,30,t+.1,.9,.22,OUT,{at:.01,fd:.5})},
  emp(t){osc('sawtooth',1400,90,t,.5,.09,OUT,{at:.005,lp:2400,fd:.7});nz(t,.5,.11,OUT,{ty:'bandpass',f0:3000,f1:500,q:2,at:.002});osc('square',2400,300,t,.25,.04,OUT,{at:.002})},
  grab(t){nz(t,.25,.18,OUT,{ty:'bandpass',f0:700,f1:3500,q:1.2,at:.01});osc('sine',200,90,t+.12,.2,.2,OUT,{at:.003})},
  fire(t){nz(t,.18,.32,OUT,{ty:'bandpass',f0:1400,f1:350,q:.7,at:.001});osc('sine',240,55,t,.25,.32,OUT,{at:.001,fd:.4})},
  fort(t){[0,7,12].forEach(n=>pluck(MIDI(48+n),t,.7,.11,OUT,1800));bell(MIDI(72),t,1,.06,OUT);nz(t,.2,.1,OUT,{ty:'bandpass',f0:2500,q:3,at:.001})},
  zone(t){[0,4,7,11,16].forEach((n,i)=>bell(MIDI(76+n),t+i*.075,1.1,.08,OUT))},
  seize(t){bell(MIDI(67),t,.8,.09,OUT);bell(MIDI(74),t+.09,1,.09,OUT);nz(t,.25,.04,OUT,{ty:'highpass',f0:4000,at:.04})},
  strike(t){osc('sine',2400,380,t,1,.06,OUT,{at:.02});osc('sine',2410,383,t,1,.05,OUT,{at:.02});nz(t+.4,.8,.16,OUT,{ty:'lowpass',f0:400,f1:80,q:.7,at:.3})},
  tick(t,a){const k=Math.max(0,Math.min(9,a|0));osc('sine',740+k*45,0,t,k>=9?.3:.09,.1,OUT,{at:.002});if(k>=9)osc('sine',1480,0,t,.3,.04,OUT,{at:.002})},
  rush(t){nz(t,1.2,.18,OUT,{ty:'bandpass',f0:200,f1:5000,q:1.3,at:.9});osc('sine',70,40,t+1,.9,.38,OUT,{at:.005});bell(MIDI(63),t+1,1.4,.06,OUT);bell(MIDI(64),t+1,1.4,.05,OUT)},
  kill(t){bell(MIDI(79),t,.6,.09,OUT);bell(MIDI(86),t+.07,.9,.08,OUT);osc('square',520,1040,t,.15,.04,OUT,{at:.002,lp:3000})},
  die(t){osc('sawtooth',330,55,t,.9,.16,OUT,{at:.004,lp:1800,fd:.9});nz(t,.7,.28,OUT,{ty:'lowpass',f0:3000,f1:150,q:.7,at:.002});osc('sine',100,32,t,.8,.38,OUT,{at:.002,fd:.5})},
  ko(t){osc('sine',260,90,t,.18,.09,OUT,{at:.002,fd:.5});nz(t,.2,.09,OUT,{ty:'lowpass',f0:2400,f1:300,q:.7,at:.001})},
  capture(t,g){const[mm,T,n]=cap(g);for(let i=0;i<n;i++){const nn=T+mm.pen[i%5]+12*Math.floor(i/5)+12;pluck(MIDI(nn),t+i*.06,.4,.07+.008*i,OUT,4200);bell(MIDI(nn+12),t+i*.06,.6,.025,OUT)}
   nz(t,.3+n*.03,.06,OUT,{ty:'bandpass',f0:500,f1:2800,q:1.2,at:.05});if(n>=5)osc('sine',90,45,t,.3,.2,OUT,{at:.003,fd:.5})},
  win(t){M.res=1;const wm=M.mood===2?1:M.mood,T=fold(MUSD[wm].k,60);[0,4,7,12,16,19,24].forEach((n,i)=>{pluck(MIDI(T+n),t+i*.085,.55,.09,OUT,5000);bell(MIDI(T+12+n),t+i*.085,1.3,.045,OUT)});
   pad([T,T+4,T+7,T+12],t+.55,2.2,.07,OUT,2600);nz(t+.5,.5,.05,OUT,{ty:'highpass',f0:6000,at:.2})},
  lose(t){M.res=-1;const T=fold(MUSD[2].k,60);[7,3,0,-5].forEach((n,i)=>bell(MIDI(T+n),t+i*.22,1.6,.08,OUT));osc('sine',220,110,t,1,.12,OUT,{at:.02});pad([T-12,T-9,T-5],t+.2,2,.05,OUT,900)},
  // ---- class abilities ----
  blade(t){nz(t,.28,.2,OUT,{ty:'bandpass',f0:700,f1:6200,q:1.2,at:.012,fd:.8});osc('sine',1800,4200,t,.2,.06,OUT,{at:.003,fd:.8});osc('triangle',3100,2400,t+.12,.35,.04,OUT,{at:.002})},
  ram(t){osc('sine',150,48,t,.5,.4,OUT,{at:.004,fd:.6});nz(t,.45,.24,OUT,{ty:'lowpass',f0:2400,f1:180,q:.8,at:.01});osc('sawtooth',90,200,t,.35,.09,OUT,{at:.05,lp:700});nz(t+.38,.08,.18,OUT,{ty:'highpass',f0:3000,at:.001})},
  fan(t){for(let i=0;i<3;i++){nz(t+i*.045,.2,.11,OUT,{ty:'bandpass',f0:1500+i*500,f1:7000,q:1.6,at:.008});osc('sine',2200+i*350,3600+i*350,t+i*.045,.12,.04,OUT,{at:.002})}},
  storm(t){nz(t,1.1,.2,OUT,{ty:'bandpass',f0:400,f1:5000,q:1.3,at:.25,fd:.6});for(let i=0;i<6;i++)osc('sine',900+i*140,1500+i*140,t+i*.09,.18,.04,OUT,{at:.003});bell(MIDI(84),t+.02,1,.05,OUT);osc('sine',70,40,t,.5,.22,OUT,{at:.01,fd:.5})},
  shock(t){osc('sine',190,28,t,.9,.5,OUT,{at:.002,fd:.55});nz(t,.8,.38,OUT,{ty:'lowpass',f0:3200,f1:120,q:.7,at:.002,fd:.9});nz(t+.02,.07,.28,OUT,{ty:'highpass',f0:2600,at:.001});osc('sine',900,200,t,.5,.06,OUT,{at:.01})},
  fortress(t){[0,7,12,19].forEach((n,i)=>pluck(MIDI(41+n),t+i*.03,.9,.1,OUT,1500));osc('sine',65,38,t,.8,.4,OUT,{at:.003,fd:.5});nz(t,.35,.14,OUT,{ty:'bandpass',f0:2200,q:3.5,at:.001});bell(MIDI(76),t+.05,1.4,.05,OUT)},
  fpulse(t){osc('sine',95,45,t,.3,.3,OUT,{at:.003,fd:.5});nz(t,.22,.07,OUT,{ty:'lowpass',f0:900,f1:180,q:.7,at:.002})},
  mortar(t){osc('sine',210,62,t,.2,.3,OUT,{at:.002,fd:.5});nz(t,.12,.14,OUT,{ty:'bandpass',f0:1400,f1:400,q:.8,at:.001});osc('sine',1100,2400,t+.08,.5,.03,OUT,{at:.05})},
  bhit(t){nz(t,.09,.2,OUT,{ty:'highpass',f0:3500,at:.001});bell(MIDI(88),t,.35,.07,OUT);osc('sine',240,100,t,.12,.18,OUT,{at:.001,fd:.5})},
  drone(t){osc('sawtooth',500,1900,t,.5,.06,OUT,{at:.03,lp:2500,fd:.8});nz(t,.45,.07,OUT,{ty:'bandpass',f0:1200,f1:3000,q:2,at:.1})},
  field(t){for(let i=0;i<8;i++)osc('square',1100+(i%2)*250,0,t+i*.045,.04,.03,OUT,{at:.001});osc('sine',120,50,t+.1,.5,.26,OUT,{at:.01,fd:.5});nz(t+.1,.45,.1,OUT,{ty:'lowpass',f0:1800,f1:200,q:.7,at:.01})},
  plate(t){osc('square',1700,1200,t,.07,.05,OUT,{at:.001,lp:5000});bell(MIDI(91),t,.5,.05,OUT);nz(t,.05,.12,OUT,{ty:'highpass',f0:4500,at:.001})},
  fortify(t){[0,7,12].forEach(n=>pluck(MIDI(48+n),t,.7,.11,OUT,1800));bell(MIDI(72),t,1,.06,OUT);nz(t,.2,.1,OUT,{ty:'bandpass',f0:2500,q:3,at:.001})},
  orbital(t){osc('sine',3000,300,t,1.2,.06,OUT,{at:.03});osc('sine',3010,303,t,1.2,.05,OUT,{at:.03});osc('sine',1500,150,t+.1,1.2,.04,OUT,{at:.03});nz(t+.5,1,.2,OUT,{ty:'lowpass',f0:500,f1:70,q:.7,at:.35});osc('sine',60,30,t+.9,1,.3,OUT,{at:.1})},
  deny(t){osc('square',150,105,t,.13,.06,OUT,{at:.002,lp:900});osc('square',96,80,t+.06,.1,.05,OUT,{at:.002,lp:800})},
  // ---- v19 abilities ----
  rail(t){osc('sawtooth',2600,180,t,.35,.07,OUT,{at:.002,lp:6000,fd:.6});nz(t,.5,.22,OUT,{ty:'bandpass',f0:6000,f1:800,q:1.5,at:.001,fd:.8});osc('sine',90,40,t,.4,.3,OUT,{at:.002,fd:.5});bell(MIDI(98),t,.5,.05,OUT)},
  wire(t){osc('square',880,880,t,.25,.04,OUT,{at:.005,lp:2400});osc('sine',1760,1600,t,.3,.05,OUT,{at:.01});nz(t,.3,.05,OUT,{ty:'highpass',f0:5000,at:.01})},
  fault(t){osc('sine',70,30,t,.8,.45,OUT,{at:.003,fd:.5});nz(t,.9,.35,OUT,{ty:'lowpass',f0:1800,f1:90,q:.8,at:.005,fd:.8});nz(t+.05,.5,.12,OUT,{ty:'bandpass',f0:2500,f1:600,q:1.5,at:.02})},
  hole(t){osc('sine',600,40,t,1.4,.3,OUT,{at:.05,fd:.7});osc('sawtooth',300,30,t,1.2,.06,OUT,{at:.1,lp:800});nz(t,1.5,.25,OUT,{ty:'bandpass',f0:3000,f1:150,q:2,at:.3,fd:.7})},
  rbounce(t){bell(MIDI(100),t,.25,.05,OUT);osc('triangle',3200,2000,t,.08,.04,OUT,{at:.001})},
  wcut(t){osc('square',2400,300,t,.12,.06,OUT,{at:.001,lp:5000});nz(t,.1,.15,OUT,{ty:'highpass',f0:3000,at:.001})},
  hcrush(t){osc('sine',140,30,t,.5,.4,OUT,{at:.002,fd:.5});nz(t,.4,.2,OUT,{ty:'lowpass',f0:1200,f1:80,q:.7,at:.002})},
  fend(t){nz(t,.35,.18,OUT,{ty:'lowpass',f0:1500,f1:200,q:.7,at:.002});osc('sine',110,50,t,.3,.2,OUT,{at:.002,fd:.5})}};
 const cool={};
 A.sfxAt=(name,t,a,b)=>{const f=X[name];if(!f)return;const g=ctx.createGain();g.gain.value=SFXG[name]==null?1:SFXG[name];g.connect(SD);OUT=g;try{f(t,a,b)}finally{OUT=SD}const dk=SFXDUCK[name];if(dk)duck(dk,name==='win'||name==='lose'?1.6:.35,t)};
 A.sfx=(name,a,b)=>{try{if(!X[name])return;const now=ctx.currentTime;if(A.live&&ctx.state!=='running')return;const cd=SFXCD[name]==null?.04:SFXCD[name];if(cool[name]!=null&&now-cool[name]<cd)return;cool[name]=now;A.sfxAt(name,now+.005,a,b)}catch(e){}};
 A.tone=(f,d,ty,v,f2)=>{try{if(A.live&&ctx.state!=='running')return;osc(ty||'sine',f,f2||0,ctx.currentTime+.003,d||.1,v||.1,SD)}catch(e){}};
 // ---- the music: a step sequencer (16 steps a bar) that is told the scene, the intensity and the danger ----
 const LG=opt.log?((ty,t,v,x)=>opt.log.push([+t.toFixed(3),ty,v,x])):null;
 let on=0,timer=0,nextT=0,st=0,bar=0,tens=null;const cur={sc:'',bpm:96,sps:.156,mi:0,rushed:0,root:0,bassN:36,padN:[],arpN:[],pcs:[],mel:[]};
 const duckPad=t=>{const p=PDduck.gain;p.setValueAtTime(1,Math.max(0,t-.002));p.setTargetAtTime(.5,t,.005);p.setTargetAtTime(1,t+.05,.1)};
 function tension(t,d,rootN){if(d>.18&&!tens){const o1=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),lf=ctx.createOscillator(),lg=ctx.createGain();o1.type='triangle';o2.type='triangle';o1.frequency.value=MIDI(rootN+24);o2.frequency.value=MIDI(rootN+25);
   g.gain.value=0;lf.frequency.value=5.2;lg.gain.value=.5;lf.connect(lg);const am=ctx.createGain();am.gain.value=.5;lg.connect(am.gain);o1.connect(am);o2.connect(am);am.connect(g);g.connect(MD);o1.start(t);o2.start(t);lf.start(t);tens={o1,o2,g,lf,t0:t}}
  if(tens){tens.g.gain.setTargetAtTime(d<.08?0:.12*Math.pow(d,1.6),t,.25);if(rootN!=null){tens.o1.frequency.setTargetAtTime(MIDI(rootN+24),t,.3);tens.o2.frequency.setTargetAtTime(MIDI(rootN+25),t,.3)}
   if(d<.08&&t-tens.t0>1){const x=tens;tens=null;try{x.o1.stop(t+1.2);x.o2.stop(t+1.2);x.lf.stop(t+1.2)}catch(e){}}}}
 function sstep(t){
  if(st===0){const sc=M.scene;if(sc!==cur.sc){cur.sc=sc;bar=0;cur.rushed=0}
   const l0=mlev(sc,M.i,M.d,M.r,M.res);cur.bpm=l0.bpm;cur.sps=60/l0.bpm/4;cur.mi=(sc==='results'?(M.res<0?2:(M.mood===2?1:M.mood)):M.mood);
   const m=MUSD[cur.mi],b8=bar%8,ch=m.ch[b8],off=ch[0],iv=ch[1];cur.root=(m.k+off)%12;cur.bassN=36+cur.root;
   cur.padN=iv.map(i=>fold(m.k+off,53)+i).map(n=>n>=76?n-12:n);cur.arpN=iv.map(i=>60+cur.root+i);cur.pcs=iv.map(i=>(m.k+off+i)%12);cur.mel=melodyFor(cur.mi,b8,cur.pcs);
   dly.delayTime.setValueAtTime(cur.sps*3,t);if(LG){LG('bar',t,bar,{sc:cur.sc,bpm:cur.bpm,mi:cur.mi,off,b8,pcs:cur.pcs.slice(),mel:cur.mel.map(x=>x?x[0]:null)});LG('pad',t,0,cur.padN.slice())}
   pad(cur.padN,t,cur.sps*16,.036*l0.pad,PD,l0.cut);
   if(M.r&&!cur.rushed){cur.rushed=1;nz(t,cur.sps*15,.17,MD,{ty:'bandpass',f0:300,f1:6500,q:1.2,at:cur.sps*13})}else if(!M.r)cur.rushed=0}
  const L=mlev(cur.sc,M.i,M.d,M.r,M.res),sps=cur.sps,b8=bar%8;
  if(L.kick>0){const four=L.kick>=.5,hit=four?(st%4===0):(st===0||st===8||(st===11&&L.kick>.3&&(bar&1)===1));if(hit){kick(t,.4*L.kick+.08,KD);duckPad(t);if(LG)LG('kick',t,st)}}
  if(L.snare>0){const fill=b8===7&&M.i>.5&&st>=13;if((st===4||st===12)&&!fill){snare(t,.26*L.snare,KD);clap(t,.2*L.snare,KD);if(LG)LG('snare',t,st)}else if(fill){snare(t,.16*L.snare*(1+(st-12)*.35),KD);if(LG)LG('fill',t,st)}}
  if(L.hat>0){const v=.18*L.hat+.07;if(LG&&(st%2===1?L.hat>.62:(st%4===2||(L.hat>.8&&st>0))))LG('hat',t,st);if(st%4===2)hat(t,v,HD,st===14&&(b8&1)===1);else if(L.hat>.62&&st%2===1)hat(t,v*.5,HD,false);else if(L.hat>.8&&st%4===0&&st>0)hat(t,v*.55,HD,false)}
  if(L.bass>0){let n=-1;const lv=L.bass;
   if(lv<.45){if(st===0)n=0;else if(st===8)n=7}
   else if(lv<.7){if(BP1.indexOf(st)>=0)n=(st===6||st===14)?12:0}
   else if(st%2===0)n=(st===6||st===14)?12:(st===10?7:0);
   if(n>=0){bass(MIDI(cur.bassN+n),t,sps*(lv<.45?7:1.6),.25*L.bass,BD);if(LG)LG('bass',t,cur.bassN+n,st)}}
  if(L.arp>0){const calm=cur.sc==='boot'||cur.sc==='results'||cur.sc==='menu',ok=calm?(st%2===0):cur.sc==='lobby'?(st%2===0||st%4===3):true;
   if(ok){const m=MUSD[cur.mi],k=m.ar[st]%cur.arpN.length,oct=(st>=8&&L.arp>.6)?12:0;{pluck1(MIDI(cur.arpN[k]+oct),t,sps*1.9,.12*L.arp*(st%4===0?1.25:st%2===0?.9:.62),(st&1)?ARL:ARR,1500+4200*L.arp);if(LG)LG('arp',t,cur.arpN[k]+oct,st)}}}
  if(L.sp>0&&(st===6||st===14)&&((bar+(st>>3))&1)===0){bell(MIDI(cur.arpN[(bar+st)%cur.arpN.length]+24),t,sps*10,.06*L.sp,LD);if(LG)LG('spark',t,cur.arpN[(bar+st)%cur.arpN.length]+24,st)}
  const nt=cur.mel[st];if(nt&&L.lead>0){const f=MIDI(nt[0]),d=Math.max(sps*2,nt[1]*sps);
   if(L.lv===1)pluck(f,t,d*1.1,.14*L.lead,LD,2400+3200*L.lead);else{bell(f,t,d*2.2,.12*L.lead,LD)}if(LG)LG('lead',t,nt[0],st)}
  if((cur.sc==='match'||cur.sc==='replay')){if(M.d>.1&&st%4===0&&L.kick<.5)kick(t,.4*M.d,BD,1.25);else if(M.d>.25&&st%8===3)kick(t,.22*M.d,BD,1.4);tension(t,M.d,cur.bassN)}else if(tens)tension(t,0,null)}
 function pump(upTo){if(!on)return;if(A.live&&ctx.state!=='running'){nextT=ctx.currentTime+.1;st=0;return}
  const now=ctx.currentTime,lim=upTo!=null?upTo:now+.3;if(A.live&&nextT<now-.05){nextT=now+.05;st=0}
  if(A.live&&!SET.music){while(nextT<lim){nextT+=cur.sps||.15}return}
  let g=0;while(nextT<lim&&g++<400){sstep(nextT);nextT+=cur.sps;st=(st+1)&15;if(!st)bar++}}
 A.music={state:M,cur,log:opt.log||null,
  start(t0){if(on)return;on=1;nextT=(t0!=null?t0:ctx.currentTime+.08);st=0;bar=0;cur.sc='';if(A.live)timer=setInterval(()=>{try{pump()}catch(e){}},35)},
  stop(){on=0;if(timer){clearInterval(timer);timer=0}},
  set(sc,i,d,r,m){try{if(sc!==M.scene){if(sc==='results'&&M.scene==='match')duck(.7,.5);if(sc==='match'||sc==='replay'||sc==='menu'||sc==='lobby')M.res=0;M.scene=sc}
   M.ti=i||0;M.td=d||0;M.r=r?1:0;M.mood=((m|0)%3+3)%3;M.i+=(M.ti-M.i)*.08;M.d+=(M.td-M.d)*.12}catch(e){}},
  pump,sstep};
 // volume knobs follow the settings
 A.apply=()=>{try{const n=ctx.currentTime,mv=SET.music?(SET.mvol==null?.8:SET.mvol):0,sv=SET.sfx?(SET.svol==null?.9:SET.svol):0;mbus.gain.setTargetAtTime(mv*1.4,n,.05);sbus.gain.setTargetAtTime(sv,n,.03)}catch(e){}};
 A.wake=()=>{try{if(ctx.state!=='running'&&ctx.resume)ctx.resume().catch(()=>{});if(!A.unlocked&&A.live){A.unlocked=1;const b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0)}}catch(e){}};
 master.gain.value=1;A.apply();A.tension=()=>tens;A.X=X;A.parts={master,comp,mbus,sbus,MD,SD};
 return A}
// menu clicks are heard even while the silent showreel plays behind them
function uis(){if(AUD&&!FF)AUD.sfx('ui')}
function audInit(){if(AUD||typeof window==='undefined')return;
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
  const cx=new C({latencyHint:'interactive'});AUD=makeAudio(cx,{live:1});AUD.wake();AUD.apply();
  document.addEventListener('visibilitychange',()=>{try{if(document.hidden){cx.suspend()}else{cx.resume()}}catch(e){}});
  ['touchend','click','keydown'].forEach(k=>document.addEventListener(k,()=>{if(AUD)AUD.wake()},{passive:true}));
  if(typeof BOOTED!=='undefined'&&BOOTED&&AUD.music)AUD.music.start()}catch(e){AUD=null}}