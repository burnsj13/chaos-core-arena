import {drawDeath,type DeathVisual} from './death';
import {Battle,ROSTER,IDS,STEP,seeded,clamp,length,statsFor,cooldownFor,shardCount,type Fighter,type FighterId,type VisualEvent} from './engine';
import {drawAura,drawCore,drawWell,drawFireball,drawUltimate,drawElementAura,drawElementUltimate,type UltimateVisual} from './effects';
import '../style.css';
import {ArenaAudio} from './audio';
const $=(id:string)=>document.getElementById(id)!;
const options=IDS.map(id=>`<option value="${id}">${ROSTER[id].name}</option>`).join('');
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`<main><header><div><span class="eyebrow">AUTONOMOUS PHYSICS BATTLES</span><h1>CHAOS <em>CORE</em> ARENA</h1></div><span class="version">SIX CHALLENGERS / 0.2</span></header>
<section class="matchup-controls" aria-label="Choose challengers"><label>Challenger 1<select id="pick0" aria-label="Challenger 1">${options}</select></label><span>VS</span><label>Challenger 2<select id="pick1" aria-label="Challenger 2">${options}</select></label><button id="randomMatch">Random matchup</button></section>
<section class="stage">${[0,1].map(i=>`<div class="fighter ${i?'right':'left'}"><div class="name"><span class="fighter-name" id="name${i}"></span> <span id="level${i}">LV 1</span></div><div class="hp"><div id="hp${i}"></div></div><div class="stats"><span id="health${i}"></span><span id="charge${i}"></span></div></div>`).join('')}
<div class="arena-wrap"><canvas id="arena" width="720" height="720" aria-label="Live battle arena"></canvas><div class="banner" id="banner"></div></div><div id="replayNote" class="replay-note"></div><div class="bottom"><span id="clock"></span><span id="status"></span><span id="seedLabel"></span></div>
<section class="live-stats" aria-label="Live fighter stats">${[0,1].map(i=>`<article class="live-card" id="card${i}"><h2><span id="liveName${i}"></span><span>LIVE STATS</span></h2><dl>${[['impact','Impact damage'],['speed','Speed'],['power','Special power'],['ultimateDamage','Ultimate base damage'],['effect','Current effect'],['defense','Defense / status'],['active','Active objects'],['cadence','Special interval'],['cooldown','Next special']].map(([key,label])=>`<div><dt id="label-${key}${i}">${label}</dt><dd id="${key}${i}"></dd></div>`).join('')}</dl><div class="evolution-label"><span>Evolution</span><span id="evolution${i}"></span></div><div class="evolution-track"><div id="evolutionBar${i}"></div></div></article>`).join('')}</section></section>
<section class="controls"><button id="portrait">Vertical layout</button><button id="exportVideo">Record TikTok video</button><button id="soundToggle">Enable sound</button><label>Volume<input id="soundVolume" type="range" min="0" max="100" value="45" /></label><label><input id="musicToggle" type="checkbox" checked />Dynamic music</label><label>Music<input id="musicVolume" type="range" min="0" max="100" value="27" /></label><span id="exportStatus" aria-live="polite"></span><button id="finishReplay" disabled>Replay finish</button><label><input id="autoReplay" type="checkbox" checked />Auto finish replay</label><button id="pause">Pause</button><button id="restart">New battle</button><button id="replay">Replay seed</button><label>Speed<select id="speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><label>Seed<input id="seed" type="number" value="1" min="1" max="99999999" /></label></section><section class="details">${[0,1].map(i=>`<article id="details${i}"></article>`).join('')}</section><p class="hint">Choose any pairing · Seeded starts · First ability hit evolves · Ultimates at 100% · Matchup advantages welcome</p></main>`;
($('pick1') as HTMLSelectElement).value='singularity';
const audio=new ArenaAudio();
let soundEnabled=false;
$('soundToggle').onclick=async()=>{soundEnabled=!soundEnabled;if(soundEnabled)await audio.unlock();audio.setEnabled(soundEnabled);$('soundToggle').textContent=soundEnabled?'Mute sound':'Enable sound'};
$('musicToggle').addEventListener('change',()=>audio.setMusicEnabled(($('musicToggle') as HTMLInputElement).checked));
$('musicVolume').addEventListener('input',()=>audio.setMusicVolume(Number(($('musicVolume') as HTMLInputElement).value)/100));
$('soundVolume').addEventListener('input',()=>audio.setVolume(Number(($('soundVolume') as HTMLInputElement).value)/100));
let replaying=false,replayDone=false,replayWait=0,completed:Battle|null=null,finishLabel='';
let battle=new Battle(['inferno','singularity'],1),paused=false,last=performance.now(),accumulator=0;
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;color:string;size:number};
type DamagePopup={x:number;y:number;amount:number;life:number;color:string};
type Arc={from:{x:number;y:number};to:{x:number;y:number};life:number;color:string};
let particles:Particle[]=[],damagePopups:DamagePopup[]=[],ultimateVisuals:(UltimateVisual&{id:FighterId;color:string})[]=[],arcs:Arc[]=[],visualRng=seeded(1),shake=0,flash=0,announcement='',announceTimer=0;
let death:DeathVisual|null=null;
let blooms:{pos:{x:number;y:number};delay:number;life:number;angle:number}[]=[];
const ctx=($('arena') as HTMLCanvasElement).getContext('2d')!;
const W=720,C=360,R=308,POPUP_LIFETIME=.95;
function emit(x:number,y:number,color:string,count=12,power=160){for(let i=0;i<count;i++){const a=visualRng()*Math.PI*2,s=(.25+visualRng())*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+visualRng()*.5,max:.8,color,size:1+visualRng()*3})}if(particles.length>900)particles.splice(0,particles.length-900)}
function banner(text:string,d=1.45){announcement=text;announceTimer=d}
function reset(seed:number){replaying=false;replayDone=false;replayWait=0;completed=null;finishLabel='';
 const ids=[$('pick0'),$('pick1')].map(el=>(el as HTMLSelectElement).value) as [FighterId,FighterId];
 audio.resetMusic();battle=new Battle(ids,clamp(Math.floor(seed)||1,1,99999999));visualRng=seeded(battle.seed^0x9e3779b9);paused=false;accumulator=0;particles=[];damagePopups=[];ultimateVisuals=[];arcs=[];blooms=[];death=null;shake=0;flash=0;
 ($('seed') as HTMLInputElement).value=String(battle.seed);$('pause').textContent='Pause';banner('FIGHT!',1.1);
 battle.fighters.forEach((f,i)=>{const d=ROSTER[f.id];$('name'+i).textContent=`${d.icon} ${d.name.toUpperCase()}`;$('liveName'+i).textContent=d.name;$('card'+i).style.setProperty('--accent',d.color);$('hp'+i).style.background=`linear-gradient(90deg,${d.glow},${d.color})`;
  $('details'+i).innerHTML=`<h2 style="color:${d.color}">${d.icon} ${d.name.toUpperCase()}</h2><p class="archetype">${d.style}</p><p><b>Basic:</b> ${d.basic}</p><p><b>Passive:</b> ${d.passive}</p><p><b>Special:</b> ${d.special}</p><p><b>Ultimate:</b> ${d.ultimate}</p>`;
 });updateUI();
}
function startFinishReplay(){if(!completed)return;const original=completed;battle=new Battle(original.fighters.map(f=>f.id) as [FighterId,FighterId],original.seed);while(battle.time<Math.max(0,original.time-5)&&battle.winner<0&&!battle.draw)battle.update();particles=[];damagePopups=[];arcs=[];ultimateVisuals=[];replaying=true;replayDone=true;paused=false;accumulator=0;$('pause').textContent='Pause';banner('FINISH REPLAY · ½ SPEED',1.3);}
function consume(e:VisualEvent){
 const f=battle.fighters[e.owner];
 audio.event(e);
 if(e.kind==='hit'){finishLabel=(e.damageKind??'ability').toUpperCase();damagePopups.push({x:e.pos.x,y:e.pos.y-42,amount:e.amount!,life:POPUP_LIFETIME,color:f.color});emit(e.pos.x,e.pos.y,f.color,5,90);shake=Math.max(shake,2)}
 if(e.kind==='evolve')emit(f.pos.x,f.pos.y,f.glow,22,130);
 if(e.kind==='special')emit(e.pos.x,e.pos.y,f.color,12,130);
 if(e.kind==='steam')emit(e.pos.x,e.pos.y,'#c6edff',24,80);
 if(e.kind==='burst')for(let k=0;k<Math.ceil(e.amount??0);k++)blooms.push({pos:{...e.pos},delay:k*.09,life:.5,angle:k*Math.PI*2/Math.max(1,e.amount??1)});
 if(e.kind==='shield')emit(e.pos.x,e.pos.y,f.color,3,60);if(e.kind==='slam'){emit(e.pos.x,e.pos.y,'#fff1b7',35,270);shake=Math.max(shake,9);flash=Math.max(flash,.13)}
 if((e.kind==='arc'||e.kind==='warning')&&e.target)arcs.push({from:e.pos,to:e.target,life:e.kind==='warning'?.25:.3,color:e.kind==='warning'?'#ffffff55':f.color});
 if(e.kind==='ultimate'){ultimateVisuals.push({owner:e.owner,life:1.45,max:1.45,pos:e.pos,id:f.id,color:f.color});banner(ROSTER[f.id].ultimate+'!');emit(e.pos.x,e.pos.y,f.glow,60,300);shake=12;flash=.3}
}
function update(dt:number){
 if(death)death.elapsed=Math.min(death.duration,death.elapsed+dt);
 for(const b of blooms){b.delay-=dt;if(b.delay<=0)b.life-=dt}blooms=blooms.filter(b=>b.life>0);
 if(completed&&!replaying&&!replayDone&&($('autoReplay') as HTMLInputElement).checked){replayWait+=dt;if(replayWait>=1.5){startFinishReplay();return}}

 for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.975;p.vy*=.975}particles=particles.filter(p=>p.life>0);
 for(const p of damagePopups){p.life-=dt;p.y-=38*dt}damagePopups=damagePopups.filter(p=>p.life>0).slice(-80);
 for(const e of ultimateVisuals)e.life-=dt;ultimateVisuals=ultimateVisuals.filter(e=>e.life>0);for(const a of arcs)a.life-=dt;arcs=arcs.filter(a=>a.life>0);
 shake=Math.max(0,shake-dt*25);flash=Math.max(0,flash-dt);announceTimer=Math.max(0,announceTimer-dt);
 const finished=battle.winner>=0||battle.draw;battle.update(dt);if(!finished){for(const e of battle.events)consume(e);
  if(battle.winner>=0){if(!replaying){completed=battle;replayWait=0}else{replaying=false;replayDone=true;}const f=battle.fighters[battle.winner];if(!battle.timeout){const loser=battle.fighters[1-battle.winner];death={id:loser.id,pos:{...loser.pos},r:loser.r,color:loser.color,elapsed:0,duration:2.4,seed:battle.seed^0x734ae8};}audio.winner();banner(`${f.name.toUpperCase()} WINS${battle.timeout?' BY HP':''}!`,999);emit(f.pos.x,f.pos.y,f.color,60,240)}else if(battle.draw){completed=battle;replayDone=true;banner('DRAW!',999);}
  if(battle.frame%5===0)battle.fighters.forEach(f=>emit(f.pos.x,f.pos.y,f.glow,1,20));
 }
}
function glowCircle(x:number,y:number,r:number,color:string,blur=22){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawOrbHealth(f:Fighter){
 const width=f.r*1.65,height=14,x=f.pos.x-width/2,y=f.pos.y-height/2;
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,width,height,5);ctx.clip();ctx.fillStyle='#090d1fe8';ctx.fillRect(x,y,width,height);ctx.fillStyle=f.hp/f.maxHp<=.25?'#b83246':f.glow;ctx.fillRect(x,y,width*f.hp/f.maxHp,height);
 ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 10px system-ui';ctx.lineWidth=2.5;ctx.strokeStyle='#090d1f';const label=String(Math.ceil(f.hp));ctx.strokeText(label,f.pos.x,f.pos.y+.5);ctx.fillText(label,f.pos.x,f.pos.y+.5);ctx.restore();
 ctx.save();ctx.strokeStyle='#ffffff99';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,width,height,5);ctx.stroke();ctx.restore();
}
function draw(){
 ctx.clearRect(0,0,W,W);ctx.save();if(shake>0)ctx.translate((visualRng()-.5)*shake,(visualRng()-.5)*shake);
 const bg=ctx.createRadialGradient(C,C,25,C,C,350);bg.addColorStop(0,'#151b33');bg.addColorStop(1,'#070a16');ctx.fillStyle=bg;ctx.fillRect(0,0,W,W);
 ctx.save();ctx.beginPath();ctx.arc(C,C,R,0,Math.PI*2);ctx.clip();ctx.strokeStyle='#242d48';ctx.lineWidth=1;for(let r=75;r<310;r+=75){ctx.beginPath();ctx.arc(C,C,r,0,Math.PI*2);ctx.stroke()}
 for(let a=0;a<12;a++){const t=a*Math.PI/6;ctx.beginPath();ctx.moveTo(C,C);ctx.lineTo(C+Math.cos(t)*R,C+Math.sin(t)*R);ctx.stroke()}
 for(const patch of battle.patches){
   const a=Math.atan2(patch.pos.y-C,patch.pos.x-C),pulse=.8+.2*Math.sin(battle.time*8+a*5);
   ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowColor='#ff4a0b';ctx.shadowBlur=22;ctx.lineCap='round';
   ctx.strokeStyle='#f65b18';ctx.lineWidth=12;ctx.beginPath();ctx.arc(C,C,R-8,a-.14,a+.14);ctx.stroke();
   ctx.strokeStyle='#ffe27b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(C,C,R-8,a-.12,a+.12);ctx.stroke();
   for(let k=0;k<7;k++){const phase=(battle.time*(1.2+k*.09)+k*.17)%1,theta=a+(k-3)*.035+Math.sin(battle.time*5+k)*.012;
    const root=R-9,tip=root-(10+phase*22)*pulse,spread=3+Math.sin(battle.time*9+k)*2;
    ctx.globalAlpha=(1-phase)*.85;ctx.fillStyle=k%3===0?'#fff4b4':k%2?'#ff9a29':'#ff4216';
    ctx.beginPath();ctx.moveTo(C+Math.cos(theta-.012)*root,C+Math.sin(theta-.012)*root);
    ctx.quadraticCurveTo(C+Math.cos(theta)*tip+Math.cos(theta+Math.PI/2)*spread,C+Math.sin(theta)*tip+Math.sin(theta+Math.PI/2)*spread,C+Math.cos(theta+.012)*root,C+Math.sin(theta+.012)*root);ctx.fill();
   }ctx.restore();
  }
 if(battle.fighters.some(f=>f.id==='volt'))for(let k=0;k<4;k++)glowCircle(C+Math.cos(k*Math.PI/2)*245,C+Math.sin(k*Math.PI/2)*245,4,'#dfcf76',10);
 for(const w of battle.wells)drawWell(ctx,w,battle.time);
 for(const e of ultimateVisuals){if(e.id==='inferno'||e.id==='singularity')drawUltimate(ctx,{...e,owner:e.id==='inferno'?0:1},battle.time);else drawElementUltimate(ctx,e,battle.time)}
 for(const p of battle.projectiles){if(p.kind==='fire'&&!p.returned)drawFireball(ctx,p,battle.time);else{const color=battle.fighters[p.owner].color;ctx.save();ctx.translate(p.pos.x,p.pos.y);ctx.rotate(Math.atan2(p.vel.y,p.vel.x));ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.beginPath();if(p.kind==='ice'){ctx.moveTo(12,0);ctx.lineTo(-8,-5);ctx.lineTo(-5,0);ctx.lineTo(-8,5);ctx.closePath()}else ctx.ellipse(0,0,10,6,0,0,Math.PI*2);ctx.fill();ctx.restore()}}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);glowCircle(p.x,p.y,p.size,p.color,6)}ctx.globalAlpha=1;
 for(const arc of arcs){ctx.save();ctx.globalAlpha=arc.life/.3;ctx.strokeStyle=arc.color;ctx.shadowColor=arc.color;ctx.shadowBlur=14;ctx.lineWidth=2;ctx.beginPath();for(let k=0;k<=12;k++){const p=k/12,x=arc.from.x+(arc.to.x-arc.from.x)*p,y=arc.from.y+(arc.to.y-arc.from.y)*p,jitter=k&&k<12?Math.sin(k*17+battle.time*60)*12:0;if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x+jitter,y-jitter)}ctx.stroke();ctx.restore()}
 for(const b of blooms)if(b.delay<=0){ctx.save();ctx.globalAlpha=b.life/.5;glowCircle(b.pos.x+Math.cos(b.angle)*(30+(1-b.life/.5)*30),b.pos.y+Math.sin(b.angle)*(30+(1-b.life/.5)*30),3+b.life*8,'#b1ee64',18);ctx.restore();}
 battle.fighters.forEach(f=>{
  if(f.hp<=0&&death)return;
  const legacy=f.id==='inferno'?0:1;if(f.id==='inferno'||f.id==='singularity')drawAura(ctx,f,legacy,battle.time);else drawElementAura(ctx,f,battle.time);
  ctx.save();ctx.shadowColor=f.glow;ctx.shadowBlur=26;const g=ctx.createRadialGradient(f.pos.x-7,f.pos.y-8,2,f.pos.x,f.pos.y,f.r);g.addColorStop(0,'#fff4da');g.addColorStop(.23,f.color);g.addColorStop(1,f.glow);ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.pos.x,f.pos.y,f.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  if(f.id==='inferno'||f.id==='singularity')drawCore(ctx,f,legacy,battle.time);drawOrbHealth(f);ctx.fillStyle=f.color;ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(ROSTER[f.id].label,f.pos.x,f.pos.y-f.r-13);
  for(let k=0;k<Math.ceil(f.poison);k++){const a=k*Math.PI*2/Math.max(1,Math.ceil(f.poison))+battle.time*.4;glowCircle(f.pos.x+Math.cos(a)*(f.r+5),f.pos.y+Math.sin(a)*(f.r+5),2.5,'#b1ee64',6);}
  if(f.chill>0){ctx.strokeStyle='#83eaff88';ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.pos.x,f.pos.y,f.r+4,0,Math.PI*2);ctx.stroke()}
  if(f.ult>75){ctx.strokeStyle=f.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.pos.x,f.pos.y,f.r+9,-Math.PI/2,-Math.PI/2+Math.PI*2*f.ult/100);ctx.stroke()}
 });
 if(death)drawDeath(ctx,death);
 ctx.restore();ctx.strokeStyle='#a07bff';ctx.shadowColor='#855bff';ctx.shadowBlur=18;ctx.lineWidth=7;ctx.beginPath();ctx.arc(C,C,R,0,Math.PI*2);ctx.stroke();ctx.restore();
 if(flash>0){ctx.fillStyle=`rgba(255,255,255,${flash*.15})`;ctx.fillRect(0,0,W,W)}
 if((battle.winner>=0||battle.draw)&&(!death||death.elapsed>.8)){
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#000';ctx.shadowBlur=16;ctx.fillStyle='#fff';ctx.strokeStyle='#090b18';ctx.lineWidth=7;ctx.font='900 32px system-ui';
  const result=battle.draw?'DRAW!':`${battle.fighters[battle.winner].name.toUpperCase()} WINS!`;
  ctx.strokeText(result,360,105);ctx.fillText(result,360,105);ctx.restore();
 }
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';for(const p of damagePopups){ctx.globalAlpha=Math.min(1,p.life/.35);ctx.font='bold 19px system-ui';ctx.lineWidth=4;ctx.strokeStyle='#070a16';ctx.fillStyle=p.color;const text=`−${Math.max(1,Math.round(p.amount))}`,x=clamp(p.x,28,W-28),y=clamp(p.y,18,W-18);ctx.strokeText(text,x,y);ctx.fillText(text,x,y)}ctx.restore();
}
// Record only the arena canvas, including all in-arena effects and the death animation.
const videoCanvas=$('arena') as HTMLCanvasElement;
let recorder:MediaRecorder|null=null,recording=false,recordedChunks:Blob[]=[],recordingFrames=0;
let recordEndingAt:number|null=null;
const INTRO_SECONDS=3;
let introStart:number|null=null, introBeat=-1, fightOverlayUntil=0;
function composeVideo(){/* Record the same arena canvas; intro is drawn into it. */}
function drawIntro(elapsed:number){
 const [left,right]=battle.fighters,progress=clamp(elapsed/INTRO_SECONDS,0,1);
 ctx.save();ctx.fillStyle='#0e1120';ctx.fillRect(0,0,W,W);
 const bg=ctx.createRadialGradient(C,C,20,C,C,450);bg.addColorStop(0,'#24203d');bg.addColorStop(1,'#0a0d19');ctx.fillStyle=bg;ctx.fillRect(0,0,W,W);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowBlur=20;
 ctx.shadowColor='#8f70ff';ctx.fillStyle='#d8c6f7';ctx.font='900 39px system-ui';ctx.fillText('WHO WINS?',C,120);
 ctx.shadowBlur=0;ctx.fillStyle='#e9eafc';ctx.font='900 24px system-ui';ctx.fillText('CHAOS ARENA BATTLES',C,53);
 const fighters=[left,right];
 fighters.forEach((f,i)=>{const x=i===0?190:530,y=325;ctx.shadowColor=f.glow;ctx.shadowBlur=34;ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(x,y,82+Math.sin(elapsed*5+i)*3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#10121f';ctx.beginPath();ctx.arc(x,y,65,0,Math.PI*2);ctx.fill();ctx.fillStyle=f.color;ctx.font='900 65px system-ui';ctx.fillText(ROSTER[f.id].icon,x,y+4);ctx.fillStyle='#f4f1ff';ctx.font='800 23px system-ui';ctx.fillText(f.name.toUpperCase(),x,y+123)});
 ctx.fillStyle='#f9f6ff';ctx.font='900 42px system-ui';ctx.fillText('VS',C,325);
 const countdown=Math.max(1,3-Math.floor(elapsed));ctx.shadowColor='#a875ff';ctx.shadowBlur=30;ctx.fillStyle='#ffffff';ctx.font='900 116px system-ui';ctx.fillText(String(countdown),C,557);ctx.shadowBlur=0;
 ctx.fillStyle='#38314f';ctx.fillRect(125,646,470,9);ctx.fillStyle='#ae85ff';ctx.fillRect(125,646,470*progress,9);
 ctx.restore();
}
function drawFightOverlay(){ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#ff994e';ctx.shadowBlur=28;ctx.strokeStyle='#11101d';ctx.lineWidth=9;ctx.fillStyle='#fff';ctx.font='900 82px system-ui';ctx.strokeText('FIGHT!',C,C);ctx.fillText('FIGHT!',C,C);ctx.restore()}

function stopRecording(){if(!recording)return;recording=false;introStart=null;if(recorder?.state==='recording')recorder.stop();$('exportVideo').textContent='Record TikTok video';}
async function startRecording(){
 if(!('MediaRecorder' in window)||!videoCanvas.captureStream){$('exportStatus').textContent='Browser does not support video recording';return}
 if(recording)return;
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime){$('exportStatus').textContent='No supported WebM encoder';return}
 // The user clicked Record, so browser audio may be unlocked here.
 try{await audio.unlock();soundEnabled=true;audio.setEnabled(true);$('soundToggle').textContent='Mute sound'}catch(e){$('exportStatus').textContent='Audio unavailable: '+String(e)}
 const seed=battle.seed;reset(seed);($('autoReplay') as HTMLInputElement).checked=false;
 ($('speed') as HTMLSelectElement).value='1';recordedChunks=[];recordingFrames=0;recordEndingAt=null;introStart=null;introBeat=-1;fightOverlayUntil=0;
 composeVideo();const stream=videoCanvas.captureStream(30);
 const audioTrack=audio.track;if(audioTrack)stream.addTrack(audioTrack.clone());
 try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5_000_000})}catch(e){$('exportStatus').textContent=String(e);stream.getTracks().forEach(t=>t.stop());return}
 recorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data)};
 recorder.onerror=()=>{$('exportStatus').textContent='Recording failed';recording=false};
 recorder.onstop=()=>{
  stream.getTracks().forEach(t=>t.stop());
  const blob=new Blob(recordedChunks,{type:mime});if(!blob.size){$('exportStatus').textContent='Empty recording';return}
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
  link.download=`chaos-arena-only-${battle.fighters[0].id}-vs-${battle.fighters[1].id}-seed-${seed}.webm`;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  $('exportStatus').textContent=`Saved WebM (${(blob.size/1048576).toFixed(1)} MB). Convert to MP4 for TikTok.`;
 };
 recorder.start(1000);recording=true;introStart=performance.now();paused=false;$('pause').textContent='Pause';
 $('exportVideo').textContent='Stop recording';$('exportStatus').textContent='Recording 3-second intro + countdown + arena (720×720) with audio — keep this tab visible';
}
$('exportVideo').onclick=()=>recording?stopRecording():startRecording();
const fmt=(n:number)=>String(Math.round(n*10)/10);
function updateUI(){($('finishReplay') as HTMLButtonElement).disabled=!completed||replaying;

 battle.fighters.forEach((f,i)=>{const s=statsFor(f),enemy=battle.fighters[1-i],wells=battle.wells.filter(w=>w.owner===i);
  $('hp'+i).style.width=`${f.hp/250*100}%`;$('health'+i).textContent=`${Math.ceil(f.hp)} / 250`;$('charge'+i).textContent=`ULT ${Math.floor(f.ult)}%`;$('level'+i).textContent=`LV ${f.level}`;
  $('impact'+i).textContent=fmt(s.impact);$('speed'+i).textContent=`${Math.round(length(f.vel)*(f.chill>0?.72:1))} px/s`;$('ultimateDamage'+i).textContent=fmt(s.ultimate);
  $('label-power'+i).textContent=f.id==='singularity'?'New well strength':f.id==='volt'?'Arc base damage':f.id==='aegis'?'Shield capacity':f.id==='glacier'?'Damage per shard':'Projectile damage';
  $('power'+i).textContent=fmt(f.id==='singularity'?s.wellPower:f.id==='volt'?s.arc:f.id==='aegis'?s.shield:s.projectile);
  $('effect'+i).textContent=f.id==='inferno'?`${fmt(enemy.burn*s.burnTick*2)} burn DPS`:f.id==='singularity'?`${fmt(wells.reduce((sum,w)=>sum+battle.gravityDps(w,enemy),0))} gravity DPS`:f.id==='venom'?`${fmt(enemy.poison)} stacks · ${fmt(enemy.poison*s.poisonTick*2)} DPS`:f.id==='volt'?`${Math.round(f.static*100)}% static`:f.id==='glacier'?`${shardCount(f.level)} shards · ${fmt(enemy.chill)}s chill`:`${fmt(f.stored)} stored energy`;
  $('defense'+i).textContent=[f.shield>0?`${fmt(f.shield)} shield`:'',f.burn>0?'Burning':'',f.poison>0?'Poisoned':'',f.chill>0?'Slowed':''].filter(Boolean).join(' · ')||'Clear';
  $('cadence'+i).textContent=fmt(cooldownFor(f))+'s';$('active'+i).textContent=String(wells.length+battle.projectiles.filter(p=>p.owner===i).length+battle.patches.filter(p=>p.owner===i).length);$('cooldown'+i).textContent=`${Math.max(0,f.special).toFixed(1)}s`;
  $('evolution'+i).textContent=f.level>=8?'MAX LEVEL':`Next ability hit → Lv ${f.level+1}`;$('evolutionBar'+i).style.width=`${(f.level-1)/7*100}%`;
 });
 $('clock').textContent=`${String(Math.floor(battle.time/60)).padStart(2,'0')}:${String(Math.floor(battle.time%60)).padStart(2,'0')}`;$('status').textContent=replaying?'FINISH REPLAY · ½ SPEED':battle.draw?'Draw':battle.winner>=0?`${battle.fighters[battle.winner].name} wins`:paused?'PAUSED':'LIVE BATTLE';$('seedLabel').textContent=`SEED ${battle.seed}`;$('banner').textContent=announceTimer>0?announcement:'';$('replayNote').textContent=replaying?'FINISH REPLAY · ½ SPEED':battle.winner>=0?'DECISIVE HIT: '+finishLabel:'';$('banner').classList.toggle('visible',announceTimer>0);
}
function loop(now:number){const elapsed=Math.min(.1,(now-last)/1000);last=now;
 if(recording&&introStart!==null){
  const introElapsed=(now-introStart)/1000;
  if(introElapsed<INTRO_SECONDS){
   const beat=Math.floor(introElapsed);if(beat!==introBeat){introBeat=beat;audio.countdown(beat===2)}
   drawIntro(introElapsed);updateUI();requestAnimationFrame(loop);return;
  }
  introStart=null;fightOverlayUntil=now+650;accumulator=0;last=now;audio.fightStart();
 }
 if(!paused){accumulator+=elapsed*(replaying?.5:Number(($('speed') as HTMLSelectElement).value));let steps=0;while(accumulator>=STEP&&steps<24){update(STEP);accumulator-=STEP;steps++}if(steps===24)accumulator=0}audio.musicTick(!paused&&introStart===null&&battle.winner<0&&!battle.draw,Math.min(...battle.fighters.map(f=>f.hp/f.maxHp)),battle.time);draw();if(fightOverlayUntil>now)drawFightOverlay();updateUI();if(recording){recordingFrames++;if(battle.winner>=0||battle.draw){if(recordEndingAt===null)recordEndingAt=now+2700;if(now>=recordEndingAt)stopRecording()}}requestAnimationFrame(loop)}
$('portrait').onclick=()=>{const enabled=document.body.classList.toggle('portrait');$('portrait').textContent=enabled?'Standard layout':'Vertical layout'};
$('finishReplay').onclick=startFinishReplay;
$('pause').onclick=()=>{if(recording)return;paused=!paused;$('pause').textContent=paused?'Resume':'Pause'};
$('restart').onclick=()=>{if(recording)stopRecording();reset(Math.floor(Math.random()*99999999)+1)};$('replay').onclick=()=>{if(recording)stopRecording();reset(battle.seed)};
$('seed').addEventListener('change',()=>reset(Number(($('seed') as HTMLInputElement).value)));
for(const id of ['pick0','pick1'])$(id).addEventListener('change',()=>reset(battle.seed));
$('randomMatch').onclick=()=>{const first=Math.floor(Math.random()*IDS.length),second=(first+1+Math.floor(Math.random()*(IDS.length-1)))%IDS.length;($('pick0') as HTMLSelectElement).value=IDS[first];($('pick1') as HTMLSelectElement).value=IDS[second];reset(Math.floor(Math.random()*99999999)+1)};
reset(1);requestAnimationFrame(loop);
