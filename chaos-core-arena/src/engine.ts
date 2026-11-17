export type Vec={x:number;y:number};
export type FighterId='inferno'|'singularity'|'volt'|'glacier'|'venom'|'aegis';
export type DamageKind='impact'|'projectile'|'ultimate'|'burn'|'gravity'|'lightning'|'poison'|'counter';
export const ARENA={size:720,center:360,radius:308,maxTime:120};
export const STEP=1/60;
export const ROSTER:Record<FighterId,{name:string;label:string;color:string;glow:string;icon:string;ultimate:string;basic:string;passive:string;special:string;style:string;cooldown:number;power:number}>={
 inferno:{name:'Inferno',label:'FIRE',color:'#ff983e',glow:'#ff491e',icon:'🔥',ultimate:'SUPERNOVA',basic:'Impact ignites a burning ember.',passive:'Wall flames persist until enemy contact ignites a burn, or ice extinguishes them. Passing fireballs are empowered.',special:'Fireburst: a fireball that adds lingering burn.',style:'Pressure / burn',cooldown:4.4,power:.84},
 singularity:{name:'Singularity',label:'VOID',color:'#bd83ff',glow:'#8344ff',icon:'◉',ultimate:'EVENT HORIZON',basic:'Impact charges the gravity core.',passive:'Wells capture passing projectiles in orbit and scatter them on collapse.',special:'Gravity well: a random nearby vortex pulls and damages.',style:'Gravity / control',cooldown:4.6,power:1.20},
 volt:{name:'Volt',label:'VOLT',color:'#ffe56a',glow:'#e8b924',icon:'ϟ',ultimate:'THUNDERSTORM',basic:'Impact builds static for the next discharge.',passive:'Fast movement builds static; ice reduces its generation.',special:'Arc dash: static chains through shards and arena conductors after a warning spark.',style:'Speed / lightning',cooldown:3.5,power:1.00},
 glacier:{name:'Glacier',label:'ICE',color:'#83eaff',glow:'#28badf',icon:'❄',ultimate:'ABSOLUTE ZERO',basic:'Impact chills enemies, reducing movement speed.',passive:'Ice armor reduces direct hits by 6%; chilled targets take stronger ice attacks.',special:'Crystal volley: each orbiting diamond fires a shard; evolution adds emitters.',style:'Ice / defense',cooldown:4.2,power:.98},
 venom:{name:'Venom',label:'TOXIN',color:'#b1ee64',glow:'#64c92c',icon:'☣',ultimate:'PLAGUE BLOOM',basic:'Impact applies a poison stack.',passive:'Stacking poison bypasses shields; stacks slowly decay.',special:'Toxic dart: a fast glob that delivers two poison stacks.',style:'Poison / attrition',cooldown:3.9,power:.96},
 aegis:{name:'Aegis',label:'AEGIS',color:'#ffe3ab',glow:'#e3ac52',icon:'◇',ultimate:'DIVINE RECKONING',basic:'Impact releases a small part of absorbed energy.',passive:'Shield stores blocked energy and periodically catches a projectile to return it.',special:'Shield Slam: braces a rotating shield, then dashes at the opponent. Contact releases stored energy and knocks back.',style:'Shield / counter',cooldown:4.3,power:.66},
};
export const IDS=Object.keys(ROSTER) as FighterId[];
// Matchup-specific balancing is symmetric across spawn positions and reproducible by seed.
// Values are offensive multipliers for the first alphabetically listed fighter.
// These can be recalibrated with scripts/balance.mjs when abilities change.
export const MATCHUP_BALANCE:Record<string,number>={
  'inferno:singularity':1,
  'inferno:volt':0.975,
  'glacier:inferno':0.925,
  'inferno:venom':0.975,
  'aegis:inferno':1.05,
  'singularity:volt':1.2,
  'glacier:singularity':1.15,
  'singularity:venom':0.85,
  'aegis:singularity':0.95,
  'glacier:volt':1.05,
  'venom:volt':1.15,
  'aegis:volt':1.025,
  'glacier:venom':0.975,
  'aegis:glacier':0.95,
  'aegis:venom':0.85,
};
export function matchupMultiplier(attacker:FighterId,defender:FighterId){
 const key=[attacker,defender].sort().join(':');
 const factor=MATCHUP_BALANCE[key]??1;
 return attacker<defender?factor:1/factor;
}

export const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export const length=(p:Vec)=>Math.hypot(p.x,p.y);
export function unit(p:Vec):Vec{const d=length(p)||1;return {x:p.x/d,y:p.y/d}}
export function seeded(seed:number){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
export type Fighter={id:FighterId;name:string;color:string;glow:string;pos:Vec;vel:Vec;r:number;hp:number;maxHp:number;ult:number;level:number;special:number;burn:number;poison:number;chill:number;shield:number;stored:number;static:number;statusTick:number;dash?:{direction:Vec;windup:number;remaining:number;damage:number;cast:number}};
export type Projectile={pos:Vec;vel:Vec;life:number;owner:number;radius:number;kind:'fire'|'ice'|'toxin';cast:number;damage?:number;returned?:boolean;empowered?:boolean;orbit?:number;angle?:number;held?:number;releaseAt?:number};
export type Well={pos:Vec;life:number;power:number;owner:number;ultimate?:boolean;cast:number;tick:number;pending:number};
export type VisualEvent={kind:'hit'|'ultimate'|'special'|'evolve'|'arc'|'shield'|'steam'|'burst'|'warning'|'slam'|'ignite';owner:number;pos:Vec;target?:Vec;amount?:number;damageKind?:DamageKind;id:FighterId};
export type Stats={impact:number;projectile:number;ultimate:number;burnTick:number;poisonTick:number;wellPower:number;shield:number;arc:number};
export function shardCount(level:number){return Math.min(6,3+Math.floor((level-1)/2))}
export function shardEmitters(f:{pos:Vec;r:number;level:number},time:number){return Array.from({length:shardCount(f.level)},(_,k)=>{const angle=time*.25+k*Math.PI*2/shardCount(f.level);return {x:f.pos.x+Math.cos(angle)*(f.r+11),y:f.pos.y+Math.sin(angle)*(f.r+11),angle}})}
export function cooldownFor(f:Fighter){return ROSTER[f.id].cooldown/(1+(f.level-1)*(f.id==='singularity'?.085:f.id==='aegis'?.012:.035))}
export function statsFor(f:Fighter):Stats{
 const g=f.level-1,p=ROSTER[f.id].power;
 return {impact:(.76+g*.19)*p,projectile:({inferno:7.2+g*.35,glacier:2.1+g*.07,venom:5.6+g*.23} as Partial<Record<FighterId,number>>)[f.id]!*p||0,
 ultimate:({inferno:4.56+g*.76,singularity:4.56+g*.76,volt:8+g*1.1,glacier:9+g*1.1,venom:7+g*.9,aegis:11+g*1.1}[f.id])*p,
 burnTick:(.285+g*.057)*p,poisonTick:(.34+g*.045)*p,wellPower:750,shield:8+g*1.5,arc:(5.8+g*.3)*p};
}
export class Battle{
 fighters:Fighter[];projectiles:Projectile[]=[];wells:Well[]=[];events:VisualEvent[]=[];
 patches:{pos:Vec;owner:number;life:number}[]=[];captureReady=[0,0];igniteReady=[0,0];chains:{owner:number;path:Vec[];delay:number;damage:number;cast:number}[]=[];
 time=0;frame=0;winner=-1;draw=false;timeout=false;impactCooldown=0;seed:number;rng:()=>number;cast=0;
 evolvedCasts=new Set<number>();damageTotals:Record<DamageKind,number>[];ultimates=[0,0];blocked=[0,0];
 constructor(ids:[FighterId,FighterId],seed=1){
  this.seed=seed;this.rng=seeded(seed);this.damageTotals=ids.map(()=>({impact:0,projectile:0,ultimate:0,burn:0,gravity:0,lightning:0,poison:0,counter:0}));
  this.fighters=ids.map(id=>{const d=ROSTER[id];return {id,name:d.name,color:d.color,glow:d.glow,pos:{x:360,y:360},vel:{x:0,y:0},r:21,hp:250,maxHp:250,ult:0,level:1,special:d.cooldown*.75,burn:0,poison:0,chill:0,shield:id==='aegis'?8:0,stored:0,static:0,statusTick:0}});
  for(let i=0;i<2;i++){
   let pos:Vec;do{const angle=this.rng()*Math.PI*2,r=Math.sqrt(this.rng())*253;pos={x:360+Math.cos(angle)*r,y:360+Math.sin(angle)*r}}while(i===1&&length({x:pos.x-this.fighters[0].pos.x,y:pos.y-this.fighters[0].pos.y})<150);
   const a=this.rng()*Math.PI*2;this.fighters[i].pos=pos;this.fighters[i].vel={x:Math.cos(a)*240,y:Math.sin(a)*240};
  }
 }
 event(kind:VisualEvent['kind'],owner:number,pos:Vec,extra:Partial<VisualEvent>={}){this.events.push({kind,owner,pos:{...pos},id:this.fighters[owner].id,...extra})}
 evolve(owner:number,cast:number){
  if(this.evolvedCasts.has(cast))return;this.evolvedCasts.add(cast);const f=this.fighters[owner];if(f.level>=8)return;
  const previousCooldown=cooldownFor(f);f.level++;f.special*=cooldownFor(f)/previousCooldown;f.r=Math.min(32,21+f.level*1.3);for(const w of this.wells)if(w.owner===owner)w.power=statsFor(f).wellPower+(w.ultimate?400:0);
  this.event('evolve',owner,f.pos);
 }
 damage(target:number,amount:number,owner:number,kind:DamageKind,cast?:number){
  if(this.winner>=0||this.draw||amount<=0)return 0;
  const f=this.fighters[target],source=this.fighters[owner];if(f.hp<=0||source.hp<=0)return 0;
  const direct=!['burn','poison','gravity'].includes(kind);
  if(f.id==='glacier'&&direct)amount*=.94;
  if(f.id==='aegis'&&direct&&f.shield>0){const block=Math.min(f.shield,amount*.2);f.shield-=block;f.stored=Math.min(24,f.stored+block);this.blocked[target]+=block;amount-=block;this.event('shield',target,f.pos)}
  amount*=matchupMultiplier(source.id,f.id);
   const actual=Math.min(f.hp,amount);f.hp-=actual;this.damageTotals[owner][kind]+=actual;
  if(actual>0){this.event('hit',owner,f.pos,{amount:actual,damageKind:kind});if(cast!==undefined)this.evolve(owner,cast);if(direct){source.ult=clamp(source.ult+Math.min(27,actual*.36),0,100);f.ult=clamp(f.ult+Math.min(9,actual*.075),0,100)}}
  if(f.hp<=0)this.winner=owner;return actual;
 }
 basic(owner:number){
  const f=this.fighters[owner],enemy=this.fighters[1-owner],cast=++this.cast;
  if(!this.damage(1-owner,statsFor(f).impact,owner,'impact',cast))return;
  f.ult=clamp(f.ult+15,0,100);
  if(f.id==='inferno')enemy.burn=Math.min(7,enemy.burn+1);
  if(f.id==='venom')enemy.poison=Math.min(8,enemy.poison+1);
  if(f.id==='glacier')enemy.chill=Math.min(4,enemy.chill+1.6);
  if(f.id==='volt')f.static=Math.min(1,f.static+.25);
  if(f.id==='aegis'&&f.stored>0){const release=Math.min(1.5,f.stored*.2);f.stored-=release;this.damage(1-owner,release*ROSTER.aegis.power,owner,'counter')}
 }
 launch(owner:number,kind:Projectile['kind'],cast:number,angleOffset=0){
  const f=this.fighters[owner],enemy=this.fighters[1-owner],a=Math.atan2(enemy.pos.y-f.pos.y,enemy.pos.x-f.pos.x)+angleOffset,speed=kind==='toxin'?370:330;
  this.projectiles.push({pos:{...f.pos},vel:{x:Math.cos(a)*speed,y:Math.sin(a)*speed},life:3.3,owner,radius:kind==='ice'?7:9,kind,cast});
 }
 makeWell(owner:number,cast:number,ultimate=false){
  const f=this.fighters[owner],a=this.rng()*Math.PI*2,r=45+Math.sqrt(this.rng())*115;
  const pos=ultimate?{x:360,y:360}:{x:f.pos.x+Math.cos(a)*r,y:f.pos.y+Math.sin(a)*r},offset={x:pos.x-360,y:pos.y-360};
  if(length(offset)>273){const n=unit(offset);pos.x=360+n.x*273;pos.y=360+n.y*273}
  this.wells.push({pos,life:3,power:statsFor(f).wellPower+(ultimate?400:0),owner,cast,ultimate,tick:0,pending:0});
 }
 special(owner:number){
  const f=this.fighters[owner],enemy=this.fighters[1-owner],stats=statsFor(f),cast=++this.cast;
  f.special=cooldownFor(f);this.event('special',owner,f.pos);
  switch(f.id){
   case 'inferno':this.launch(owner,'fire',cast);break;
   case 'singularity':this.makeWell(owner,cast);break;
   case 'glacier':{const emitters=shardEmitters(f,this.time);emitters.forEach((pos,k)=>{const angle=Math.atan2(enemy.pos.y-pos.y,enemy.pos.x-pos.x)+(k-(emitters.length-1)/2)*.22;this.projectiles.push({pos:{x:pos.x,y:pos.y},vel:{x:Math.cos(angle)*330,y:Math.sin(angle)*330},life:3.3,owner,radius:7,kind:'ice',cast})});break;}
   case 'venom':this.launch(owner,'toxin',cast);break;
   case 'volt':{
    const n=unit(f.vel);f.vel.x+=n.x*150;f.vel.y+=n.y*150;
    const nodes=[...this.projectiles.map(p=>p.pos),...Array.from({length:4},(_,k)=>({x:360+Math.cos(k*Math.PI/2)*245,y:360+Math.sin(k*Math.PI/2)*245}))];
    const path=[{...f.pos}];let current=f.pos;for(let hop=0;hop<3&&length({x:enemy.pos.x-current.x,y:enemy.pos.y-current.y})>=310;hop++){const next=nodes.filter(p=>!path.includes(p)&&length({x:p.x-current.x,y:p.y-current.y})<210&&length({x:p.x-enemy.pos.x,y:p.y-enemy.pos.y})<length({x:current.x-enemy.pos.x,y:current.y-enemy.pos.y})).sort((a,b)=>length({x:a.x-enemy.pos.x,y:a.y-enemy.pos.y})-length({x:b.x-enemy.pos.x,y:b.y-enemy.pos.y}))[0];if(!next)break;path.push(next);current=next;}
    if(length({x:enemy.pos.x-current.x,y:enemy.pos.y-current.y})<310){path.push({...enemy.pos});for(let k=1;k<path.length;k++)this.event('warning',owner,path[k-1],{target:path[k]});this.chains.push({owner,path,delay:.25,damage:stats.arc*(1+f.static*.7),cast});f.static=0}
    break;
   }
   case 'aegis':{
    const release=(20+(f.level-1)*1.6+f.stored*.5)*ROSTER.aegis.power;f.stored=0;f.shield=Math.min(stats.shield,f.shield+stats.shield*.7);
    const direction=unit({x:enemy.pos.x+enemy.vel.x*.18-f.pos.x,y:enemy.pos.y+enemy.vel.y*.18-f.pos.y});
    f.dash={direction,windup:.22,remaining:.85,damage:release,cast};this.event('shield',owner,f.pos);this.event('warning',owner,f.pos,{target:{...enemy.pos}});break;
   }
  }
 }
 ultimate(owner:number){
  const f=this.fighters[owner],enemy=this.fighters[1-owner],stats=statsFor(f),cast=++this.cast;f.ult=0;this.ultimates[owner]++;
  const pos=f.id==='singularity'?{x:360,y:360}:{...f.pos};this.event('ultimate',owner,pos,{target:{...enemy.pos}});
  let amount=stats.ultimate;
  if(f.id==='glacier')amount*=1+Math.min(3,enemy.chill)*.12;
  if(f.id==='venom'){this.event('burst',owner,enemy.pos,{amount:enemy.poison});amount+=Math.min(8,enemy.poison)*1.3*ROSTER.venom.power;enemy.poison*=.4}
  if(f.id==='aegis'){amount+=f.stored*.4*ROSTER.aegis.power;f.stored=0;f.shield=stats.shield}
  if(f.id==='volt')amount*=1+f.static*.3;
  this.damage(1-owner,amount,owner,'ultimate',cast);
  if(f.id==='inferno'){enemy.burn=Math.min(7,enemy.burn+1);const n=unit({x:enemy.pos.x-f.pos.x,y:enemy.pos.y-f.pos.y});enemy.vel.x+=n.x*(220+(f.level-1)*20);enemy.vel.y+=n.y*(220+(f.level-1)*20)}
  if(f.id==='singularity')this.makeWell(owner,cast,true);
  if(f.id==='glacier')enemy.chill=4;
  if(f.id==='volt')f.static=0;
 }
 gravityDps(w:Well,target:Fighter){return .38*Math.min(24,w.power*.03)*clamp(1-length({x:target.pos.x-w.pos.x,y:target.pos.y-w.pos.y})/150,0,1)*ROSTER[this.fighters[w.owner].id].power}
 bend(p:Projectile,dt:number){for(const w of this.wells){
  const delta={x:w.pos.x-p.pos.x,y:w.pos.y-p.pos.y},d=length(delta);if(d>=240)continue;
  const n=d>.001?unit(delta):{x:1,y:0},t={x:-n.y,y:n.x},sign=p.vel.x*t.x+p.vel.y*t.y<0?-1:1,speed=clamp(Math.sqrt(w.power*70),180,340),radial=clamp((d-65)*3,-180,260),blend=1-Math.exp(-6*(1-d/240)*dt);
  p.vel.x+=(n.x*radial+t.x*speed*sign-p.vel.x)*blend;p.vel.y+=(n.y*radial+t.y*speed*sign-p.vel.y)*blend;
 }}
 update(dt=STEP){
  this.events=[];if(this.winner>=0||this.draw)return;
  this.time+=dt;this.frame++;if(this.time>=ARENA.maxTime){this.timeout=true;const diff=this.fighters[0].hp-this.fighters[1].hp;if(Math.abs(diff)<.001)this.draw=true;else this.winner=diff>0?0:1;return}
  this.patches=this.patches.filter(p=>p.life>0);
  for(let j=this.chains.length-1;j>=0;j--){const chain=this.chains[j];chain.delay-=dt;if(chain.delay<=0){for(let k=1;k<chain.path.length;k++)this.event('arc',chain.owner,chain.path[k-1],{target:chain.path[k]});this.damage(1-chain.owner,chain.damage,chain.owner,'lightning',chain.cast);this.chains.splice(j,1)}}
  if(this.winner>=0)return;
  this.impactCooldown=Math.max(0,this.impactCooldown-dt);
  for(let i=0;i<2;i++){
   const f=this.fighters[i],enemy=this.fighters[1-i];f.special-=dt;f.ult=clamp(f.ult+10*dt,0,100);f.chill=Math.max(0,f.chill-dt);f.statusTick+=dt;
   if(f.id==='volt')f.static=Math.min(1,f.static+dt*.2*clamp(length(f.vel)/300,0,1)*(f.chill>0?.4:1));
   if(f.id==='aegis')f.shield=Math.min(statsFor(f).shield,f.shield+dt*.5);
   if(f.statusTick>=.5){f.statusTick-=.5;
    if(f.burn>0){this.damage(i,f.burn*statsFor(enemy).burnTick,1-i,'burn');f.burn=Math.max(0,f.burn-.35)}
    if(f.poison>0){this.damage(i,f.poison*statsFor(enemy).poisonTick,1-i,'poison');f.poison=Math.max(0,f.poison-.12)}
   }
   if(this.winner>=0)return;
   if(f.special<=0)this.special(i);if(f.ult>=100)this.ultimate(i);if(this.winner>=0)return;
   for(const w of this.wells){if(w.owner===i)continue;const delta={x:w.pos.x-f.pos.x,y:w.pos.y-f.pos.y},d=Math.max(35,length(delta)),n=unit(delta),accel=w.power/Math.max(1,d/100);f.vel.x+=n.x*accel*dt;f.vel.y+=n.y*accel*dt}
   if(f.dash){f.dash.windup=Math.max(0,f.dash.windup-dt);if(f.dash.windup>0){f.vel.x*=.85;f.vel.y*=.85}else{f.dash.remaining-=dt;f.vel={x:f.dash.direction.x*740,y:f.dash.direction.y*740};if(f.dash.remaining<=0)f.dash=undefined;}}
   const min=f.dash?0:f.id==='volt'?230:180,max=f.dash?740:f.id==='volt'?540:490,speed=length(f.vel),n=unit(f.vel);
   if(speed<min){f.vel.x=n.x*min;f.vel.y=n.y*min}if(speed>max){f.vel.x=n.x*max;f.vel.y=n.y*max}
   const slow=f.chill>0?.72:1;f.pos.x+=f.vel.x*dt*slow;f.pos.y+=f.vel.y*dt*slow;
   const offset={x:f.pos.x-360,y:f.pos.y-360};if(length(offset)>308-f.r){const n=unit(offset);f.pos.x=360+n.x*(308-f.r);f.pos.y=360+n.y*(308-f.r);const dot=f.vel.x*n.x+f.vel.y*n.y;if(dot>0){f.vel.x-=2*dot*n.x;f.vel.y-=2*dot*n.y;f.dash=undefined;if(f.id==='inferno'&&this.time>=this.igniteReady[i]){this.igniteReady[i]=this.time+2;const angle=Math.round(Math.atan2(n.y,n.x)/(Math.PI*2/24))*(Math.PI*2/24),pos={x:360+Math.cos(angle)*301,y:360+Math.sin(angle)*301};if(!this.patches.some(p=>p.owner===i&&p.life>0&&length({x:p.pos.x-pos.x,y:p.pos.y-pos.y})<30)){this.patches.push({pos,owner:i,life:ARENA.maxTime+1});this.event('ignite',i,pos);}}}f.ult=clamp(f.ult+1.5,0,100)}
  }
  for(let i=0;i<2;i++){const f=this.fighters[i],enemy=this.fighters[1-i];
   for(const patch of this.patches)if(patch.life>0&&patch.owner!==i&&length({x:f.pos.x-360,y:f.pos.y-360})>308-f.r-18&&length({x:f.pos.x-patch.pos.x,y:f.pos.y-patch.pos.y})<f.r+28){patch.life=0;f.burn=Math.min(7,f.burn+1.1);this.damage(i,1.4,patch.owner,'burn');this.event('ignite',patch.owner,patch.pos);}
   if(f.dash&&f.dash.windup<=0&&length({x:f.pos.x-enemy.pos.x,y:f.pos.y-enemy.pos.y})<f.r+enemy.r+20){const dash=f.dash;f.dash=undefined;if(this.damage(1-i,dash.damage,i,'counter',dash.cast)>0){enemy.vel.x+=dash.direction.x*210;enemy.vel.y+=dash.direction.y*210;f.vel.x*=.45;f.vel.y*=.45;this.event('slam',i,enemy.pos,{target:{...f.pos}});}}
  }
  this.patches=this.patches.filter(p=>p.life>0);if(this.winner>=0)return;
  const [a,b]=this.fighters,d={x:b.pos.x-a.pos.x,y:b.pos.y-a.pos.y},distance=length(d);
  if(distance<a.r+b.r){const n=distance>.001?unit(d):{x:1,y:0},overlap=a.r+b.r-distance;a.pos.x-=n.x*overlap/2;a.pos.y-=n.y*overlap/2;b.pos.x+=n.x*overlap/2;b.pos.y+=n.y*overlap/2;
   const relative=(b.vel.x-a.vel.x)*n.x+(b.vel.y-a.vel.y)*n.y;if(relative<0){a.vel.x+=relative*n.x;a.vel.y+=relative*n.y;b.vel.x-=relative*n.x;b.vel.y-=relative*n.y}
   if(this.impactCooldown<=0){const first=this.frame%2;this.basic(first);this.basic(1-first);this.impactCooldown=.23}
  }
  if(this.winner>=0)return;
  for(let j=this.projectiles.length-1;j>=0;j--){const p=this.projectiles[j];
   if(p.held!==undefined){const holder=this.fighters[p.held],a=this.time*5+(p.angle??0);p.pos={x:holder.pos.x+Math.cos(a)*(holder.r+18),y:holder.pos.y+Math.sin(a)*(holder.r+18)};if(this.time<(p.releaseAt??0))continue;const target=this.fighters[1-p.owner],n=unit({x:target.pos.x-p.pos.x,y:target.pos.y-p.pos.y});p.vel={x:n.x*360,y:n.y*360};p.held=undefined;p.life=2;}
   if(p.orbit!==undefined){const w=this.wells.find(w=>w.cast===p.orbit);if(w){p.angle=(p.angle??0)+dt*4;p.pos={x:w.pos.x+Math.cos(p.angle)*58,y:w.pos.y+Math.sin(p.angle)*58};continue;}const a=p.angle??0;p.vel={x:Math.cos(a)*380,y:Math.sin(a)*380};p.orbit=undefined;p.life=1.8;}
   for(const w of this.wells)if(w.life>.2&&!p.returned&&length({x:p.pos.x-w.pos.x,y:p.pos.y-w.pos.y})<75&&this.projectiles.filter(q=>q.orbit===w.cast).length<6){p.orbit=w.cast;p.angle=Math.atan2(p.pos.y-w.pos.y,p.pos.x-w.pos.x);break;}
   if(p.orbit!==undefined)continue;
   for(const patch of this.patches)if(patch.life>0&&length({x:p.pos.x-patch.pos.x,y:p.pos.y-patch.pos.y})<48){if(p.kind==='ice'){patch.life=0;this.event('steam',p.owner,patch.pos);}else if(p.kind==='fire')p.empowered=true;}
   p.life-=dt;this.bend(p,dt);p.pos.x+=p.vel.x*dt;p.pos.y+=p.vel.y*dt;const enemy=this.fighters[1-p.owner],f=this.fighters[p.owner];
   if(length({x:p.pos.x-enemy.pos.x,y:p.pos.y-enemy.pos.y})<p.radius+enemy.r){if(enemy.id==='aegis'&&!p.returned&&enemy.shield>=2&&this.time>=this.captureReady[1-p.owner]&&this.projectiles.filter(q=>q.held===1-p.owner).length<2){const holder=1-p.owner;this.captureReady[holder]=this.time+10;enemy.shield-=2;p.damage=Math.min(5,statsFor(f).projectile*.6);p.owner=holder;p.cast=++this.cast;p.returned=true;p.held=holder;p.releaseAt=this.time+.8;p.angle=this.time;p.empowered=false;this.event('shield',holder,enemy.pos);continue;}
    let damage=p.damage??statsFor(f).projectile;if(p.empowered)damage*=1.15;if(p.kind==='ice')damage*=1+enemy.chill*.12;
    this.damage(1-p.owner,damage,p.owner,'projectile',p.cast);if(!p.returned&&p.kind==='fire')enemy.burn=Math.min(9,enemy.burn+2);if(!p.returned&&p.kind==='toxin')enemy.poison=Math.min(8,enemy.poison+2);if(!p.returned&&p.kind==='ice')enemy.chill=Math.min(4,enemy.chill+1.2);this.projectiles.splice(j,1);
   }else if(p.life<=0||length({x:p.pos.x-360,y:p.pos.y-360})>308)this.projectiles.splice(j,1);
   if(this.winner>=0)return;
  }
  for(let j=this.wells.length-1;j>=0;j--){const w=this.wells[j],active=Math.min(dt,w.life);w.pending+=this.gravityDps(w,this.fighters[1-w.owner])*active;w.tick+=active;w.life-=dt;
   if(w.tick>=.5||w.life<=0){const whole=w.life<=0?Math.ceil(w.pending):Math.floor(w.pending);if(whole>0){this.damage(1-w.owner,whole,w.owner,'gravity',w.cast);w.pending=Math.max(0,w.pending-whole)}w.tick=0}if(w.life<=0)this.wells.splice(j,1);if(this.winner>=0)return;
  }
 }
}
