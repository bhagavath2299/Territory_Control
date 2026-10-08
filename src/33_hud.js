// ---------- on-screen display: minimap, timer, standings, feed, name tags, messages ----------
function glassBox(x,y,w,h,r,a){ctx.fillStyle='rgba(9,14,32,'+(a||.72)+')';ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1;ctx.stroke();
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();ctx.fillStyle=lg(ctx,0,y,0,y+h*.55,[[0,'rgba(255,255,255,.10)'],[1,'rgba(255,255,255,0)']]);ctx.fillRect(x,y,w,h);ctx.restore()}
function crownIcon(x,y,s){ctx.fillStyle='#ffd54a';ctx.beginPath();ctx.moveTo(x-s,y+s*.6);ctx.lineTo(x-s,y-s*.5);ctx.lineTo(x-s*.5,y);ctx.lineTo(x,y-s*.7);ctx.lineTo(x+s*.5,y);ctx.lineTo(x+s,y-s*.5);ctx.lineTo(x+s,y+s*.6);ctx.closePath();ctx.fill()}
function drawHUD(w,h,z,labels,zl,S){
 const vg=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.42,w/2,h/2,Math.max(w,h)*.8);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(8,14,34,'+MOOD.vig.toFixed(2)+')');ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);
 const fs=Math.max(10,cs*1.1);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='700 '+fs+'px system-ui,sans-serif';
 // screen rectangles the panels cover, so that zone labels fade out under them instead of overlapping
 // the standings box grows to fit long names so a name never runs into the percentage
 let mxn=0;for(const q of [1,2,3,4,5])if(NM[q])mxn=Math.max(mxn,ctx.measureText(NM[q]).width);const LBW=Math.min(w*.58,Math.max(fs*10.2,fs*1.2+mxn+fs*4.2+16));
 const KO=[];if(state==='play'||state==='over'||state==='replay'){const mw0=Math.min(84,w*.21),mh0=mw0*WH/WW,nn=[1,2,3,4,5].filter(q=>NM[q]).length,pw0=LBW,rh0=fs*1.62;
  if(MINI)KO.push([2,2,mw0+18,mh0+18]);KO.push([w-pw0-12,4,pw0+14,rh0*nn+18]);
  if(FD.length){let fw=0;for(const d of FD)fw=Math.max(fw,ctx.measureText(d.t).width);const fy0=MINI?mh0+28:14;KO.push([4,fy0-fs,fw+fs*2.4,FD.length*fs*1.75+fs*.5])}
  if(state==='play')KO.push([w/2-cs*8.6,4,cs*17.2,cs*3.4+16])}
 // name tags over the cars

 for(const [lx,ly,nm,q] of labels){if(!nm)continue;const tw=ctx.measureText(nm).width+fs*1.7;ctx.fillStyle='rgba(9,14,32,.72)';ctx.beginPath();ctx.roundRect(lx-tw/2,ly-fs*.72,tw,fs*1.44,fs*.72);ctx.fill();
  ctx.fillStyle=COLS[q];ctx.beginPath();ctx.arc(lx-tw/2+fs*.78,ly,fs*.28,0,7);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillText(nm,lx+fs*.38,ly)}
 ctx.font='800 '+Math.max(9,cs*.9)+'px system-ui,sans-serif';
 for(const [lx,ly,t,o] of zl){const u=t.toUpperCase(),tw=ctx.measureText(u).width+cs*1.2;let fa=1;
  for(const r of KO){const dx=Math.max(r[0]-(lx+tw/2),lx-tw/2-(r[0]+r[2]),0),dy=Math.max(r[1]-(ly+cs*.65),ly-cs*.65-(r[1]+r[3]),0);fa=Math.min(fa,Math.hypot(dx,dy)/(cs*1.4))}
  if(fa<=.02)continue;ctx.globalAlpha=.92*Math.min(1,fa);ctx.fillStyle=o?COLS[o]:'rgba(9,14,32,.78)';ctx.beginPath();ctx.roundRect(lx-tw/2,ly-cs*.65,tw,cs*1.3,cs*.65);ctx.fill();ctx.globalAlpha=Math.min(1,fa);ctx.fillStyle='#ffffff';ctx.fillText(u,lx,ly)}
 ctx.globalAlpha=1;
 // floating messages
 for(const q of PO){const [px,py]=S(q.x,q.y);ctx.globalAlpha=Math.min(1,q.l*1.6);ctx.fillStyle=q.c;ctx.font='900 '+Math.round(cs*2)+'px system-ui,sans-serif';ctx.shadowColor='rgba(8,14,34,.95)';ctx.shadowBlur=7;const hw2=ctx.measureText(q.t).width/2+8;ctx.fillText(q.t,Math.min(w-hw2,Math.max(hw2,px)),Math.max(cs*3,py))}
 ctx.shadowBlur=0;ctx.globalAlpha=1;
 const HUDON=state==='play'||state==='over'||state==='replay';
 // minimap
 if(MINI&&HUDON){const mw=Math.min(84,w*.21),mh=mw*WH/WW,mx=10,my=10;glassBox(mx-4,my-4,mw+8,mh+8,10,.78);
  ctx.save();ctx.beginPath();ctx.roundRect(mx,my,mw,mh,7);ctx.clip();ctx.drawImage(MINI,mx,my,mw,mh);
  for(let zi=0;zi<ZN.length;zi++){const zz=ZN[zi],o=ZOWN[zi]||0,zx=mx+zz.x/WW*mw,zy=my+zz.y/WH*mh;ctx.fillStyle=o?COLS[o]:'#ffffff';ctx.strokeStyle='#10162a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(zx,zy-3.6);ctx.lineTo(zx+3.6,zy);ctx.lineTo(zx,zy+3.6);ctx.lineTo(zx-3.6,zy);ctx.closePath();ctx.fill();ctx.stroke()}
  const vx=(CAM.x-w/2/z)/WW*mw,vy=(CAM.y-h/2/z)/WH*mh;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1;ctx.strokeRect(mx+vx,my+vy,w/z/WW*mw,h/z/WH*mh);
  for(let q=1;q<=5;q++){const p=P[q];if(!p||!p.alive)continue;ctx.fillStyle=COLS[q];ctx.beginPath();ctx.arc(mx+(p.rx)/WW*mw,my+(p.ry)/WH*mh,q===VS?3.2:2.4,0,7);ctx.fill();if(q===VS){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.2;ctx.stroke()}}ctx.restore()}
 if(state==='play'){const t=Math.max(0,Math.ceil(tl)),ts=(t/60|0)+':'+String(t%60).padStart(2,'0'),pc=(CN[VS]*100/LANDN).toFixed(1)+'%',rk=[1,2,3,4,5].filter(q=>NM[q]).sort((a,b)=>CN[b]-CN[a]).indexOf(VS)+1;
  ctx.font='900 '+Math.round(cs*1.9)+'px system-ui,sans-serif';const tw1=ctx.measureText(ts).width;ctx.font='800 '+Math.round(cs*1.5)+'px system-ui,sans-serif';const tw2=ctx.measureText(pc).width;
  const pwid=tw1+tw2+cs*7.2,px0=w/2-pwid/2,py0=10;glassBox(px0,py0,pwid,cs*3.4,cs*1.7,.78);
  ctx.textAlign='left';const pulse=t<=10?.65+.35*Math.sin(fr/3):1;ctx.fillStyle=t<=10?'rgba(255,70,100,'+pulse+')':'#ffffff';ctx.font='900 '+Math.round(cs*1.9)+'px system-ui,sans-serif';ctx.fillText(ts,px0+cs*1.4,py0+cs*1.75);
  ctx.fillStyle=tint(COLS[VS],.35);ctx.font='800 '+Math.round(cs*1.5)+'px system-ui,sans-serif';ctx.fillText(pc,px0+cs*2.3+tw1,py0+cs*1.75);
  ctx.fillStyle=COLS[VS];ctx.beginPath();ctx.arc(px0+pwid-cs*1.75,py0+cs*1.7,cs*1.2,0,7);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='800 '+Math.round(cs*1.1)+'px system-ui,sans-serif';ctx.fillText('#'+rk,px0+pwid-cs*1.75,py0+cs*1.75);
  const bw=w*Math.max(0,tl)/TL;ctx.fillStyle=lg(ctx,0,0,w,0,[[0,'#4f88ff'],[.6,'#a979ff'],[1,'#ff6a8a']]);ctx.fillRect(0,0,bw,3);
  if(MYHOLD&8){const names=['Nitro +15%'];ctx.font='800 '+Math.round(cs*1.05)+'px system-ui,sans-serif';const ws=names.map(n=>ctx.measureText(n).width+cs*1.6),tw=ws.reduce((a,b)=>a+b,0)+(names.length-1)*cs*.5;let cx0=w/2-tw/2;const cy0=py0+cs*3.4+6;
   names.forEach((n,k)=>{ctx.fillStyle='rgba(255,176,32,.94)';ctx.beginPath();ctx.roundRect(cx0,cy0,ws[k],cs*1.9,cs*.95);ctx.fill();ctx.fillStyle='#1b1206';ctx.textAlign='center';ctx.fillText(n,cx0+ws[k]/2,cy0+cs*.98);cx0+=ws[k]+cs*.5})}}
 if(state==='play'&&tl<=30&&tl>0){const a=.08+.06*Math.sin(fr/5)+(tl<=10?.08:0),g2=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.75);g2.addColorStop(0,'rgba(255,40,80,0)');g2.addColorStop(1,'rgba(255,40,80,'+a+')');ctx.fillStyle=g2;ctx.fillRect(0,0,w,h);ctx.textAlign='center';
  if(tl>27){ctx.globalAlpha=Math.min(1,tl-27);ctx.fillStyle='#ff2d55';ctx.shadowColor='rgba(255,255,255,.9)';ctx.shadowBlur=10;ctx.font='900 '+Math.round(cs*3.2)+'px system-ui,sans-serif';ctx.fillText('FINAL RUSH',w/2,h*.3);ctx.shadowBlur=0}
  if(tl<=10){ctx.globalAlpha=.4+.2*Math.sin(fr/3);ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(255,40,80,.9)';ctx.shadowBlur=18;ctx.font='900 '+Math.round(cs*10)+'px system-ui,sans-serif';ctx.fillText(Math.ceil(tl),w/2,h/2);ctx.shadowBlur=0}
  ctx.globalAlpha=1}
 if(HUDON){const rk=[1,2,3,4,5].filter(q=>NM[q]).sort((a,b)=>CN[b]-CN[a]),pw=LBW,rh=fs*1.62,L=LANDN,top=CN[rk[0]]||1;
  glassBox(w-pw-8,8,pw,rh*rk.length+10,12,.74);
  rk.forEach((q,k)=>{const y=13+rh*(k+.5);ctx.save();ctx.beginPath();ctx.roundRect(w-pw-4,y-rh*.44,pw-8,rh*.88,fs*.5);ctx.clip();ctx.fillStyle=COLS[q];ctx.globalAlpha=q===VS?.42:.26;ctx.fillRect(w-pw-4,y-rh*.44,(pw-8)*Math.max(.04,CN[q]/top),rh*.88);ctx.restore();ctx.globalAlpha=1;
   if(k===0&&CN[q]>0)crownIcon(w-pw+fs*.58,y-1,fs*.4);else{ctx.fillStyle=COLS[q];ctx.beginPath();ctx.arc(w-pw+fs*.58,y,fs*.3,0,7);ctx.fill()}
   ctx.fillStyle='#ffffff';ctx.font=(q===VS?'800 ':'600 ')+fs+'px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(NM[q],w-pw+fs*1.2,y);ctx.textAlign='right';ctx.fillText((CN[q]*100/L).toFixed(1)+'%',w-14,y);
   });
  ctx.textAlign='left';ctx.font='700 '+fs+'px system-ui,sans-serif';const fy=(MINI?Math.min(84,w*.21)*WH/WW+28:14);
  FD.forEach((d,k)=>{ctx.globalAlpha=Math.min(1,d.l);const t=d.t,tw=ctx.measureText(t).width;glassBox(8,fy+k*fs*1.75-fs*.78,tw+fs*1.7,fs*1.56,fs*.78,.74);ctx.fillStyle=d.c||'#fff';ctx.beginPath();ctx.arc(8+fs*.7,fy+k*fs*1.75,fs*.26,0,7);ctx.fill();ctx.fillStyle='#ffffff';ctx.fillText(t,8+fs*1.25,fy+k*fs*1.75)});ctx.globalAlpha=1;
  if(me&&!me.alive&&state==='play'){ctx.font='800 '+Math.round(cs*1.6)+'px system-ui,sans-serif';ctx.textAlign='center';const t1=DEATH||'Wiped out',tw=Math.max(ctx.measureText(t1).width,cs*12)+cs*3;glassBox(w/2-tw/2,h/2-cs*2.4,tw,cs*4.8,cs,.84);ctx.fillStyle='#ffffff';ctx.fillText(t1,w/2,h/2-cs*.7);ctx.fillStyle='#aab6d3';ctx.font='700 '+Math.round(cs*1.2)+'px system-ui,sans-serif';ctx.fillText('Respawning...',w/2,h/2+cs*1.1)}}
 ctx.textBaseline='alphabetic';
 if(me&&me.alive&&state==='play'&&ptr.type==='mouse'&&ptr.sx!==undefined){ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(ptr.sx,ptr.sy,7,0,7);ctx.moveTo(ptr.sx-11,ptr.sy);ctx.lineTo(ptr.sx+11,ptr.sy);ctx.moveTo(ptr.sx,ptr.sy-11);ctx.lineTo(ptr.sx,ptr.sy+11);ctx.stroke()}}
