import {scenery,puppet,thumbnail} from "./art.mjs";
import {music,unlock,toggle,isEnabled} from "./music.mjs";
import {avatars,colors,lanes,Round} from "./game.mjs";
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
  stop();menu.innerHTML="<h1>Bubble Pop</h1><h2>How many players?</h2><div class='modes'></div>";
  for(const n of [1,2]){
    const b=button(n+" Player"+(n===2?"s":""),()=>{count=n;choices=Array(n).fill(0);current=0;picker();},"mode");
    const art=document.createElement("span");art.className="orbs";art.setAttribute("aria-hidden","true");art.innerHTML="<i class='orb'></i>".repeat(n);
    b.prepend(art);menu.querySelector(".modes").append(b);
  }
}
function picker(){
  const actions=panel("Choose your avatar",count===2?"Player "+(current+1)+" · "+(current===0?"Left lane":"Right lane"):"Player 1");
  const hint=document.createElement("p");hint.className="hint";hint.textContent="Choose No avatar to see yourself on screen, or a character to wear its cartoon costume.";
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
    model=ready;round=new Round(count);players=Array(count).fill(null);
    lastFrame=-1;lastPose=0;lastTick=performance.now();rateStart=lastTick;samples=0;el("rate").textContent="";
    menu.hidden=true;arena.hidden=false;raf=requestAnimationFrame(frame);
  }catch(e){if(token===epoch)failure(e.name==="NotAllowedError"?"Camera access was denied. Allow camera access in this site's browser settings, then retry.":"Camera or motion tracking could not start. Check camera availability and retry. "+(e.message||""));}
}
function results(){
  const total=round.score;stop();panel("Round complete!",total+" bubble"+(total===1?"":"s")+" popped").append(button("Play again",start),button("Change avatars",()=>{current=0;picker();},"secondary"),button("Change players",home,"secondary"));
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
    round.update(players,dt);music(round.state==="play");
    if(round.state==="done"){results();return;}
    draw();raf=requestAnimationFrame(frame);
  }catch(e){failure("Tracking was interrupted. "+(e.message||""));}
}
function disk(x,y,r,fill,stroke){
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}
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
function balloon(b,W,H){
  const x=b.x*W,y=b.y*H;
  ctx.strokeStyle="#fff4ce";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+30);ctx.bezierCurveTo(x-9,y+43,x+8,y+50,x-2,y+61);ctx.stroke();
  ctx.fillStyle="hsl("+b.hue+",74%,47%)";ctx.beginPath();ctx.moveTo(x,y+26);ctx.lineTo(x-5,y+35);ctx.lineTo(x+5,y+35);ctx.fill();
  const g=ctx.createRadialGradient(x-11,y-14,2,x,y,35);g.addColorStop(0,"hsl("+b.hue+",100%,86%)");g.addColorStop(.7,"hsl("+b.hue+",83%,62%)");g.addColorStop(1,"hsl("+b.hue+",67%,43%)");
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,27,32,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff9";ctx.stroke();disk(x-9,y-13,4,"#fffc");
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
    if(round.targets[i] && round.state==="play")balloon(round.targets[i],W,H);
    if(count===2){caption("Player "+(i+1),center,30,19);ctx.fillStyle=colors[i];ctx.fillRect(i*lane,0,lane,4);}
    const prompt=round.state==="calibrate"?(p?(round.holds[i]>=.45?"Ready!":"Raise either hand"):"Step back so your body fits in view"):(!p?"Return to your lane":"");
    if(prompt)caption(prompt,center,H-28,count===2?19:24);
    ctx.restore();
  }
  for(const e of round.effects){
    ctx.save();ctx.globalAlpha=Math.min(1,(.85-e.age)*4);const size=32+32*Math.sin(Math.min(1,e.age/.32)*Math.PI/2);
    caption(e.kind==="hit"?"+1":"😢",e.x*W,Math.max(65,e.y*H-35*e.age),size);ctx.restore();
  }
  el("clock").textContent=Math.floor(Math.ceil(round.remaining)/60)+":"+String(Math.ceil(round.remaining)%60).padStart(2,"0");
  el("score").textContent=round.score+" pops";
  el("status").textContent=round.state==="countdown"?(players.every(Boolean)?String(Math.ceil(round.countdown)):"Waiting for players"):round.state==="paused"?"Round paused":"";
}
el("exit").onclick=home;
document.addEventListener("visibilitychange",()=>{if(document.hidden && (stream || !arena.hidden)){failure("Session interrupted. Tap Retry camera when you are ready.");}});
window.addEventListener("pagehide",home);
home();
