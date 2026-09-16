const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),threeURL=pathToFileURL(path.join(root,'vendor/three.core.min.js')).href;
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const rounded=fs.readFileSync(path.join(root,'vendor/addons/geometries/RoundedBoxGeometry.js'),'utf8').replace(/from 'three'/g,`from '${threeURL}'`);
// The browser checks texture painting. These tests exercise the production
// geometry, face alignment and cache with lightweight canvas-free textures.
const art=data(`import * as THREE from '${threeURL}';export const DICE_PALETTES={};export async function preloadTreasureIcons(){};export function faceTexture(){return {texture:new THREE.Texture(),emissiveMap:new THREE.Texture()}};export const offerFaceTexture=faceTexture;`);
const physics=data(fs.readFileSync(path.join(root,'dice-physics.js'),'utf8').replace(/from 'three'/g,`from '${threeURL}'`).replace(/from '\.\/vendor\/cannon-es.js'/,`from '${pathToFileURL(path.join(root,'vendor/cannon-es.js')).href}'`));
const src=fs.readFileSync(path.join(root,'true3d-dice.js'),'utf8').replace(/from 'three'/g,`from '${threeURL}'`).replace(/from 'three\/addons\/geometries\/RoundedBoxGeometry.js'/,`from '${data(rounded)}'`).replace(/from '\.\/dice-reference-art.js[^']*'/,`from '${art}'`).replace(/from '\.\/dice-physics.js[^']*'/,`from '${physics}'`);
const ready=Promise.all([import(data(src)),import(threeURL),import(data(rounded))]);
async function board(){const[{TabokDice3D},THREE,{RoundedBoxGeometry}]=await ready;const d=Object.create(TabokDice3D.prototype);d.dieResources=new Map();d.scene=new THREE.Scene();d.dice=[];d.dieGeometry=new RoundedBoxGeometry(2.05,2.05,2.05,4,.115);return{d,THREE};}
test('all 20 numbered triangles face outward and every forced D20 result lands face up',async()=>{
 const{d,THREE}=await board();const die=d.buildOfferDie(0);assert.equal(die.userData.labels.length,20);assert.equal(new Set(die.userData.labels).size,20);
 const panels=die.children.filter(n=>n.name.startsWith('D20 face '));assert.equal(panels.length,20);
 for(const panel of panels){const p=panel.geometry.attributes.position,n=panel.geometry.attributes.normal;assert.equal(p.count,3);for(let i=0;i<3;i++)assert.ok(new THREE.Vector3().fromBufferAttribute(p,i).dot(new THREE.Vector3().fromBufferAttribute(n,i))>0);for(const v of panel.geometry.attributes.uv.array)assert.ok(v>=0&&v<=1);}
 for(let result=1;result<=20;result++){const q=d.targetQuaternion(die,String(result),0),face=die.userData.resultFace;assert.equal(die.userData.labels[face],String(result));const normal=die.userData.faceNormals[face].clone().applyQuaternion(q);assert.ok(normal.distanceTo(new THREE.Vector3(0,1,0))<1e-6);die.quaternion.copy(q);die.position.y=die.userData.restHeight;const bounds=new THREE.Box3().setFromObject(die,true);assert.ok(bounds.min.y>-.001,'D20 never sinks through the tray');assert.ok(bounds.min.y<.02,'D20 rests on the tray');}
});
test('dice redesign preserves the treasure odds and reuses ready resources',async()=>{
 const{d}=await board();const treasure=d.buildDice('Treasure',0);assert.deepEqual(treasure.userData.labels,['CHOOSE','CHOOSE','CHOOSE','BLANK','BLANK','BLANK']);
 const rune=d.buildDice('Rune',0);assert.deepEqual(rune.userData.labels,['WARP','DOUBLE','PHASE','BALANCE','FORTUNE','TIME']);
 const action=d.buildDice('Action',0);assert.deepEqual(action.userData.labels,['TAKE','TAKE','TAKE','GIVE','GIVE','STEAL']);
 const first=d.buildOfferDie(0),resource=d.dieResources.get('Offer|'+first.userData.labels.join(','));d.clearDice();const second=d.buildOfferDie(0);assert.equal(d.dieResources.get('Offer|'+second.userData.labels.join(',')),resource);assert.equal(first.children[0].geometry,second.children[0].geometry);
 d.clearDice();const life=d.buildDice('Last Chance',0,Array.from({length:20},(_,index)=>index+1));assert.equal(life.userData.kind,'Offer');assert.deepEqual(life.userData.labels,first.userData.labels);assert.equal(life.children[0].geometry,first.children[0].geometry);
 assert.equal(d.supports([{label:'Movement'}]),true);assert.equal(d.supports([{label:'Last Chance'}]),true);assert.equal(d.supports([{label:'Direction'}]),false);assert.equal(d.supports([{label:'Treasure',rolling:false}]),false);
});


test('Movement dice have recessed pips and keep their geometry cached',async()=>{
 const{d}=await board();const movement=d.buildDice('Movement',0),g=movement.geometry,p=g.attributes.position;
 const faceStart=2*37*37,center=faceStart+18*37+18;
 assert.ok(p.getY(center)<.98,'the three-pip upward face has a physical center cavity');
 for(const key of ['position','normal'])for(const value of g.attributes[key].array)assert.ok(Number.isFinite(value));
 d.clearDice();assert.equal(d.buildDice('Movement',0).geometry,g);
});

test('resin dice use polished alpha surfaces without an expensive transmission pass',async()=>{
 const{d,THREE}=await board();
 for(const kind of ['Movement','Treasure','Rune','Action']){
  const die=d.buildDice(kind,0);
  for(const material of die.material){assert.equal(material.isMeshPhysicalMaterial,true);assert.equal(material.transparent,true);assert.equal(material.clearcoat,1);assert.equal(material.transmission,0);assert.equal(material.side,THREE.FrontSide)}
 }
 const offering=d.buildDice('Offer',0),lastChance=d.buildDice('Last Chance',0);
 assert.equal(offering.children[0].material,lastChance.children[0].material);
 assert.ok(offering.children[0].material.opacity<1);
 for(const material of offering.userData.resultMaterials){assert.equal(material.transparent,true);assert.equal(material.clearcoat,1);assert.equal(material.transmission,0)}
});

test('a replacement roll and hide cancel pending rolls without stale pose updates',async()=>{
 const{d}=await board();d.buildDice('Movement',0);d.prepare=()=>true;d.render=()=>{};
 d.canvas={classList:{add(){},remove(){}}};d.animationGeneration=0;d.pendingResolve=null;
 let id=0;const frames=new Map();
 global.requestAnimationFrame=callback=>{frames.set(++id,callback);return id};global.cancelAnimationFrame=handle=>frames.delete(handle);global.matchMedia=()=>({matches:false});
 const first=d.cast([{label:'Movement',result:'2'}]);const stale=[...frames.values()][0];
 const second=d.cast([{label:'Movement',result:'6'}]);assert.equal(await first,false);
 d.hide();assert.equal(await second,false);assert.equal(frames.size,0);
 const before=d.dice[0].position.clone();stale(performance.now()+9999);assert.ok(d.dice[0].position.equals(before));
 const last=d.cast([{label:'Movement',result:'4'}]);[...frames.values()][0](performance.now()+9999);assert.equal(await last,true);assert.equal(d.pendingResolve,null);
});

test('reduced motion resolves the correct die in one frame',async()=>{
 const{d}=await board();d.buildDice('Movement',0);d.prepare=()=>true;d.render=()=>{};d.canvas={classList:{add(){},remove(){}}};d.animationGeneration=0;
 let callback;global.requestAnimationFrame=fn=>{callback=fn;return 1};global.cancelAnimationFrame=()=>{};global.matchMedia=()=>({matches:true});
 const done=d.cast([{label:'Movement',result:'3'}],2000);callback(performance.now());assert.equal(await done,true);assert.equal(d.dice[0].userData.resultFace,2);
});

test('all fifteen selection combinations keep unselected 3D dice stationary and return selected dice to their slots',async()=>{
 const{d,THREE}=await board();
 for(const label of ['Movement','Treasure','Rune','Offer']){const die=d.buildDice(label,0);die.userData.selectionLabel=label;die.position.set(0,1.255,0)}
 d.render=()=>{};d.animationGeneration=0;
 let callback;global.requestAnimationFrame=fn=>{callback=fn;return 1};global.cancelAnimationFrame=()=>{};
 for(const reduced of [false,true])for(let mask=1;mask<16;mask++){
  global.matchMedia=()=>({matches:reduced});
  d.dice.forEach((die,i)=>die.userData.selected=Boolean(mask&(1<<i)));
  const before=d.dice.map(die=>({position:die.position.clone(),quaternion:die.quaternion.clone()}));
  const specs=d.dice.filter(die=>die.userData.selected).map(die=>({label:die.userData.selectionLabel,result:die.userData.labels.at(-1)}));
  const done=d.castSelection(specs);callback(performance.now()+9999);assert.equal(await done,true);
  d.dice.forEach((die,i)=>{
   if(!die.userData.selected){assert.ok(die.position.equals(before[i].position));assert.ok(die.quaternion.equals(before[i].quaternion))}
   else{const normals=die.userData.faceNormals||[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(v=>new THREE.Vector3(...v));assert.ok(normals[die.userData.resultFace].clone().applyQuaternion(die.quaternion).y>.999);assert.ok(Math.abs(die.position.z-.48)<1e-6)}
  });
  const returned=d.returnSelection();callback(performance.now()+9999);assert.equal(await returned,true);
  d.dice.filter(die=>die.userData.selected).forEach(die=>{assert.equal(die.position.x,0);assert.equal(die.position.z,0);assert.ok(Math.abs(die.position.y-(die.userData.restHeight||1.035)-.22)<1e-6)});
 }
});

test('a cancelled selection roll cannot write a stale pose',async()=>{
 const{d}=await board();const die=d.buildDice('Offer',0);die.userData.selectionLabel='Offer';d.render=()=>{};d.animationGeneration=0;
 let callback;global.requestAnimationFrame=fn=>{callback=fn;return 1};global.cancelAnimationFrame=()=>{};global.matchMedia=()=>({matches:false});
 const pending=d.castSelection([{label:'Offer',result:'20'}]);d.cancelAnimation();assert.equal(await pending,false);
 const before=die.position.clone();callback(performance.now()+9999);assert.ok(die.position.equals(before));
});
