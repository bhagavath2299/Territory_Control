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
const SFXDB={ui:5.6,logo:-1.9,start:1.9,boost:13,dash:11,shield:-4.9,pop:2.9,recall:6.7,ghost:7.2,mine:4.2,boom:0,boom2:0,boom2far:1.1,emp:7.6,grab:4,fire:.9,fort:-.5,zone:5.3,seize:5.9,strike:9.9,tick:7.4,rush:1.1,kill:7.4,die:1.3,ko:4.4,capture:2.6,win:3.8,lose:2.3},SFXG={};for(const k in SFXDB)SFXG[k]=Math.pow(10,SFXDB[k]/20);
const SFXCD={ui:.03,ko:.1,kill:.05,capture:.07,tick:0,pop:.06,boom:.08,boom2:.1,boom2far:.1,die:.3,win:1,lose:1,start:.5,boost:.12,dash:.1,fire:.08};
const SFXDUCK={boom:.3,boom2:.5,boom2far:.12,die:.5,win:.55,lose:.5,rush:.3,strike:.12,capture:.1,kill:.12};

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
  lose(t){M.res=-1;const T=fold(MUSD[2].k,60);[7,3,0,-5].forEach((n,i)=>bell(MIDI(T+n),t+i*.22,1.6,.08,OUT));osc('sine',220,110,t,1,.12,OUT,{at:.02});pad([T-12,T-9,T-5],t+.2,2,.05,OUT,900)}};
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
