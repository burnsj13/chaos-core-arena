import type {VisualEvent,FighterId} from './engine';

// Original, synthesized effects: no licensed audio assets or network requests.
export class ArenaAudio {
 private ctx:AudioContext|null=null;
 private master:GainNode|null=null;
 private output:MediaStreamAudioDestinationNode|null=null;
 private lastHit=0;
 private music:GainNode|null=null;
 private musicVolume=.27;
 private musicEnabled=true;
 private nextBeat=0;
 private beat=0;
 private duckUntil=0;
 private enabled=true;
 private volume=.45;
 async unlock(){
  const AudioContextClass=window.AudioContext;
  if(!this.ctx){this.ctx=new AudioContextClass();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.output=this.ctx.createMediaStreamDestination();this.master.connect(this.ctx.destination);this.master.connect(this.output);this.music=this.ctx.createGain();this.music.gain.value=this.musicVolume;this.music.connect(this.master)}
  if(this.ctx.state==='suspended')await this.ctx.resume();
 }
 setMusicEnabled(v:boolean){this.musicEnabled=v;if(this.music)this.music.gain.value=v?this.musicVolume:0;this.nextBeat=0}
 setMusicVolume(v:number){this.musicVolume=Math.max(0,Math.min(1,v));if(this.music)this.music.gain.value=this.musicEnabled?this.musicVolume:0}
 resetMusic(){this.beat=0;this.nextBeat=0}
 // Original minor-key synth score. Scheduled against AudioContext time, not animation frames.
 private note(freq:number,at:number,duration:number,volume:number,type:OscillatorType='triangle',out?:AudioNode){
  if(!this.ctx)return;
  const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.value=freq;
  gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(volume,at+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(out??this.music!);osc.start(at);osc.stop(at+duration+.02);
 }
 musicTick(active:boolean,remainingHp:number,elapsed:number){
  if(!this.ctx||!this.music||this.ctx.state!=='running')return;
  if(!active){this.nextBeat=0;return}
  if(!this.musicEnabled||!this.enabled){this.nextBeat=0;return}
  const intensity=remainingHp<.32||elapsed>48?2:remainingHp<.68||elapsed>22?1:0;
  const beatDuration=60/(intensity===2?148:intensity===1?132:116)/2;
  if(!this.nextBeat||this.nextBeat<this.ctx.currentTime-.3)this.nextBeat=this.ctx.currentTime+.04;
  const bass=[55,55,65.41,55,46.25,46.25,49,49];
  while(this.nextBeat<this.ctx.currentTime+.16){
   const t=this.nextBeat,k=this.beat%16,bar=Math.floor(this.beat/16)%4;
   const root=bass[(Math.floor(this.beat/4)+bar*2)%8];
   // Kick, bass, and a quiet offbeat hi-hat synthesized from oscillators.
   if(k%4===0){this.note(95,t,.11,.24,'sine');this.note(root,t,.29,.21,'sawtooth')}
   if(k%4===2)this.note(155,t,.07,.095,'triangle');
   if(k%2===1)this.note(1200,t,.035,.025,'square');
   if(intensity>=1&&k%2===0)this.note(root*4,t,.12,.05,'triangle');
   if(intensity===2){if(k%4===3)this.note(950,t,.04,.035,'square');if(k%8===0)this.note(root*8,t,.32,.06,'sine')}
   this.nextBeat+=beatDuration;this.beat++;
  }
  const desired=this.ctx.currentTime<this.duckUntil?this.musicVolume*.22:this.musicVolume;
  this.music.gain.setTargetAtTime(desired,this.ctx.currentTime,.09);
 }
 countdown(finalBeat:boolean){this.tone(finalBeat?720:520,finalBeat?950:440,.17,'sine',.13)}
 fightStart(){this.tone(180,560,.36,'sawtooth',.16);this.tone(720,1100,.2,'triangle',.1,.1)}
 get track(){return this.output?.stream.getAudioTracks()[0]??null}
 setEnabled(v:boolean){this.enabled=v;if(this.master)this.master.gain.value=v?this.volume:0}
 setVolume(v:number){this.volume=Math.max(0,Math.min(1,v));if(this.master)this.master.gain.value=this.enabled?this.volume:0}
 private tone(freq:number,end:number,duration:number,type:OscillatorType='sine',gain=.12,delay=0){
  if(!this.ctx||!this.master||!this.enabled)return;
  const t=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),amp=this.ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(Math.max(20,freq),t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
  amp.gain.setValueAtTime(.0001,t);amp.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.008);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(amp);amp.connect(this.master);osc.start(t);osc.stop(t+duration+.02);
 }
 private noise(duration:number,gain=.08,lowpass=1300){
  if(!this.ctx||!this.master||!this.enabled)return;
  const n=Math.max(1,Math.ceil(this.ctx.sampleRate*duration)),buffer=this.ctx.createBuffer(1,n,this.ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<n;i++)data[i]=Math.random()*2-1;
  const src=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),amp=this.ctx.createGain(),t=this.ctx.currentTime;
  src.buffer=buffer;filter.type='lowpass';filter.frequency.value=lowpass;amp.gain.setValueAtTime(gain,t);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
  src.connect(filter);filter.connect(amp);amp.connect(this.master);src.start(t);src.stop(t+duration);
 }
 event(e:VisualEvent){
  if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
  switch(e.kind){
   case 'hit':{
    // A 70ms gate keeps rapid DOT ticks from becoming an unpleasant buzz.
    if(this.ctx.currentTime-this.lastHit<.07)return;this.lastHit=this.ctx.currentTime;
    const strength=Math.min(1,(e.amount??1)/9);
    this.tone(155+strength*90,65,.105,'triangle',.045+strength*.06);
    if(strength>.5)this.noise(.07,.03,650);break;
   }
   case 'special':this.special(e.id);break;
   case 'evolve':this.tone(380,760,.23,'sine',.08);this.tone(570,1100,.2,'triangle',.035,.08);break;
   case 'ultimate':this.duckUntil=this.ctx.currentTime+1.15;this.ultimate(e.id);break;
   case 'slam':this.tone(165,38,.36,'sawtooth',.24);this.noise(.28,.16,500);break;
   case 'arc':this.tone(1300,250,.16,'sawtooth',.055);this.noise(.11,.055,3500);break;
   case 'ignite':this.noise(.24,.065,1800);break;
   case 'steam':this.noise(.3,.055,2800);break;
   case 'shield':this.tone(520,230,.15,'triangle',.035);break;
   case 'burst':this.tone(220,70,.3,'sawtooth',.09);break;
  }
 }
 private special(id:FighterId){
  switch(id){
   case 'inferno':this.noise(.24,.075,1900);this.tone(160,390,.22,'sawtooth',.055);break;
   case 'singularity':this.tone(260,65,.42,'sine',.14);break;
   case 'volt':this.tone(1100,310,.13,'sawtooth',.09);break;
   case 'glacier':this.tone(850,1450,.18,'triangle',.08);break;
   case 'venom':this.tone(340,115,.25,'sine',.095);break;
   case 'aegis':this.tone(210,470,.22,'triangle',.12);break;
  }
 }
 private ultimate(id:FighterId){
  const low=id==='singularity'?75:120;
  this.tone(low*2,low,.85,'sawtooth',.14);
  this.tone(260,1100,.65,'triangle',.13,.12);
  this.tone(900,120,.4,'sine',.11,.62);
  this.noise(.65,.11,id==='inferno'?2300:1000);
 }
 winner(){this.tone(392,392,.2,'triangle',.12);this.tone(494,494,.23,'triangle',.12,.2);this.tone(587,587,.45,'triangle',.14,.43)}
 dispose(){void this.ctx?.close();this.ctx=null;this.master=null;this.output=null;this.music=null}
}
