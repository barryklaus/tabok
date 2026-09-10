import * as THREE from 'three';
import {material,mesh,orb,joint,loft,tube,plate,ring,rivet,strap,clothPanel,finish} from './cast-forge.js?v=20260906S1';

const specs={
  misty:{name:'Misty',title:'Mist Scout',color:'#ff745c',cloth:0x70302a,trim:0xb1a184,skin:0xc18159,hair:0x29150f,armor:0x727b7c,style:'scout',move:'walk'},
  cliff:{name:'Cliff',title:'Relic Archivist',color:'#4cb5ff',cloth:0x163e61,trim:0xc09a58,skin:0xc88b67,hair:0x793710,armor:0x506272,style:'coat',move:'glide'},
  paige:{name:'Paige',title:'Portal Mystic',color:'#8ce563',cloth:0x284a33,trim:0xb69b50,skin:0x77462d,hair:0x211915,armor:0x4e694d,style:'robe',move:'glide'},
  justin:{name:'Justin',title:'Ruin Guardian',color:'#f0b842',cloth:0x553928,trim:0xc49d52,skin:0xa16843,hair:0x322015,armor:0x99743c,style:'guardian',move:'walk'},
  sue:{name:'Sue',title:'Treasure Rogue',color:'#ff78c8',cloth:0x30212d,trim:0xb38576,skin:0xc99173,hair:0x951444,armor:0x42424c,style:'rogue',move:'jump'},
  wanday:{name:'Wanday',title:'Oddity Collector',color:'#c391ff',cloth:0x483662,trim:0xbfa56d,skin:0xcba07f,hair:0x684282,armor:0x78677f,style:'coat',move:'glide'}
};
function palette(d){return{
  skin:material(d.skin,'skin'),shadow:material(new THREE.Color(d.skin).multiplyScalar(.64),'skin'),lip:material(new THREE.Color(d.skin).multiply(new THREE.Color(1,.7,.68)),'skin'),
  cloth:material(d.cloth,'cloth',{side:THREE.DoubleSide}),lining:material(0xbaa989,'cloth',{side:THREE.DoubleSide}),leather:material(0x33251e,'leather'),seam:material(0x816a4c,'leather'),
  metal:material(d.armor,'metal'),gold:material(d.trim,'metal'),edge:material(0xc7c1ab,'metal'),dark:material(0x101218,'metal'),
  hair:material(d.hair,'hair'),hairLight:material(new THREE.Color(d.hair).multiplyScalar(1.35),'hair'),white:material(0xcac0ad,'skin'),eye:material(0x100f13,'skin'),
  gem:material(d.color,'metal',{metalness:.35,emissive:d.color,emissiveIntensity:.6}),
};}

function hand(parent,m,side){
  orb(parent,m.leather,[0,-.085,.035],[.105,.125,.09]);
  for(let i=0;i<3;i++)tube(parent,m.skin,[[side*(i-1)*.055,-.085,.08],[side*(i-1)*.055,-.16,.13],[side*(i-1)*.055,-.21,.055]],[.031,.032,.023],6);
  tube(parent,m.skin,[[side*.1,-.03,.05],[side*.13,-.08,.12],[side*.05,-.13,.14]],[.042,.037,.025],6);
  for(let i=0;i<3;i++)rivet(parent,m.gold,[(i-1)*.045,-.06,-.048],.012);
}

function anatomy(root,d,m){
  const model=joint(root,'root',[0,0,0]),hips=joint(model,'pelvis',[0,1.82,0]),torso=joint(hips,'spine',[0,.18,0]);
  const broad=d.style==='guardian'?1.27:1;
  loft(hips,m.leather,[[-.15,.34,.23],[.02,.4,.25],[.22,.36,.235]],[],16).position.set(0,0,0);
  loft(torso,m.cloth,[[0,.34,.22],[.23,.37,.24],[.53,.48*broad,.28],[.8,.52*broad,.25],[.94,.27,.20]]);
  const neck=joint(torso,'neck',[0,.98,0]);loft(neck,m.skin,[[-.1,.18,.17],[.18,.14,.145],[.32,.18,.16]]);
  const head=joint(neck,'head',[0,.48,.015]);
  const rig={model,hips,torso,neck,head};
  for(const [prefix,side]of [['left',1],['right',-1]]){
    const arm=joint(torso,prefix+'Shoulder',[side*.54*broad,.79,0]),fore=joint(arm,prefix+'Elbow',[side*.07,-.59,0]),wrist=joint(fore,prefix+'Wrist',[side*.035,-.53,.025]);
    loft(arm,m.cloth,[[-.61,.11,.12,side*.07],[-.39,.155,.15,side*.035],[-.15,.175,.17],[.055,.145,.15]]);
    orb(arm,m.cloth,[side*.02,-.06,0],[.21,.22,.20]);
    loft(fore,m.skin,[[-.54,.087,.095,side*.035],[-.35,.12,.115,side*.025],[-.1,.145,.13],[.05,.115,.115]]);
    loft(fore,m.leather,[[-.44,.114,.119,side*.03],[-.35,.135,.135,side*.025],[-.15,.16,.148],[-.1,.143,.14]]);
    for(const y of [-.39,-.16])loft(fore,m.gold,[[y-.018,.139,.143,side*.02],[y+.018,.139,.143,side*.02]],[],12).position.set(0,0,0);
    hand(wrist,m,side);
    const leg=joint(hips,prefix+'Hip',[side*.235,-.02,0]),knee=joint(leg,prefix+'Knee',[0,-.78,0]),foot=joint(knee,prefix+'Ankle',[0,-.79,.04]);
    loft(leg,m.leather,[[-.83,.145,.15],[-.65,.17,.18],[-.29,.195,.20],[.025,.20,.22]]);
    orb(knee,m.leather,[0,0,0],[.145,.16,.16]);
    loft(knee,m.leather,[[-.8,.115,.13],[-.65,.125,.145],[-.32,.17,.175],[.035,.14,.15]]);
    orb(foot,m.leather,[0,-.10,.13],[.165,.15,.31]);
    loft(foot,m.dark,[[-.2,.16,.29,0,.12],[-.15,.17,.30,0,.12]],[],14).position.set(0,0,0);
    plate(knee,m.metal,[[-.14,.04],[0,.16],[.14,.04],[.105,-.16],[0,-.23],[-.105,-.16]],.03,[0,0,.14]);
    for(const y of [-.23,-.55])strap(knee,m.seam,[-.15,y,.12],[.15,y,.12],.055);
    Object.assign(rig,{[prefix+'Arm']:arm,[prefix+'Forearm']:fore,[prefix+'Hand']:wrist,[prefix+'Leg']:leg,[prefix+'Knee']:knee,[prefix+'Foot']:foot});
  }
  return rig;
}

function sculptFace(head,m,d){
  // A connected jaw, cheek and brow volume replaces the floating sphere head.
  loft(head,m.skin,[[-.40,.12,.14,0,.02],[-.32,.225,.213],[-.16,.302,.266],[.005,.337,.29],[.19,.34,.286],[.32,.295,.248],[.42,.16,.15],[.445,.025,.025]],[],28).position.set(0,0,0);
  for(const side of [-1,1]){
    orb(head,m.skin,[side*.34,-.015,-.005],[.06,.105,.044]);orb(head,m.shadow,[side*.362,-.011,.024],[.023,.049,.012]);
    const eye=joint(head,side<0?'rightEye':'leftEye',[side*.142,.045,.263]);
    orb(eye,m.shadow,[0,0,0],[.094,.042,.018]);
    orb(eye,m.white,[0,0,.012],[.076,.027,.015]);orb(eye,m.eye,[0,0,.027],[.028,.028,.008]);orb(eye,m.white,[-.009,.01,.035],[.006,.006,.003],8);
    tube(eye,m.shadow,[[-.077,.002,.02],[0,.026,.025],[.077,.001,.02]],[.007,.009,.006],5);
    tube(head,m.hair,[[side*.063,.124,.293],[side*.15,.145,.286],[side*.24,.113,.242]],[.011,.018,.007],6);
  }
  loft(head,m.skin,[[-.104,.045,.028,0,.274],[-.061,.052,.045,0,.302],[.0,.031,.038,0,.294],[.15,.025,.013,0,.284]],[],16).position.set(0,0,0);
  for(const x of [-.032,.032])orb(head,m.shadow,[x,-.087,.320],[.011,.006,.005],8);
  tube(head,m.lip,[[-.079,-.193,.243],[0,-.182,.269],[.079,-.193,.243]],[.007,.011,.005],6);
  tube(head,m.shadow,[[-.074,-.203,.245],[0,-.205,.267],[.074,-.203,.245]],[.003,.005,.003],5);
}

function hair(r,m,d){
  const head=r.head;
  mesh(head,new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.54),m.hair,[0,.09,-.04],[.379,.4,.306]);
  const wild=d.name==='Wanday'||d.name==='Cliff';
  for(let i=0;i<(wild?14:10);i++){
    const a=i/10*Math.PI*2,side=Math.sin(a),z=Math.cos(a),start=[side*.18,.41,z*.16-.05],mid=[side*.37,.29,z*.31-.035],end=[side*(wild?.45:.36),wild?.12-Math.sin(i*2)*.1:.1,z*.32-.065];
    if(z>.3){mid[0]+=.1;end[0]+=.07;end[1]=.11+(i%3)*.036;}
    tube(head,i%4===0?m.hairLight:m.hair,[start,mid,end],[.06,wild?.095:.077,.006],7);
    tube(head,m.hairLight,[[start[0],start[1]+.017,start[2]+.017],[mid[0],mid[1]+.024,mid[2]+.024],[end[0],end[1]+.006,end[2]+.006]],[.006,.009,.001],5);
  }
  const tail=joint(head,'hairSecondary',[0,.27,-.3]);
  if(d.name==='Paige'){
    tail.position.set(-.28,.12,.025);
    for(let i=0;i<13;i++){const y=-i*.082,z=.005+i*.022;orb(tail,i%2?m.hair:m.hairLight,[Math.sin(i*2.3)*.018,y,z],[.066,.061,.059],10);}
    ring(tail,m.gold,.055,.014,[0,-.97,.26],[Math.PI/2,0,0]);
    for(const s of [-1,1])tube(head,m.hair,[[s*.20,.37,.10],[s*.35,.15,.045],[s*.33,-.28,-.055]],[.073,.076,.018],7);
  }else if(['Misty','Sue','Justin'].includes(d.name)){
    ring(tail,m.gold,.086,.021,[0,.03,-.015],[Math.PI/2,0,0]);
    for(let i=0;i<5;i++)tube(tail,i%2?m.hair:m.hairLight,[[i*.025-.05,.06,0],[i*.024-.045,.12,-.21],[i*.02-.04,-.38-(i%2)*.12,-.29]],[.07,.063,.005],7);
  }
  if(d.name==='Justin'){
    for(let i=0;i<11;i++){const x=(i-5)*.048; tube(head,i%3?m.hair:m.hairLight,[[x,-.14+Math.abs(x)*.25,.255],[x*.88,-.33,.23],[x*.62,-.46+Math.abs(x)*.3,.14]],[.04,.049,.004],6);}
    for(const s of [-1,1])tube(head,m.hair,[[s*.015,-.15,.31],[s*.10,-.175,.302],[s*.18,-.23,.26]],[.025,.034,.006],6);
  }
  return tail;
}

function torsoDetails(r,m,d){
  const t=r.torso,guardian=d.style==='guardian';
  const outline=[[-.42,.66],[-.23,.85],[0,.76],[.23,.85],[.42,.66],[.34,.18],[0,.06],[-.34,.18]];
  if(['scout','guardian','rogue'].includes(d.style)){
    loft(t,m.metal,[[.10,.35,.25],[.28,.38,.28],[.54,guardian?.57:.47,.322],[.73,guardian?.59:.49,.293],[.82,.37,.245]],[],20).position.set(0,0,0);
    for(const s of [-1,1]){
      tube(t,m.gold,[[s*.025,.20,.284],[s*.08,.40,.32],[s*.32,.70,.273]],[.01,.016,.012],6);
      tube(t,m.edge,[[s*.05,.74,.272],[s*.21,.77,.27],[s*.37,.67,.242]],[.01,.014,.01],5);
    }
    for(let i=0;i<3;i++)plate(t,m.metal,[[-.31,.04],[0,-.015],[.31,.04],[.30,-.10],[0,-.16],[-.30,-.10]],.04,[0,.13-i*.12,.245]);
  }else{
    for(const side of [-1,1])plate(t,m.lining,[[side*.05,.8],[side*.32,.91],[side*.38,.73],[side*.12,.29]],.035,[0,0,.263]);
    for(let i=0;i<4;i++)rivet(t,m.gold,[0,.17+i*.14,.31],.024);
  }
  loft(r.hips,m.leather,[[.13,.414,.26],[.25,.397,.255]]);
  plate(r.hips,m.gold,[[-.1,.08],[.1,.08],[.1,-.08],[-.1,-.08]],.035,[0,.19,.264]);
  plate(r.hips,m.dark,[[-.065,.045],[.065,.045],[.065,-.045],[-.065,-.045]],.018,[0,.19,.306]);
  strap(t,m.leather,[-.37,.84,.335],[.29,-.04,.325],.105);
  for(let i=0;i<6;i++)rivet(t,m.gold,[-.34+i*.105,.795-i*.135,.362],.013);
  for(const side of [-1,1]){
    const arm=r[side>0?'leftArm':'rightArm'];
    for(let i=0;i<(guardian?3:2);i++){
      const shoulder=plate(arm,i===0?m.gold:m.metal,[[-.18,.10],[0,.2],[.2,.10],[.23,-.09],[0,-.16],[-.23,-.09]],.045,[side*.045,-i*.12,.15]);
      shoulder.rotation.z=-side*.12;
      if(!guardian)shoulder.scale.set(.78,.72,.86);
    }
    for(const x of [-.13,.13])rivet(arm,m.gold,[x,-.07,.215]);
    const pouch=joint(r.hips,side>0?'satchel':'beltPouch',[side*.41,.015,.11]);
    loft(pouch,m.leather,[[-.28,.125,.09],[-.20,.15,.105],[.02,.135,.10],[.08,.1,.08]]);
    strap(pouch,m.gold,[-.09,-.02,.115],[.09,-.02,.115],.03);rivet(pouch,m.gold,[0,-.07,.119],.025);
  }
  if(d.style==='robe'||d.style==='coat'){
    for(const side of [-1,1]){
      const panel=clothPanel(t,m.cloth,{top:.43,bottom:.64,height:d.style==='robe'?1.65:1.4,depth:.12,pos:[side*.34,.22,-.14]});panel.rotation.y=side*.4;
      clothPanel(t,m.lining,{top:.14,bottom:.2,height:1.33,depth:0,pos:[side*.30,.18,.15],folds:1});
    }
  }
  const cape=joint(t,'cape',[0,.87,-.25]);
  if(d.name!=='Sue'&&d.name!=='Cliff'&&d.name!=='Wanday'){
    const cm=d.name==='Misty'?material(0x8e2720,'cloth',{side:THREE.DoubleSide}):m.cloth;
    clothPanel(cape,cm,{top:.7,bottom:guardian?1.5:1.03,height:guardian?2:1.65,depth:.42,folds:5,ragged:true});
    for(const s of [-1,1])rivet(t,m.gold,[s*.33,.86,.28],.06);
  }
  if(d.name==='Misty'){
    ring(r.neck,material(0xa8271d,'cloth'),.23,.092,[0,.18,.01],[Math.PI/2,0,0]);
    const scarf=clothPanel(cape,material(0xac3024,'cloth',{side:THREE.DoubleSide}),{top:.17,bottom:.27,height:1.35,depth:.7,pos:[-.28,.25,-.04],folds:2});scarf.rotation.z=-.5;
  }
  if(guardian||d.name==='Wanday')for(let i=0;i<15;i++){
    const a=-1.65+i/14*3.3,x=Math.sin(a)*.51,y=.89+Math.cos(a)*.12,z=-.12+Math.cos(a)*.23;
    tube(t,m.lining,[[x,y,z],[x*1.17,y-.12,z+.075],[x*1.2,y-.27,z+.09]],[.105,.098,.007],6);
  }
  return cape;
}

function sword(parent,m,{long=false,curve=0}={}){
  const weapon=joint(parent,'weaponGrip',[0,-.10,.055]);
  loft(weapon,m.leather,[[-.14,.046,.046],[.14,.047,.047]],[],10).position.set(0,0,0);
  for(let i=0;i<5;i++)ring(weapon,m.gold,.047,.009,[0,-.10+i*.048,0],[Math.PI/2,0,0],12);
  orb(weapon,m.gold,[0,.18,0],[.074,.065,.065],10);
  tube(weapon,m.gold,[[-.23,-.17,.005],[-.12,-.145,.005],[0,-.18,.005],[.12,-.145,.005],[.23,-.17,.005]],[.034,.045,.045,.045,.034],6);
  const length=long?1.24:.71;
  plate(weapon,m.edge,[[-.085,-.21],[-.09,-length*.7],[curve,-length-.23],[.09,-length*.68],[.085,-.21]],.035,[0,0,-.022]);
  plate(weapon,m.metal,[[-.018,-.22],[0,-length-.14],[.025,-.22]],.009,[0,0,.03]);
  return weapon;
}

function sunShield(parent,m){
  const g=joint(parent,'sunShield',[.07,-.02,.19]);g.rotation.y=-.10;
  orb(g,m.dark,[0,0,0],[.60,.67,.10],24);orb(g,m.metal,[0,0,.055],[.56,.63,.11],24);
  const outer=ring(g,m.gold,.585,.035,[0,0,.10]);outer.scale.y=1.11;
  const inner=ring(g,m.gold,.48,.011,[0,0,.159]);inner.scale.y=1.11;
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;plate(g,m.gold,[[-.035,.2],[0,.44],[.035,.2]],.022,[0,0,.18],[0,0,a]);rivet(g,m.edge,[Math.sin(a)*.55,Math.cos(a)*.61,.125],.022);}
  orb(g,m.gold,[0,0,.16],[.21,.235,.15]);orb(g,m.gem,[0,0,.291],[.08,.086,.032],12);
  ring(g,m.leather,.13,.032,[0,0,-.115],[0,Math.PI/2,0]);return g;
}

function lantern(parent,m){
  const g=joint(parent,'lantern',[0,-.40,.08]);
  ring(g,m.gold,.115,.018,[0,.31,0]);
  mesh(g,new THREE.CylinderGeometry(.18,.24,.12,8),m.gold,[0,.2,0]);mesh(g,new THREE.CylinderGeometry(.24,.18,.085,8),m.gold,[0,-.22,0]);
  const glow=material(0xffc572,'skin',{emissive:0xffa331,emissiveIntensity:1.6});
  orb(g,glow,[0,-.01,0],[.11,.17,.11]);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,x=Math.sin(a)*.185,z=Math.cos(a)*.185;tube(g,m.gold,[[x,.19,z],[x*1.12,0,z*1.12],[x,-.19,z]],[.018,.015,.018],5);}
  return g;
}
function equipment(r,m,d){
  if(['Misty','Sue','Justin'].includes(d.name))sword(r.rightHand,m,{long:d.name==='Justin',curve:d.name==='Sue'?.1:0});
  if(d.name==='Sue')sword(r.leftHand,m,{curve:-.1});
  if(d.name==='Justin')sunShield(r.leftHand,m);
  if(d.name==='Paige')return {lantern:lantern(r.leftHand,m)};
  if(d.name==='Cliff'||d.name==='Wanday'){
    const pack=joint(r.torso,'expeditionPack',[0,.42,-.34]);
    loft(pack,m.leather,[[-.57,.32,.17],[-.40,.39,.24],[.39,.37,.21],[.57,.23,.14]],[],14).position.set(0,0,0);
    for(const s of [-1,1]){strap(pack,m.gold,[s*.24,-.47,-.22],[s*.24,.42,-.23],.045);ring(pack,m.gold,.087,.02,[s*.24,.25,-.27]);}
    const scroll=joint(pack,'scrollCase',[-.39,.24,0]);scroll.rotation.z=-.21;
    loft(scroll,m.gold,[[-.44,.09,.09],[.40,.09,.09],[.43,.13,.13]],[],12).position.set(0,0,0);
    if(d.name==='Cliff'){
      for(const x of [-.15,.15]){ring(r.head,m.gold,.097,.016,[x,.045,.341]);orb(r.head,material(0x509eaa,'metal',{metalness:.2,roughness:.18}),[x,.045,.334],[.075,.029,.008]);}
      strap(r.head,m.gold,[-.052,.055,.35],[.052,.055,.35],.014);
      const book=joint(r.leftHand,'fieldTome',[0,-.02,.23]);book.rotation.set(-.5,0,.08);
      plate(book,m.leather,[[-.22,.3],[.22,.3],[.22,-.3],[-.22,-.3]],.11,[0,0,-.05]);
      for(const x of [-.18,.18])strap(book,m.gold,[x,-.25,.078],[x,.25,.078],.027);
      for(const y of [-.25,.25])strap(book,m.gold,[-.18,y,.08],[.18,y,.08],.026);
      ring(book,m.gold,.095,.013,[0,0,.081]);
    }else{
      const staff=joint(r.rightHand,'riftStaff',[0,-.05,.055]);
      tube(staff,m.leather,[[0,-1.13,0],[.025,0,0],[0,1.22,0]],[.047,.044,.04],8);
      for(let i=0;i<6;i++)ring(staff,m.gold,.051,.013,[.015,i*.12-.2,0],[Math.PI/2,0,0],12);
      for(const s of [-1,1])tube(staff,m.gold,[[0,1.03,0],[s*.20,1.25,0],[s*.11,1.5,0]],[.037,.03,.009],6);
      mesh(staff,new THREE.OctahedronGeometry(.20),m.gem,[0,1.35,0],[.7,1.4,.7]);
      for(let i=0;i<3;i++){const vial=joint(pack,'oddityVial'+i,[(i-1)*.24,-.43,-.21]);orb(vial,m.gem,[0,-.12,0],[.077,.11,.077],10);loft(vial,m.gold,[[-.04,.039,.039],[.055,.039,.039]],[],8).position.set(0,0,0);}
    }
  }
  return {};
}

function animate(root,r,d,secondary){
  let mode='idle',start=null;const rest=new Map();for(const b of Object.values(r)){if(b?.isObject3D)rest.set(b,{p:b.position.clone(),q:b.quaternion.clone()});}
  const identity=['Misty','Cliff','Paige','Justin','Sue','Wanday'].indexOf(d.name),idleSpan=6.4;
  root.userData.rig=r;root.userData.movementStyle=d.move;root.userData.idleBehaviorCount=30;
  root.userData.setMode=value=>{mode=value==='celebrate'?'victory':value;start=null;};
  root.userData.update=time=>{
    if(start===null)start=time;const age=time-start,breathe=Math.sin(time*1.9),cycle=Math.sin(age*9),pulse=Math.sin(Math.min(age/1.2,1)*Math.PI);
    for(const [bone,state]of rest){bone.position.copy(state.p);bone.quaternion.copy(state.q);}r.model.scale.setScalar(d.name==='Justin'?1.06:1);
    r.torso.rotation.x=breathe*.008;r.torso.rotation.y=-.06;r.head.rotation.y=.06+Math.sin(time*.57)*.035;r.leftArm.rotation.z=-.095;r.rightArm.rotation.z=.075;r.leftForearm.rotation.x=-.18;r.rightForearm.rotation.x=-.14;r.leftLeg.rotation.z=.035;r.rightLeg.rotation.z=-.035;secondary.hair.rotation.z=Math.sin(time*1.6)*.045;if(secondary.lantern)secondary.lantern.rotation.z=Math.sin(time*1.65)*.07;
    if(mode==='idle'){
      // Thirty low-cost, layered behaviors per Traveler: fifteen gesture families,
      // mirrored and personality-weighted. Only one quiet gesture blooms at a time.
      const shifted=time+identity*1.17,index=(Math.floor(shifted/idleSpan)*7+identity*11)%30,phase=(shifted%idleSpan)/idleSpan;
      const gesture=phase>.17&&phase<.87?Math.sin((phase-.17)/.7*Math.PI)**2:0,side=index<15?-1:1,variant=index%15,amp=(.75+identity*.035)*gesture;
      if(variant===0){r.head.rotation.y+=side*.48*amp;r.head.rotation.x-=.05*amp;}
      else if(variant===1){r.head.rotation.x+=.18*amp;r.torso.rotation.x+=.035*amp;}
      else if(variant===2){r.torso.rotation.y+=side*.18*amp;r.head.rotation.y-=side*.22*amp;}
      else if(variant===3){r.rightArm.rotation.x-=.72*amp;r.rightForearm.rotation.x-=.55*amp;r.head.rotation.y+=.17*amp;}
      else if(variant===4){r.leftArm.rotation.x-=.68*amp;r.leftForearm.rotation.x-=.58*amp;r.head.rotation.y-=.17*amp;}
      else if(variant===5){r.leftArm.rotation.z-=.24*amp;r.rightArm.rotation.z+=.24*amp;r.torso.rotation.x-=.055*amp;}
      else if(variant===6){r.hips.rotation.y+=side*.095*amp;r.leftLeg.rotation.z+=side*.055*amp;r.rightLeg.rotation.z+=side*.055*amp;}
      else if(variant===7){r.torso.rotation.x+=.10*amp;r.head.rotation.x-=.15*amp;r.leftKnee.rotation.x+=.12*amp;}
      else if(variant===8){r.rightArm.rotation.z+=.38*amp;r.rightForearm.rotation.x-=.45*amp;r.head.rotation.y+=side*.12*amp;}
      else if(variant===9){r.leftArm.rotation.z-=.38*amp;r.leftForearm.rotation.x-=.4*amp;r.head.rotation.x+=.08*amp;}
      else if(variant===10){r.head.rotation.x-=.13*amp;r.head.rotation.z=side*.08*amp;}
      else if(variant===11){r.torso.rotation.x-=.10*amp;r.leftArm.rotation.z-=.34*amp;r.rightArm.rotation.z+=.34*amp;}
      else if(variant===12){r.rightArm.rotation.x-=1.05*amp;r.rightForearm.rotation.x+=.25*amp;r.head.rotation.y+=side*.25*amp;}
      else if(variant===13){r.leftArm.rotation.x-=.8*amp;r.leftForearm.rotation.x-=.18*amp;r.torso.rotation.y-=side*.16*amp;}
      else {r.model.position.y+=.045*amp;r.hips.rotation.y+=Math.sin(phase*Math.PI*4)*.05*amp;r.head.rotation.y-=side*.3*amp;}
      if(d.name==='Misty')secondary.hair.rotation.z+=side*.09*amp;
      if(d.name==='Cliff'&&(variant===3||variant===10))r.rightHand.rotation.z-=.22*amp;
      if(d.name==='Paige'&&secondary.lantern)secondary.lantern.rotation.z+=side*.28*amp;
      if(d.name==='Justin'&&(variant===5||variant===11)){r.leftArm.rotation.z-=.2*amp;r.torso.rotation.x-=.04*amp;}
      if(d.name==='Sue'&&(variant===3||variant===12))r.rightHand.rotation.z+=side*.5*amp;
      if(d.name==='Wanday'&&(variant===4||variant===9)){r.rightArm.rotation.z+=.22*amp;r.head.rotation.x-=.1*amp;}
    }else if(['move','walk','run','crouch','jump','acro'].includes(mode)){
      const travelMode=mode==='move'?d.move:mode,runCycle=Math.sin(age*15),jumpU=Math.min(age/.38,1);
      if(travelMode==='walk'){r.leftLeg.rotation.x=cycle*.36;r.rightLeg.rotation.x=-cycle*.36;r.leftKnee.rotation.x=Math.max(0,-cycle)*.52;r.rightKnee.rotation.x=Math.max(0,cycle)*.52;r.leftArm.rotation.x=-cycle*.22;r.rightArm.rotation.x=cycle*.22;r.hips.rotation.y=cycle*.04;}
      else if(travelMode==='run'){r.torso.rotation.x=-.14;r.leftLeg.rotation.x=runCycle*.62;r.rightLeg.rotation.x=-runCycle*.62;r.leftKnee.rotation.x=Math.max(0,-runCycle)*.82;r.rightKnee.rotation.x=Math.max(0,runCycle)*.82;r.leftArm.rotation.x=-runCycle*.52;r.rightArm.rotation.x=runCycle*.52;r.model.position.y=Math.abs(runCycle)*.045;}
      else if(travelMode==='crouch'){r.model.position.y=-.16;r.torso.rotation.x=.18;r.leftLeg.rotation.x=-.18;r.rightLeg.rotation.x=-.18;r.leftKnee.rotation.x=.78;r.rightKnee.rotation.x=.78;r.leftArm.rotation.z=-.18;r.rightArm.rotation.z=.18;}
      else if(travelMode==='jump'){r.model.position.y=Math.sin(jumpU*Math.PI)*.34;r.leftLeg.rotation.x=-.18;r.rightKnee.rotation.x=.62;r.leftArm.rotation.z=-.34;r.rightArm.rotation.z=.34;}
      else if(travelMode==='acro'){const flip=Math.sin(jumpU*Math.PI);r.model.position.y=flip*.5;r.model.rotation.x=-jumpU*Math.PI*2;r.leftKnee.rotation.x=.68*flip;r.rightKnee.rotation.x=.68*flip;r.leftArm.rotation.z=-.48;r.rightArm.rotation.z=.48;}
      else{r.model.position.y=.025;r.model.rotation.x=-.045;r.leftArm.rotation.z=-.13;r.rightArm.rotation.z=.13;}
    }else if(mode==='dice'){r.torso.rotation.x=-.075*pulse;r.rightArm.rotation.x=-.95*pulse;r.rightForearm.rotation.x=-.55*pulse;r.rightHand.rotation.z=-.25*pulse;}
    else if(mode==='take'||mode==='grab'){r.torso.rotation.x=.12*pulse;r.rightArm.rotation.x=-.85*pulse;r.rightForearm.rotation.x=-.60*pulse;}
    else if(mode==='give'){r.torso.rotation.y=.19*pulse;r.rightArm.rotation.x=-1.2*pulse;r.rightForearm.rotation.x=-.3*(1-pulse);}
    else if(mode==='steal'||mode==='receive'){const pull=Math.sin(Math.min(age,1)*Math.PI);r.leftArm.rotation.x=-1*pull;r.rightArm.rotation.x=-1*pull;r.leftForearm.rotation.x=-.85*pull;r.rightForearm.rotation.x=-.85*pull;r.torso.rotation.x=-.10*pull;}
    else if(mode==='rune'){r.leftArm.rotation.z=-.85*pulse;r.rightArm.rotation.z=.85*pulse;r.leftForearm.rotation.x=-.5*pulse;r.rightForearm.rotation.x=-.5*pulse;r.model.position.y=.12*pulse;r.head.rotation.x=-.12*pulse;}
    else if(mode==='blast'){const flail=Math.sin(age*16),kick=Math.sin(age*13+1.2);r.torso.rotation.x=-.2;r.leftArm.rotation.z=-.95+flail*.24;r.rightArm.rotation.z=.95-flail*.22;r.leftArm.rotation.x=flail*.42;r.rightArm.rotation.x=-flail*.39;r.leftForearm.rotation.x=-.34+flail*.5;r.rightForearm.rotation.x=-.34-flail*.5;r.leftLeg.rotation.x=kick*.48;r.rightLeg.rotation.x=-kick*.48;r.leftKnee.rotation.x=.2+Math.max(0,-kick)*.5;r.rightKnee.rotation.x=.2+Math.max(0,kick)*.5;r.head.rotation.z=flail*.13;}
    else if(mode==='victory'){r.rightArm.rotation.z=.8;r.rightArm.rotation.x=-.28;r.leftArm.rotation.z=-.35;r.torso.rotation.x=-.07;r.head.rotation.x=-.09;}
    else if(mode==='portal'){const u=Math.min(age/1.2,1);r.model.position.y=Math.sin(u*Math.PI)*.35;r.model.rotation.x=-u*.34;r.leftLeg.rotation.x=-.3;r.rightKnee.rotation.x=.5;r.leftArm.rotation.z=-.4;r.rightArm.rotation.z=.4;}
    secondary.cape.rotation.x=Math.sin(time*1.15)*.028+(['move','walk','run','crouch','jump','acro'].includes(mode)?.12:0);
  };
}

export function createSculptedTraveler(id='misty'){
  const d=specs[id]||specs.misty,m=palette(d),root=new THREE.Group();root.name=d.name+' — Sculpted Ruins';
  const r=anatomy(root,d,m);sculptFace(r.head,m,d);const hairJoint=hair(r,m,d),cape=torsoDetails(r,m,d),props=equipment(r,m,d);
  animate(root,r,d,{hair:hairJoint,cape,...props});root.userData.update(0);return finish(root);
}
export const SCULPTED_TRAVELERS=Object.fromEntries(Object.entries(specs).map(([id,d])=>[id,{name:d.name,title:d.title,color:d.color,create:()=>createSculptedTraveler(id)}]));
