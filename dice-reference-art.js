import * as THREE from 'three';

export const DICE_PALETTES = Object.freeze({
  Movement:{stone:'#392a43',metal:'#af8299',light:'#edc8dc',symbol:'#c58bdd',glow:0xc47aff},
  Treasure:{stone:'#362a20',metal:'#b2874c',light:'#ffe1a3',symbol:'#e5b664',glow:0xffbf5c},
  Action:{stone:'#213c3d',metal:'#6faaaa',light:'#c6f5e9',symbol:'#7cd7c8',glow:0x71ded0},
  Rune:{stone:'#191225',metal:'#9f7bb2',light:'#e7ccff',symbol:'#bb8cde',glow:0xb783ff},
  Offer:{stone:'#3a2545',metal:'#a58866',light:'#f7dfb4',symbol:'#ebd1a0',glow:0xc18aff}
});
export const TREASURE_DICE_ART = Object.freeze({
  RELIC:'assets/treasure-relic-gilded-v1.png',
  ODDITY:'assets/treasure-oddity-gilded-v1.png',
  KEEPSAKE:'assets/treasure-keepsake-gilded-v1.png'
});
const treasureImages=new Map();let preload;
export function preloadTreasureIcons(){
  return preload ||= Promise.all(Object.entries(TREASURE_DICE_ART).map(([label,path])=>new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>{treasureImages.set(label,img);resolve();};img.onerror=()=>reject(new Error(`Unable to load ${path}`));img.src=new URL(path,import.meta.url).href;
  })));
}
function canvas(){const c=document.createElement('canvas');c.width=c.height=512;return c;}
function path(ctx,points,close=false){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(close)ctx.closePath();}
function star(ctx,x,y,r=12){
  ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,s=i%2?r*.18:r;const px=x+Math.sin(a)*s,py=y+Math.cos(a)*s;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();
}
function stone(ctx,p,seed=19){
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const base=ctx.createRadialGradient(90,48,10,280,310,590);base.addColorStop(0,p.stone);base.addColorStop(.7,'#25212c');base.addColorStop(1,'#121019');ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
  for(let i=0;i<11500;i++){const n=random();ctx.fillStyle=n>.52?'rgba(174,162,179,.055)':'rgba(0,0,0,.11)';ctx.fillRect(random()*512,random()*512,random()*2.2+.4,random()*1.4+.4);}
  // Branching hairline fractures catch a faint polished edge.
  for(let i=0;i<15;i++){
    let x=random()*512,y=random()*512;const points=[[x,y]];
    for(let j=0;j<5;j++){x+=(random()-.5)*75;y+=(random()-.35)*52;points.push([x,y]);}
    ctx.lineWidth=2.4;ctx.strokeStyle='#06060b';path(ctx,points);ctx.stroke();
    ctx.save();ctx.translate(.8,-.8);ctx.lineWidth=.7;ctx.strokeStyle='rgba(173,155,186,.43)';path(ctx,points);ctx.stroke();ctx.restore();
    const [bx,by]=points[2];ctx.lineWidth=1;ctx.strokeStyle='rgba(5,4,8,.7)';path(ctx,[[bx,by],[bx+22,by-11],[bx+34,by-34]]);ctx.stroke();
  }
}
function metallic(ctx,p){const g=ctx.createLinearGradient(50,30,430,460);g.addColorStop(0,p.light);g.addColorStop(.2,p.metal);g.addColorStop(.43,p.light);g.addColorStop(.57,p.metal);g.addColorStop(.83,p.light);g.addColorStop(1,p.metal);return g;}
function ornament(ctx,p){
  ctx.lineCap='round';ctx.lineJoin='round';ctx.fillStyle=ctx.strokeStyle=metallic(ctx,p);
  // Thin bevel-following borders leave the central face clear as in the reference.
  const outline=new Path2D('M64 30H448Q482 30 482 64V448Q482 482 448 482H64Q30 482 30 448V64Q30 30 64 30Z');
  ctx.lineWidth=7;ctx.stroke(outline);ctx.lineWidth=1.6;ctx.stroke(new Path2D('M70 47H442Q465 47 465 70V442Q465 465 442 465H70Q47 465 47 442V70Q47 47 70 47Z'));
  // Eight-point compass stars, split filigree and diamond fasteners.
  for(let i=0;i<4;i++){
    ctx.save();ctx.translate(256,256);ctx.rotate(i*Math.PI/2);ctx.translate(-256,-256);
    star(ctx,256,40,17);ctx.lineWidth=1.8;
    path(ctx,[[193,42],[223,43],[240,51],[256,47],[272,51],[289,43],[319,42]]);ctx.stroke();
    for(const sx of [-1,1]){
      path(ctx,[[256+sx*59,38],[256+sx*77,46],[256+sx*88,40]]);ctx.stroke();
      ctx.beginPath();ctx.arc(256+sx*68,39,2.5,0,Math.PI*2);ctx.fill();
    }
    ctx.translate(59,59);ctx.lineWidth=2;
    path(ctx,[[-15,39],[-11,12],[0,0],[12,-11],[39,-15]]);ctx.stroke();
    path(ctx,[[0,30],[4,12],[16,4],[30,0]]);ctx.stroke();
    star(ctx,8,8,10);path(ctx,[[20,33],[25,25],[33,20]]);ctx.stroke();
    ctx.restore();
  }
  // Tiny chisel interruptions keep the inlay from looking like a UI outline.
  ctx.strokeStyle='rgba(20,11,19,.45)';ctx.lineWidth=1.5;
  for(let i=0;i<12;i++){const x=83+i*29;path(ctx,[[x,29],[x+3,35]]);ctx.stroke();}
}
function hand(ctx,p,take){
  ctx.save();ctx.translate(256,267);ctx.fillStyle=metallic(ctx,{light:p.symbol,metal:'#397e78'});ctx.strokeStyle=p.symbol;ctx.lineWidth=2.6;
  if(take){
    const shape=new Path2D('M-58 83L-64 45Q-104 13 -109 -5Q-112 -22 -97 -22L-68 7L-65 -75Q-66 -91 -52 -91Q-41 -90 -42 -73L-39 -31L-32 -107Q-31 -121 -18 -118Q-8 -116 -10 -100L-11 -31L0 -114Q4 -130 16 -122Q23 -119 21 -101L16 -26L33 -87Q38 -102 50 -95Q57 -88 50 -72L36 -11L63 -30Q77 -41 84 -28Q90 -16 78 -3L47 23Q31 50 23 79L-58 83Z');
    ctx.fill(shape);ctx.stroke(shape);
    ctx.strokeStyle=p.metal;ctx.lineWidth=3;path(ctx,[[-50,34],[-29,6],[4,5],[28,22]]);ctx.stroke();path(ctx,[[-47,53],[-17,31],[12,30]]);ctx.stroke();
    ctx.fillStyle=p.symbol;ctx.shadowBlur=7;ctx.shadowColor=p.symbol;ctx.fillRect(-12,-178,15,72);ctx.fillRect(-40,-150,71,15);
  } else {
    const shape=new Path2D('M-110 24L-61 12Q-46 9 -29 17L6 32L38 32Q49 32 49 44Q48 54 35 54L-10 51Q-20 52 -17 60L29 65Q43 66 52 59L91 25Q103 15 114 26Q122 37 110 49L66 94Q47 114 15 108L-54 86L-110 86Z');
    ctx.fill(shape);ctx.stroke(shape);ctx.fillRect(-119,17,15,78);
    ctx.strokeStyle=p.metal;ctx.lineWidth=3;path(ctx,[[-49,61],[-14,69],[29,79],[50,71]]);ctx.stroke();
    ctx.fillStyle=p.symbol;ctx.shadowBlur=7;ctx.shadowColor=p.symbol;ctx.fillRect(-39,-76,81,14);
  }
  ctx.restore();
}
function skull(ctx,p){
  ctx.save();ctx.translate(256,248);ctx.fillStyle=metallic(ctx,p);ctx.strokeStyle=p.light;ctx.lineWidth=2;
  const head=new Path2D('M-68 21Q-83 -30 -55 -72Q-33 -108 8 -105Q70 -99 77 -39L65 27L43 39L36 79L-35 79L-43 37Z');ctx.fill(head);ctx.stroke(head);
  ctx.fillStyle='#112124';ctx.beginPath();ctx.ellipse(-29,-11,23,30,-.2,0,Math.PI*2);ctx.ellipse(31,-11,23,30,.2,0,Math.PI*2);ctx.fill();path(ctx,[[0,13],[-13,36],[12,36]],true);ctx.fill();
  ctx.lineWidth=4;ctx.strokeStyle='#173238';for(let i=0;i<5;i++){path(ctx,[[-29+i*14,51],[-27+i*14,79]]);ctx.stroke();}
  ctx.strokeStyle=p.symbol;ctx.lineWidth=9;for(const side of [-1,1])for(let i=0;i<3;i++){const x=side*(53+i*17);path(ctx,[[x,47+i*3],[x+side*9,79],[x+side*3,104]]);ctx.stroke();}
  ctx.restore();
}
function rune(ctx,label,p){
  ctx.strokeStyle=p.symbol;ctx.fillStyle=p.light;ctx.lineWidth=13;ctx.lineCap='round';ctx.lineJoin='round';
  if(label==='×2'||label==='×3'||label==='DOUBLE'){ctx.font='bold 148px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label==='DOUBLE'?'×2':label,256,265);return;}
  if(label==='WARP'){ctx.beginPath();ctx.arc(256,256,104,0,Math.PI*1.65);ctx.stroke();path(ctx,[[162,214],[151,259],[194,243]]);ctx.stroke();ctx.beginPath();ctx.arc(256,256,48,Math.PI*.2,Math.PI*1.85);ctx.stroke();}
  else if(label==='PHASE'){ctx.globalAlpha=.9;for(const x of[202,256,310]){ctx.beginPath();ctx.ellipse(x,256,25,105,0,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;}
  else if(label==='BALANCE'){path(ctx,[[256,137],[256,349]]);ctx.stroke();path(ctx,[[180,188],[332,188]]);ctx.stroke();for(const x of[184,328]){path(ctx,[[x,188],[x-35,267],[x+35,267]],true);ctx.stroke();}}
  else if(label==='FORTUNE'){star(ctx,256,256,105);ctx.beginPath();ctx.arc(256,256,49,0,Math.PI*2);ctx.stroke();}
  else if(label==='TIME'){ctx.beginPath();ctx.arc(256,256,105,0,Math.PI*2);ctx.stroke();path(ctx,[[256,256],[256,184],[311,230]]);ctx.stroke();}
  else if(label==='RIFT'){ctx.beginPath();ctx.ellipse(256,256,63,119,0,0,Math.PI*2);ctx.stroke();path(ctx,[[260,158],[228,221],[277,254],[235,299],[256,354]]);ctx.stroke();}
  else if(label==='SWAP'){for(const side of [-1,1]){ctx.beginPath();ctx.arc(256,256,100,side<0?.1:Math.PI+.1,side<0?Math.PI-.2:Math.PI*2-.2);ctx.stroke();path(ctx,side<0?[[163,296],[156,256],[196,263]]:[[349,216],[356,256],[316,249]]);ctx.stroke();}}
  else if(label==='PLUNDER'){for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const x=256+Math.sin(a)*108,y=256+Math.cos(a)*108;ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.stroke();path(ctx,[[x,y],[256+(x-256)*.25,256+(y-256)*.25]]);ctx.stroke();}star(ctx,256,256,36);}
  else{path(ctx,[[276,129],[185,270],[247,274],[226,383],[327,232],[267,232]],true);ctx.fill();}
}
function maps(c){
  const coarse=typeof matchMedia==='function'&&matchMedia('(max-width:900px), (pointer:coarse)').matches;
  const upload=source=>{if(!coarse)return source;const scaled=document.createElement('canvas');scaled.width=scaled.height=256;scaled.getContext('2d').drawImage(source,0,0,256,256);return scaled;};
  const mask=canvas(),mc=mask.getContext('2d'),pixels=c.getContext('2d').getImageData(0,0,512,512),em=mc.createImageData(512,512);
  for(let i=0;i<pixels.data.length;i+=4){const light=Math.max(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);const v=Math.max(0,light-87)*1.5;em.data[i]=em.data[i+1]=em.data[i+2]=v;em.data[i+3]=255;}
  mc.putImageData(em,0,0);
  const texture=new THREE.CanvasTexture(upload(c)),emissiveMap=new THREE.CanvasTexture(upload(mask));
  for(const t of [texture,emissiveMap]){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;}
  return {texture,emissiveMap};
}
export function faceTexture(label,kind,faceIndex=0){
  const c=canvas(),ctx=c.getContext('2d'),p=DICE_PALETTES[kind]||DICE_PALETTES.Movement;
  stone(ctx,p,73+faceIndex*19);ornament(ctx,p);
  if(kind==='Movement'){
    ctx.font='252px Georgia, "Times New Roman", serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#08060d';ctx.fillText(String(label),259,280);ctx.fillStyle=metallic(ctx,{...p,metal:p.symbol});ctx.fillText(String(label),256,274);
    ctx.strokeStyle=p.light;ctx.lineWidth=.8;ctx.strokeText(String(label),256,274);
  } else if(kind==='Treasure'){
    // Use the exact inventory icons, including their authored crystal facets,
    // orbiting spheres, and compass pendant. Blank outcomes remain blank.
    const img=treasureImages.get(label);
    if(img){const size=label==='RELIC'?326:312;ctx.drawImage(img,256-size/2,256-size/2,size,size);}
    else if(label==='CHOOSE'){
      ctx.save();ctx.translate(256,256);ctx.strokeStyle=ctx.fillStyle=metallic(ctx,p);ctx.lineWidth=8;
      for(let i=0;i<3;i++){const a=-Math.PI/2+i*Math.PI*2/3,x=Math.cos(a)*92,y=Math.sin(a)*92;ctx.beginPath();ctx.arc(x,y,34,0,Math.PI*2);ctx.stroke();star(ctx,x,y,19);}
      ctx.beginPath();ctx.arc(0,0,43,0,Math.PI*2);ctx.stroke();star(ctx,0,0,24);ctx.restore();
    }
  } else if(kind==='Action'){
    if(label==='TAKE')hand(ctx,p,true);else if(label==='GIVE')hand(ctx,p,false);else skull(ctx,p);
  } else rune(ctx,label,p);
  return maps(c);
}
export function offerFaceTexture(label){
  const c=canvas(),ctx=c.getContext('2d'),p=DICE_PALETTES.Offer;stone(ctx,p,230+Number(label)*11);
  ctx.strokeStyle=ctx.fillStyle=metallic(ctx,p);ctx.lineJoin='round';
  for(const [pts,width] of [[[[256,20],[20,461],[492,461]],6],[[[256,50],[46,446],[466,446]],1.7]]){path(ctx,pts,true);ctx.lineWidth=width;ctx.stroke();}
  // The three corners carry celestial spear points and fine branching inlay.
  const center=[256,314];
  for(const [x,y] of [[256,51],[51,440],[461,440]]){
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(center[1]-y,center[0]-x)-Math.PI/2);star(ctx,0,15,17);ctx.lineWidth=1.8;
    path(ctx,[[0,0],[0,65]]);ctx.stroke();for(const side of [-1,1]){path(ctx,[[side*3,22],[side*16,37],[side*12,53],[side*25,63]]);ctx.stroke();}ctx.restore();
  }
  for(const [x,y] of [[154,266],[358,266],[256,438]]){star(ctx,x,y,8);}
  ctx.font='154px Georgia, "Times New Roman", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#08040d';ctx.fillText(String(label),259,322);ctx.fillStyle=metallic(ctx,p);ctx.fillText(String(label),256,318);
  return maps(c);
}
