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
    const wrists=[read(15),read(16)].filter(Boolean);
    // A visible second torso makes a lane ambiguous even if its hands are hidden.
    groups[Math.min(count-1,Math.floor(x*count))].push({x,y,span,wrists,index,joints:points.map((_,i)=>read(i))});
  }
  return groups.map(g=>g.length===1 && g[0].wrists.length ? g[0]:null);
}
export class Round {
  constructor(count,random=Math.random) {
    this.count=count; this.random=random; this.state="calibrate"; this.score=0; this.remaining=60;
    this.holds=Array(count).fill(0); this.zones=Array(count); this.targets=Array(count).fill(null);
    this.countdown=3; this.recovery=0; this.effects=[];
  }
  target(i) {
    const z=this.zones[i],r=this.random;
    return {x:z.x+(r()-.5)*z.w,y:-.06,speed:.19+r()*.065,hue:Math.floor(r()*360)};
  }
  update(players,dt) {
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
    if(!all) {this.recovery=0;if(this.state==="countdown")this.countdown=3;else this.state="paused";return;}
    if(this.state==="countdown") {
      this.countdown-=dt;
      if(this.countdown<=0){this.state="play";this.targets=this.targets.map((_,i)=>this.target(i));}
      return;
    }
    if(this.state==="paused"){this.recovery+=dt;if(this.recovery>=.65)this.state="play";return;}
    this.effects=this.effects.filter(effect=>(effect.age+=dt)<.85);
    this.remaining=Math.max(0,this.remaining-dt);
    if(!this.remaining){this.state="done";return;}
    players.forEach((p,i)=>{
      const b=this.targets[i];
      b.y+=b.speed*dt;
      if(p.wrists.some(w=>Math.hypot((w.x-b.x)*1.6,w.y-b.y)<=.065)){
        this.score++;this.effects.push({kind:'hit',x:b.x,y:b.y,age:0});this.targets[i]=this.target(i);
      }else if(b.y>=1.06){
        this.effects.push({kind:'miss',x:b.x,y:.89,age:0});this.targets[i]=this.target(i);
      }
    });
  }
}
