import {shardCount} from './engine';
type Point={x:number;y:number};
type Orb={pos:Point;vel:Point;r:number;level:number;ult:number};
export type UltimateVisual={owner:number;life:number;max:number;pos:Point};
const TAU=Math.PI*2;

export function drawElementAura(ctx:CanvasRenderingContext2D,f:Orb&{id:string;color:string;shield:number;static:number},t:number){
 ctx.save();ctx.translate(f.pos.x,f.pos.y);ctx.strokeStyle=f.color;ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=12;ctx.lineWidth=1.8;
 if(f.id==='volt'){
  for(let k=0;k<3;k++){ctx.save();ctx.rotate(t*2+k*TAU/3);ctx.globalAlpha=.4+f.static*.5;ctx.beginPath();for(let j=0;j<9;j++){const a=j*.14,r=f.r+6+(j%2)*5,x=Math.cos(a)*r,y=Math.sin(a)*r;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.restore()}
 }else if(f.id==='glacier'){
  ctx.rotate(t*.25);for(let k=0;k<shardCount(f.level);k++){ctx.save();ctx.rotate(k*TAU/shardCount(f.level));ctx.beginPath();ctx.moveTo(f.r+3,0);ctx.lineTo(f.r+11,-4);ctx.lineTo(f.r+18,0);ctx.lineTo(f.r+11,4);ctx.closePath();ctx.globalAlpha=.65;ctx.stroke();ctx.restore()}
 }else if(f.id==='venom'){
  for(let k=0;k<8;k++){const phase=(t*.3+k/8)%1,a=k*2.4+t*.2,r=f.r+7+phase*20;ctx.globalAlpha=(1-phase)*.7;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,2+phase*2,0,TAU);ctx.stroke()}
 }else{
  const dash=(f as typeof f & {dash?:{direction:Point;windup:number;remaining:number}}).dash;
   const facing=dash?Math.atan2(dash.direction.y,dash.direction.x):t*.85;
   for(let k=0;k<3;k++){ctx.save();ctx.rotate(facing+k*TAU/3);const r=f.r+12;
    ctx.globalAlpha=.45+Math.min(1,f.shield/15)*.45;ctx.fillStyle='#ffe3ab33';ctx.strokeStyle='#ffe9b5';ctx.lineWidth=dash?4:2.5;
    ctx.beginPath();ctx.arc(0,0,r,-.37,.37);ctx.arc(0,0,r+8,.37,-.37,true);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
   if(dash){ctx.save();ctx.rotate(facing);ctx.globalAlpha=.9;ctx.strokeStyle='#fff3bd';ctx.lineWidth=5;ctx.shadowBlur=25;ctx.beginPath();ctx.arc(0,0,f.r+22,-.55,.55);ctx.stroke();ctx.restore();}
   ring(ctx,0,0,f.r+19,'#ffe5a844',1);
 }
 ctx.restore();
}
export function drawElementUltimate(ctx:CanvasRenderingContext2D,e:UltimateVisual&{id:string;color:string},t:number){
 const p=1-e.life/e.max;ctx.save();ctx.translate(e.pos.x,e.pos.y);ctx.globalAlpha=1-p;ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.shadowColor=e.color;ctx.shadowBlur=15;ctx.globalCompositeOperation='lighter';
 if(e.id==='volt'){
  for(let k=0;k<10;k++){ctx.save();ctx.rotate(k*TAU/10);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(15,0);for(let j=1;j<=8;j++)ctx.lineTo(15+j*(20+p*15),Math.sin(j*3+k+t*25)*16);ctx.stroke();ctx.restore()}
 }else if(e.id==='glacier'){
  ring(ctx,0,0,25+p*300,e.color,4);for(let k=0;k<18;k++){ctx.save();ctx.rotate(k*TAU/18);const r=30+p*240;ctx.beginPath();ctx.moveTo(r-10,0);ctx.lineTo(r+20,-6);ctx.lineTo(r+40,0);ctx.lineTo(r+20,6);ctx.closePath();ctx.stroke();ctx.restore()}
 }else if(e.id==='venom'){
  for(let k=0;k<8;k++){const a=k*TAU/8+t*.2;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(45+p*80,0,25+p*35,12+p*20,0,0,TAU);ctx.stroke();ctx.restore()}ring(ctx,0,0,20+p*210,e.color,2);
 }else{
  ring(ctx,0,0,25+p*310,e.color,5);for(let k=0;k<12;k++){ctx.save();ctx.rotate(k*TAU/12);ctx.fillRect(45+p*130,-1,35+p*40,2);ctx.restore()}ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-70-p*60);ctx.lineTo(0,70+p*60);ctx.moveTo(-50-p*40,-15);ctx.lineTo(50+p*40,-15);ctx.stroke();
 }
 ctx.restore();
}

function ring(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,width=2){
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,Math.max(1,r),0,TAU);ctx.stroke();
}
export function drawAura(ctx:CanvasRenderingContext2D,f:Orb,owner:number,t:number){
 ctx.save();ctx.translate(f.pos.x,f.pos.y);ctx.globalCompositeOperation='lighter';
 const intensity=1+f.level*.07+f.ult/250;
 if(owner===0){
  const aura=ctx.createRadialGradient(0,0,f.r*.7,0,0,f.r*2.3);aura.addColorStop(0,'#ff9c3244');aura.addColorStop(1,'#ff3d0000');ctx.fillStyle=aura;ctx.fillRect(-f.r*3,-f.r*3,f.r*6,f.r*6);
  for(let k=0;k<12;k++){
   const angle=k*TAU/12+t*.7,root=f.r-2,tip=root+(10+8*Math.sin(t*9+k*2.4))*intensity;
   ctx.save();ctx.rotate(angle);ctx.fillStyle=k%3===0?'#ffe4aacc':'#ff652299';ctx.beginPath();ctx.moveTo(root,-5);ctx.quadraticCurveTo(tip,-9,tip+5,Math.sin(t*7+k)*5);ctx.quadraticCurveTo(tip,5,root,5);ctx.fill();ctx.restore();
  }
  for(let k=0;k<7;k++){const phase=(t*.65+k/7)%1,angle=k*2.4+t*.3,r=f.r+phase*35;ctx.globalAlpha=1-phase;ctx.fillStyle='#ffc875';ctx.fillRect(Math.cos(angle)*r,Math.sin(angle)*r,2,2)}
 }else{
  ctx.rotate(t*.6);ctx.strokeStyle='#b782ff88';ctx.lineWidth=1.5;
  for(let k=0;k<3;k++){ctx.save();ctx.rotate(k*TAU/3);ctx.beginPath();ctx.ellipse(0,0,f.r+11*intensity,f.r*.6,0,0,TAU);ctx.stroke();ctx.restore()}
  for(let k=0;k<9;k++){const a=k*TAU/9-t*2,r=f.r+10+5*Math.sin(t*2+k);ctx.fillStyle=k%2?'#d7b4ff':'#795cff';ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,1.5,0,TAU);ctx.fill()}
 }
 ctx.restore();
}
export function drawCore(ctx:CanvasRenderingContext2D,f:Orb,owner:number,t:number){
 ctx.save();ctx.beginPath();ctx.arc(f.pos.x,f.pos.y,f.r-2,0,TAU);ctx.clip();ctx.translate(f.pos.x,f.pos.y);
 if(owner===0){
  ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ffe4a988';ctx.lineWidth=2;
  for(let k=0;k<3;k++){ctx.beginPath();for(let j=0;j<=20;j++){const x=-f.r+j*f.r/10,y=Math.sin(x*.16+t*3+k*2)*5+(k-1)*11;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke()}
 }else{
  ctx.fillStyle='#090417';ctx.beginPath();ctx.arc(0,0,f.r*.65,0,TAU);ctx.fill();ctx.rotate(-t*1.8);
  for(let k=0;k<3;k++){ctx.strokeStyle=k===0?'#f0cdff':'#a75bff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,f.r*.86,f.r*.5,k*Math.PI/3,.2,Math.PI*1.6);ctx.stroke()}
 }
 ctx.restore();
}
export function drawWell(ctx:CanvasRenderingContext2D,well:{pos:Point;life:number;power:number;ultimate?:boolean},t:number){
 ctx.save();ctx.translate(well.pos.x,well.pos.y);const radius=well.ultimate?76:44+well.power*.012;
 ctx.globalAlpha=Math.min(1,well.life*2);const g=ctx.createRadialGradient(0,0,4,0,0,radius*1.8);g.addColorStop(0,'#02010beb');g.addColorStop(.25,'#33125a88');g.addColorStop(.6,'#7c32bd22');g.addColorStop(1,'#7136ff00');ctx.fillStyle=g;ctx.fillRect(-radius*2,-radius*2,radius*4,radius*4);
 ctx.globalCompositeOperation='lighter';
 for(let arm=0;arm<3;arm++){
  ctx.beginPath();for(let j=0;j<48;j++){const p=j/47,r=10+p*radius,a=arm*TAU/3+t*2-p*4;const x=Math.cos(a)*r,y=Math.sin(a)*r*.72;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.strokeStyle=arm===0?'#d6a0ff99':'#8e59ff66';ctx.lineWidth=2;ctx.stroke();
 }
 for(let k=0;k<10;k++){const phase=(t*.45+k/10)%1,r=12+(1-phase)*radius,a=k*2.4+t*2+phase*3;ctx.fillStyle='#d8bcff';ctx.globalAlpha=Math.sin(phase*Math.PI)*.7*Math.min(1,well.life*2);ctx.fillRect(Math.cos(a)*r,Math.sin(a)*r*.72,2,2)}
 ctx.globalAlpha=Math.min(1,well.life*2);ctx.globalCompositeOperation='source-over';ctx.fillStyle='#050310';ctx.beginPath();ctx.arc(0,0,10,0,TAU);ctx.fill();ring(ctx,0,0,12,'#c397ffbb',2);ctx.restore();
}
export function drawFireball(ctx:CanvasRenderingContext2D,p:{pos:Point;vel:Point;radius:number},t:number){
 ctx.save();ctx.translate(p.pos.x,p.pos.y);ctx.rotate(Math.atan2(p.vel.y,p.vel.x));ctx.globalCompositeOperation='lighter';
 const flame=ctx.createLinearGradient(-48,0,10,0);flame.addColorStop(0,'#ff330000');flame.addColorStop(.6,'#ff5b2688');flame.addColorStop(1,'#fff0b7');ctx.fillStyle=flame;ctx.beginPath();ctx.moveTo(8,0);ctx.quadraticCurveTo(-10,-14,-46,Math.sin(t*30)*5);ctx.quadraticCurveTo(-15,12,8,0);ctx.fill();
 ctx.fillStyle='#fff2bf';ctx.shadowColor='#ff6d19';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(0,0,p.radius*.65,0,TAU);ctx.fill();ctx.restore();
}
export function drawUltimate(ctx:CanvasRenderingContext2D,e:UltimateVisual,t:number){
 const p=1-e.life/e.max,x=e.pos.x,y=e.pos.y;ctx.save();ctx.translate(x,y);
 if(e.owner===0){
  ctx.globalCompositeOperation='lighter';const radius=25+Math.pow(p,.65)*330;
  const g=ctx.createRadialGradient(0,0,0,0,0,radius);g.addColorStop(0,`rgba(255,190,65,${(1-p)*.2})`);g.addColorStop(.8,'#ff460000');g.addColorStop(.95,`rgba(255,102,30,${(1-p)*.35})`);g.addColorStop(1,'#ff460000');ctx.fillStyle=g;ctx.fillRect(-radius,-radius,radius*2,radius*2);
  ctx.globalAlpha=1-p;ring(ctx,0,0,radius,'#ffb347',7*(1-p)+1);ring(ctx,0,0,radius*.88,'#ff5228',3);ring(ctx,0,0,20+p*210,'#fff0be',2);
  for(let k=0;k<24;k++){const angle=k*TAU/24+k*.13,r=25+p*(180+k%4*30);ctx.save();ctx.rotate(angle);ctx.strokeStyle=k%3?'#ff8b36':'#fff0ae';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(r+12+20*(1-p),0);ctx.stroke();ctx.restore()}
 }else{
  const collapse=p<.68,phase=collapse?p/.68:(p-.68)/.32,r=collapse?115*(1-phase)+22:22+phase*245;
  ctx.globalAlpha=collapse?.8:1-phase;
  if(collapse){ctx.fillStyle='#03010cbb';ctx.beginPath();ctx.arc(0,0,r*.5,0,TAU);ctx.fill();ctx.globalCompositeOperation='lighter';for(let k=0;k<4;k++){ctx.save();ctx.rotate(t*2+k*Math.PI/4);ctx.strokeStyle=k%2?'#d8a6ff':'#8354ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,r,r*.4,0,0,TAU);ctx.stroke();ctx.restore()}
   for(let k=0;k<18;k++){const a=k*2.4+t*2,dist=r+((k/18+t*.7)%1)*130;ctx.strokeStyle='#be91ff88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.cos(a)*dist,Math.sin(a)*dist);ctx.lineTo(Math.cos(a-.1)*(dist-16),Math.sin(a-.1)*(dist-16));ctx.stroke()}
  }else{ctx.globalCompositeOperation='lighter';ring(ctx,0,0,r,'#e2c8ff',5);ring(ctx,0,0,r*.85,'#8558ff',9)}
 }
 ctx.restore();
}
