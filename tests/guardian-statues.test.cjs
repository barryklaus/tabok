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

test('candles stay dark until awakening, then cast local light that follows the statue',async()=>{
 const [{createGuardianStatue},THREE]=await ready;
 for(let i=0;i<6;i++)for(const active of [false,true]){
  const statue=createGuardianStatue(i,active);
  const flames=statue.getObjectByName('Candle flames');
  const lights=flames.children.filter(node=>node.isPointLight);
  assert.equal(flames.visible,active,'dormant candles have no visible flame');
  assert.equal(lights.length,2,'one light per cluster keeps the light budget bounded');
  for(const time of [0,2,200]){
   statue.userData.update(time);
   for(const light of lights){
    assert.equal(light.intensity>0,active,'updates must not ignite dormant candles');
    assert.ok(Number.isFinite(light.intensity));
    assert.ok(light.distance>0&&light.distance<2,'candlelight remains at the statue base');
    assert.equal(light.castShadow,false);
   }
  }
  statue.position.set(4,.11,7);statue.updateMatrixWorld(true);
  for(const light of lights){
   const offset=light.getWorldPosition(new THREE.Vector3()).sub(statue.position);
   statue.position.x+=3;statue.updateMatrixWorld(true);
   assert.ok(light.getWorldPosition(new THREE.Vector3()).sub(statue.position).distanceTo(offset)<1e-8);
  }
  if(!active){
   const visibleLights=[];statue.traverseVisible(node=>{if(node.isLight)visibleLights.push(node);});
   assert.equal(visibleLights.length,0,'dormant lights are excluded from rendering');
   statue.userData.setActive(true);statue.userData.update(1);
   assert.equal(statue.userData.guardian.active,true);
   assert.equal(flames.visible,true,'the existing dormant sculpture awakens without rebuilding geometry');
   for(const light of lights)assert.ok(light.intensity>0);
  }
 }
});
