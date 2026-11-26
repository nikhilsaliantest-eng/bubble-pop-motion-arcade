const palettes = [
  ["#f2ad76","#fff0c4","#91c782","#63965c"],["#c7baff","#ffe1bc","#8288bd","#545782"],
  ["#91deeb","#fff1cb","#abc777","#6c9c66"],["#8bd8ff","#ffe4ac","#83c6ac","#508f83"],
  ["#9ddbed","#ffe1a1","#cfb966","#86a258"],["#b1dfef","#ffe3ba","#9ccc83","#659863"],
  ["#f6bd72","#fff0ae","#d3ab5d","#ad884a"],["#83d2bd","#d9edaa","#60a583","#35795e"]
];
function oval(c,x,y,rx,ry,fill,angle=0){
  c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fillStyle=fill;c.fill();
}
function shape(c,fill,...pts){
  c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);
  c.closePath();c.fillStyle=fill;c.fill();
}
function line(c,a,b,w,color){
  c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineWidth=w;c.lineCap="round";c.strokeStyle=color;c.stroke();
}
function tree(c,x,y,s,jungle=false){
  c.save();c.translate(x,y);c.scale(s,s);
  shape(c,"#886d4e",[-10,0],[-4,-110],[8,-110],[6,0]);
  for(const [a,b,r] of [[-30,-103,35],[20,-112,41],[0,-144,31]]){
    oval(c,a,b,r,jungle?45:27,jungle?"#33785b":"#53835a");oval(c,a-5,b-9,r*.79,r*.5,jungle?"#509369":"#77a668");
  }c.restore();
}
export function scenery(id,width,height){
  const sheet=document.createElement("canvas");sheet.width=width;sheet.height=height;
  const c=sheet.getContext("2d");c.scale(width/600,height/500);
  const [sky,haze,far,grass]=palettes[id],g=c.createLinearGradient(0,0,0,500);
  g.addColorStop(0,sky);g.addColorStop(.75,haze);c.fillStyle=g;c.fillRect(0,0,600,500);
  oval(c,451,85,39,39,"#fff2bb");
  for(const [x,y] of [[60,100],[260,54],[535,156]]){oval(c,x,y,49,9,"#ffffff88");oval(c,x-10,y-6,24,12,"#ffffff88");}
  for(const [x,y] of [[-30,390],[280,400],[610,370]])oval(c,x,y,250,135,far);
  oval(c,300,525,610,190,grass);
  if(id===4 || id===2 || id===3){
    const barn=id===4, x=barn?35:380, y=219;
    c.fillStyle=barn?"#ba5948":"#f8d391";c.fillRect(x,y,149,106);
    shape(c,barn?"#704b45":"#ad7561",[x-13,y+5],[x+25,y-42],[x+76,y-62],[x+161,y+5]);
    c.fillStyle=barn?"#813d36":"#6a9a9d";c.fillRect(x+49,y+41,53,65);c.fillStyle="#fff0c5";c.fillRect(x+66,y+4,22,18);
    if(barn){line(c,{x:x+51,y:y+44},{x:x+99,y:y+102},4,haze);line(c,{x:x+99,y:y+44},{x:x+51,y:y+102},4,haze);}
    for(let x=0;x<600;x+=35){c.fillStyle="#d5bc8c";c.fillRect(x,330,5,27);}c.fillRect(0,338,600,4);
  }
  if(id===7){
    for(const x of [30,115,510,595])tree(c,x,355,1.3,true);
    for(const side of [-1,1]){c.save();c.translate(side===1?0:600,0);c.scale(side,1);
      for(let k=0;k<7;k++){oval(c,k*18,12+7*Math.sin(k),19,48,"#235e50",-.7+k*.16);oval(c,8+k*12,490-k*3,13,55,"#2a6951",-.7+k*.16);}
      c.restore();}
  }else if(id===6){tree(c,88,320,.95);tree(c,513,350,1.24);}
  else if(id===1){
    for(const x of [63,113,168]){c.fillStyle="#b4a2be";c.fillRect(x,202,38,118);shape(c,"#835c88",[x-5,204],[x+18,158],[x+43,204]);}
  }else if(id===5){tree(c,70,347,1.1);tree(c,520,342,.8);c.fillStyle="#b48355";c.fillRect(385,341,110,12);c.fillRect(393,352,8,23);c.fillRect(479,352,8,23);}
  if(id===2)oval(c,105,420,65,8,"#ab8764");
  for(let i=0;i<24;i++){const x=(i*113)%600,y=380+(i*29)%120;shape(c,far,[x,y],[x-3,y-8],[x+4,y-2],[x+7,y-10],[x+6,y]);}
  return sheet;
}
const fur=["","#423b49","#ef9da8","#6699c9","#faf0d9","#bc854f","#e7b355","#f29b41"];
const ink="#3f3436",cream="#fff0cb";
function face(c,id){
  const f=fur[id];
  if(id===6){for(const k of [-1,1]){line(c,{x:k*15,y:-19},{x:k*18,y:-38},6,"#b68148");oval(c,k*18,-38,5,5,"#805633");}}
  for(const k of [-1,1]){
    if(id===3){shape(c,f,[k*29,-6],[k*24,-39],[k*6,-18]);shape(c,"#b9cde0",[k*24,-16],[k*23,-31],[k*15,-18]);}
    else if(id===5)oval(c,k*30,2,10,21,"#78543e",k*-.28);
    else{const r=id===1?18:11;oval(c,k*24,-22,r,r,f);oval(c,k*24,-22,r*.58,r*.58,id===7?"#563e34":"#e6b199");}
  }
  oval(c,0,0,32,29,f);
  if(id===7){for(const k of [-1,1]){shape(c,ink,[k*29,-10],[k*18,-6],[k*30,-3]);shape(c,ink,[k*30,0],[k*20,4],[k*29,6]);}shape(c,ink,[-5,-27],[0,-15],[5,-27]);}
  if(id===4 || id===5 || id===3)oval(c,-13,-5,10,13,id===3?"#415f91":"#645046");
  if(id===6)for(const k of [-1,1])oval(c,k*22,0,5,4,"#a97542");
  oval(c,0,12,id===2||id===4?20:17,12,id===2||id===4?"#f0adab":cream);
  for(const k of [-1,1]){oval(c,k*12,-4,3.6,5.2,ink);oval(c,k*12-1,-6,1.2,1.5,"white");}
  if(id===2 || id===4){for(const k of [-1,1])oval(c,k*6,11,2.5,3,"#985e67");}else oval(c,0,7,5,3.5,ink);
  c.beginPath();c.arc(0,13,6,.15,Math.PI-.15);c.strokeStyle=ink;c.lineWidth=1.8;c.stroke();
}
export function puppet(c,id,p,W,H){
  const unit=p.span*W, body=fur[id],j=p.joints;
  const point=(i,dx,dy)=>j?.[i]?{x:j[i].x*W,y:j[i].y*H}:{x:p.x*W+dx*unit,y:p.y*H+dy*unit};
  const hipL=point(23,-.34,1.22),hipR=point(24,.34,1.22),sL=point(11,-.5,0),sR=point(12,.5,0);
  const chain=(a,b,d,w)=>{for(const col of [ink,body]){const size=w+(col===ink?.045:0);line(c,a,b,unit*size,col);line(c,b,d,unit*size,col);}oval(c,d.x,d.y,unit*w*.67,unit*w*.52,body);};
  for(const [k,h] of [[0,hipL],[1,hipR]]){const side=k?1:-1;chain(h,point(25+k,side*.37,1.88),point(27+k,side*.4,2.57),.31);}
  const cx=(sL.x+sR.x+hipL.x+hipR.x)/4,cy=(sL.y+sR.y+hipL.y+hipR.y)/4;
  const ry=Math.max(unit*.53,Math.hypot(sL.x-hipL.x,sL.y-hipL.y)*.69);
  oval(c,cx,cy,unit*.56,ry,ink);oval(c,cx,cy,unit*.535,ry*.97,body);oval(c,cx,cy+ry*.16,unit*.33,ry*.70,cream);
  for(const [k,s] of [[0,sL],[1,sR]]){const side=k?1:-1;chain(s,point(13+k,side*.76,.50),point(15+k,side*.89,.88),.25);}
  const head=point(0,0,-.53);c.save();c.translate(head.x,head.y);c.scale(unit*.019,unit*.019);face(c,id);c.restore();
}
export function thumbnail(c,id){
  if(!id){c.fillStyle="#d2f9e5";oval(c,48,32,13,15,c.fillStyle);oval(c,48,66,23,20,c.fillStyle);return;}
  c.save();c.translate(48,49);c.scale(1.14,1.14);face(c,id);c.restore();
}

