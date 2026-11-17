import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {renameSync,mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('.balance-build',{recursive:true});execFileSync('tsc',['src/engine.ts','--target','es2022','--module','commonjs','--outDir','.balance-build','--skipLibCheck']);renameSync('.balance-build/engine.js','.balance-build/engine.cjs');
const {Battle,IDS,STEP,MATCHUP_BALANCE}=createRequire(import.meta.url)('../.balance-build/engine.cjs');
const sample=Number(process.argv.find(x=>x.startsWith('--count='))?.split('=')[1]??100);
const results=[];
for(let a=0;a<IDS.length;a++)for(let b=a+1;b<IDS.length;b++){
 const first=IDS[a],second=IDS[b],key=[first,second].sort().join(':');let best=null;
 for(const factor of [.65,.7,.75,.8,.85,.9,.925,.95,.975,1,1.025,1.05,1.075,1.1,1.125,1.15,1.2,1.25,1.3,1.4]){
  MATCHUP_BALANCE[key]=factor;let wins=0,duration=0;
  for(let n=0;n<sample;n++){
   const swap=n%2===1,ids=swap?[second,first]:[first,second];const battle=new Battle(ids,300000+Math.floor(n/2)+a*100003+b*1009);
   while(battle.winner<0&&!battle.draw)battle.update(STEP);
   if((swap?1-battle.winner:battle.winner)===0)wins++;
   duration+=battle.time;
  }
  const pct=wins/sample*100,mean=duration/sample;
  const score=Math.abs(pct-50)+Math.abs(mean-60)*.12;
  if(!best||score<best.score)best={factor,pct,mean,score};
 }
 MATCHUP_BALANCE[key]=best.factor;results.push({pair:[first,second],...best});console.log(key,best);
}
writeFileSync('reports/calibration.json',JSON.stringify(results,null,2));
const p='src/engine.ts';let source=(await import('node:fs')).readFileSync(p,'utf8');source=source.replace(/export const MATCHUP_BALANCE:Record<string,number>=\{[\s\S]*?\};/,'export const MATCHUP_BALANCE:Record<string,number>={\n'+Object.entries(MATCHUP_BALANCE).map(([k,v])=>`  '${k}':${v},`).join('\n')+'\n};');writeFileSync(p,source);
