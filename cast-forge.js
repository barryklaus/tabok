import * as THREE from 'three';

// Small shared, authored surface maps. Geometry carries the silhouette;
// bump and roughness carry close-up detail without extra polygons.
const surfaces = new Map();
const albedos = new Map();
function surface(kind) {
  if (surfaces.has(kind)) return surfaces.get(kind);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256);
  let seed = 73471;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const n = random(), grain = Math.sin(x * .43 + Math.sin(y * .12) * 3);
    let value = 150 + n * 30;
    if (kind === 'cloth') value = 140 + (x % 4 < 2 ? 15 : -15) + (y % 4 < 2 ? 12 : -12) + n * 12;
    if (kind === 'leather') value = 146 + n * 24 + grain * 7 + Math.sin(y * .53) * 7;
    if (kind === 'metal') value = 179 + n * 9 + (y % 17 === 0 ? -17 : 0);
    if (kind === 'stone') value = 112 + n * 56 + Math.sin(x * .12 + y * .09) * 23;
    if (kind === 'skin') value = 174 + n * 8;
    const i = (y * 256 + x) * 4; pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  if (kind === 'metal' || kind === 'stone') {
    ctx.strokeStyle = kind === 'metal' ? '#929292' : '#505050'; ctx.lineWidth = .65;
    for (let i = 0; i < 27; i++) { const x = random() * 256, y = random() * 256; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 27, y + random() * 11); ctx.stroke(); }
  }
  const map = new THREE.CanvasTexture(canvas); map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4; surfaces.set(kind, map); return map;
}

export function material(color, kind = 'cloth', options = {}) {
  const properties = {cloth:[.94,0,.024],leather:[.77,0,.018],metal:[.38,.8,.007],stone:[.89,.12,.04],skin:[.61,0,.006],bone:[.56,.05,.012],hair:[.68,.02,.012]};
  const [roughness,metalness,bumpScale] = properties[kind] || properties.cloth;
  const map = surface(kind);
  if(!albedos.has(kind)&&['cloth','leather','metal','stone'].includes(kind)){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.drawImage(map.image,0,0);const pixels=ctx.getImageData(0,0,256,256);
    for(let i=0;i<pixels.data.length;i+=4){const value=218+(pixels.data[i]-145)*.50;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;}
    ctx.putImageData(pixels,0,0);const albedo=new THREE.CanvasTexture(c);albedo.colorSpace=THREE.SRGBColorSpace;albedo.wrapS=albedo.wrapT=THREE.RepeatWrapping;albedo.anisotropy=4;albedos.set(kind,albedo);
  }
  return new THREE.MeshStandardMaterial({color,map:albedos.get(kind)||null,roughness,metalness,bumpMap:map,bumpScale,roughnessMap:kind==='metal'?map:null,vertexColors:true,...options});
}

export function mesh(parent, geometry, mat, pos = [0,0,0], scale = [1,1,1], rot = [0,0,0]) {
  if (!geometry.attributes.color) {
    const normals = geometry.attributes.normal, colors = new Float32Array(normals.count * 3);
    for (let i=0;i<normals.count;i++) { const shade=.84+Math.max(0,normals.getY(i))*.16; colors[i*3]=colors[i*3+1]=colors[i*3+2]=shade; }
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  }
  const m = new THREE.Mesh(geometry,mat); m.position.set(...(pos.length?pos:[0,0,0]));m.scale.set(...scale);m.rotation.set(...rot);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
export const orb = (parent, mat, pos, scale, detail = 14) => mesh(parent,new THREE.SphereGeometry(1,detail,10),mat,pos,scale);
export const joint = (parent, name, pos) => { const g=new THREE.Bone();g.name=name;g.position.set(...pos);parent.add(g);return g; };

// Cross-section lofts are used for tapered torsos, muscle, boots and bracers.
export function loft(parent, mat, rings, pos = [0,0,0], segments = 16) {
  const p=[],uv=[],ix=[];
  rings.forEach(([y,rx,rz,cx=0,cz=0],i)=>{for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;p.push(cx+Math.sin(a)*rx,y,cz+Math.cos(a)*rz);uv.push(j/segments,i/(rings.length-1));}});
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;ix.push(a,a+1,b,a+1,b+1,b);}
  for (const end of [0,rings.length-1]) {const [y,,,cx=0,cz=0]=rings[end],center=p.length/3;p.push(cx,y,cz);uv.push(.5,end?1:0);for(let j=0;j<segments;j++){const a=end*(segments+1)+j;ix.push(...(end?[center,a,a+1]:[center,a+1,a]));}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return mesh(parent,g,mat,pos);
}

export function tube(parent, mat, points, radii, segments = 7) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),steps=Math.max(8,points.length*4),frames=curve.computeFrenetFrames(steps,false),p=[],uv=[],ix=[];
  for(let i=0;i<=steps;i++){const u=i/steps,k=u*(radii.length-1),n=Math.min(radii.length-2,Math.floor(k)),radius=THREE.MathUtils.lerp(radii[n],radii[n+1],k-n),c=curve.getPointAt(u);for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,v=c.clone().addScaledVector(frames.normals[i],Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius);p.push(v.x,v.y,v.z);uv.push(j/segments,u);}}
  for(let i=0;i<steps;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;ix.push(a,a+1,b,a+1,b+1,b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return mesh(parent,g,mat);
}

export function plate(parent,mat,outline,depth=.045,pos=[0,0,0],rot=[0,0,0]) {
  const s=new THREE.Shape();outline.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
  return mesh(parent,new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:2,curveSegments:8}),mat,pos,[1,1,1],rot);
}
export function ring(parent,mat,radius,thickness,pos,rot=[0,0,0],segments=24){return mesh(parent,new THREE.TorusGeometry(radius,thickness,6,segments),mat,pos,[1,1,1],rot);}
export function rivet(parent,mat,pos,r=.023){return orb(parent,mat,pos,[r,r,r*.6],8);}
export function strap(parent,mat,a,b,width=.1){const mid=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5),delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=mesh(parent,new THREE.BoxGeometry(width,delta.length(),.04),mat,mid.toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}

export function clothPanel(parent,mat,{top=.42,bottom=.7,height=1.5,depth=.22,folds=4,pos=[0,0,0],ragged=false}={}){
  const p=[],uv=[],ix=[],cols=16,rows=10;
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const u=x/cols,v=y/rows,w=THREE.MathUtils.lerp(top,bottom,v);p.push((u-.5)*w,-height*v-(ragged&&y===rows?(x%4)*.04:0),-v*v*depth+Math.cos(u*Math.PI*2*folds)*(.02+v*.045));uv.push(u,v);}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;ix.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return mesh(parent,g,mat,pos);
}

// Merge only static siblings with the same material. Joints and animated pieces
// remain independent, so detail does not add a draw call per rivet or hair lock.
export function finish(root) {
  const groups=[];root.traverse(n=>{if(!n.isMesh)groups.push(n)});
  for(const parent of groups){
    const buckets=new Map();
    for(const m of parent.children){if(!m.isMesh||Array.isArray(m.material)||m.userData.keepSeparate||m.userData.galleryPlatform)continue;const key=m.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(m);}
    for(const bucket of buckets.values()){
      if(bucket.length<2)continue;const arrays={position:[],normal:[],uv:[],color:[]};
      for(const m of bucket){m.updateMatrix();let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);for(const k of Object.keys(arrays))arrays[k].push(g.attributes[k].array);g.dispose();parent.remove(m);m.geometry.dispose();}
      const geometry=new THREE.BufferGeometry();for(const [key,list]of Object.entries(arrays)){const total=list.reduce((n,a)=>n+a.length,0),out=new Float32Array(total);let offset=0;for(const a of list){out.set(a,offset);offset+=a.length;}geometry.setAttribute(key,new THREE.BufferAttribute(out,key==='uv'?2:3));}
      geometry.computeBoundingSphere();const merged=new THREE.Mesh(geometry,bucket[0].material);merged.name='Batched sculpt details';merged.castShadow=merged.receiveShadow=true;parent.add(merged);
    }
  }
  let triangles=0,draws=0;root.traverse(n=>{if(n.isMesh){n.userData.ownedActorMaterial=true;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;draws++;}});
  root.userData.design={edition:'Sculpted Ruins',triangles,draws,rigType:'articulated rigid-part skeleton'};return root;
}
