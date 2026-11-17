import type {FighterId,Vec} from './engine';
export type DeathVisual={id:FighterId;pos:Vec;r:number;color:string;elapsed:number;duration:number;seed:number};
const TAU=Math.PI*2;
const random=(seed:number)=>{let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}};
export function drawDeath(ctx:CanvasRenderingContext2D,d:DeathVisual){
 const t=Math.min(1,d.elapsed/d.duration),ease=1-(1-t)**3,rng=random(d.seed);const {x,y}=d.pos;
 ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
 const dot=(x:number,y:number,r:number,color:string,a=1)=>{ctx.globalAlpha=a;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,TAU);ctx.fill()};
 switch(d.id){
 case 'inferno':{
  // Ember fragments rise and cool to ash.
  dot(0,0,d.r*(1-ease),'#ff8529',1-t);
  for(let i=0;i<64;i++){const a=rng()*TAU,s=.3+rng()*.7,dist=(8+50*s)*t,px=Math.cos(a)*dist,py=Math.sin(a)*dist-85*t*s;
   dot(px,py,1+rng()*3,t<.35?'#ffd46d':rng()>.5?'#a5a0a0':'#615b60',Math.max(0,1-t)*(i%3===0?.9:.65));}break;
 }
 case 'singularity':{
  // A collapsing accretion disk pulls its own body into a black hole.
  const radius=55*(1-t)+5;ctx.globalAlpha=1-t*.7;ctx.strokeStyle='#b477ff';ctx.lineWidth=5*(1-t)+1;ctx.shadowColor='#a052ff';ctx.shadowBlur=22;
  for(let k=0;k<3;k++){ctx.save();ctx.rotate(t*12+k*TAU/3);ctx.beginPath();ctx.ellipse(0,0,radius,radius*.36,0,0,TAU);ctx.stroke();ctx.restore()}
  ctx.globalAlpha=1;ctx.fillStyle='#010008';ctx.beginPath();ctx.arc(0,0,Math.max(0,23*(1-ease)),0,TAU);ctx.fill();
  for(let i=0;i<34;i++){const a=i*2.399+t*12,rad=(80+rng()*55)*(1-ease);dot(Math.cos(a)*rad,Math.sin(a)*rad*.7,1.7,'#c9a0ff',1-t)}break;
 }
 case 'glacier':{
  // Freezes solid, cracks, then bursts into shards.
  if(t<.28){ctx.globalAlpha=1;ctx.fillStyle='#d5fbff';ctx.beginPath();ctx.arc(0,0,d.r*(1+t),0,TAU);ctx.fill();ctx.strokeStyle='#5dc7ed';ctx.lineWidth=2;for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(i*TAU/6)*d.r,Math.sin(i*TAU/6)*d.r);ctx.stroke()}}
  else for(let i=0;i<28;i++){const a=i*TAU/28,dist=(t-.28)*125*(.5+rng()),size=(3+rng()*10)*(1-t);ctx.save();ctx.translate(Math.cos(a)*dist,Math.sin(a)*dist);ctx.rotate(a+t*5);ctx.fillStyle=i%3?'#8be8ff':'#f3ffff';ctx.globalAlpha=1-t;ctx.beginPath();ctx.moveTo(size,0);ctx.lineTo(-size*.6,-size*.4);ctx.lineTo(-size*.6,size*.4);ctx.closePath();ctx.fill();ctx.restore()}break;
 }
 case 'volt':{
  // Electrical overload: rapid branching bolts and sparks.
  for(let i=0;i<12;i++){const a=i*TAU/12+t*8,dist=(25+90*t)*(0.7+rng()*.5);ctx.strokeStyle=i%2?'#fff4a1':'#ffcf37';ctx.lineWidth=(1-t)*3;ctx.globalAlpha=1-t;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*dist*.4,Math.sin(a)*dist*.4);ctx.lineTo(Math.cos(a+.2)*dist*.7,Math.sin(a+.2)*dist*.7);ctx.lineTo(Math.cos(a)*dist,Math.sin(a)*dist);ctx.stroke()}
  dot(0,0,d.r*(1-ease),'#fff8b5',1-t);break;
 }
 case 'venom':{
  // Toxic body liquefies and dissolves into rising bubbles.
  dot(0,12*t,d.r*(1-t),'#83df37',1-t);
  for(let i=0;i<42;i++){const a=i*2.4,rad=(15+rng()*65)*t;dot(Math.cos(a)*rad,Math.sin(a)*rad-55*t,2+rng()*6,i%2?'#9cff54':'#4c8f35',1-t)}break;
 }
 case 'aegis':{
  // Protective shield fractures, then golden fragments scatter.
  for(let i=0;i<12;i++){const a=i*TAU/12+t*2,rad=(d.r+15)+t*115;ctx.save();ctx.translate(Math.cos(a)*rad,Math.sin(a)*rad);ctx.rotate(a+t*6);ctx.globalAlpha=1-t;ctx.strokeStyle=i%2?'#fff4ce':'#e7b659';ctx.lineWidth=3;ctx.strokeRect(-5,-7,10*(1-t)+1,14*(1-t)+1);ctx.restore()}
  dot(0,0,d.r*(1-ease),'#ffe6a8',1-t);break;
 }
 }
 ctx.restore();
}
