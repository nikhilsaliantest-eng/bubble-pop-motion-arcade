import {Round,speeds} from "./game.mjs";
const candy=["🍬","🍭","🍫","🍪","🍡"];
export class MiniRound extends Round {
 constructor(game,speed){super(1);this.game=game;this.speed=speed;this.targets=[null];this.spawn=0;this.misses=0;this.previousHand=null;this.previousFoot=null;this.ball={x:.5,y:.83,vx:0,vy:0,active:false};}
 update(players,dt,time){
  if(this.state==="calibrate" || this.state==="countdown"){super.update(players,dt,time);if(this.state==="play"){this.targets=[null];this.remaining=120;}return;}
  const p=players[0];
  if(!p){this.lostFor+=dt;this.previousHand=null;this.previousFoot=null;if(this.lostFor>.6)this.state="paused";return;}
  this.lostFor=0;
  if(this.state==="paused"){this.recovery+=dt;if(this.recovery>.65){this.state="play";this.recovery=0;}return;}
  if(this.state==="done")return;
  this.effects=this.effects.filter(e=>(e.age+=dt)<.85);
  this.remaining=Math.max(0,this.remaining-dt);
  if(this.remaining===0){this.state="done";return;}
  const speed=speeds[this.speed]/speeds.Classic;
  const wrist=p.wrists[0],foot=[p.joints?.[27],p.joints?.[28]].find(Boolean);
  if(this.game==="candy"){
   const basket=wrist?{x:wrist.x,y:wrist.y+.08}:null;
   const c=this.targets[0];
   if(c){
    c.y+=dt*.3*speed;
    if(basket && Math.abs(c.x-basket.x)<.095 && Math.abs(c.y-basket.y)<.065){this.hit(c);this.targets[0]=null;}
    else if(c.y>1.04){this.miss(c);this.targets[0]=null;this.misses++;if(this.misses>=10)this.state="done";}
   }
   this.spawn-=dt;if(!this.targets[0]&&this.spawn<=0){this.targets[0]={x:.14+Math.random()*.72,y:-.08,icon:candy[Math.floor(Math.random()*candy.length)]};this.spawn=.5;}
  }
  if(this.game==="ghost"){
   const g=this.targets[0];
   if(g){
    g.y+=dt*.13*speed;g.age+=dt;
    if(wrist && this.previousHand && time>this.previousHand.time && time-this.previousHand.time<.25 &&
       Math.hypot((wrist.x-g.x)*1.6,wrist.y-g.y)<.11 &&
       Math.hypot((wrist.x-this.previousHand.x)*1.6,wrist.y-this.previousHand.y)>.045){this.hit(g);this.targets[0]=null;}
    else if(g.age>4.2/speed){this.miss(g);this.targets[0]=null;}
   }
   this.spawn-=dt;if(!this.targets[0]&&this.spawn<=0){this.targets[0]={x:.18+Math.random()*.64,y:.2,age:0,icon:"👻"};this.spawn=.5;}
   this.previousHand=wrist?{...wrist,time}:null;
  }
  if(this.game==="football"){
   const ball=this.ball;
   if(!ball.active && foot && this.previousFoot && time>this.previousFoot.time && time-this.previousFoot.time<.25){
    const vx=(foot.x-this.previousFoot.x)/(time-this.previousFoot.time);
    const vy=(foot.y-this.previousFoot.y)/(time-this.previousFoot.time);
    if(Math.hypot(vx,vy)>.45 && vy<-.18){ball.x=foot.x;ball.y=foot.y;ball.vx=vx*.18;ball.vy=-.95;ball.active=true;}
   }
   if(ball.active){
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vy+=dt*.6;
    if(ball.vy<0 && ball.y<.31){if(ball.x>.35&&ball.x<.65)this.hit(ball);else this.miss(ball);ball.active=false;}
    else if(ball.y>1 || ball.x<0 || ball.x>1){this.miss(ball);ball.active=false;}
   }else if(foot){ball.x=foot.x;ball.y=foot.y;}
   this.previousFoot=foot?{...foot,time}:null;
  }
 }
  hit(t){this.score++;this.hits++;this.effects.push({kind:"hit",x:t.x,y:t.y,age:0,ghost:this.game==="ghost"});}
 miss(t){this.effects.push({kind:"miss",x:t.x,y:t.y,age:0,ghost:this.game==="ghost"});}
}
