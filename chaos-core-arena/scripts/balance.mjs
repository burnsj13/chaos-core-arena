// Run with: npm run balance -- --count=100
import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {mkdirSync,writeFileSync,renameSync} from 'node:fs';
mkdirSync('.balance-build',{recursive:true});execFileSync('tsc',['src/engine.ts','--target','es2022','--module','commonjs','--outDir','.balance-build','--skipLibCheck']);
renameSync('.balance-build/engine.js','.balance-build/engine.cjs');const require=createRequire(import.meta.url);const {Battle,IDS,STEP}=require('../.balance-build/engine.cjs');
const count=Number(process.argv.find(a=>a.startsWith('--count='))?.split('=')[1]??100);if(count%2)throw Error('Count must be even');
const results=[];let index=0;
for(let a=0;a<IDS.length;a++)for(let b=a+1;b<IDS.length;b++){
 const wins=[0,0],times=[],close=[];let timeouts=0;
 for(let n=0;n<count;n++){const swap=n%2===1,ids=swap?[IDS[b],IDS[a]]:[IDS[a],IDS[b]];const battle=new Battle(ids,10000+Math.floor(n/2)+index*100003);while(battle.winner<0&&!battle.draw)battle.update(STEP);if(battle.winner>=0)wins[swap?1-battle.winner:battle.winner]++;if(battle.timeout)timeouts++;times.push(battle.time);close.push(Math.abs(battle.fighters[0].hp-battle.fighters[1].hp));}
 results.push({pair:[IDS[a],IDS[b]],wins,winPct:Math.round(wins[0]/count*1000)/10,meanSeconds:Math.round(times.reduce((x,y)=>x+y,0)/count*10)/10,medianSeconds:times.sort((x,y)=>x-y)[Math.floor(count/2)],timeouts});index++;
}
const report={countPerPair:count,total:count*results.length,results};mkdirSync('reports',{recursive:true});writeFileSync('reports/balance.json',JSON.stringify(report,null,2));console.table(results.map(r=>({match:r.pair.join(' vs '),winPct:r.winPct,mean:r.meanSeconds,timeout:r.timeouts})));console.log('Saved reports/balance.json');
