const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),threeURL=pathToFileURL(path.join(root,'vendor/three.core.min.js')).href;
const source=fs.readFileSync(path.join(root,'treasure-models.js'),'utf8').replace("from 'three'",`from '${threeURL}'`);
test('all fourteen treasure models are finite, volumetric, lightweight and within one hex',async()=>{
 const [{createTreasureModel},THREE]=await Promise.all([import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')),import(threeURL)]);
 const {ARTIFACTS,COMMONS}=require('../treasure-rules.js');
 for(const name of [...ARTIFACTS,...COMMONS]){
  const model=createTreasureModel(name);let triangles=0,meshes=0;
  model.traverse(n=>{assert.ok(!n.isLight);if(!n.isMesh)return;meshes++;for(const v of n.geometry.attributes.position.array)assert.ok(Number.isFinite(v));triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3});
  const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  assert.ok(size.x<1.1&&size.z<1.1&&size.y>.3&&size.y<1.4,name+' fits its hex');
  assert.ok(meshes>2&&meshes<30);assert.ok(triangles<10000);
 }
});
