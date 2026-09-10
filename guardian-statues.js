import * as THREE from 'three';
import { material, mesh, orb, tube, plate, ring, finish } from './cast-forge.js?v=20260906S1';

export const GUARDIANS = Object.freeze([
  { name: 'The Oracle', aspect: 'Sight', relic: 'orb' },
  { name: 'The Warden', aspect: 'Judgment', relic: 'sword' },
  { name: 'The Chronicler', aspect: 'Memory', relic: 'book' },
  { name: 'The Hollow', aspect: 'Absence', relic: 'eclipse' },
  { name: 'The Keeper', aspect: 'Time', relic: 'hourglass' },
  { name: 'The Mourner', aspect: 'Death', relic: 'skull' }
]);

// All figures face local +Z. Silhouettes, recesses, folds, and ornaments are
// geometry, including the backs: no camera-facing planes or image cutouts.
function surface(parent, mat, rows, cols, point) {
  const p=[], uv=[], indices=[];
  for(let i=0;i<=rows;i++) for(let j=0;j<=cols;j++) {
    p.push(...point(i/rows,j/cols)); uv.push(j/cols,i/rows);
  }
  for(let i=0;i<rows;i++) for(let j=0;j<cols;j++) {
    const a=i*(cols+1)+j,b=a+cols+1;
    indices.push(a,b,a+1,a+1,b,b+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  return mesh(parent,g,mat);
}
function line(parent,mat,points,r=.009) { return tube(parent,mat,points,[r,r],5); }
function cylinder(parent,mat,r1,r2,height,pos,segments=12) {
  return mesh(parent,new THREE.CylinderGeometry(r1,r2,height,segments),mat,pos);
}
function spike(parent,mat,start,end,r=.023) {
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),d=b.clone().sub(a);
  const m=mesh(parent,new THREE.ConeGeometry(r,d.length(),6),mat,a.add(b).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;
}
function sigil(parent,mat,x,y,z,scale=1) {
  line(parent,mat,[[x,y+.1*scale,z],[x+.046*scale,y,z+.006],[x,y-.1*scale,z],[x-.046*scale,y,z+.006],[x,y+.1*scale,z]],.006);
  line(parent,mat,[[x,y+.15*scale,z],[x,y-.16*scale,z]],.005);
}
function crescent(parent,mat,r,pos,rotation=0) {
  const s=new THREE.Shape();s.absarc(0,0,r,Math.PI*.15,Math.PI*1.85,false);
  s.quadraticCurveTo(-r*.33,0,Math.cos(Math.PI*.15)*r,Math.sin(Math.PI*.15)*r);
  const m=mesh(parent,new THREE.ExtrudeGeometry(s,{depth:.018,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:1,curveSegments:16}),mat,pos);
  m.rotation.z=rotation;return m;
}
function pedestal(root,m) {
  // Three stepped octagonal courses, individually jointed, with a carved cap.
  const tiers=[[.055,.68,.11],[.15,.615,.08],[.25,.55,.12]];
  for(const [y,r,h] of tiers) {
    cylinder(root,m.shadow,r,r,h,[0,y,0],8);
    for(let i=0;i<8;i++) {
      const a=(i+.5)*Math.PI/4;
      const block=mesh(root,new THREE.BoxGeometry(2*r*Math.sin(Math.PI/8)-.012,h-.009,.105),m.base,[Math.sin(a)*(r*Math.cos(Math.PI/8)-.048),y,Math.cos(a)*(r*Math.cos(Math.PI/8)-.048)]);
      block.rotation.y=a;
    }
  }
  cylinder(root,m.edge,.552,.568,.042,[0,.326,0],8);
  cylinder(root,m.base,.528,.551,.035,[0,.36,0],8);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    const arch=ring(root,m.edge,.071,.008,[Math.sin(a)*.563,.238,Math.cos(a)*.563],[0,a,0],12);
    arch.scale.y=.66;
  }
}
function robes(root,m) {
  // Full circumferential stone drapery: fluted hem narrows at the waist,
  // then broadens into the shoulders. Deep folds carry the distant silhouette.
  const profile=[[.38,.39,.28],[.57,.37,.27],[1.0,.32,.23],[1.5,.265,.205],[1.92,.28,.215],[2.18,.37,.23],[2.36,.26,.18],[2.43,.15,.13]];
  surface(root,m.stone,45,88,(v,u)=>{
    const k=v*(profile.length-1),n=Math.min(profile.length-2,Math.floor(k)),f=k-n;
    const row=profile[n].map((x,j)=>THREE.MathUtils.lerp(x,profile[n+1][j],f));
    const a=u*Math.PI*2,fold=(Math.cos(a*17+v*.6)*.029+Math.cos(a*29-v)*.009)*(1-v*.55);
    return [Math.sin(a)*(row[1]+fold),row[0]+Math.pow(1-v,9)*.025*Math.cos(a*11),Math.cos(a)*(row[2]+fold)];
  });
  // Long open mantle panels curve from shoulder around the back. The frontal
  // opening reveals a narrow embroidered stole and layered inner robe.
  for(const side of [-1,1]) {
    surface(root,m.mantle,34,30,(v,u)=>{
      const a=side*(.39+u*(Math.PI-.39)),r=.27+.145*v+.047*Math.sin(v*Math.PI);
      const folds=(Math.cos(u*8*Math.PI+v*.8)*.03+Math.cos(u*17*Math.PI)*.011)*(.4+v);
      return [Math.sin(a)*(r+folds),2.32-v*1.93-.105*Math.sin(u*Math.PI)+.025*Math.cos(u*9*Math.PI)*Math.pow(v,8),Math.cos(a)*(r*.7+folds)];
    });
    line(root,m.edge,[[side*.11,2.33,.185],[side*.16,2.15,.237],[side*.14,1.78,.247],[side*.175,1.15,.266],[side*.195,.43,.302]],.012);
    // Layered shoulder cowl, with three concentric draped seams.
    for(let i=0;i<3;i++) {
      line(root,i===0?m.edge:m.fold,[[side*.11,2.45-i*.04,.08],[side*.30,2.31-i*.05,.17],[side*.415,2.19-i*.055,.12],[side*.35,2.12-i*.065,-.19],[side*.10,2.24-i*.06,-.23]],.014-i*.003);
    }
  }
  // Central hanging stole, tapered and wavy at the hem.
  surface(root,m.mantle,26,12,(v,u)=>[(u-.5)*(.15+v*.055),1.92-v*1.47,.23+v*.063+Math.cos(u*Math.PI*4)*.007]);
  for(const side of [-1,1]) line(root,m.edge,[[side*.07,1.91,.245],[side*.085,1.22,.264],[side*.1,.46,.306]],.006);
  for(let i=0;i<6;i++) sigil(root,m.bronze,0,.57+i*.205,.312-i*.010,.62);
  // Neck chains lie over the mantle rather than floating above it.
  for(let i=0;i<3;i++) line(root,m.bronze,[[-.18,2.38-i*.02,.19],[-.12,2.23-i*.07,.25],[0,2.18-i*.08,.269],[.12,2.23-i*.07,.25],[.18,2.38-i*.02,.19]],.006);
  sigil(root,m.bronze,0,2.05,.278,.5);
}
function hood(root,m) {
  // Pointed, open hood built as a shell running from the front aperture to
  // a rounded closed back. The void is deeply recessed, with no visible face.
  const outline=t=>{
    const a=t*Math.PI*2;
    return [Math.sin(a)*(.166-.018*Math.cos(a)),2.59+Math.cos(a)*.262,.205+Math.cos(a)*.043];
  };
  // A thick draped rim surrounds the smaller aperture; its outer edge
  // broadens into the shoulders instead of reading as a hollow metal ring.
  surface(root,m.mantle,12,64,(v,u)=>{
    const [x,y,z]=outline(u),a=u*Math.PI*2;
    return [x*(1+v*.70),y+v*(.11*Math.cos(a)-.045),z-v*.088+Math.sin(v*Math.PI)*.018+Math.cos(a*12)*.003*v];
  });
  surface(root,m.mantle,22,64,(v,u)=>{
    const [x,y,z]=outline(u),a=u*Math.PI*2,shrink=Math.cos(v*Math.PI/2);
    return [x*1.70*shrink,2.545+(y-2.59+.11*Math.cos(a))*shrink,(z-.088)*(1-v)-.24*Math.sin(v*Math.PI/2)];
  });
  const edgePoints=Array.from({length:41},(_,i)=>outline(i/40));
  tube(root,m.fold,edgePoints,[.023,.023],6);
  const inner=edgePoints.map(([x,y,z])=>[x*.91,2.59+(y-2.59)*.94,z-.028]);
  tube(root,m.edge,inner,[.007,.007],5);
  // Inset black concavity, not a head or flat face pasted on the opening.
  surface(root,m.void,12,48,(v,u)=>{
    const [x,y,z]=outline(u),s=1-v;
    return [x*s*.95,2.59+(y-2.59)*s*.95,z-.045-.155*Math.sin(v*Math.PI/2)];
  });
  for(const side of [-1,1]) {
    line(root,m.fold,[[0,2.90,.245],[side*.13,2.76,.19],[side*.20,2.48,.15],[side*.16,2.28,.16],[side*.28,2.18,.20]],.012);
    line(root,m.fold,[[side*.04,2.88,.10],[side*.20,2.66,-.055],[side*.23,2.45,-.08],[side*.20,2.35,-.16]],.009);
  }
}
function handsAndSleeves(root,m,index) {
  for(const side of [-1,1]) {
    // Bent forearms disappear into voluminous suspended sleeves.
    tube(root,m.stone,[[side*.32,2.22,.02],[side*.405,2.02,.12],[side*.29,1.87,.34],[side*.18,1.92,.40]],[.115,.137,.109,.066],10);
    surface(root,m.mantle,28,24,(v,u)=>{
      const a=u*Math.PI*2,w=.092+(1-v)*.03;
      return [side*(.32+v*.012)+Math.sin(a)*w*(1-v*.28),1.97-v*1.28+.04*Math.cos(a),.18+Math.cos(a)*(.15-v*.095)+Math.cos(a*7)*.009];
    });
    for(let j=0;j<4;j++) {
      const x=side*(.26+j*.035);
      line(root,j===0?m.edge:m.fold,[[x,1.92,.329],[x+side*.014,1.45,.278],[x+side*.012,.72+j*.016,.226]],j===0?.009:.007);
    }
    // Creased cloth follows the bend of each forearm and fans into the cuff.
    for(let j=0;j<5;j++) {
      const offset=j*.023;
      line(root,m.fold,[[side*(.32+offset*.4),2.21-offset,.125],[side*(.43+offset*.18),2.02-offset*.35,.21],[side*(.32-offset*.3),1.905-offset*.2,.405]],.006);
    }
    const sword=index===1,px=side*(sword?.065:.155),py=sword?1.97+(side<0?.075:0):1.91,pz=.419;
    orb(root,m.stone,[px,py,pz],[.087,.041,.065],12);
    for(let f=0;f<4;f++) {
      const fx=px+side*(f-1.5)*.025;
      tube(root,m.edge,[[fx,py,pz+.035],[fx-side*.018,py+.026,pz+.082],[fx-side*.035,py+.067,pz+.084]],[.013,.010,.008],5);
    }
    tube(root,m.stone,[[px+side*.057,py+.01,pz],[px+side*.03,py+.06,pz+.015],[px,py+.079,pz+.02]],[.021,.018,.012],6);
  }
}
function halo(root,m,index) {
  const g=new THREE.Group();g.name='Bronze halo';g.position.set(0,2.71,-.13);root.add(g);
  const r=.43;
  mesh(g,new THREE.TorusGeometry(r,.018,7,72,index===5?Math.PI*1.79:Math.PI*2),m.bronze);
  if(index===5) g.children[0].rotation.z=.48;
  if(index===2||index===4) ring(g,m.bronze,r-.062,.007,[0,0,.002],[0,0,0],60);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;if(index===5&&i===1)continue;
    const x=Math.sin(a),y=Math.cos(a);
    line(g,m.edge,[[x*(r-.018),y*(r-.018),.004],[x*(r+.016),y*(r+.016),.004]],.011);
    if(i%3===0) spike(g,m.bronze,[x*(r+.015),y*(r+.015),0],[x*(r+.135),y*(r+.135),0],.022);
    if(index===2) sigil(g,m.edge,x*(r-.03),y*(r-.03),.026,.20);
    if(index===4&&i%2===0)line(g,m.bronze,[[x*.27,y*.27,0],[x*r,y*r,0]],.008);
  }
  if(index===0) {
    const eye=ring(g,m.bronze,.062,.009,[0,.423,.025],[0,0,0],24);eye.scale.y=.55;
    orb(g,m.bronze,[0,.423,.026],[.015,.024,.011],10);
  }
  if(index===1) spike(g,m.bronze,[0,.38,.02],[0,.62,.02],.024);
  if(index===3) for(const a of [0,Math.PI/2,-Math.PI/2])crescent(g,m.bronze,.067,[Math.sin(a)*r,Math.cos(a)*r,.023],a+Math.PI/2);
  if(index===5) {
    line(g,m.edge,[[.18,.39,0],[.175,.34,.018],[.207,.318,.02]],.009);
    spike(g,m.bronze,[.325,.28,0],[.302,.336,.01],.016);
  }
  return g;
}
function relic(root,m,index) {
  const g=new THREE.Group();g.name=GUARDIANS[index].relic;g.position.set(0,2.06,.435);root.add(g);
  if(index===0) {
    orb(g,m.obsidian,[0,0,0],[.145,.145,.145],28);
    ring(g,m.bronze,.133,.009,[0,0,0],[Math.PI/2,0,0],32);
    orb(g,m.rune,[-.034,.028,.135],[.024,.024,.010],12);
    for(let i=0;i<5;i++)orb(g,m.rune,[(i-2)*.028,Math.sin(i*3)*.036,.133],[.005,.005,.004],6);
  } else if(index===1) {
    plate(g,m.edge,[[-.041,-.12],[.041,-.12],[.035,-1.22],[0,-1.37],[-.035,-1.22]],.026,[0,0,0]);
    line(g,m.bronze,[[0,-.17,.03],[0,-1.2,.03]],.006);
    tube(g,m.bronze,[[-.19,-.10,.024],[-.13,-.04,.024],[0,-.075,.024],[.13,-.04,.024],[.19,-.10,.024]],[.022,.022],6);
    cylinder(g,m.bronze,.022,.023,.31,[0,.1,.022]);
    for(let i=0;i<6;i++)ring(g,m.shadow,.024,.005,[0,.005+i*.039,.022],[Math.PI/2,0,0],12);
    orb(g,m.bronze,[0,.285,.022],[.038,.052,.028],12);
  } else if(index===2) {
    // Both covers, the layered page block, and raised page edges are solid.
    for(const side of [-1,1]) {
      const half=new THREE.Group();half.rotation.z=side*.22;g.add(half);
      mesh(half,new THREE.BoxGeometry(.195,.035,.23),m.bronze,[side*.10,-.057,.01]);
      mesh(half,new THREE.BoxGeometry(.18,.038,.21),m.pages,[side*.097,-.022,.01]);
      for(let j=0;j<4;j++)line(half,m.edge,[[side*.012,-.024+j*.009,.119],[side*.18,-.017+j*.009,.119]],.0025);
      for(let j=0;j<5;j++)line(half,m.ink,[[side*.025,.001,-.06+j*.03],[side*.075,.005,-.06+j*.03],[side*.155,.004,-.055+j*.03]],.002);
    }
    line(g,m.bronze,[[0,-.058,-.11],[0,-.068,.13],[.012,-.17,.15]],.008);
  } else if(index===3) {
    orb(g,m.void,[0,-.01,0],[.13,.15,.11],24);
    crescent(g,m.bronze,.167,[0,0,.006],.45);
    orb(g,m.rune,[.012,.123,.04],[.009,.009,.009],8);
  } else if(index===4) {
    for(const y of [-.165,.165])cylinder(g,m.bronze,.119,.119,.026,[0,y,0],16);
    for(let i=0;i<4;i++) {
      const a=Math.PI/4+i*Math.PI/2;cylinder(g,m.bronze,.009,.009,.32,[Math.sin(a)*.099,0,Math.cos(a)*.099],8);
    }
    for(const side of [-1,1]) {
      const glass=mesh(g,new THREE.LatheGeometry([new THREE.Vector2(.008,0),new THREE.Vector2(.016,.035),new THREE.Vector2(.067,.104),new THREE.Vector2(.078,.135)],24),m.glass);
      glass.rotation.z=side<0?Math.PI:0;
      const sand=mesh(g,new THREE.ConeGeometry(.063,.065,16),m.sand,[0,side*.10,0]);sand.rotation.z=side>0?Math.PI:0;
    }
    cylinder(g,m.sand,.003,.003,.17,[0,0,0],6);
  } else {
    orb(g,m.bone,[0,.036,0],[.111,.123,.085],24);
    orb(g,m.bone,[0,-.061,.028],[.079,.046,.061],16);
    for(const side of [-1,1]) {
      orb(g,m.void,[side*.045,.038,.073],[.033,.033,.019],14);
      line(g,m.edge,[[side*.012,.067,.082],[side*.045,.081,.077],[side*.078,.066,.06]],.008);
      orb(g,m.bone,[side*.072,-.012,.063],[.034,.023,.022],12);
    }
    plate(g,m.void,[[0,.008],[-.017,-.023],[.017,-.023]],.006,[0,0,.085]);
    for(let i=0;i<6;i++) mesh(g,new THREE.BoxGeometry(.012,.022,.012),m.bone,[(i-2.5)*.019,-.04,.081]);
    line(g,m.shadow,[[-.045,-.054,.088],[0,-.058,.091],[.045,-.054,.088]],.004);
  }
  return g;
}
function candles(root,m,index) {
  const flames=new THREE.Group();flames.name='Candle flames';root.add(flames);
  for(const side of [-1,1])for(let i=0;i<4;i++) {
    const x=side*(.35+(i%2)*.092),z=.20-Math.floor(i/2)*.23,h=.095+(i%3)*.047;
    cylinder(root,m.bronze,.049,.052,.025,[x,.385,z],10);
    cylinder(root,m.wax,.026,.031,h,[x,.393+h/2,z],10);
    for(let d=0;d<2;d++)line(root,m.wax,[[x+(d?-.016:.018),.39+h,z+.017],[x+(d?-.016:.018),.39+h*.45,z+.022]],.005);
    cylinder(root,m.shadow,.004,.004,.022,[x,.40+h,z],6);
    const flame=orb(flames,m.fire,[x,.438+h,z],[.019,.051,.019],10);flame.rotation.z=side*.1;
    orb(flames,m.hot,[x,.422+h,z+.001],[.009,.026,.01],8);
  }
  // Warm emissive inlays imply candle bounce without six extra point lights.
  for(const side of [-1,1])line(root,m.ember,[[side*.39,.40,.23],[side*.372,.57,.235],[side*.36,.72,.215]],.008);
  return flames;
}

export function createGuardianStatue(index=0,active=false) {
  index=((Math.trunc(Number(index)||0)%6)+6)%6;
  const root=new THREE.Group(),definition=GUARDIANS[index];
  root.name=`${active?'Awakened':'Dormant'} ${definition.name}`;
  const m={
    stone:material(0x5d5350,'stone',{side:THREE.DoubleSide,bumpScale:.012}),
    mantle:material(0x4b4140,'stone',{side:THREE.DoubleSide,bumpScale:.009}),
    fold:material(0x71605a,'stone',{bumpScale:.007}),
    edge:material(0x9b7d65,'metal',{metalness:.48,roughness:.67}),
    bronze:material(0x9c7047,'metal',{metalness:.68,roughness:.48}),
    base:material(0x49414a,'stone'),shadow:material(0x201b22,'stone'),
    void:new THREE.MeshBasicMaterial({color:0x07050c,side:THREE.DoubleSide}),
    obsidian:material(0x160e25,'metal',{roughness:.16,metalness:.58}),
    rune:new THREE.MeshStandardMaterial({color:0xdca4ff,emissive:0xb643ff,emissiveIntensity:2}),
    pages:material(0xae9e82,'stone',{bumpScale:.005}),ink:material(0x584636,'stone'),
    bone:material(0xb5a28b,'bone'),wax:material(0xc7a374,'bone'),
    glass:new THREE.MeshStandardMaterial({color:0xb5a5be,transparent:true,opacity:.21,roughness:.16,metalness:.3,side:THREE.DoubleSide,depthWrite:false}),
    sand:new THREE.MeshStandardMaterial({color:0xffc27a,emissive:0xd17017,emissiveIntensity:.5}),
    fire:new THREE.MeshBasicMaterial({color:0xff8e27}),hot:new THREE.MeshBasicMaterial({color:0xffe9b0}),
    ember:new THREE.MeshStandardMaterial({color:0x8e552a,emissive:0xf57921,emissiveIntensity:.65})
  };
  pedestal(root,m);robes(root,m);hood(root,m);handsAndSleeves(root,m,index);
  const crown=halo(root,m,index);relic(root,m,index);candles(root,m,index);
  finish(root);
  root.traverse(node=>{if(node.isMesh){node.castShadow=false;node.receiveShadow=false;node.userData.preserveMaterial=true;node.userData.actorModelMesh=true;}});
  let mode='idle';
  root.userData.guardian={...definition,index,active};
  root.userData.setMode=value=>{mode=value;};
  root.userData.update=time=>{
    const flicker=.90+Math.sin(time*9.1+index)*.06+Math.sin(time*14.3+index*2)*.04;
    m.fire.color.setRGB(1,.29*flicker,.025);m.ember.emissiveIntensity=.58*flicker;
    if(active) {
      const awakening=(root.userData.activationUntil||0)>performance.now();
      const pulse=awakening?1:.18+.08*Math.sin(time*1.5+index);
      crown.rotation.z=Math.sin(time*.24+index)*.045+(mode==='move'?.025:0);
      m.bronze.emissive.setHex(0xa34be1);m.bronze.emissiveIntensity=pulse*.48;
      m.rune.emissiveIntensity=1.6+pulse*1.5;
    }
  };
  root.userData.design.edition='The Six · Reference guardians';
  return root;
}
