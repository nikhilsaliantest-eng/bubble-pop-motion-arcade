import {scenery,puppet,thumbnail} from "./art.mjs?v=fruit-2";
import {music,unlock,toggle,isEnabled,clap} from "./music.mjs?v=fruit-3";
import {avatars,colors,lanes,Round,speeds,fruitTypes,fruitRadius} from "./game.mjs?v=fruit-3";
let speed="Classic";
try{const saved=localStorage.getItem("fruit-speed");if(Object.prototype.hasOwnProperty.call(speeds,saved))speed=saved;}catch{}
function selectSpeed(value){
  speed=value;if(round)round.speed=value;
  for(const select of document.querySelectorAll(".speed-select"))select.value=value;
  try{localStorage.setItem("fruit-speed",value);}catch{}
}
function speedControl(){
  const label=document.createElement("label");label.className="speed-control";label.append("Speed ");
  const select=document.createElement("select");select.className="speed-select";
  for(const name of Object.keys(speeds))select.add(new Option(name,name));
  select.value=speed;select.onchange=()=>selectSpeed(select.value);label.append(select);return label;
}
const el=id=>document.getElementById(id);
const menu=el("menu"),arena=el("arena"),canvas=el("board"),ctx=canvas.getContext("2d");
canvas.width=960; canvas.height=600;
const video=document.createElement("video");
video.muted=true;video.playsInline=true;video.autoplay=true;
let scenes=[],cutout=null;
const musicButton=el('music');
function musicLabel(){musicButton.textContent=isEnabled()?'Music on':'Music off';musicButton.setAttribute('aria-pressed',String(isEnabled()));}
musicButton.onclick=()=>{toggle(round?.state==='play');musicLabel();};musicLabel();
let count=1, choices=[], current=0, epoch=0,stream=null,model=null,raf=0;
let round,players=[],lastFrame=-1,lastPose=0,lastTick=0,rateStart=0,samples=0;
function stop() {
  epoch++;cancelAnimationFrame(raf);music(false);cutout=null;
  if(stream)stream.getTracks().forEach(t=>t.stop());
  stream=null; video.pause();video.srcObject=null;
  if(model){model.close();model=null;}
  arena.hidden=true;menu.hidden=false;
}
function button(label,action,klass="") {
  const b=document.createElement("button");b.textContent=label;b.className=klass;b.onclick=action;return b;
}
function panel(title,hint="") {
  menu.replaceChildren();const h=document.createElement("h2");h.textContent=title;menu.append(h);
  if(hint){const p=document.createElement("p");p.className="hint";p.textContent=hint;menu.append(p);}
  const actions=document.createElement("div");actions.className="actions";menu.append(actions);return actions;
}
function home(){
  stop();menu.innerHTML="<h1>Fruit Slice</h1><h2>How many players?</h2><div class='modes'></div>";
  menu.append(speedControl());
  for(const n of [1,2]){
    const b=button(n+" Player"+(n===2?"s":""),()=>{count=n;choices=Array(n).fill(0);current=0;picker();},"mode");
    const art=document.createElement("span");art.className="orbs";art.setAttribute("aria-hidden","true");art.textContent=n===1?"🍎":"🍊 🍉";
    b.prepend(art);menu.querySelector(".modes").append(b);
  }
}
function picker(){
  const actions=panel("Choose your avatar",count===2?"Player "+(current+1)+" · "+(current===0?"Left lane":"Right lane"):"Player 1");
  const hint=document.createElement("p");hint.className="hint";hint.textContent="Swipe either hand through falling fruit. Slice at least half in two minutes to advance. Choose No avatar to see yourself.";
  const grid=document.createElement("div");grid.className="grid";actions.before(hint,grid);
  avatars.forEach((name,id)=>{
    const b=button(name,()=>{choices[current]=id;[...grid.children].forEach((tile,i)=>tile.setAttribute("aria-pressed",String(id===i)));},"tile");
    b.setAttribute("aria-pressed",String(choices[current]===id));
    const c=document.createElement("canvas");c.width=c.height=96;c.setAttribute("aria-hidden","true");
    thumbnail(c.getContext('2d'),id);b.prepend(c);grid.append(b);
  });
  actions.append(button("Back",()=>{if(current){current--;picker();}else home();},"secondary"),
    button(current+1<count?"Choose player 2":"Start camera",()=>{if(current+1<count){current++;picker();}else start();}));
}
function failure(message){
  stop();panel("Camera setup",message).append(button("Retry camera",start),button("Change avatars",()=>{current=0;picker();},"secondary"));
}
async function start(){
  stop();unlock();const token=epoch;
  panel("Starting camera…","Allow camera access so your hands can pop bubbles.").append(button("Back",()=>{stop();picker();},"secondary"));
  try{
    const capture=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:"user",width:{ideal:640},height:{ideal:480}}});
    if(token!==epoch){capture.getTracks().forEach(t=>t.stop());return;}
    stream=capture;video.srcObject=stream;await video.play();if(token!==epoch)return;
    const {FilesetResolver,PoseLandmarker}=await import("./vendor/vision_bundle.mjs");
    const files=await FilesetResolver.forVisionTasks(new URL("./vendor/wasm",import.meta.url).href);
    if(token!==epoch)return;
    const options={baseOptions:{modelAssetPath:new URL("./vendor/pose_landmarker_lite.task",import.meta.url).href,delegate:"GPU"},runningMode:"VIDEO",numPoses:count,outputSegmentationMasks:count===2 && choices.includes(0) && choices.some(Boolean)};
    let ready;
    try{ready=await PoseLandmarker.createFromOptions(files,options);}
    catch{if(token!==epoch)return;options.baseOptions.delegate="CPU";ready=await PoseLandmarker.createFromOptions(files,options);}
    if(token!==epoch){ready.close();return;}
    scenes=choices.map(id=>scenery(id,canvas.width/count,canvas.height));
    model=ready;round=new Round(count);round.speed=speed;players=Array(count).fill(null);
    lastFrame=-1;lastPose=0;lastTick=performance.now();rateStart=lastTick;samples=0;el("rate").textContent="";
    menu.hidden=true;arena.hidden=false;raf=requestAnimationFrame(frame);
  }catch(e){if(token===epoch)failure(e.name==="NotAllowedError"?"Camera access was denied. Allow camera access in this site's browser settings, then retry.":"Camera or motion tracking could not start. Check camera availability and retry. "+(e.message||""));}
}
function results(){
  const total=round.score;stop();panel("Round complete!",total+" fruit sliced · Level "+round.level+" · "+round.hits+" sliced / "+round.misses+" missed this level").append(button("Play again",start),button("Change avatars",()=>{current=0;picker();},"secondary"),button("Change players",home,"secondary"));
}
function frame(now){
  try{
    if(stream.getVideoTracks()[0]?.readyState==="ended"){failure("The camera disconnected. Reconnect it and retry.");return;}
    const dt=Math.min((now-lastTick)/1000,.3);lastTick=now;
    if(video.readyState>=2 && video.currentTime!==lastFrame){
      lastFrame=video.currentTime;
      model.detectForVideo(video,now,result=>{
        players=lanes(result.landmarks,count);
        const i=choices.indexOf(0), person=players[i];
        if(count===2 && choices.some(Boolean) && person && i>=0){
          const mask=result.segmentationMasks?.[person.index];
          cutout=mask?personImage(mask):null;
        }else cutout=null;
      });
      lastPose=now;samples++;
    }
    if(now-lastPose>400) players=Array(count).fill(null);
    if(now-rateStart>=1000){el("rate").textContent=Math.round(samples*1000/(now-rateStart))+" tracking updates/s";rateStart=now;samples=0;}
    round.update(players,dt,lastPose/1000);music(round.state==="play");
    for(const effect of round.effects){
      if(effect.kind==="hit" && !effect.sounded){clap();effect.sounded=true;}
    }
    if(round.state==="done"){results();return;}
    draw();raf=requestAnimationFrame(frame);
  }catch(e){failure("Tracking was interrupted. "+(e.message||""));}
}
// Compose the selected person's mask in camera coordinates, then mirror the result once.
let matte,portrait,imageData;
function personImage(mask){
  const {width,height}=mask;
  if(!matte || matte.width!==width || matte.height!==height){
    matte=document.createElement("canvas");matte.width=width;matte.height=height;
    imageData=matte.getContext("2d").createImageData(width,height);
  }
  const values=mask.getAsFloat32Array();
  for(let i=0;i<values.length;i++)imageData.data[i*4+3]=Math.min(255,Math.max(0,(values[i]-.2)*425));
  matte.getContext("2d").putImageData(imageData,0,0);
  if(!portrait){portrait=document.createElement("canvas");portrait.width=640;portrait.height=480;}
  const c=portrait.getContext("2d");
  c.globalCompositeOperation="source-over";c.drawImage(video,0,0,640,480);
  c.globalCompositeOperation="destination-in";c.drawImage(matte,0,0,640,480);
  c.globalCompositeOperation="source-over";return portrait;
}
function cameraLayer(source,W,H){
  ctx.save();ctx.translate(W,0);ctx.scale(-1,1);ctx.drawImage(source,0,0,W,H);ctx.restore();
}
function fruitIcon(type,x,y,size){
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=size+"px system-ui";
  ctx.fillText(fruitTypes[type],x,y);
}
function drawFruit(target,W,H){
  ctx.save();fruitIcon(target.type,target.x*W,target.y*H,2*fruitRadius*H);ctx.restore();
}
function splitFruit(e,W,H){
  const x=e.x*W,y=e.y*H,size=2*fruitRadius*H;
  const angle=Math.atan2((e.cut.b.y-e.cut.a.y)*H,(e.cut.b.x-e.cut.a.x)*W);
  for(const side of [-1,1]){
    ctx.save();ctx.translate(x-Math.sin(angle)*side*e.age*80,y+Math.cos(angle)*side*e.age*80+e.age*e.age*80);
    ctx.rotate(angle+side*e.age*.7);ctx.beginPath();ctx.rect(-size,side<0?-size:0,size*2,size);ctx.clip();ctx.rotate(-angle);
    fruitIcon(e.type,0,0,size);ctx.restore();
  }
  if(e.age<.18){
    ctx.strokeStyle="white";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(e.cut.a.x*W,e.cut.a.y*H);ctx.lineTo(e.cut.b.x*W,e.cut.b.y*H);ctx.stroke();
  }
}
function cutCloud(e,W,H){
  const x=e.x*W,y=e.y*H,spread=e.age*115;
  ctx.save();ctx.globalAlpha=Math.max(0,1-e.age/.65);
  for(let i=0;i<9;i++){
    const angle=i*Math.PI*2/9;
    const px=x+Math.cos(angle)*spread,py=y+Math.sin(angle)*spread;
    ctx.beginPath();ctx.arc(px,py,Math.max(2,11-e.age*11),0,Math.PI*2);
    ctx.fillStyle=i%2?"#fff6d0":"#ffffff";ctx.fill();
  }
  ctx.restore();
}
function caption(text,x,y,size=22){
  ctx.textAlign="center";ctx.font="bold "+size+"px system-ui";ctx.lineWidth=5;ctx.strokeStyle="#183b47";ctx.strokeText(text,x,y);ctx.fillStyle="white";ctx.fillText(text,x,y);
}
function draw(){
  const W=canvas.width,H=canvas.height,lane=W/count;
  const allCamera=choices.every(id=>id===0);
  for(let i=0;i<count;i++){
    const p=players[i],center=(i+.5)*lane;
    ctx.save();ctx.beginPath();ctx.rect(i*lane,0,lane,H);ctx.clip();
    ctx.drawImage(scenes[i],i*lane,0);
    if(choices[i]===0){
      if(allCamera && video.readyState>=2)cameraLayer(video,W,H);
      else if(p && cutout)cameraLayer(cutout,W,H);
    }else if(p)puppet(ctx,choices[i],p,W,H);
    if(round.targets[i] && round.state==="play")drawFruit(round.targets[i],W,H);
    if(count===2){caption("Player "+(i+1),center,30,19);ctx.fillStyle=colors[i];ctx.fillRect(i*lane,0,lane,4);}
    const prompt=round.state==="calibrate"?(p?(round.holds[i]>=.45?"Ready!":"Raise either hand"):"Step back so your body fits in view"):(!p?"Return to your lane":"");
    if(prompt)caption(prompt,center,H-28,count===2?19:24);
    ctx.restore();
  }
  for(const e of round.effects){
    ctx.save();ctx.globalAlpha=Math.min(1,(.85-e.age)*4);const size=32+32*Math.sin(Math.min(1,e.age/.32)*Math.PI/2);
    if(e.kind==="hit"){splitFruit(e,W,H);cutCloud(e,W,H);}
    caption(e.kind==="hit"?"+1":"😢",e.x*W,Math.max(65,e.y*H-35*e.age),size);ctx.restore();
  }
  el("clock").textContent=Math.floor(Math.ceil(round.remaining)/60)+":"+String(Math.ceil(round.remaining)%60).padStart(2,"0");
  el("score").textContent=round.score+" sliced";
  el("progress").textContent="This level · "+round.hits+" sliced / "+round.misses+" missed";
  el("level").textContent="Level "+round.level;
  el("status").textContent=round.state==="countdown"?(players.every(Boolean)?String(Math.ceil(round.countdown)):"Waiting for players"):round.state==="paused"?"Tracking paused · Face the camera and show one hand":round.state==="play" && round.remaining>117?(round.level===1?"Swipe through the fruit!":"Level "+round.level+" · Move left and right!"):"";
}
el("clock").before(speedControl());
el("exit").onclick=home;
document.addEventListener("visibilitychange",()=>{if(document.hidden && (stream || !arena.hidden)){failure("Session interrupted. Tap Retry camera when you are ready.");}});
window.addEventListener("pagehide",home);
home();
