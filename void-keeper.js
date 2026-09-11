import * as THREE from 'three';
import {material,mesh,orb,joint,loft,tube,plate,ring,finish} from './cast-forge.js?v=20260906S1';

// Authored, fully volumetric Void Keeper. No image planes or remote assets.
// Static details batch by material; only articulated joints and the halo move.
const TAU=Math.PI*2;
const outline=[[-.44,.15],[-.22,.44],[.05,.56],[.36,.25],[.42,-.08],[.16,-.48],[-.13,-.60],[-.39,-.21]];
const glowOptions={emissive:0xec00ff,emissiveIntensity:2.4,roughness:.35,metalness:.15};
let stoneMaps;
function fracturedSurface(){
  if(stoneMaps)return stoneMaps;
  if(typeof document==='undefined')return {};
  const make=()=>{const c=document.createElement('canvas');c.width=c.height=512;return c;};
  const color=make(),emission=make(),bump=make(),c=color.getContext('2d'),e=emission.getContext('2d'),b=bump.getContext('2d');
  c.fillStyle='#b1a8b7';c.fillRect(0,0,512,512);e.fillStyle='#000';e.fillRect(0,0,512,512);b.fillStyle='#999';b.fillRect(0,0,512,512);
  let seed=2391;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<11000;i++){const v=100+Math.floor(rand()*100);c.fillStyle=`rgba(${v},${v},${v},.25)`;c.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*2);}
  for(let i=0;i<35;i++){
    let x=rand()*512,y=rand()*512;const points=[[x,y]];
    for(let j=0;j<5;j++){x+=(rand()-.5)*62;y+=13+rand()*28;points.push([x,y]);}
    for(const [ctx,width,tint] of [[c,2.8,'#29222f'],[b,3,'#252525'],[e,i%4===0?1.7:.65,i%4===0?'#dd15ee':'#4a134e']]){
      ctx.beginPath();points.forEach(([px,py],j)=>j?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.lineWidth=width;ctx.strokeStyle=tint;ctx.stroke();
    }
    if(i%2===0){const [x,y]=points[2];c.beginPath();c.moveTo(x,y);c.lineTo(x+24,y-14);c.lineTo(x+32,y-29);c.lineWidth=1;c.strokeStyle='#544452';c.stroke();}
  }
  const tex=(canvas,srgb=false)=>{const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;};
  stoneMaps={map:tex(color,true),emissiveMap:tex(emission,true),bumpMap:tex(bump),bumpScale:.028,emissive:0xed19ff,emissiveIntensity:1.3};return stoneMaps;
}
function line(p,m,points,r=.012){return tube(p,m,points,[r,r*.85,r*.75,.002],5);}
function spike(p,m,points,r=.06){return tube(p,m,points,[r,r*.72,r*.34,.001],7);}
function border(p,m,shape,z,r=.012){return line(p,m,[...shape,shape[0]].map(([x,y])=>[x,y,z]),r);}
function inlay(p,m,outline,pos){const s=new THREE.Shape();outline.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(p,new THREE.ExtrudeGeometry(s,{depth:.006,bevelEnabled:false}),m,pos);}
function sigil(p,m,r,z=0){
  ring(p,m,r,.009,[0,0,z],[0,0,0],24);
  line(p,m,[[0,-r*1.6,z],[0,0,z],[0,r*1.65,z]],.008);
  line(p,m,[[-r*1.6,0,z],[0,0,z],[r*1.6,0,z]],.008);
  ring(p,m,r*.37,.006,[0,0,z],[0,0,0],12);
}

// Uneven woven strips, missing faces, frayed hems and sculpted folds give the
// robe actual depth from the side and back, including at board camera angles.
function rag(p,m,{x=0,y=0,z=0,width=.32,length=2.6,flare=0,back=.3,seed=1}={}){
  const cols=18,rows=28,pos=[],uv=[],indices=[],colors=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const u=i/cols,v=j/rows;
    const hem=.13*Math.sin(i*2.7+seed)+.08*Math.cos(i*4.1+seed);
    const edge=1+.13*Math.sin(v*26+seed)+.07*Math.sin(v*57);
    pos.push(x+(u-.5)*width*(1+v*.65)*edge+flare*v*v,
      y-v*length+Math.pow(v,8)*hem,
      z-back*v*v+Math.sin(u*TAU*2.3+seed*.7)*(.018+v*.055)+Math.sin(v*8+seed)*.04);
    uv.push(u*2,v*7);
    const shade=.66+.29*Math.pow(Math.sin(u*Math.PI),.6)-.15*v*v;
    colors.push(shade,shade*.96,shade*.88);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const tornEdge=j>rows*.48&&(i===0||i===cols-1)&&Math.sin(j*2+seed)>.05;
    const hole=j>7&&Math.sin(i*13.7+j*9.1+seed*5)>.984;
    const split=j>rows-5&&((i+seed*3)%7===0);
    if(tornEdge||hole||split)continue;
    const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(indices);g.computeVertexNormals();return mesh(p,g,m);
}

function claw(parent,m,side){
  loft(parent,m.stone,[[-.23,.12,.085],[-.12,.18,.10],[.08,.105,.085]],[],10);
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.095,l=.45-Math.abs(i-1.5)*.055;
    const points=[[x,-.16,.03],[x*1.7,-.31,.08],[x*1.9,-.31-l*.48,.16],[x*1.6,-.31-l,.29]];
    spike(parent,m.stone,points,.047);
    spike(parent,m.black,[[x*1.9,-.31-l*.48,.16],[x*1.6,-.31-l,.29],[x*1.05,-.36-l,.40],[x*.65,-.32-l,.44]],.025);
    orb(parent,m.gold,[x*1.65,-.31,.09],[.047,.035,.037],8);
    line(parent,m.void,[[x,-.13,.11],[x*1.4,-.26,.12],[x*1.8,-.39,.18]],.009);
  }
  spike(parent,m.stone,[[side*.12,0,.02],[side*.30,-.13,.03],[side*.34,-.31,.16],[side*.23,-.43,.30]],.07);
  line(parent,m.void,[[0,.04,.09],[-side*.06,-.07,.116],[side*.04,-.18,.11]],.015);
  // Narrow luminous arcs surround the fingers without concealing the hand.
  const energy=joint(parent,'Hand lightning',[0,-.15,.04]);
  for(let i=0;i<3;i++){
    const a=i*2.2;
    line(energy,m.void,[[Math.cos(a)*.25,.05,0],[Math.cos(a+.4)*.34,-.07,.12],
      [Math.cos(a+.1)*.29,-.19,.17],[Math.cos(a+.6)*.35,-.32,.20]],.007);
  }
  return energy;
}

export function createVoidKeeper(){
  const root=new THREE.Group();root.name='The Void Keeper';
  const m={stone:material(0x45404d,'stone',{roughness:.78,metalness:.28,...fracturedSurface()}),
    black:material(0x100f19,'metal',{roughness:.43,metalness:.55}),
    facet:material(0x5b515f,'stone',{roughness:.7,metalness:.3,...fracturedSurface()}),
    gold:material(0xb88a49,'metal',{roughness:.36,metalness:.72}),
    goldDark:material(0x65441f,'metal'),
    ivory:material(0xd2c6ae,'cloth',{side:THREE.DoubleSide}),
    cloth:material(0x29212c,'cloth',{side:THREE.DoubleSide}),
    void:material(0xf03dff,'metal',glowOptions),
    hot:material(0xffd3ff,'skin',{emissive:0xff36f7,emissiveIntensity:3})};
  const body=joint(root,'Levitation',[0,0,0]);
  const hips=joint(body,'Pelvis',[0,2.12,0]),torso=joint(hips,'Armored torso',[0,.25,0]);
  loft(hips,m.black,[[-.23,.30,.20],[0,.38,.25],[.24,.28,.22]],[],14);
  loft(torso,m.stone,[[-.05,.28,.21],[.27,.33,.24],[.64,.47,.29],[.91,.54,.27],[1.14,.32,.20]],[],18);
  // Interleaved chevron armor follows the chest instead of exposed bone ribs.
  for(const s of [-1,1])for(let i=0;i<5;i++){
    const y=.06+i*.16,w=.25+i*.045;
    const shape=[[s*.025,y-.08],[s*w,y+.05],[s*(w+.055),y+.25],[s*.055,y+.11]];
    plate(torso,i%2?m.stone:m.black,shape,.05,[0,0,.24]);
    line(torso,m.void,[[s*.035,y-.045,.309],[s*w*.64,y+.043,.31],[s*w,y+.13,.285]],.008);
  }
  for(const s of [-1,1]){
    line(torso,m.gold,[[s*.05,.81,.315],[s*.3,1.04,.29],[s*.49,.87,.16]],.023);
    line(torso,m.goldDark,[[s*.10,.09,.25],[s*.27,.3,.26],[s*.40,.62,.23]],.015);
  }
  const neck=joint(torso,'Neck',[0,1.05,0]);
  loft(neck,m.black,[[0,.14,.14],[.43,.16,.14]],[],12);
  const head=joint(neck,'Crowned obsidian mask',[0,.59,.035]);
  loft(head,m.stone,[[-.44,.015,.025,0,.16],[-.27,.16,.15,0,.05],[-.08,.235,.205],
    [.15,.26,.22],[.32,.19,.17],[.39,.05,.08]],[],16);
  // A closed, long pointed mask with slanted eyes; no mouth or exposed skull.
  for(const s of [-1,1]){
    const cheek=[[s*.025,.02],[s*.23,.11],[s*.22,-.16],[s*.065,-.38]];
    plate(head,m.black,cheek,.025,[0,0,.176]);
    inlay(head,m.void,[[s*.07,-.035],[s*.178,.010],[s*.15,-.039],[s*.09,-.062]],[0,0,.215]);
    line(head,m.hot,[[s*.072,-.043,.237],[s*.13,-.033,.24],[s*.169,.005,.235]],.009);
    line(head,m.void,[[s*.158,-.075,.218],[s*.115,-.19,.229],[s*.061,-.29,.213],[s*.027,-.40,.203]],.007);
    line(head,m.gold,[[s*.225,.20,.143],[s*.25,.06,.151],[s*.19,-.19,.168],[s*.03,-.43,.18]],.01);
    // Three rising, swept crown tines on either side.
    for(let i=0;i<3;i++){
      const x=.21+i*.06;
      spike(head,m.gold,[[s*x,.16,-.045-i*.02],[s*(.36+i*.075),.40,-.07],
        [s*(.36+i*.105),.57+i*.06,-.045],[s*(.32+i*.11),.72+i*.065,.01]],.029+i*.005);
    }
  }
  line(head,m.gold,[[0,.3,.18],[.05,.16,.22],[0,.03,.237],[-.05,.16,.22],[0,.3,.18]],.012);
  line(head,m.goldDark,[[0,.31,.17],[-.085,.22,.20],[-.03,.13,.22],[0,.07,.228]],.007);
  // Bronze circlet and its seven small pointed leaves.
  ring(head,m.gold,.247,.023,[0,.27,0],[Math.PI/2,0,0],28);
  for(let i=0;i<7;i++){
    const a=(i-3)*.36;
    spike(head,m.gold,[[Math.sin(a)*.24,.28,Math.cos(a)*.19],[Math.sin(a)*.26,.36,Math.cos(a)*.2],
      [Math.sin(a)*.27,.45+(i===3?.10:0),Math.cos(a)*.21],[Math.sin(a)*.27,.49+(i===3?.10:0),Math.cos(a)*.21]],.025);
  }

  const cape=joint(torso,'Tattered funeral mantle',[0,1.06,-.19]);
  for(let i=0;i<7;i++)rag(cape,i%3===0?m.cloth:m.ivory,{x:(i-3)*.15,z:-.10-Math.abs(i-3)*.022,
    width:.25,length:3.35-Math.abs(i-3)*.13,flare:(i-3)*.22,back:.48+Math.abs(i-3)*.1,seed:i+1});
  for(const s of [-1,1]){
    rag(cape,m.ivory,{x:s*.47,z:.58,width:.34,length:3.17,flare:s*.54,back:.11,seed:s+31});
    rag(cape,m.ivory,{x:s*.50,z:.35,width:.23,length:2.89,flare:s*.78,back:.21,seed:s+35});
    for(let i=0;i<4;i++)tube(torso,i===0?m.ivory:m.cloth,
      [[s*.24,1.39-i*.07,-.09],[s*.32,1.23-i*.06,.15],[s*.18,1.04-i*.055,.33],[0,1.02-i*.057,.365]],
      [.042,.051,.046,.039],8);
    // Broad folded shawl crossing the throat, then two long pale lapels.
    for(let i=0;i<5;i++)tube(torso,i<2?m.ivory:m.cloth,
      [[s*.47,1.05-i*.035,-.10],[s*.42,.92-i*.045,.24],[s*.20,.71-i*.04,.41],[0,.76-i*.043,.425]],
      [.063,.075,.045,.022],7);
    rag(cape,m.ivory,{x:s*.43,z:.43,width:.23,length:1.43,flare:s*.14,back:-.02,seed:s+5});
    const brooch=joint(torso,'Mantle clasp '+s,[s*.49,.91,.44]);
    orb(brooch,m.black,[0,0,0],[.126,.126,.055],12);
    ring(brooch,m.gold,.13,.022,[0,0,.04],[0,0,0],24);
    ring(brooch,m.goldDark,.092,.009,[0,0,.055]);
    for(let i=0;i<3;i++){
      line(brooch,m.gold,[[s*(i-1)*.052,-.105,.045],[s*(i-1)*.055,-.22-i*.036,.05]],.008);
      plate(brooch,m.gold,[[-.014,0],[.014,0],[.014,-.1],[-.014,-.085]],.015,[s*(i-1)*.055,-.22-i*.036,.045]);
    }
  }
  for(let i=0;i<3;i++){
    const x=(i-1)*.10;
    line(torso,m.gold,[[x*1.8,.63,.40],[x,.46-i*.035,.345]],.007);
    plate(torso,m.gold,[[-.022,0],[.022,0],[.022,-.17],[-.022,-.16]],.018,[x,.46-i*.035,.33]);
  }
  // Central embroidered tabard and split shredded overskirt.
  const skirt=joint(hips,'Split ceremonial robes',[0,.04,.19]);
  rag(skirt,m.cloth,{width:.44,length:1.82,back:-.14,seed:21});
  for(const s of [-1,1]){
    rag(skirt,m.ivory,{x:s*.28,width:.21,length:1.95,flare:s*.28,back:.045,seed:s+11});
    rag(skirt,m.cloth,{x:s*.41,z:-.19,width:.44,length:1.66,flare:s*.45,back:.23,seed:s+17});
    line(skirt,m.gold,[[s*.20,0,.08],[s*.20,-.64,.10],[s*.22,-1.4,.18],[0,-1.69,.18]],.012);
    line(hips,m.gold,[[0,.11,.35],[s*.31,.25,.28],[s*.48,.05,.10],[s*.38,-.23,.20]],.035);
    for(let i=0;i<3;i++){
      const shape=[[s*.16,-i*.2],[s*.39,.07-i*.19],[s*.53,-.10-i*.2],[s*.33,-.27-i*.20]];
      plate(hips,m.black,shape,.05,[0,0,.19]);border(hips,m.goldDark,shape,.25,.012);
    }
  }
  ring(hips,m.gold,.205,.033,[0,.01,.375]);ring(hips,m.goldDark,.145,.014,[0,.01,.393]);
  plate(hips,m.gold,[[-.022,0],[.022,0],[.022,-.44],[.08,-.44],[.08,-.49],[-.045,-.49]],.025,[0,-.01,.411]);
  for(const y of [-.92,-1.32]){ring(skirt,m.gold,.071,.010,[0,y,.12]);}
  line(skirt,m.gold,[[0,-.56,.13],[.13,-.82,.13],[0,-1.04,.13],[-.13,-.82,.13],[0,-.56,.13]],.01);

  const arms=[],legs=[],energies=[];
  for(const s of [-1,1]){
    const arm=joint(torso,'Shoulder '+s,[s*.55,.92,0]),elbow=joint(arm,'Elbow '+s,[s*.19,-.66,.015]),hand=joint(elbow,'Void claw '+s,[s*.15,-.60,.035]);
    arms.push({arm,elbow,hand});
    tube(arm,m.stone,[[0,0,0],[s*.13,-.30,0],[s*.19,-.66,.015]],[.18,.145,.105],10);
    tube(elbow,m.stone,[[0,.03,0],[s*.06,-.28,.015],[s*.15,-.60,.035]],[.12,.145,.085],10);
    for(let i=0;i<3;i++){
      const shape=[[-.20,.12],[-.1,.29],[.13,.33],[.36,.1],[.28,-.13],[0,-.18]];
      const shoulder=joint(arm,'Obsidian pauldron '+i,[s*i*.075,-i*.115,.01]);shoulder.scale.x=s;
      plate(shoulder,i===1?m.facet:m.stone,shape,.19,[0,0,-.08]);
      border(shoulder,m.goldDark,shape,.125,.014);
      line(shoulder,m.void,[[-.10,.20,.14],[.015,.14,.145],[-.025,.02,.14],[.17,-.085,.14]],.01);
      mesh(shoulder,new THREE.DodecahedronGeometry(.12,0),m.stone,[.12,.18,.06],[1.7,.9,.75],[.2,.1,.8]);
    }
    for(const [parent,y,rad] of [[arm,-.31,.162],[elbow,-.12,.143],[elbow,-.49,.10]]){
      ring(parent,m.gold,rad,.027,[parent===arm?s*.11:s*(-y)*.24,y,.018],[Math.PI/2,0,-s*.19],18);
      ring(parent,m.goldDark,rad,.013,[parent===arm?s*.11:s*(-y)*.24,y-.066,.018],[Math.PI/2,0,-s*.19],18);
    }
    for(const [parent,y,z] of [[arm,-.36,.15],[elbow,-.17,.14]]){
      line(parent,m.void,[[s*.04,y+.10,z],[s*.13,y-.02,z+.007],[s*.07,y-.12,z],[s*.18,y-.25,z-.02]],.012);
    }
    energies.push(claw(hand,m,s));
    const leg=joint(hips,'Hip '+s,[s*.205,-.18,0]),knee=joint(leg,'Knee '+s,[s*.015,-.77,.015]);legs.push({leg,knee});
    loft(leg,m.stone,[[-.8,.12,.13],[-.4,.16,.17],[.02,.20,.20]],[],12);
    loft(knee,m.stone,[[-.80,.085,.11],[-.6,.115,.15],[-.23,.14,.16],[.08,.12,.13]],[],12);
    const kneeShape=[[-.13,.08],[0,.26],[.13,.08],[.11,-.17],[0,-.3],[-.11,-.17]];
    plate(knee,m.black,kneeShape,.045,[0,0,.125]);border(knee,m.gold,kneeShape,.188,.012);
    line(knee,m.void,[[0,.19,.19],[.06,.04,.19],[0,-.15,.19]],.01);
    for(let i=0;i<3;i++){
      const y=-.34-i*.18;line(knee,m.gold,[[-.11,y-.05,.05],[0,y+.065,.19],[.11,y-.05,.05]],.026);
      line(knee,m.void,[[-.09,y-.08,.11],[-.025,y-.11,.15],[.07,y-.18,.12]],.009);
    }
    const foot=joint(knee,'Pointed armored foot '+s,[0,-.83,.04]);
    orb(foot,m.black,[0,-.02,.07],[.13,.105,.21],12);
    for(let i=0;i<3;i++){
      const x=(i-1)*.088;
      spike(foot,m.stone,[[x,.025,.14],[x,-.07,.25],[x*.9,-.21,.34],[x*.7,-.29,.32]],.053);
      line(foot,m.goldDark,[[x,.005,.16],[x,-.08,.25],[x*.9,-.17,.31]],.008);
    }
  }

  // Seven rune monoliths form a tall open halo behind the head and shoulders.
  const halo=joint(body,'Seven shattered seals',[0,3.94,-.50]),shards=[];
  // Arc uses explicit lower-to-upper-to-lower positions for a readable silhouette.
  const stations=[[-1.03,-.25],[-1.22,.43],[-.91,1.17],[0,1.63],[.91,1.17],[1.22,.43],[1.03,-.25]];
  stations.forEach(([x,y],i)=>{
    const shard=joint(halo,'Rune monolith '+(i+1),[x,y,0]);
    const size=i===3?.66:.53;shard.scale.set(size,size,i===3?.65:.55);
    shard.rotation.z=(i-3)*-.23;
    plate(shard,m.stone,outline,.23,[0,0,-.10]);border(shard,m.goldDark,outline,.146,.016);
    for(const shape of [[[-.4,.13],[-.08,.28],[.04,-.02],[-.13,-.55]],[[-.18,.43],[.05,.54],[.33,.23],[.05,.1]],[[.1,-.08],[.4,-.08],[.15,-.46],[-.03,-.3]]])
      plate(shard,m.black,shape,.022,[0,0,.14]);
    line(shard,m.void,[[0,.53,.19],[-.05,.30,.192],[.08,.16,.194],[0,0,.195],[.04,-.29,.192],[-.10,-.57,.19]],.017);
    line(shard,m.void,[[-.41,.1,.19],[-.16,.03,.194],[0,0,.195],[.22,.13,.194],[.35,.22,.19]],.011);
    sigil(shard,m.void,.17,.203);
    // Reverse face has its own seal so orbiting the board never reveals a blank.
    const reverse=joint(shard,'Reverse seal',[0,0,-.115]);reverse.rotation.y=Math.PI;sigil(reverse,m.void,.17,.012);
    shards.push({node:shard,x,y,angle:shard.rotation.z});
  });
  // Discontinuous arcs and orbiting debris use a single dynamic group each.
  const arc=joint(halo,'Rift arc',[0,0,.04]);
  for(let i=0;i<stations.length-1;i++){
    const a=stations[i],b=stations[i+1];
    line(arc,m.void,[[a[0],a[1],0],[(a[0]*.55+b[0]*.45)+.06,(a[1]*.55+b[1]*.45)-.035,.07],
      [(a[0]*.45+b[0]*.55)-.04,(a[1]*.45+b[1]*.55)+.07,.03],[b[0],b[1],0]],.009);
  }
  const debris=joint(body,'Suspended obsidian splinters',[0,0,0]);
  for(let i=0;i<22;i++){
    const a=i*2.39996,y=.36+(i%11)*.46,r=.94+.36*Math.sin(i*3.7)**2;
    mesh(debris,new THREE.OctahedronGeometry(.045+(i%3)*.022,0),i%4===0?m.goldDark:m.stone,
      [Math.cos(a)*r,y,Math.sin(a)*.40-.25],[.7,1.8,.65],[i*.32,i*.41,i*.21]);
  }
  let mode='idle';
  root.userData.setMode=value=>{mode=value;};
  root.userData.rig={body,hips,torso,head,arms,legs,cape,halo,shards};
  root.userData.idleBehaviorCount=24;
  root.userData.update=t=>{
    if(!Number.isFinite(t))return;
    const summon=mode==='summon',attack=mode==='kill'||mode==='attack'||mode==='blast',moving=['move','walk','levitate'].includes(mode);
    const pulse=Math.sin(t*1.65),gesture=Math.sin(t*.38);
    body.position.y=.065+pulse*.052+(summon?.10:0);body.rotation.z=Math.sin(t*.49)*.009;
    hips.rotation.y=Math.sin(t*.38)*.025;torso.rotation.set(attack?-.10:0,gesture*.025,0);
    head.rotation.set(Math.sin(t*.71)*.022+(attack?.08:0),Math.sin(t*.31)*.14,Math.sin(t*.43)*.016);
    cape.rotation.set((moving?.13:0)+Math.sin(t*.8)*.035,Math.sin(t*.46)*.035,Math.sin(t*.57)*.025);
    skirt.rotation.x=Math.sin(t*.9+.7)*.022+(moving?.10:0);
    arms.forEach(({arm,elbow,hand},i)=>{
      const s=i===0?-1:1;
      arm.rotation.set(attack?-1.15:Math.sin(t*.6+i)*.035,0,s*(summon?.53:.13)+s*Math.sin(t*.73)*.028);
      elbow.rotation.set(attack?-.64:summon?-.33:-.075,Math.sin(t*.4+i)*.025,0);
      hand.rotation.set(Math.sin(t*1.1+i)*.045,0,s*Math.sin(t*.83)*.06);
    });
    legs.forEach(({leg,knee},i)=>{leg.rotation.x=(moving?-.15:0)+Math.sin(t*.8+i)*.025;knee.rotation.x=moving?.21:.045;});
    if(!summon&&!attack&&!moving){
      const span=7.2,index=Math.floor(t/span)*7%24,phase=t%span/span;
      const g=phase>.16&&phase<.88?Math.sin((phase-.16)/.72*Math.PI)**2:0,s=index<12?-1:1,kind=index%12;
      const near=arms[s<0?0:1],far=arms[s<0?1:0];
      if(kind===0)head.rotation.y+=s*.32*g;
      else if(kind===1){torso.rotation.x-=.045*g;arms.forEach(({arm},i)=>arm.rotation.z+=(i?1:-1)*.10*g);}
      else if(kind===2){near.arm.rotation.x-=.35*g;near.elbow.rotation.x-=.28*g;}
      else if(kind===3){head.rotation.x-=.10*g;hips.rotation.y+=s*.07*g;}
      else if(kind===4)arms.forEach(({arm,elbow})=>{arm.rotation.x-=.22*g;elbow.rotation.x-=.18*g;});
      else if(kind===5){cape.rotation.z+=s*.035*g;torso.rotation.y+=s*.08*g;}
      else if(kind===6){body.position.y+=.06*g;arms.forEach(({arm},i)=>arm.rotation.z+=(i?1:-1)*.14*g);}
      else if(kind===7)legs.forEach(({leg,knee},i)=>{leg.rotation.x+=(i?1:-1)*.055*g;knee.rotation.x+=.05*g;});
      else if(kind===8){head.rotation.z+=s*.055*g;torso.rotation.x+=.04*g;}
      else if(kind===9){far.elbow.rotation.x-=.22*g;head.rotation.y-=s*.16*g;}
      else if(kind===10){torso.rotation.y+=Math.sin(phase*Math.PI*4)*.045*g;head.rotation.y-=Math.sin(phase*Math.PI*4)*.06*g;}
      else{hips.rotation.y+=s*.05*g;cape.rotation.x+=.06*g;}
    }
    shards.forEach(({node,x,y,angle},i)=>{
      const spread=summon?1.10:1;node.position.set(x*spread,y*spread+Math.sin(t*1.05+i*.6)*.035,Math.sin(t*.63+i)*.035);
      node.rotation.set(0,Math.sin(t*.52+i)*.085,angle+Math.sin(t*.7+i)*.028);
    });
    arc.scale.setScalar(summon?1.10:1);arc.rotation.z=Math.sin(t*.7)*.005;
    debris.rotation.y=Math.sin(t*.16)*.13;debris.position.y=Math.sin(t*.87)*.065;
    energies.forEach((e,i)=>{e.rotation.y=Math.sin(t*1.7+i)*.25;e.scale.setScalar((attack||summon?1.25:1)+Math.sin(t*4+i)*.08);});
    m.void.emissiveIntensity=(attack?3.2:summon?2.9:2.1)+Math.sin(t*2.2)*.3;
    m.hot.emissiveIntensity=2.7+Math.sin(t*2.2)*.35;
  };
  root.userData.update(0);
  // Bake nonanimated grouping transforms before batching. Brooches, shoulder
  // layers and reverse seals share their parent joint's draw calls.
  const animated=new Set([root,body,hips,torso,head,cape,skirt,halo,arc,debris,...energies,
    ...arms.flatMap(a=>[a.arm,a.elbow,a.hand]),...legs.flatMap(l=>[l.leg,l.knee]),...shards.map(s=>s.node)]);
  root.updateMatrixWorld(true);
  const meshes=[];root.traverse(n=>{if(n.isMesh)meshes.push(n);});
  for(const node of meshes){let target=node.parent;while(!animated.has(target))target=target.parent;if(target!==node.parent)target.attach(node);}
  finish(root);
  // The seven identical seals share four instanced draws, while their bones
  // retain individual bob, tilt and summon poses. Geometry stays in seal space.
  const seals=[];
  for(const template of shards[0].node.children.filter(n=>n.isMesh)){
    template.updateMatrix();
    const geometry=template.geometry.clone().applyMatrix4(template.matrix);
    const instances=new THREE.InstancedMesh(geometry,template.material,shards.length);
    instances.name='Instanced rune seals';instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instances.frustumCulled=false;instances.castShadow=instances.receiveShadow=true;
    instances.userData.ownedActorMaterial=true;
    halo.add(instances);seals.push(instances);
    for(const {node} of shards){
      const part=node.children.find(n=>n.isMesh&&n.material===template.material);
      if(part){node.remove(part);part.geometry.dispose();}
    }
  }
  const animate=root.userData.update;
  root.userData.update=t=>{animate(t);shards.forEach(({node},i)=>{node.updateMatrix();for(const seal of seals)seal.setMatrixAt(i,node.matrix);});for(const seal of seals){seal.instanceMatrix.needsUpdate=true;seal.boundingBox=null;seal.boundingSphere=null;}};
  root.userData.update(0);
  let draws=0;root.traverse(n=>{if(n.isMesh)draws++;});root.userData.design.draws=draws;
  root.userData.design.edition='Void Keeper · reference sculpture';
  return root;
}
