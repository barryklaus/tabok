import * as THREE from 'three';
// Small volumetric props: patinated brass, dark stone and translucent crystal.
// No per-item lights, loaders or frame-time geometry creation.
export function createTreasureModel(name){
  const g=new THREE.Group();g.name=name;
  const brass=new THREE.MeshStandardMaterial({color:0xb69658,metalness:.72,roughness:.42}),stone=new THREE.MeshStandardMaterial({color:0x302d3c,roughness:.85}),ivory=new THREE.MeshStandardMaterial({color:0xd8c8a3,roughness:.68}),glass=new THREE.MeshStandardMaterial({color:0x93c8c8,transparent:true,opacity:.58,metalness:.15,roughness:.22}),purple=new THREE.MeshStandardMaterial({color:0x826099,metalness:.2,roughness:.42});
  const mesh=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  const box=(x,y,z,mat=brass,px=0,py=0,pz=0)=>mesh(new THREE.BoxGeometry(x,y,z),mat,px,py,pz);
  const ball=(r,mat=brass,x=0,y=0,z=0)=>mesh(new THREE.SphereGeometry(r,12,8),mat,x,y,z);
  const rod=(r,h,mat=brass,x=0,y=0,z=0)=>mesh(new THREE.CylinderGeometry(r,r,h,12),mat,x,y,z);
  const ring=(r,t=.035,x=0,y=0,z=0)=>mesh(new THREE.TorusGeometry(r,t,6,20),brass,x,y,z);
  const line=(points,r=.035,mat=brass)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,6,false),mat);
  rod(.34,.055,stone,0,.045);rod(.29,.018,brass,0,.083);
  if(name==='Hourglass'){for(const y of[.13,.75])rod(.25,.06,brass,0,y);for(const x of[-.2,.2])rod(.025,.62,brass,x,.44);mesh(new THREE.ConeGeometry(.19,.29,16),glass,0,.28).rotation.z=Math.PI;mesh(new THREE.ConeGeometry(.19,.29,16),glass,0,.59);mesh(new THREE.ConeGeometry(.14,.19,16),ivory,0,.22);rod(.012,.22,ivory,0,.4)}
  else if(name==='Mirror'){const frame=ring(.27,.045,0,.54);frame.scale.y=1.28;const face=mesh(new THREE.CircleGeometry(.245,24),new THREE.MeshStandardMaterial({color:0xb4dce8,metalness:1,roughness:.13,side:THREE.DoubleSide}),0,.54,.009);face.scale.y=1.28;rod(.045,.27,brass,0,.2)}
  else if(name==='Lantern'){box(.35,.04,.35,brass,0,.16);box(.32,.39,.32,glass,0,.39);for(const x of[-.17,.17])for(const z of[-.17,.17])rod(.024,.44,brass,x,.39,z);mesh(new THREE.ConeGeometry(.29,.16,4),brass,0,.67).rotation.y=Math.PI/4;ring(.1,.025,0,.81);ball(.09,new THREE.MeshStandardMaterial({color:0xffcd76,emissive:0xdc842f,emissiveIntensity:.8}),0,.37)}
  else if(name==='Key'){ring(.15,.05,-.1,.68);rod(.048,.43,brass,-.1,.34);box(.22,.065,.07,brass,.01,.15);box(.07,.13,.07,brass,.09,.17)}
  else if(name==='Crown'){rod(.25,.17,brass,0,.23);for(let i=0;i<6;i++){const a=i*Math.PI/3;mesh(new THREE.ConeGeometry(.08,.3,4),brass,Math.cos(a)*.21,.45,Math.sin(a)*.21);ball(.038,purple,Math.cos(a)*.21,.61,Math.sin(a)*.21)}}
  else if(name==='Quill'){rod(.13,.16,stone,0,.18);rod(.055,.05,brass,0,.29);line([[0,.27,0],[.07,.55,0],[.2,.92,0]],.018);for(let i=0;i<7;i++){const y=.43+i*.062,x=.055+i*.02;line([[x-.13,y-.055,0],[x,y,.01],[x+.11,y+.09,0]],.018,ivory)}}
  else if(name==='Bell'){mesh(new THREE.CylinderGeometry(.08,.28,.43,20,1,true),brass,0,.4);const lip=ring(.275,.03,0,.18);lip.rotation.x=Math.PI/2;rod(.035,.2,brass,0,.7);ball(.06,stone,0,.2)}
  else if(name==='Anchor'){rod(.04,.65,brass,0,.43);ring(.09,.028,0,.86);box(.4,.06,.06,brass,0,.59);line([[-.29,.4,0],[-.2,.2,0],[0,.14,0],[.2,.2,0],[.29,.4,0]],.05);for(const x of[-.29,.29])mesh(new THREE.ConeGeometry(.095,.17,3),brass,x,.4)}
  else if(name==='Compass'){rod(.28,.11,brass,0,.24);const dial=mesh(new THREE.CircleGeometry(.25,24),ivory,0,.302);dial.rotation.x=-Math.PI/2;mesh(new THREE.ConeGeometry(.055,.34,3),purple,0,.33,-.08).rotation.x=-Math.PI/2;mesh(new THREE.ConeGeometry(.055,.25,3),brass,0,.33,.13).rotation.x=Math.PI/2;ring(.08,.025,0,.31,-.35)}
  else if(name==='Book'){box(.45,.48,.16,ivory,0,.36);for(const z of[-.1,.1])box(.5,.53,.035,purple,0,.36,z);box(.04,.53,.23,brass,-.24,.36);box(.26,.025,.012,brass,0,.44,.125);box(.16,.02,.012,brass,0,.35,.125)}
  else if(name==='Seed'){const seed=ball(.21,new THREE.MeshStandardMaterial({color:0x6c482c,roughness:.7}),0,.31);seed.scale.set(.75,1.3,.75);line([[0,.42,0],[.025,.62,0],[.12,.74,0]],.023,brass);const leaf=ball(.12,new THREE.MeshStandardMaterial({color:0x5b8466,roughness:.6}),.13,.71);leaf.scale.set(1,.28,.5)}
  else if(name==='Mask'){const face=ball(.26,ivory,0,.48);face.scale.set(.83,1.22,.33);for(const x of[-.09,.09]){const eye=ball(.06,stone,x,.52,.077);eye.scale.set(1,.5,.22)}mesh(new THREE.ConeGeometry(.055,.13,4),brass,0,.46,.1).rotation.x=Math.PI/2;line([[-.09,.34,.075],[0,.32,.09],[.09,.34,.075]],.015,stone)}
  else if(name==='Sun Shard'){mesh(new THREE.OctahedronGeometry(.24),new THREE.MeshStandardMaterial({color:0xeec05b,emissive:0x6b4012,emissiveIntensity:.22,metalness:.35,roughness:.25,transparent:true,opacity:.88}),0,.36).scale.y=1.5}
  else{ball(.22,new THREE.MeshStandardMaterial({color:0xb3dbea,metalness:.3,roughness:.2}),0,.34);const orbit=ring(.26,.018,0,.34);orbit.rotation.x=.9}
  g.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=true}});g.scale.setScalar(1.2);return g;
}
