const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),threeURL=pathToFileURL(path.join(root,'vendor/three.core.min.js')).href;
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const rounded=fs.readFileSync(path.join(root,'vendor/addons/geometries/RoundedBoxGeometry.js'),'utf8').replace(/from 'three'/g,`from '${threeURL}'`);
// The browser checks texture painting. These tests exercise the production
// geometry, face alignment and cache with lightweight canvas-free textures.
const art=data(`import * as THREE from '${threeURL}';export const DICE_PALETTES={};export async function preloadTreasureIcons(){};export function faceTexture(){return {texture:new THREE.Texture(),emissiveMap:new THREE.Texture()}};export const offerFaceTexture=faceTexture;`);
const src=fs.readFileSync(path.join(root,'true3d-dice.js'),'utf8').replace(/from 'three'/g,`from '${threeURL}'`).replace(/from 'three\/addons\/geometries\/RoundedBoxGeometry.js'/,`from '${data(rounded)}'`).replace(/from '\.\/dice-reference-art.js[^']*'/,`from '${art}'`);
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
