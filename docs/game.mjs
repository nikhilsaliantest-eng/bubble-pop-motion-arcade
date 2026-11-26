export const avatars = ["No avatar","Mickey Mouse","Peppa Pig","Bluey","Cow","Puppy","Giraffe","Tiger"];
export const colors = ["#91ffe0","#ffc797"];
export function lanes(raw,count) {
  const groups = Array.from({length:count},()=>[]);
  for (const [index,points] of raw.entries()) {
    const read=i=>points[i] && (points[i].visibility ?? 1)>=.5 ? {x:1-points[i].x,y:points[i].y}:null;
    const left=read(11),right=read(12);
    if (!left || !right) continue;
    const x=(left.x+right.x)/2, y=(left.y+right.y)/2;
    const span=Math.abs(left.x-right.x);
    if (x<0 || x>1 || span<.025 || (count===2 && Math.abs(.5-x)<.025)) continue;
    const wrists=[15,16].map(id=>{const w=read(id);return w && {...w,id};}).filter(Boolean);
    // A visible second torso makes a lane ambiguous even if its hands are hidden.
    groups[Math.min(count-1,Math.floor(x*count))].push({x,y,span,wrists,index,joints:points.map((_,i)=>read(i))});
  }
  return groups.map(g=>g.length===1 && g[0].wrists.length ? g[0]:null);
}
export const speeds={Gentle:.20,Classic:.32,Fast:.46};
export const fruitTypes=["🍎","🍊","🍉","🥝","🍑","🍋"];
export const fruitRadius=.108;
function crosses(a,b,fruit,elapsed){
  const dx=(b.x-a.x)*1.6,dy=b.y-a.y;
  const length=Math.hypot(dx,dy);
  if(length<.010 || length/elapsed<.32 || length/elapsed>8)return false;
  const fx=(fruit.x-a.x)*1.6,fy=fruit.y-a.y;
  const t=Math.max(0,Math.min(1,(fx*dx+fy*dy)/(length*length)));
  return Math.hypot(fx-t*dx,fy-t*dy)<=fruitRadius;
}
export class Round {
  constructor(count,random=Math.random) {
    this.count=count; this.random=random; this.state="calibrate"; this.score=0; this.remaining=120;this.level=1;this.hits=0;this.misses=0;this.speed='Classic';
    this.bags=Array.from({length:count},()=>[]);this.previous=Array(count).fill(null);this.elapsed=0;
    this.holds=Array(count).fill(0); this.zones=Array(count); this.targets=Array(count).fill(null);
    this.countdown=3; this.recovery=0; this.lostFor=0; this.effects=[];
  }
  target(i) {
    const r=this.random,z=this.zones[i];
    let x=z.x+(r()-.5)*z.w;
    if(this.level>=2){
      const bag=this.bags[i];
      if(!bag.length){
        bag.push(0,1,2);
        for(let j=2;j>0;j--){const k=Math.floor(r()*(j+1));[bag[j],bag[k]]=[bag[k],bag[j]];}
      }
      x=(i+.16+bag.pop()*.34+(r()-.5)*.09)/this.count;
    }
    return {x,y:-.10,type:Math.floor(r()*fruitTypes.length)};
  }
  get fallSpeed(){
    return speeds[this.speed]*(1+2*(1-Math.pow(.87,this.level-1)));
  }
  update(players,dt,sampleTime) {
    this.elapsed+=dt;
    const stamp=sampleTime??this.elapsed;
    const all=players.every(Boolean);
    if (this.state==="calibrate") {
      players.forEach((p,i)=>{
        const hand=p?.wrists.find(w=>w.y<p.y-.035);
        this.holds[i]=hand?this.holds[i]+dt:0;
        if(hand) {
          const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
          const w=clamp(p.span*1.8,.09,.78/this.count),h=clamp(p.y-hand.y,.12,.45);
          this.zones[i]={x:clamp(p.x,i/this.count+w/2+.015,(i+1)/this.count-w/2-.015),y:clamp(p.y-h*.35,.07+h/2,.93-h/2),w,h};
        }
      });
      if(this.holds.every(v=>v>=.45)){this.state="countdown";this.countdown=3;}
      return;
    }
    if(this.state==="done") return;
    if(!all){
      this.previous.fill(null);
      this.recovery=0;
      this.lostFor+=dt;
      if(this.lostFor>=.6){
        if(this.state==="countdown")this.countdown=3;
        else this.state="paused";
      }
      return;
    }
    this.lostFor=0;
    if(this.state==="countdown") {
      this.countdown-=dt;
      if(this.countdown<=0){this.state="play";this.targets=this.targets.map((_,i)=>this.target(i));}
      return;
    }
    if(this.state==="paused"){this.recovery+=dt;if(this.recovery>=.65)this.state="play";return;}
    this.effects=this.effects.filter(effect=>(effect.age+=dt)<.85);
    this.remaining=Math.max(0,this.remaining-dt);
    if(!this.remaining){
      if(this.hits===0 || this.hits<this.misses){this.state="done";return;}
      this.level++;this.hits=0;this.misses=0;this.remaining=120;
      this.previous.fill(null);this.targets=this.targets.map((_,i)=>this.target(i));
      return;
    }
    players.forEach((p,i)=>{
      const b=this.targets[i];
      b.y+=this.fallSpeed*dt;
      const prior=this.previous[i];
      let cut=null;
      if(prior && stamp>prior.time && stamp-prior.time<=.25){
        for(const w of p.wrists){
          const a=prior.wrists.find(hand=>hand.id===w.id);
          if(a && crosses(a,w,b,stamp-prior.time)){cut={a,b:w};break;}
        }
      }
      this.previous[i]={time:stamp,wrists:p.wrists};
      if(cut){
        this.score++;this.hits++;
        this.effects.push({kind:'hit',x:b.x,y:b.y,type:b.type,cut,age:0});this.targets[i]=this.target(i);
      }else if(b.y>=1.10){
        this.misses++;
        this.effects.push({kind:'miss',x:b.x,y:.89,age:0});this.targets[i]=this.target(i);
      }
    });
  }
}
