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
  p.forEach((v,i)=>v.wrists=[r.targets[i],r.targets[i]]);
  r.update(p,.05);assert.equal(r.score,n);
  const time=r.remaining;tick(r,p.map(()=>null),100);assert.equal(r.remaining,time);
  tick(r,p,15);assert.equal(r.state,"play");tick(r,p,1250);assert.equal(r.state,"done");
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
test("balloons enter from above, fall, give one point or one miss, then reset",()=>{
  const r=new Round(1,()=>.5),p=[person(.5)];
  tick(r,p,75);const b=r.targets[0];assert.ok(b.y<0);
  r.update(p,.1);assert.equal(r.targets[0],b);assert.ok(b.y>-.06);
  b.y=.65;p[0].wrists=[{x:b.x,y:.65},{x:b.x,y:.65}];
  r.update(p,.03);assert.equal(r.score,1);assert.equal(r.effects[0].kind,"hit");assert.ok(r.targets[0].y<0);
  r.targets[0].y=1.059;r.update(p,.03);
  assert.equal(r.score,1);assert.equal(r.effects[1].kind,"miss");assert.ok(r.targets[0].y<0);
  tick(r,p,20);assert.equal(r.effects.length,0);
});
test("a mixed camera lane retains its source mask index when detections reorder",()=>{
  const p=lanes([points(.75),points(.25)],2);
  assert.deepEqual(p.map(v=>v.index),[1,0]);assert.equal(avatars.length,8);
});
