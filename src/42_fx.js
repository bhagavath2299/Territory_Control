// ---------- game events -> messages, sounds and sparks ----------
const NMAB={boost:'Boost',dash:'Dash',shield:'Shield',recall:'Recall',ghost:'Ghost',trap:'Mine',emp:'EMP',grab:'Grab'},
 ABD={boost:'Hold to sprint',dash:'A burst of speed',shield:'Blocks one trail cut',recall:'Jump home, drop your trail',ghost:'Trail cannot be cut for 2.5s',trap:'Drop a mine that wrecks rivals',emp:'Slow every rival near you',grab:'Claim land around you at your border'},
 ABC={boost:'#ffb020',dash:'#5ee1ff',shield:'#4fa3ff',recall:'#b78bff',ghost:'#bfe9ff',trap:'#ff5a6a',emp:'#5ee1ff',grab:'#e8d3a0'};
let lastSec=99,AB_=['boost'],RDY=[1,1],KIND='';
const isMe=q=>q===VS&&!RPL;
function setAbLabels(){const a=AB_[0],b=AB_[1];$('bst').innerHTML=(ABI[a]||'')+'<span>'+(NMAB[a]||'')+'</span>';$('bst').style.setProperty('--pc',ABC[a]||'#ffb020');
 $('a2').innerHTML=b?(ABI[b]||'')+'<span>'+NMAB[b]+'</span>':'';$('a2').style.setProperty('--pc',ABC[b]||'#5ee1ff')}
(function(){const d=[[IC.cannon,'Fire'],[IC.fort,'Fortify'],[IC.strike,'Strike']];PWB.forEach((b,j)=>{b.innerHTML=d[j][0]+'<span>'+d[j][1]+'</span>'})})();
function evFx(ty,mine,x,y){
 if(ty==='dash'){burst(x,y,'#ffffff',18,14);snd('dash');if(mine)buzz(20)}
 else if(ty==='shield'){burst(x,y,'#5ee1ff',22,8);snd('shield')}
 else if(ty==='pop'){burst(x,y,'#5ee1ff',40,12);snd('pop');if(mine){shake=10;buzz(60)}}
 else if(ty==='recall'){burst(x,y,'#b78bff',30,10);snd('recall')}
 else if(ty==='ghost'){burst(x,y,'#bfe9ff',20,6);snd('ghost')}
 else if(ty==='mine'){burst(x,y,'#ff5a6a',10,4);snd('mine')}
 else if(ty==='boom'){burst(x,y,'#ffb020',50,14);burst(x,y,'#ff3b4e',30,10);RINGS.push({x,y,t0:clk,c:'#ff7a1a'});snd('boom');shake=Math.max(shake,12);buzz(120)}
 else if(ty==='emp'){RINGS.push({x,y,t0:clk,c:'#5ee1ff'});burst(x,y,'#5ee1ff',26,9);snd('emp')}
 else if(ty==='grab'){RINGS.push({x,y,t0:clk,c:'#ffffff'});burst(x,y,'#e8d3a0',30,8);snd('grab');if(mine)shake=Math.max(shake,8)}
 else if(ty==='fire'){burst(x,y,'#ffd27a',10,9);snd('fire');if(mine)shake=Math.max(shake,4)}
 else if(ty==='fort'){RINGS.push({x,y,t0:clk,c:'#5ee1ff'});burst(x,y,'#5ee1ff',20,7);snd('fort')}
 else if(ty==='boom2'){burst(x,y,'#ffb020',36,12);burst(x,y,'#4a3a2a',18,6);SCORCH.push({x,y,r:2.4,t0:clk});if(SCORCH.length>24)SCORCH.shift();RINGS.push({x,y,t0:clk,c:'#ff7a1a'});
  const dd=me?Math.hypot(me.rx-x,me.ry-y):99;if(dd<14){shake=Math.max(shake,9*(1-dd/14));snd('boom2')}else if(dd<30)snd('boom2far')}}
function koMsg(v,b,why){if(!v)return;const vn=NM[v]||'Player',bn=NM[b]||'',mine=isMe(v);
 const t=why==='self'?(mine?'You crossed your own trail':vn+' crossed their own trail'):why==='noland'?(b?bn+(mine?' took all your land':' took all of '+vn+"'s land"):(mine?'You lost all your land':vn+' lost all their land')):why==='enclosed'?(bn+(mine?' trapped your trail':' trapped '+vn)):why==='blast'&&b?(bn+(mine?' blew up all your land':' blew up all of '+vn+"'s land")):why==='mine'&&b?(bn+"'s mine got "+(mine?'you':vn)):b?(bn+(mine?' cut your trail':' cut '+vn)):(mine?'You were eliminated':vn+' was eliminated');
 FD.push({t,c:COLS[b||v],l:4});if(FD.length>3)FD.shift();if(mine)DEATH=t}
function zoneEv(zi,o,old){const z=ZN[zi];if(!z)return;const nm=ZNAME[z.t];
 if(isMe(o)){FD.push({t:'You took the '+nm+': '+ZPOW[z.t]+' ready',c:COLS[VS],l:4});if(me)pop(me.rx,me.ry-3.2,ZPOW[z.t].toUpperCase()+' ONLINE','#ffb020',1.6);snd('zone');buzz(30)}
 else if(isMe(old))FD.push({t:'You lost the '+nm,c:COLS[o]||'#c8d1e6',l:4});
 else if(o&&NM[o])FD.push({t:NM[o]+' took the '+nm,c:COLS[o],l:4});
 if(FD.length>3)FD.shift();RINGS.push({x:z.x,y:z.y,t0:clk,c:COLS[o]||'#ffffff'})}
function seizeEv(h,v,n){const pc=(n*100/LANDN).toFixed(1);
 if(isMe(h)&&me){pop(me.rx,me.ry-2.5,'+'+pc+'% seized','#ffd54a',1.5);snd('seize')}
 if(h&&v&&NM[h]&&NM[v]){FD.push({t:(isMe(h)?'You':NM[h])+' seized '+(isMe(v)?'your':NM[v]+"'s")+' land',c:COLS[h],l:4});if(FD.length>3)FD.shift()}}
function strikeEv(i,t){if(!i||!t||!NM[i]||!NM[t])return;FD.push({t:(isMe(i)?'You':NM[i])+' called an airstrike on '+(isMe(t)?'you!':NM[t]),c:'#ff3b5e',l:4});if(FD.length>3)FD.shift();snd('strike');if(isMe(t))buzz(120)}
function rush(){if(state!=='play'){lastSec=99;return}const s=Math.ceil(tl);if(s!==lastSec){if(s<=10&&s>0){snd('tick',10-s);buzz(12)}else if(s===30){snd('rush');buzz(60)}lastSec=s}}
function updatePowDock(pl){const hb=pl&&me&&me.alive?MYHOLD:0,key=hb+'|'+(PRV[VS]>0?Math.ceil(PRV[VS]):0);
 if(key!==DOCKS){DOCKS=key;$('pwd').style.display=(hb&7)?'flex':'none';for(let j=0;j<3;j++)PWB[j].className='gb'+((hb&(1<<j))?' on':'');const sp=PWB[1].querySelector('span');if(sp)sp.textContent=PRV[VS]>0?Math.ceil(PRV[VS])+'s':'Fortify'}
 if(hb&7)for(let j=0;j<3;j++)if(hb&(1<<j))PWB[j].style.setProperty('--e',Math.max(0,Math.min(1,MYPW[j]||0)))}
