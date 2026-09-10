import * as THREE from 'three';
import {material,mesh,orb,joint,loft,tube,plate,ring,rivet,clothPanel,finish} from './cast-forge.js?v=20260906S1';

function palette(){return{hide:material(0x38302d,'leather'),skin:material(0x585347,'stone'),shell:material(0x393447,'stone'),edge:material(0x716771,'metal'),bone:material(0xb3a18a,'bone'),horn:material(0x6d5746,'bone'),gold:material(0x927246,'metal'),black:material(0x14121d,'metal'),cloth:material(0x25202c,'cloth',{side:THREE.DoubleSide}),rune:material(0xb759d0,'metal',{emissive:0x9912d0,emissiveIntensity:1.25}),hot:material(0xffb2dd,'skin',{emissive:0xf151cf,emissiveIntensity:1.6})};}
function horn(parent,m,points,r=.15){return tube(parent,m,points,[r,r*.78,r*.4,.002],8);}
function scar(parent,m,points){return tube(parent,m,points,[.009,.015,.01,.001],5);}

export function sculptMinor(){
  const root=new THREE.Group(),m=palette();root.name='Riftback — Sculpted Ruins';
  const body=joint(root,'carapaceRoot',[0,0,0]),chest=joint(body,'chest',[0,.88,0]);
  orb(chest,m.hide,[0,.06,-.13],[.80,.60,1.04],20);
  // Broad overlapping chitin plates form a continuous shell over the body.
  for(let row=0;row<6;row++){
    const z=-.92+row*.32,width=.48+Math.sin((row+.5)/6*Math.PI)*.34,y=.36+Math.sin((row+.5)/6*Math.PI)*.28;
    for(const side of [-1,1]){
      const tile=plate(chest,row%2?m.shell:m.edge,[[0,.18],[width*.7,.20],[width,.03],[width*.96,-.19],[width*.32,-.30],[0,-.22]],.08,[0,y,z],[-Math.PI/2,0,side<0?Math.PI:0]);
      tile.scale.x=side;
      const verts=tile.geometry.attributes.position;for(let v=0;v<verts.count;v++){const x=verts.getX(v);verts.setZ(v,verts.getZ(v)-Math.pow(x/width,2)*.31);}verts.needsUpdate=true;tile.geometry.computeVertexNormals();
      tube(chest,m.horn,[[0,y+.07,z-.08],[side*width*.6,y+.025,z-.11],[side*width,y-.13,z-.13]],[.024,.029,.016],6);
    }
    horn(chest,m.horn,[[0,y+.055,z],[0,y+.26,z-.10],[0,y+.36,z-.30],[0,y+.38,z-.39]],row===3?.12:.085);
    if(row%2===0)scar(chest,m.rune,[[-width*.56,y+.04,z+.02],[-width*.3,y+.12,z-.02],[0,y+.13,z+.045],[width*.42,y+.07,z-.04]]);
  }
  const neck=joint(chest,'neck',[0,-.05,.78]),head=joint(neck,'head',[0,0,.27]);
  orb(head,m.hide,[0,0,.11],[.48,.34,.47],18);
  plate(head,m.shell,[[-.42,.15],[-.24,.36],[0,.40],[.24,.36],[.42,.15],[.27,-.15],[0,-.23],[-.27,-.15]],.12,[0,.025,.23],[-.32,0,0]);
  for(const side of [-1,1]){
    orb(head,m.black,[side*.27,.06,.36],[.14,.088,.06]);orb(head,m.hot,[side*.28,.075,.411],[.079,.033,.023]);
    horn(head,m.bone,[[side*.34,.14,.14],[side*.48,.40,.15],[side*.50,.66,.32],[side*.39,.73,.46]],.125);
    horn(head,m.horn,[[side*.38,-.10,.26],[side*.51,-.25,.49],[side*.46,-.24,.69],[side*.32,-.17,.76]],.095);
    tube(head,m.edge,[[side*.12,.25,.36],[side*.26,.205,.40],[side*.39,.13,.33]],[.035,.053,.017],7);
  }
  orb(head,m.black,[0,-.15,.4],[.31,.1,.10]);
  const jaw=joint(head,'jaw',[0,-.19,.25]);orb(jaw,m.horn,[0,-.09,.19],[.31,.115,.28]);
  for(let i=0;i<7;i++){
    const x=(i-3)*.075;
    horn(jaw,m.bone,[[x,-.06,.35],[x,.01,.38],[x,.055,.365],[x,.09,.35]],.023);
  }
  const legs=[];
  for(const side of [-1,1])for(const z of [-.58,.57]){
    const leg=joint(chest,'hip'+side+z,[side*.62,-.16,z]),knee=joint(leg,'knee',[side*.36,-.25,0]),foot=joint(knee,'paw',[side*.05,-.31,.09]);legs.push({leg,knee,foot});
    tube(leg,m.hide,[[0,0,0],[side*.23,-.09,.06],[side*.36,-.25,0]],[.25,.22,.155],10);
    orb(leg,m.shell,[side*.20,-.005,0],[.25,.22,.29]);
    tube(knee,m.hide,[[0,0,0],[0,-.16,.055],[side*.05,-.32,.08]],[.145,.16,.11],9);
    orb(foot,m.skin,[0,-.065,.11],[.23,.13,.26]);
    for(const x of [-.14,0,.14])horn(foot,m.bone,[[x,-.06,.26],[x,-.04,.38],[x,-.07,.45],[x,-.095,.47]],.049);
    horn(leg,m.horn,[[side*.2,.09,-.1],[side*.28,.26,-.15],[side*.36,.32,-.2],[side*.44,.32,-.26]],.075);
  }
  const tail=joint(chest,'tail',[0,-.16,-.96]);
  tube(tail,m.hide,[[0,0,0],[.17,-.06,-.35],[.37,.03,-.66],[.42,.12,-.92]],[.20,.16,.085,.009],10);
  for(let i=0;i<3;i++)horn(tail,m.horn,[[i*.11,-.025,-i*.23],[i*.11,.18,-i*.23-.05],[i*.11,.23,-i*.23-.12],[i*.11,.25,-i*.23-.19]],.069);
  let mode='idle';root.userData.setMode=v=>mode=v;root.userData.rig={body,chest,head,jaw,legs,tail};root.userData.idleBehaviorCount=18;
  root.userData.update=t=>{
    const moving=mode==='move'||mode==='walk',summon=mode==='summon';body.position.y=0;body.rotation.set(0,0,0);chest.rotation.set(0,0,0);chest.position.y=.88+Math.sin(t*1.8)*.015;head.rotation.set((summon?-.15:0)+Math.sin(t*.83)*.035,0,0);jaw.rotation.x=summon?.27:.03;tail.rotation.y=Math.sin(t*.95)*.15;
    legs.forEach(({leg,knee},i)=>{const step=Math.sin(t*8+i*Math.PI*.85);leg.rotation.x=moving?step*.24:Math.sin(t+i)*.012;leg.rotation.z=0;knee.rotation.x=moving?Math.max(0,step)*.25:0;});
    if(!moving&&!summon){const span=5.8,index=Math.floor(t/span)*5%18,phase=t%span/span,g=phase>.2&&phase<.86?Math.sin((phase-.2)/.66*Math.PI)**2:0,side=index<9?-1:1,kind=index%9;if(kind===0){head.rotation.y=side*.48*g;head.rotation.x-=.09*g;}else if(kind===1){jaw.rotation.x+=.38*g;head.rotation.x-=.15*g;}else if(kind===2){chest.rotation.z=side*.07*g;tail.rotation.y+=side*.42*g;}else if(kind===3){chest.position.y-=.11*g;legs.forEach(({leg},i)=>leg.rotation.z=(i%2?1:-1)*.08*g);}else if(kind===4){head.rotation.z=side*.1*g;jaw.rotation.x+=.14*g;}else if(kind===5){tail.rotation.y+=Math.sin(phase*Math.PI*7)*.32*g;}else if(kind===6){chest.rotation.x=-.09*g;head.rotation.x+=.16*g;}else if(kind===7){legs.forEach(({leg},i)=>leg.rotation.x+=Math.sin(i+phase*Math.PI*4)*.12*g);}else{body.position.y=Math.sin(phase*Math.PI*5)*.045*g;head.rotation.y=side*.25*g;}}
    m.rune.emissiveIntensity=.95+(Math.sin(t*2)+1)*.18;m.hot.emissiveIntensity=summon?2:1.3;
  };
  return finish(root);
}

function sovereignHand(parent,m,side){
  orb(parent,m.black,[0,-.08,0],[.16,.20,.10]);
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.078;
    tube(parent,m.bone,[[x,-.1,.04],[x*1.35,-.27,.10],[x*1.45,-.38,.17]],[.038,.031,.024],7);
    horn(parent,m.black,[[x*1.45,-.36,.16],[x*1.5,-.45,.20],[x*1.3,-.50,.25],[x*1.1,-.51,.27]],.031);
  }
  horn(parent,m.bone,[[side*.13,.02,.03],[side*.23,-.09,.10],[side*.25,-.18,.16],[side*.18,-.25,.2]],.058);
}

export function sculptMajor(){
  const root=new THREE.Group(),m=palette();root.name='Ruin Sovereign — Sculpted Ruins';
  const body=joint(root,'root',[0,0,0]),hips=joint(body,'pelvis',[0,2.02,0]),torso=joint(hips,'spine',[0,.28,0]);
  loft(hips,m.black,[[-.22,.33,.24],[.05,.48,.29],[.27,.30,.23]],[],16).position.set(0,0,0);
  loft(torso,m.hide,[[-.15,.27,.21],[.20,.33,.24],[.62,.53,.32],[1,.60,.3],[1.18,.32,.23]]);
  const core=joint(torso,'riftHeart',[0,.54,.31]);
  orb(core,m.black,[0,0,0],[.27,.40,.11]);mesh(core,new THREE.OctahedronGeometry(.21),m.rune,[0,0,.12],[.7,1.6,.6]);
  // Sculpted bone ribs wrap around an open, emissive sternum.
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const y=.13+i*.18,w=.27+i*.04;
    tube(torso,i%2?m.bone:m.horn,[[side*.06,y,.37],[side*w,y+.06,.41],[side*(w+.14),y+.19,.23],[side*(w+.05),y+.21,-.15]],[.028,.055,.048,.026],8);
  }
  for(const side of [-1,1]){
    plate(torso,m.black,[[side*.06,1.08],[side*.3,1.3],[side*.52,1.08],[side*.38,.68],[side*.22,.56]],.08,[0,0,.26]);
    tube(torso,m.gold,[[side*.1,1.09,.39],[side*.29,1.20,.37],[side*.47,1.04,.31]],[.026,.026,.013],6);
  }
  const neck=joint(torso,'neck',[0,1.16,0]);loft(neck,m.bone,[[0,.13,.14],[.37,.13,.14]],[],12).position.set(0,0,0);
  for(let i=0;i<3;i++)ring(neck,m.gold,.147,.019,[0,.04+i*.09,0],[Math.PI/2,0,0],16);
  const head=joint(neck,'skull',[0,.66,.035]);
  loft(head,m.bone,[[-.38,.15,.17,0,.04],[-.23,.235,.20],[0,.30,.25],[.22,.32,.23],[.37,.24,.20],[.43,.08,.08]],[],20).position.set(0,0,0);
  for(const side of [-1,1]){
    orb(head,m.black,[side*.13,.015,.218],[.112,.068,.046]);orb(head,m.hot,[side*.13,.01,.260],[.04,.017,.015]);
    tube(head,m.bone,[[side*.025,.083,.25],[side*.12,.13,.268],[side*.26,.09,.206]],[.025,.035,.016],7);
    plate(head,m.black,[[side*.05,.24],[side*.18,.43],[side*.35,.30],[side*.30,-.08],[side*.18,-.18]],.055,[0,0,.15]);
    horn(head,m.gold,[[side*.26,.31,0],[side*.52,.68,-.06],[side*.42,.97,-.03],[side*.27,1.08,.04]],.13);
    horn(head,m.black,[[side*.24,.22,-.12],[side*.62,.38,-.27],[side*.82,.38,-.42],[side*.91,.28,-.48]],.12);
  }
  plate(head,m.black,[[-.038,-.01],[.038,-.01],[.05,-.135],[-.05,-.135]],.04,[0,0,.24]);
  plate(head,m.black,[[-.17,-.22],[.17,-.22],[.13,-.29],[-.13,-.29]],.023,[0,0,.188]);
  for(let i=0;i<7;i++)loft(head,m.bone,[[-.27,.013,.016],[-.215,.019,.021]],[(i-3)*.035,0,.228],6);
  plate(head,m.gold,[[0,.76],[.09,.39],[0,.17],[-.09,.39]],.04,[0,0,.237]);rivet(head,m.rune,[0,.4,.29],.043);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=joint(torso,'shoulder'+side,[side*.62,1,0]),elbow=joint(arm,'elbow',[side*.11,-.78,0]),hand=joint(elbow,'claw',[side*.045,-.64,0]);arms.push({arm,elbow});
    tube(arm,m.hide,[[0,.03,0],[side*.06,-.39,0],[side*.11,-.8,0]],[.17,.15,.10],10);
    tube(elbow,m.bone,[[0,.02,.03],[0,-.32,.01],[side*.045,-.65,.02]],[.11,.08,.07],8);
    for(let i=0;i<3;i++)plate(elbow,m.black,[[-.13,.1],[0,.24],[.13,.1],[.11,-.11],[0,-.23],[-.11,-.11]],.05,[side*.012,-i*.16,.06]);
    sovereignHand(hand,m,side);
    for(let i=0;i<3;i++){
      const shoulder=plate(arm,i===0?m.edge:m.black,[[-.21,.09],[0,.29],[.28,.19],[.4,-.04],[.22,-.16],[-.21,-.13]],.075,[side*.10,-i*.14,.12]);shoulder.scale.x=side;
      horn(arm,m.black,[[side*(.13+i*.1),.14-i*.05,0],[side*(.27+i*.14),.47-i*.04,-.04],[side*(.34+i*.17),.66-i*.02,-.12],[side*(.38+i*.19),.74,-.2]],.10);
    }
    const leg=joint(hips,'hip'+side,[side*.28,-.11,0]),knee=joint(leg,'knee',[0,-.86,0]);legs.push({leg,knee});
    tube(leg,m.bone,[[0,.07,0],[0,-.43,0],[0,-.86,0]],[.19,.15,.12],10);
    loft(knee,m.black,[[-.94,.12,.14],[-.67,.14,.18],[-.32,.18,.21],[.09,.145,.16]]);
    plate(knee,m.gold,[[-.14,.07],[0,.23],[.14,.07],[.10,-.17],[0,-.29],[-.10,-.17]],.04,[0,.01,.17]);
    orb(knee,m.black,[0,-.9,.13],[.19,.13,.33]);for(const x of [-.12,0,.12])horn(knee,m.bone,[[x,-.91,.31],[x,-.88,.42],[x,-.91,.5],[x,-.93,.54]],.037);
    plate(hips,m.black,[[0,.22],[side*.35,.26],[side*.55,.02],[side*.4,-.58],[side*.12,-.43]],.07,[0,0,.18]);
    tube(hips,m.gold,[[side*.1,.14,.31],[side*.35,.19,.31],[side*.44,-.06,.3],[side*.35,-.43,.27]],[.016,.026,.022,.006],6);
  }
  const cape=joint(torso,'funeralMantle',[0,1.16,-.25]);
  for(let i=0;i<5;i++){const p=clothPanel(cape,m.cloth,{top:.30,bottom:.48,height:2.95-(i%2)*.22,depth:.32,folds:2,pos:[(i-2)*.25,0,-.035*Math.abs(i-2)],ragged:true});p.rotation.y=(i-2)*.13;}
  const halo=joint(body,'brokenHalo',[0,4.62,-.4]);const shards=[];
  for(let i=0;i<5;i++){
    const stone=joint(halo,'crownShard'+i,[0,0,0]);shards.push(stone);
    plate(stone,m.black,[[-.09,.25],[.09,.17],[.13,-.1],[0,-.31],[-.13,-.12]],.12);
    scar(stone,m.rune,[[0,.19,.143],[-.03,.08,.143],[.03,-.05,.143],[0,-.22,.143]]);
    tube(stone,m.gold,[[-.07,.16,.145],[.07,.06,.145],[-.06,-.10,.145]],[.011,.013,.008],5);
  }
  let mode='idle';root.userData.setMode=v=>mode=v;root.userData.rig={body,hips,torso,head,arms,legs,cape};root.userData.idleBehaviorCount=24;
  root.userData.update=t=>{
    const summon=mode==='summon',execution=mode==='kill',moving=mode==='move'||mode==='levitate',levitating=!summon;body.position.y=levitating?.08+Math.sin(t*1.7)*.055:0;body.rotation.set(0,0,0);hips.rotation.set(0,0,0);torso.rotation.set(execution?-.13:0,Math.sin(t*.53)*.02,0);head.rotation.set(execution?.12:0,Math.sin(t*.61)*.06,0);cape.rotation.set(Math.sin(t*.9)*.027+(moving?.12:0),0,0);
    arms.forEach(({arm,elbow},i)=>{const side=i===0?-1:1;if(execution){arm.rotation.set(-1.34,0,side*.22);elbow.rotation.set(-.92,0,-side*.08)}else{arm.rotation.set(0,0,side*(summon?.73:.07)+Math.sin(t*.8)*.025);elbow.rotation.set(summon?-.35:-.12,0,0)}});
    legs.forEach(({leg,knee},i)=>{leg.rotation.x=moving?-.12:0;knee.rotation.x=moving?.24:0;});
    if(execution){m.rune.emissiveIntensity=1.75+Math.sin(t*7)*.2;return}
    if(!moving&&!summon){const span=7.2,index=Math.floor((t+.9)/span)*7%24,phase=(t+.9)%span/span,g=phase>.16&&phase<.88?Math.sin((phase-.16)/.72*Math.PI)**2:0,side=index<12?-1:1,kind=index%12;if(kind===0){head.rotation.y+=side*.55*g;}else if(kind===1){torso.rotation.x=-.08*g;arms.forEach(({arm},i)=>arm.rotation.z+=(i?1:-1)*.23*g);}else if(kind===2){arms[side<0?0:1].arm.rotation.x=-.7*g;arms[side<0?0:1].elbow.rotation.x=-.55*g;}else if(kind===3){head.rotation.x=-.18*g;hips.rotation.y=side*.1*g;}else if(kind===4){arms.forEach(({arm,elbow},i)=>{arm.rotation.x=-.5*g;elbow.rotation.x=-.45*g;});}else if(kind===5){cape.rotation.z=side*.045*g;torso.rotation.y+=side*.14*g;}else if(kind===6){body.position.y=.12*g;arms.forEach(({arm},i)=>arm.rotation.z+=(i?1:-1)*.35*g);}else if(kind===7){legs.forEach(({leg,knee},i)=>{leg.rotation.x+=(i?1:-1)*.09*g;knee.rotation.x=.12*g;});}else if(kind===8){head.rotation.z=side*.08*g;torso.rotation.x=.06*g;}else if(kind===9){arms[side<0?1:0].arm.rotation.z+=side*.45*g;head.rotation.y-=side*.25*g;}else if(kind===10){torso.rotation.y+=Math.sin(phase*Math.PI*4)*.09*g;head.rotation.y-=Math.sin(phase*Math.PI*4)*.12*g;}else{body.rotation.y=side*.07*g;cape.rotation.x+=.13*g;}}
    shards.forEach((s,i)=>{const a=i/5*Math.PI*2+Math.PI*.1;s.position.set(Math.cos(a)*1.04,Math.sin(a)*.55+Math.sin(t*1.1+i)*.04,0);s.rotation.z=a-Math.PI/2+Math.sin(t+i)*.04;});
    core.rotation.y=Math.sin(t)*.1;m.rune.emissiveIntensity=(summon?1.8:.95)+Math.sin(t*2.3)*.16;
  };
  return finish(root);
}
