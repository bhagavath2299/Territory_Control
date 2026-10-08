// ---------- screens: main menu, lobby, garage, replays, settings, results ----------
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
// features that are built but not shown yet (switch on when they are ready to launch)
const FEAT={ranked:0,war:0,stats:0,rewards:0};
const ACHL={first:'First win',m10:'10 matches played',w10:'10 wins',k25:'25 takedowns',h50:'Held 50% of the map',s3:'3 wins in a row'};
const CITYL=['Hyderabad','Bengaluru','Chennai','Mumbai','Delhi','Pune','Kolkata','Ahmedabad','Jaipur','Lucknow','Kochi','Visakhapatnam','Vijayawada','Coimbatore','Indore','Chandigarh','Surat','Nagpur','Patna','Bhubaneswar','Guwahati','Warangal','Mysuru','Thiruvananthapuram'];
const MODEN={ranked:'Ranked',quick:'Quick match',private:'With friends',bots:'Practice',local:'Practice'};
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n);
function show(h,s,cls){scr=s;const o=$('ov'),c=$('card');c.innerHTML=h;c.scrollTop=0;o.className=cls||'pn';c.style.animation='none';void c.offsetWidth;c.style.animation=''}
function hideOv(){$('ov').className='h'}
let toastT=0;function toast(t,ms){const e=$('toast');e.textContent=t;e.className='s';clearTimeout(toastT);toastT=setTimeout(()=>{e.className=''},ms||2400)}
const hdr=(t,a)=>'<div class="hd"><button class="back" data-a="'+(a||'menu')+'" aria-label="Back">'+IC.back+'</button><div class="ttl">'+t+'</div></div>';
const LOGO='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fb0ff"/><stop offset="1" stop-color="#7a4dff"/></linearGradient><linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a5c"/><stop offset="1" stop-color="#ff3d6b"/></linearGradient></defs><path d="M8 24C8 13 15 8 25 8h16c11 0 17 6 17 16v16c0 11-6 16-17 16H25C14 56 8 51 8 40z" fill="url(#lg1)"/><path d="M8 24C8 13 15 8 25 8h16c11 0 17 6 17 16v16c0 11-6 16-17 16H25C14 56 8 51 8 40z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/><path d="M34 8h7c11 0 17 6 17 16v8H34z" fill="url(#lg2)" opacity=".95"/><path d="M18 42 18 26 30 26 30 36 46 36 46 22" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 0"/><circle cx="46" cy="21" r="4.5" fill="#fff"/></svg>';
function initial(){const n=(myName||ME.name||'P').trim();return esc(n.charAt(0).toUpperCase()||'P')}
function menu(){const m=ME,nm=esc(myName||m.name||'Player');
 const on=online,cnt=replayCount();
 show('<div class="mm-top"><button class="chip" data-a="garage" aria-label="Garage and profile"><span class="av">'+initial()+'</span><div style="flex:1;min-width:0"><b>'+nm+'</b><span class="sub">'+(on?'Level '+m.lv+' &middot; '+m.coins+' coins':'Tap to set up your car')+'</span>'+(on?'<div class="xp"><i style="width:'+m.pr+'%"></i></div>':'')+'</div></button><button class="ibtn" data-a="settings" aria-label="Settings">'+IC.gear+'</button></div>'
 +'<div class="logo">'+LOGO+'<h1 style="margin:0"><img class="wmi" alt="Territory Control" src="'+wmURL()+'"></h1><p class="tag">Claim the map</p></div>'
 +'<div class="mm-btns">'
 +'<button class="btn play" data-a="quick">'+IC.play+'<span class="tx">PLAY<small>'+(on?'Online match &middot; 2 min':'Offline &middot; vs bots')+'</small></span></button>'
 +(on?'<button class="btn" data-a="bots">'+IC.bots+'<span class="tx">Practice<small>Solo against bots</small></span></button>':'')
 +'<button class="btn vio'+(on?'':' off')+'" data-a="friends">'+IC.friends+'<span class="tx">Play with friends<small>'+(on?'Private room &amp; invite link':'Needs the server')+'</small></span></button>'
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
function howUI(){show(hdr('How to play')+'<div class="rw"><span>1. Drag to steer your car. It always moves forward.</span></div><div class="rw"><span>2. Leave your land to draw a trail. Loop back home to claim everything inside.</span></div><div class="rw"><span>3. If a rival touches your trail you are out, so cut theirs first!</span></div><div class="rw"><span>4. Eliminate a rival and all of their land becomes yours.</span></div><div class="rw"><span>5. Pick two abilities in the Garage: Boost, Dash, Shield or Recall.</span></div><div class="rw"><span>6. Own half of a power zone to use its power: Cannon, Fortify, Airstrike or Nitro.</span></div><p class="hint">Matches last 2 minutes. The most land wins.</p>','how')}
// ---------- garage: name, car, trail and two abilities ----------
let GPV=0;
function garageUI(keep){const sc=keep?$('card').scrollTop:0,lo=LOAD;
 show(hdr('Garage')+'<div class="prev"><canvas id="gpv" width="640" height="320"></canvas></div>'
 +'<input id="nm" class="inp" maxlength="12" placeholder="Your name" autocomplete="off" autocapitalize="words" value="'+esc(myName||(online?ME.name:'')||'')+'">'
 +'<div class="sec">Car</div><div class="grid3">'+CARS.map(k=>'<button class="opt'+(lo.skin===k?' on':'')+'" data-a="skin" data-v="'+k+'"><canvas width="240" height="120" data-car="'+k+'"></canvas>'+CARDEF[k]+'</button>').join('')+'</div>'
 +'<div class="sec">Trail</div><div class="grid3">'+TRAILS.map(k=>'<button class="opt'+(lo.trail===k?' on':'')+'" data-a="trail" data-v="'+k+'"><canvas width="240" height="120" data-trl="'+k+'"></canvas>'+TRLDEF[k]+'</button>').join('')+'</div>'
 +'<div class="sec">Abilities &middot; pick 2</div>'+OPEN_AB.map(a=>{const i=lo.ab.indexOf(a);return '<button class="ab'+(i>=0?' on':'')+'" data-a="ab" data-v="'+a+'" style="--k:'+ABC[a]+'"><span class="ic">'+ABI[a]+'</span><span><b>'+NMAB[a]+'</b><small>'+ABD[a]+'</small></span><span class="n">'+(i>=0?i+1:'')+'</span></button>'}).join('')
 +'<p class="hint">Cars and trails are cosmetic. Nothing here gives anyone a competitive edge.</p>','garage');
 $('card').scrollTop=sc;for(const c of $('card').querySelectorAll('canvas[data-car]'))carThumb(c,c.dataset.car);for(const c of $('card').querySelectorAll('canvas[data-trl]'))trailThumb(c,c.dataset.trl);
 if(!GPV){GPV=1;requestAnimationFrame(gpvLoop)}}
function gpvLoop(t){const c=document.getElementById('gpv');if(scr!=='garage'||!c){GPV=0;return}drawGaragePreview(c,t/1000);requestAnimationFrame(gpvLoop)}
function setLoad(k,v){LOAD[k]=v;saveLoad();if(online){if(k==='ab')tx({t:'ab',a:v});else tx({t:k,v})}else LOAD.dirty=1;if(k==='ab')ME.ab=v.slice();else ME[k]=v;resetCos();garageUI(1)}
// ---------- settings ----------
function saveSet(){lsSet('ct-set',JSON.stringify(SET))}
function settingsUI(){const sw=(k,t,s)=>'<button class="sw" data-a="set" data-v="'+k+'" style="width:100%"><b>'+t+(s?'<small>'+s+'</small>':'')+'</b><span class="tg'+(SET[k]?' on':'')+'"></span></button>';
 show(hdr('Settings')+sw('music','Music','The soundtrack follows the match')+'<div class="sw"><b>Music volume</b><input type="range" id="mvol" min="0" max="100" value="'+Math.round(SET.mvol*100)+'" aria-label="Music volume"></div>'+sw('sfx','Sound effects','')+sw('vib','Vibration','Haptics on supported phones')
 +'<div class="sw"><b>Graphics<small>Auto lowers detail on slow phones</small></b><span class="seg">'+['auto','high','low'].map(q=>'<button class="'+(SET.q===q?'on':'')+'" data-a="qual" data-v="'+q+'">'+q[0].toUpperCase()+q.slice(1)+'</button>').join('')+'</span></div>'
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
  +rk.map((i,k)=>'<div class="rw'+(i===VS?' me':'')+'"><b>'+(k+1)+'</b><i class="d" style="--c:'+COLS[i]+'"></i><span>'+esc(NM[i])+'</span><em>'+Math.round(CN[i]*100/LANDN)+'%</em></div>').join('')
  +'<p id="rw" class="hint">'+(MP?'Saving rewards...':'')+'</p><div id="rpslot"></div>'
  +(MP?(KIND==='ranked'?'<button class="btn vio" data-a="ranked">Play ranked again</button>':'<button class="btn gr" data-a="cont">'+(KIND==='quick'?'Next match':'Continue')+'</button>'):'<button class="btn gr" data-a="again">Play again</button>')
  +'<button class="btn ghost" data-a="menu2">Menu</button>','result');resultReplay()}
function resultReplay(){const e=$('rpslot');if(!e)return;
 if(!LASTREP){e.innerHTML=MP?'<p class="hint" style="margin:0">Saving the replay...</p>':'';return}
 e.innerHTML='<button class="btn vio" data-a="watchlast">'+IC.replay+'<span class="tx">Watch replay<small>Saved for '+(LASTREP.days||7)+' days</small></span></button>'}
// the server keeps sending lobby updates to a player who is still in a room; they may only take over the screen when the player is waiting
const NOTAKE={result:1,replay:1,rpend:1,load:1,replays:1,garage:1,settings:1,rewards:1,stats:1,war:1,how:1,gone:1};
function lobbyOK(){return state!=='play'&&state!=='replay'&&!RPL&&!NOTAKE[scr]}
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
  case 'bots':localMatch(4,'bots');break;
  case 'friends':if(online)friendsUI();else toast('Playing with friends needs the server');break;
  case 'create':tx({t:'create'});waitUI();break;
  case 'joincode':{const c=String($('cd').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(c){tx({t:'join',room:c});waitUI()}break}
  case 'stats':ST2=null;statsUI();tx({t:'stats'});break;
  case 'war':WARD=online?null:DEMOWAR;warUI();if(online)tx({t:'war'});break;
  case 'garage':garageUI();break;
  case 'settings':settingsUI();break;
  case 'replays':replaysUI();break;
  case 'how':howUI();break;
  case 'rewards':rewardsUI();break;
  case 'daily':tx({t:'daily'});break;
  case 'ab':{const cur=LOAD.ab.slice();if(!cur.includes(v))setLoad('ab',[cur[1],v]);break}
  case 'skin':case 'trail':if(v!==LOAD[a])setLoad(a,v);break;
  case 'set':SET[v]=SET[v]?0:1;saveSet();if(AUD)AUD.apply();settingsUI();break;
  case 'qual':SET.q=v;saveSet();applyQuality(1);settingsUI();break;
  case 'clearrp':for(const r of localIdx())lsDel('ct-rp-'+r.id);lsSet('ct-rpx','[]');toast('Deleted');break;
  case 'challenge':if(online&&MP)tx({t:'challenge'});else shareChallenge();break;
  case 'invite':shareInv();break;
  case 'go':tx({t:'go',bots:0});break;
  case 'gob':tx({t:'go',bots:1});break;
  case 'leave':tx({t:'leave'});LB=null;backToMenu();break;
  case 'cont':if(online&&KIND==='quick'){tx({t:'quick'});waitUI()}else LB?lobbyUI():backToMenu();break;
  case 'again':localMatch(4,'bots');break;
  case 'back':case 'menu':backToMenu();break;
  case 'menu2':case 'quit':if(MP||online)tx({t:'leave'});LB=null;backToMenu();break;
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
