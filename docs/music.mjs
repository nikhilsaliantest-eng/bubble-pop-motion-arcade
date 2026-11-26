let audio, timer, master, step=0, next=0;
let enabled=true;
try{enabled=localStorage.getItem("bubble-music")!=="off";}catch{}
const melody=[72,0,76,79,0,76,74,0,71,0,74,77,0,74,72,0,69,0,72,76,0,72,71,0,67,0,71,74,0,71,0,0];
export function unlock(){
  try{
    if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;audio=new Audio();master=audio.createGain();master.gain.value=.22;master.connect(audio.destination);}
    audio.resume().catch(()=>{});
  }catch{}
}
export function clap(){
  if(!audio || audio.state!=="running")return;
  const duration=.18,buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate);
  const samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/(audio.sampleRate*.035));
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
  source.buffer=buffer;filter.type="highpass";filter.frequency.value=900;
  gain.gain.value=.35;source.connect(filter);filter.connect(gain);gain.connect(audio.destination);
  source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
function note(midi,time,volume,duration,type){
  const voice=audio.createOscillator(), envelope=audio.createGain();
  voice.type=type;voice.frequency.value=440*2**((midi-69)/12);
  envelope.gain.setValueAtTime(.0001,time);envelope.gain.exponentialRampToValueAtTime(volume,time+.04);envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
  voice.connect(envelope);envelope.connect(master);voice.start(time);voice.stop(time+duration+.02);
  voice.onended=()=>{voice.disconnect();envelope.disconnect();};
}
export function music(active){
  if(!active || !enabled || !audio){
    clearInterval(timer);timer=null;if(master)master.gain.setTargetAtTime(0,audio.currentTime,.03);return;
  }
  if(timer)return;
  master.gain.setTargetAtTime(.22,audio.currentTime,.05);next=audio.currentTime+.06;
  function schedule(){
    if(audio.state!=="running")return;
    next=Math.max(audio.currentTime,next);
    while(next<audio.currentTime+.18){
      const m=melody[step];if(m)note(m,next,.15,.60,"sine");
      if(step%8===0)note([48,43,45,43][step/8],next,.10,1.3,"triangle");
      step=(step+1)%melody.length;next+=.34;
    }
  }
  schedule();timer=setInterval(schedule,90);
}
export function toggle(active){enabled=!enabled;try{localStorage.setItem("bubble-music",enabled?"on":"off");}catch{}unlock();music(active);return enabled;}
export const isEnabled=()=>enabled;
