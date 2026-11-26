import test from "node:test";
import assert from "node:assert/strict";
import {Round, lanes, avatars, sprite} from "../docs/game.mjs";
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
test("all eight sprites render, No avatar draws nothing in play",()=>{
  let draws=0;const ctx=new Proxy({},{get:(_,k)=>()=>{if(k==="fill" || k==="fillText")draws++;},set:()=>true});
  assert.equal(avatars.length,8);sprite(ctx,0,0,0,64,"red");assert.equal(draws,0);
  sprite(ctx,0,0,0,64,"red",true);assert.equal(draws,2);
  for(let i=1;i<8;i++){const prev=draws;sprite(ctx,i,0,0,64,"red");assert.ok(draws>prev);}
});
