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

// Preserve the existing major-monster API for all callers.
export { createVoidKeeper as sculptMajor } from './void-keeper.js?v=20260911VK1';
