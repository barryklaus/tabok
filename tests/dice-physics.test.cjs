const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const threeURL=pathToFileURL(path.join(root,'vendor/three.core.min.js')).href;
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const source=fs.readFileSync(path.join(root,'dice-physics.js'),'utf8').replace("from 'three'",`from '${threeURL}'`).replace("from './vendor/cannon-es.js'",`from '${pathToFileURL(path.join(root,'vendor/cannon-es.js')).href}'`);
const ready=Promise.all([import(data(source)),import(threeURL)]);
const rng=initial=>{let seed=initial;return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)};
function die(THREE,sides,face){
  const geometry=sides===20?new THREE.IcosahedronGeometry(1.46,0):new THREE.BoxGeometry(2.05,2.05,2.05);
  const normals=sides===20?Array.from({length:20},(_,i)=>{
    const p=geometry.attributes.position,a=new THREE.Vector3().fromBufferAttribute(p,i*3),b=new THREE.Vector3().fromBufferAttribute(p,i*3+1),c=new THREE.Vector3().fromBufferAttribute(p,i*3+2);
    return b.sub(a).cross(c.sub(a)).normalize();
  }):[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(v=>new THREE.Vector3(...v));
  return {userData:{resultFace:face,...(sides===20?{faceNormals:normals,restHeight:1.46*Math.sqrt((5+2*Math.sqrt(5))/15)+.006}:{})},children:[{geometry}],normals};
}

test('all D6 and D20 results survive gravity, impacts and flat settling without a final snap',async()=>{
  const [{simulateDiceThrow,sampleDiceThrow},THREE]=await ready;
  for(const sides of [6,20])for(let face=0;face<sides;face++){
    const d=die(THREE,sides,face),plan=simulateDiceThrow([d],rng(1023+face));
    assert.ok(plan.collisions>0);assert.ok(plan.settled);assert.ok(plan.frames.length>30);
    const last=plan.frames.at(-1)[0];
    assert.ok(d.normals[face].clone().applyQuaternion(last.quaternion).y>.999);
    assert.ok(last.position.y>1&&last.position.y<1.3);
    const end=sampleDiceThrow(plan,1)[0];
    assert.ok(end.position.distanceTo(last.position)<1e-9);
    assert.ok(end.quaternion.angleTo(last.quaternion)<1e-6);
    const penultimate=plan.frames.at(-2)[0];
    assert.ok(penultimate.position.distanceTo(last.position)<.02);
    assert.ok(penultimate.quaternion.angleTo(last.quaternion)<.02);
    for(const frame of plan.frames){
      const p=frame[0];for(const value of [...p.position.toArray(),...p.quaternion.toArray()])assert.ok(Number.isFinite(value));
      assert.ok(Math.abs(p.position.x)<5.4&&Math.abs(p.position.z)<3.5);
    }
  }
});

test('mixed throws keep each assigned face and preserve the exact collision shape under relabeling',async()=>{
  const [{simulateDiceThrow},THREE]=await ready;
  for(let seed=0;seed<10;seed++){
    const dice=[die(THREE,6,seed%6),die(THREE,6,(seed+2)%6),die(THREE,20,seed)];
    const plan=simulateDiceThrow(dice,rng(2049+seed));
    plan.frames.at(-1).forEach((pose,index)=>{
      assert.ok(dice[index].normals[dice[index].userData.resultFace].clone().applyQuaternion(pose.quaternion).y>.999);
      assert.ok(pose.position.y<1.3,'no stacked result');
    });
    // A constant symmetry may move labels, but no corrected vertex may pass
    // through the floor once the rigid body has settled.
    dice.forEach((d,index)=>{
      const p=d.children[0].geometry.attributes.position,pose=plan.frames.at(-1)[index];let lowest=Infinity;
      for(let i=0;i<p.count;i++)lowest=Math.min(lowest,new THREE.Vector3().fromBufferAttribute(p,i).applyQuaternion(pose.quaternion).add(pose.position).y);
      assert.ok(lowest>-.025&&lowest<.04);
    });
  }
});

test('same launch seed gives the same throw independent of render frame rate',async()=>{
  const [{simulateDiceThrow,sampleDiceThrow},THREE]=await ready;
  const dice=[die(THREE,6,4),die(THREE,20,18)];
  const a=simulateDiceThrow(dice,rng(739)),b=simulateDiceThrow(dice,rng(739));
  assert.equal(a.frames.length,b.frames.length);
  for(const t of [0,.125,.51,.875,1])sampleDiceThrow(a,t).forEach((p,i)=>{
    const q=sampleDiceThrow(b,t)[i];assert.ok(p.position.distanceTo(q.position)<1e-8);assert.ok(p.quaternion.angleTo(q.quaternion)<1e-6);
  });
});
