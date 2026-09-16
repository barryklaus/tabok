const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),threeURL=pathToFileURL(path.join(root,'vendor/three.core.min.js')).href;
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
let forge=fs.readFileSync(path.join(root,'cast-forge.js'),'utf8').replace("from 'three'",`from '${threeURL}'`);
forge=forge.slice(0,forge.indexOf('export function material('))+`export function material(color,kind,options={}){return new THREE.MeshStandardMaterial({color,vertexColors:true,...options});}\n`+forge.slice(forge.indexOf('export function mesh('));
const keeper=fs.readFileSync(path.join(root,'void-keeper.js'),'utf8').replace("from 'three'",`from '${threeURL}'`).replace(/from '\.\/cast-forge\.js[^']*'/,`from '${data(forge)}'`);
const ready=Promise.all([import(data(keeper)),import(threeURL)]);

test('Void Keeper is volumetric, finite, and fits the existing major-monster board scale',async()=>{
 const [{createVoidKeeper},THREE]=await ready,m=createVoidKeeper();
 assert.equal(m.name,'The Void Keeper');assert.equal(m.userData.rig.shards.length,7);
 let triangles=0,draws=0;
 m.traverse(n=>{
  assert.ok(!n.isSprite,'reference is sculpted geometry');
  assert.ok(!n.isLight,'model adds no board light or shadow passes');
  if(!n.isMesh)return;draws++;
  for(const attr of ['position','normal','uv','color']){
   assert.ok(n.geometry.attributes[attr]);for(const v of n.geometry.attributes[attr].array)assert.ok(Number.isFinite(v));
  }
  assert.ok(n.userData.ownedActorMaterial);
  triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3*(n.isInstancedMesh?n.count:1);
 });
 assert.equal(triangles,m.userData.design.triangles);assert.equal(draws,m.userData.design.draws);
 assert.ok(triangles<80000);assert.ok(draws<=72,'halo and static details stay batched');
 const b=new THREE.Box3().setFromObject(m),size=b.getSize(new THREE.Vector3());
 assert.ok(size.y>5.5&&size.y<6.6);assert.ok(size.z>1.5);
 assert.ok(size.x*.36<1.25,'idle silhouette fits the existing major actor footprint');
});

test('all game action modes animate finite poses without moving the rules anchor',async()=>{
 const [{createVoidKeeper},THREE]=await ready,m=createVoidKeeper();
 const instance=m.getObjectByName('Instanced rune seals');assert.ok(instance?.isInstancedMesh);
 for(const mode of ['idle','summon','levitate','move','walk','kill','attack','blast']){
  m.userData.setMode(mode);
  m.userData.update(1);const before=Array.from(instance.instanceMatrix.array);
  m.userData.update(3);assert.notDeepEqual(Array.from(instance.instanceMatrix.array),before,mode+' keeps halo alive');
  for(const time of [0,1,19,500,10000]){
   m.userData.update(time);m.updateMatrixWorld(true);
   m.traverse(n=>n.matrixWorld.elements.forEach(v=>assert.ok(Number.isFinite(v),mode)));
   assert.deepEqual(m.position.toArray(),[0,0,0]);
   const b=new THREE.Box3().setFromObject(m);assert.ok(b.max.y<6.7&&b.min.y>-.4);
  }
 }
 m.userData.setMode('idle');m.userData.update(5);
 const idle=m.userData.rig.arms[0].arm.rotation.x;
 m.userData.setMode('kill');m.userData.update(5);assert.ok(Math.abs(m.userData.rig.arms[0].arm.rotation.x-idle)>.8);
 m.userData.setMode('idle');m.userData.update(5);assert.equal(m.userData.rig.arms[0].arm.rotation.x,idle);
});

test('the existing public monster factory routes major monsters to the new sculpture',async()=>{
 const sculpt=fs.readFileSync(path.join(root,'sculpted-monsters.js'),'utf8')
  .replace("from 'three'",`from '${threeURL}'`).replace(/from '\.\/cast-forge\.js[^']*'/,`from '${data(forge)}'`)
  .replace(/from '\.\/void-keeper\.js[^']*'/,`from '${data(keeper)}'`);
 const factory=fs.readFileSync(path.join(root,'monster-3d-models.js'),'utf8').replace(/from '\.\/sculpted-monsters\.js[^']*'/,`from '${data(sculpt)}'`);
 const api=await import(data(factory));
 assert.equal(api.createMonsterPilot('major').name,'The Void Keeper');assert.equal(api.createMajorMonster().name,'The Void Keeper');
 assert.match(api.createMinorMonster().name,/Riftback/);assert.equal(api.MONSTER_3D.major.title,'The Void Keeper');
 const board=fs.readFileSync(path.join(root,'true3d-board.js'),'utf8');assert.match(board,/this\.prewarmedMajorVisual\|\|createMonsterPilot\('major'\)/);
});
