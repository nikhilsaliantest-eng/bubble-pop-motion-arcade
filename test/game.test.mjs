import test from "node:test";
import assert from "node:assert/strict";
import {Round, lanes, avatars} from "../docs/game.mjs";
const person=x=>({x,y:.55,span:.12,wrists:[{x,y:.3}]});
const tick=(r,p,n)=>{for(let i=0;i<n;i++)r.update(p,.05);};
for(const n of [1,2])test(n+" players calibrate, play, pause and finish",()=>{
  const p=Array.from({length:n},(_,i)=>person((i+.5)/n));
  const r=new Round(n,()=>.5);
  tick(r,p.map((v,i)=>i===n-1?null:v),90);assert.equal(r.state,"calibrate");
  tick(r,p,75);assert.equal(r.state,"play");
  p.forEach((v,i)=>{r.targets[i].y=.5;v.wrists=[{id:15,x:r.targets[i].x-.08,y:.5}];});
  r.update(p,.05);p.forEach(v=>{v.wrists=[{...v.wrists[0],x:v.wrists[0].x+.16}];});
  r.update(p,.05);assert.equal(r.score,n);
  const time=r.remaining;tick(r,p.map(()=>null),100);assert.equal(r.remaining,time);
  tick(r,p,15);assert.equal(r.state,"play");tick(r,p,2450);assert.equal(r.state,"done");
});
function points(x){
  const a=[];for(const [i,dx] of [[11,-.05],[12,.05],[15,-.1],[16,.1]])a[i]={x:1-x+dx,y:.5,visibility:.9};return a;
}
test("mirrored lanes recover the same slots regardless of detection order",()=>{
  const left=points(.25),right=points(.75);
  for(const input of [[left,right],[right,left]])assert.deepEqual(lanes(input,2).map(p=>p.x),[.25,.75]);
  assert.deepEqual(lanes([right],2).map(p=>p?.x),[undefined,.75]);
  assert.deepEqual(lanes([left,left],2),[null,null]);
  assert.deepEqual(lanes([points(.5)],2),[null,null]);
});
test("a fruit passing a stationary wrist misses; switching visible hands cannot slice",()=>{
  const r=new Round(1,()=>.5),p=[person(.5)];tick(r,p,75);
  const b=r.targets[0];assert.ok(b.y<0);b.y=.29;
  p[0].wrists=[{id:15,x:.42,y:.3}];r.update(p,.05);
  p[0].wrists=[{id:16,x:.58,y:.3}];r.update(p,.05);assert.equal(r.score,0);
  p[0].wrists=[{id:16,x:.5,y:.6}];r.update(p,.05);tick(r,p,50);
  assert.equal(r.score,0);assert.equal(r.misses,1);
});
test("winning stages last two minutes, carry points and widen both lanes",()=>{
  const r=new Round(2,()=>.5),p=[person(.25),person(.75)];tick(r,p,75);
  assert.ok(r.remaining>119);const firstSpeed=r.fallSpeed;
  r.score=3;r.hits=3;r.misses=3;r.remaining=.05;r.update(p,.05);
  assert.equal(r.level,2);assert.equal(r.remaining,120);assert.equal(r.score,3);
  assert.ok(r.fallSpeed>firstSpeed);assert.equal(r.hits,0);assert.equal(r.misses,0);
  for(let lane=0;lane<2;lane++){
    const xs=[r.targets[lane],r.target(lane),r.target(lane)].map(t=>Math.floor((t.x*2-lane)*3));
    assert.deepEqual(xs.sort(),[0,1,2]);
  }
  const medium=r.fallSpeed;r.speed="Fast";assert.ok(r.fallSpeed>medium);
  r.speed="Gentle";assert.ok(r.fallSpeed<medium);
  r.hits=1;r.misses=2;r.remaining=.05;r.update(p,.05);assert.equal(r.state,"done");
});
test("a mixed camera lane retains its source mask index when detections reorder",()=>{
  const p=lanes([points(.75),points(.25)],2);
  assert.deepEqual(p.map(v=>v.index),[1,0]);assert.equal(avatars.length,8);
});
test("brief occlusion clears swipe history; sustained loss pauses until steady tracking returns",()=>{
  const r=new Round(1),p=[person(.5)];
  tick(r,p,76);r.update([null],.05);assert.equal(r.state,"play");assert.equal(r.previous[0],null);
  tick(r,p,1);tick(r,[null],14);assert.equal(r.state,"paused");
  tick(r,p,10);assert.equal(r.state,"paused");tick(r,p,4);assert.equal(r.state,"play");
});
