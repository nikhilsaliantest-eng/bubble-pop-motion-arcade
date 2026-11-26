import {avatars,colors,sprite,lanes,Round} from "./game.mjs";
const el=id=>document.getElementById(id);
const menu=el("menu"),arena=el("arena"),canvas=el("board"),ctx=canvas.getContext("2d");
canvas.width=960; canvas.height=600;
const video=document.createElement("video");
video.muted=true;video.playsInline=true;video.autoplay=true;
// Keep the capture element detached. Only artwork is drawn to the visible canvas.
let count=1, choices=[], current=0, epoch=0,stream=null,model=null,raf=0;
let round,players=[],lastFrame=-1,lastPose=0,lastTick=0,rateStart=0,samples=0;
function stop() {
  epoch++;cancelAnimationFrame(raf);
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
  const grid=document.createElement("div");grid.className="grid";actions.before(grid);
  avatars.forEach((name,id)=>{
    const b=button(name,()=>{choices[current]=id;[...grid.children].forEach((tile,i)=>tile.setAttribute("aria-pressed",String(id===i)));},"tile");
    b.setAttribute("aria-pressed",String(choices[current]===id));
    const c=document.createElement("canvas");c.width=c.height=96;c.setAttribute("aria-hidden","true");
    sprite(c.getContext("2d"),id,48,48,84,colors[current],true);b.prepend(c);grid.append(b);
  });
  actions.append(button("Back",()=>{if(current){current--;picker();}else home();},"secondary"),
    button(current+1<count?"Choose player 2":"Start camera",()=>{if(current+1<count){current++;picker();}else start();}));
}
function failure(message){
  stop();panel("Camera setup",message).append(button("Retry camera",start),button("Change avatars",()=>{current=0;picker();},"secondary"));
}
async function start(){
  stop();const token=epoch;
  panel("Starting camera…","Allow camera access so your hands can pop bubbles.").append(button("Back",()=>{stop();picker();},"secondary"));
  try{
    const capture=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:"user",width:{ideal:640},height:{ideal:480}}});
    if(token!==epoch){capture.getTracks().forEach(t=>t.stop());return;}
    stream=capture;video.srcObject=stream;await video.play();if(token!==epoch)return;
    const {FilesetResolver,PoseLandmarker}=await import("./vendor/vision_bundle.mjs");
    const files=await FilesetResolver.forVisionTasks(new URL("./vendor/wasm",import.meta.url).href);
    if(token!==epoch)return;
    const options={baseOptions:{modelAssetPath:new URL("./vendor/pose_landmarker_lite.task",import.meta.url).href,delegate:"GPU"},runningMode:"VIDEO",numPoses:count,outputSegmentationMasks:false};
    let ready;
    try{ready=await PoseLandmarker.createFromOptions(files,options);}
    catch{if(token!==epoch)return;options.baseOptions.delegate="CPU";ready=await PoseLandmarker.createFromOptions(files,options);}
    if(token!==epoch){ready.close();return;}
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
      players=lanes(model.detectForVideo(video,now).landmarks,count);
      lastPose=now;samples++;
    }
    if(now-lastPose>400) players=Array(count).fill(null);
    if(now-rateStart>=1000){el("rate").textContent=Math.round(samples*1000/(now-rateStart))+" tracking updates/s";rateStart=now;samples=0;}
    round.update(players,dt);
    if(round.state==="done"){results();return;}
    draw();raf=requestAnimationFrame(frame);
  }catch(e){failure("Tracking was interrupted. "+(e.message||""));}
}
function disk(x,y,r,fill,stroke){
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}
}
function draw(){
  const W=canvas.width,H=canvas.height;
  ctx.fillStyle="#103e59";ctx.fillRect(0,0,W,H);
  for(let i=0;i<count;i++){
    const p=players[i],col=colors[i],center=W*(i+.5)/count;
    ctx.fillStyle=i===0?"#164f61":"#36485e";ctx.fillRect(W*i/count+3,3,W/count-6,H-6);
    ctx.textAlign="center";ctx.font="bold 22px system-ui";ctx.fillStyle=col;
    ctx.fillText("Player "+(i+1),center,34);
    if(p)sprite(ctx,choices[i],p.x*W,p.y*H,Math.max(48,Math.min(160,p.span*W*1.15)),col);
    const b=round.targets[i];
    if(b && round.state==="play"){
      disk(b.x*W,b.y*H,32,i===0?"#2c9e99":"#bb7975",col);
      disk(b.x*W-9,b.y*H-12,6,"white");
    }
    if(p)for(const w of p.wrists)disk(w.x*W,w.y*H,11,col,"#143347");
    const prompt=round.state==="calibrate"?(p?(round.holds[i]>=.45?"Ready!":"Raise either hand"):"Step into this lane"):(!p?"Return to your lane":"");
    if(prompt)ctx.fillText(prompt,center,H-30);
  }
  el("clock").textContent=Math.floor(Math.ceil(round.remaining)/60)+":"+String(Math.ceil(round.remaining)%60).padStart(2,"0");
  el("score").textContent=round.score+" pops";
  el("status").textContent=round.state==="countdown"?(players.every(Boolean)?String(Math.ceil(round.countdown)):"Waiting for players"):round.state==="paused"?"Round paused":"";
}
el("exit").onclick=home;
document.addEventListener("visibilitychange",()=>{if(document.hidden && (stream || !arena.hidden)){failure("Session interrupted. Tap Retry camera when you are ready.");}});
window.addEventListener("pagehide",home);
home();
