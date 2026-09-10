const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const threeURL=pathToFileURL(path.join(root,'vendor/three.core.min.js')).href;
const dataURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
// Geometry tests use the real sculpting helpers and Three.js. Surface-map
// painting needs a browser canvas and is covered by the interactive previews.
let forge=fs.readFileSync(path.join(root,'cast-forge.js'),'utf8').replace("from 'three'",`from '${threeURL}'`);
const start=forge.indexOf('export function material('),end=forge.indexOf('\nexport function mesh(',start);
forge=forge.slice(0,start)+`export function material(color,kind,options={}) {return new THREE.MeshStandardMaterial({color,vertexColors:true,...options});}\n`+forge.slice(end);
let source=fs.readFileSync(path.join(root,'guardian-statues.js'),'utf8').replace("from 'three'",`from '${threeURL}'`).replace(/from '\.\/cast-forge\.js[^']*'/,`from '${dataURL(forge)}'`);
const ready=Promise.all([import(dataURL(source)),import(threeURL)]);

test('all six guardians are finite, grounded, bounded solid models with distinct relics',async()=>{
 const [{createGuardianStatue,GUARDIANS},THREE]=await ready;
 assert.equal(new Set(GUARDIANS.map(g=>g.relic)).size,6);
 for(let i=0;i<6;i++){
  const model=createGuardianStatue(i);
  assert.equal(model.userData.guardian.name,GUARDIANS[i].name);
  assert.ok(model.getObjectByName(GUARDIANS[i].relic));
  assert.ok(model.getObjectByName('Bronze halo'));
  assert.ok(model.userData.design.triangles<55000);
  assert.ok(model.userData.design.draws<=24,'static details remain batched');
  model.traverse(n=>{
   assert.ok(!n.isSprite,'every guardian detail has real 3D geometry');
   if(!n.isMesh)return;
   assert.equal(n.castShadow,false);assert.equal(n.receiveShadow,false);
   for(const attr of ['position','normal'])for(const value of n.geometry.attributes[attr].array)assert.ok(Number.isFinite(value));
  });
  const bounds=new THREE.Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.min.y)<.001,'base rests on its anchor');
  assert.ok(bounds.max.y>3&&bounds.max.y<3.4,'all statues keep equal monumental scale');
  assert.ok(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))*.86<.62,'fits within a playable hex');
  assert.ok(bounds.max.z-bounds.min.z>1,'sculpture has physical depth');
 }
});
test('awakening preserves each guardian geometry and updates glow without moving its anchor',async()=>{
 const [{createGuardianStatue},THREE]=await ready;
 for(let i=0;i<6;i++){
  const dormant=createGuardianStatue(i,false),awake=createGuardianStatue(i,true);
  assert.equal(dormant.userData.design.triangles,awake.userData.design.triangles);
  const a=new THREE.Box3().setFromObject(dormant),b=new THREE.Box3().setFromObject(awake);
  assert.ok(a.min.distanceTo(b.min)<1e-8&&a.max.distanceTo(b.max)<1e-8);
  awake.userData.activationUntil=performance.now()+1500;
  for(const mode of ['idle','move','summon']){
   awake.userData.setMode(mode);awake.userData.update(1.2);dormant.userData.update(1.2);
   assert.deepEqual(awake.position.toArray(),[0,0,0]);
  }
  assert.equal(awake.userData.guardian.index,i);
 }
});
