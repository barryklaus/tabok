import * as THREE from 'three';

// Built once at scene creation. All cells share these maps; variation lives in
// mesh UVs and instance colors rather than another uploaded texture per tile.
function randomFor(seed) {
  let state = seed >>> 0;
  return () => ((state = Math.imul(1664525, state) + 1013904223 >>> 0) / 4294967296);
}

export function makeRuinStoneMaps(image, type, anisotropy = 4) {
  // iOS Safari has a much tighter GPU-process memory ceiling than desktop
  // browsers. The physical screen size makes 256px shared tile maps visually
  // equivalent on phones while cutting this ten-texture set to one quarter.
  const size = matchMedia('(max-width: 900px), (pointer: coarse)').matches ? 256 : 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size);
  const tint = { P: [66, 55, 76], T: [44, 66, 66], G: [67, 64, 59], B: [49, 46, 45], W: [112, 101, 79] }[type];
  const height = document.createElement('canvas');
  height.width = height.height = size;
  const hctx = height.getContext('2d');
  const relief = hctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const grey = pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114;
    const cloud = Math.sin(x * .023 + Math.sin(y * .018)) * Math.cos(y * .031) * .09;
    const nx = (x / size - .5) * 2, nz = (y / size - .5) * 2;
    const edgeDistance = Math.max(Math.abs(nx) / .866, Math.abs(.5 * nx + .866 * nz) / .866, Math.abs(.5 * nx - .866 * nz) / .866);
    const edgeWear = .72 + .28 * Math.min(1, Math.max(0, (1 - edgeDistance) / .14));
    const value = Math.max(.45, .92 + (grey - 139) / 120 + cloud) * edgeWear;
    for (let c = 0; c < 3; c++) {
      pixels.data[i + c] = tint[c] * value;
      relief.data[i + c] = 100 + grey * .34 + cloud * 40;
    }
    relief.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  hctx.putImageData(relief, 0, 0);
  const rand = randomFor(7823); // Same fractures under every network color.
  const stroke = (target, points, color, width, offset = 0) => {
    target.beginPath();
    points.forEach(([x, y], i) => i ? target.lineTo(x + offset, y + offset) : target.moveTo(x + offset, y + offset));
    target.strokeStyle = color; target.lineWidth = width; target.lineJoin = 'round'; target.stroke();
  };
  for (let crack = 0; crack < 5; crack++) {
    const angle = crack / 5 * Math.PI * 2 + .35;
    let x = 256 + Math.sin(angle) * 285, y = 256 + Math.cos(angle) * 285;
    const points = [[x, y]];
    for (let j = 0; j < 7; j++) {
      x += (256 - x) * .17 + (rand() - .5) * 34;
      y += (256 - y) * .17 + (rand() - .5) * 34;
      points.push([x, y]);
    }
    stroke(ctx, points, 'rgba(2,6,10,.25)', 6);
    stroke(ctx, points, 'rgba(214,200,164,.20)', 1.5, 1.8);
    stroke(ctx, points, 'rgba(9,12,16,.77)', 1.9);
    stroke(hctx, points, '#393939', 2.6);
    if (crack % 2 === 0) {
      const branch = points.slice(2, 4);
      branch.push([branch[1][0] + 44, branch[1][1] - 27], [branch[1][0] + 62, branch[1][1] - 29]);
      stroke(ctx, branch, 'rgba(8,11,14,.48)', 1.3);
      stroke(hctx, branch, '#555555', 1.6);
    }
  }
  // Sparse mineral flecks: baked details, not a particle or mesh per speck.
  for (let i = 0; i < 220; i++) {
    const x = rand() * size, y = rand() * size, radius = .35 + rand() * 1.5;
    ctx.fillStyle = i % 4 ? 'rgba(15,20,22,.24)' : 'rgba(196,170,119,.25)';
    ctx.fillRect(x, y, radius * 1.8, radius);
  }
  ctx.strokeStyle = 'rgba(193,175,136,.13)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(272, 244, 109, .2, 1.7); ctx.stroke();
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(height);
  for (const texture of [map, bump]) {
    texture.anisotropy = anisotropy;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  }
  return { map, bump };
}

// A flat contact surface, a narrow worn bevel, and clipped/chipped corners.
// Its footprint never extends past the original logical hex radius.
export function makeWornHexGeometry(radius, depth, variant = 0) {
  const rand = randomFor(341 + variant * 917);
  const corners = Array.from({ length: 6 }, (_, i) => {
    const a = i * Math.PI / 3;
    return [Math.sin(a) * radius, Math.cos(a) * radius];
  });
  const outline = [];
  for (let i = 0; i < 6; i++) {
    const a = corners[i], b = corners[(i + 1) % 6];
    for (const t of [.045 + rand() * .04, .91 + rand() * .045]) {
      const chip = .994 + rand() * .006;
      outline.push([(a[0] + (b[0] - a[0]) * t) * chip, (a[1] + (b[1] - a[1]) * t) * chip]);
    }
  }
  const positions = [], uvs = [], groups = [];
  const angle = variant * Math.PI / 3, cs = Math.cos(angle), sn = Math.sin(angle);
  const vertex = p => {
    positions.push(...p);
    uvs.push(.5 + (p[0] * cs - p[2] * sn) / radius * .5, .5 + (p[0] * sn + p[2] * cs) / radius * .5);
  };
  const triangle = (a, b, c) => { vertex(a); vertex(b); vertex(c); };
  const point = (i, scale, y) => [outline[i][0] * scale, y, outline[i][1] * scale];
  let start = 0;
  for (const [s0, y0, s1, y1] of [[1, -depth / 2, 1, depth / 2 - .025], [1, depth / 2 - .025, .965, depth / 2]]) {
    for (let i = 0; i < outline.length; i++) {
      const j = (i + 1) % outline.length;
      const a = point(i, s0, y0), b = point(j, s0, y0), c = point(j, s1, y1), d = point(i, s1, y1);
      triangle(a, b, c); triangle(a, c, d);
    }
  }
  groups.push([start, positions.length / 3, 0]); start = positions.length / 3;
  for (let i = 0; i < outline.length; i++) triangle([0, depth / 2, 0], point(i, .965, depth / 2), point((i + 1) % outline.length, .965, depth / 2));
  groups.push([start, positions.length / 3 - start, 1]); start = positions.length / 3;
  for (let i = 0; i < outline.length; i++) triangle([0, -depth / 2, 0], point((i + 1) % outline.length, 1, -depth / 2), point(i, 1, -depth / 2));
  groups.push([start, positions.length / 3 - start, 2]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  groups.forEach(group => geometry.addGroup(...group));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function makeRuinFoundation(cells, worldFor, radius, maps) {
  const root = new THREE.Group(); root.name = 'Fractured stone foundation';
  const ids = new Set(cells.map(c => `${c.q},${c.r}`));
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  const border = cells.filter(c => steps.some(([q, r]) => !ids.has(`${c.q + q},${c.r + r}`)));
  const material = new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.bump, bumpScale: .08, roughness: .94, color: 0xb2b4b8 });
  const cliffGeometry = new THREE.CylinderGeometry(radius * 1.01, radius * .96, 1, 7);
  cliffGeometry.clearGroups(); // One material / one draw for all cliff blocks.
  const cliffs = new THREE.InstancedMesh(cliffGeometry, material, border.length * 3);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  border.forEach((cell, index) => {
    const pos = worldFor(`${cell.q},${cell.r}`), rand = randomFor(index * 887 + 72);
    for (let layer = 0; layer < 3; layer++) {
      const height = .95 + rand() * .28;
      dummy.position.set(pos.x + (rand() - .5) * .12, -.54 - layer * .88, pos.z + (rand() - .5) * .12);
      dummy.rotation.set(0, (rand() - .5) * .09, 0);
      dummy.scale.set(1 - layer * .035, height, 1 - layer * .035); dummy.updateMatrix();
      cliffs.setMatrixAt(index * 3 + layer, dummy.matrix);
      cliffs.setColorAt(index * 3 + layer, color.setScalar(.72 + rand() * .3 - layer * .09));
    }
  });
  cliffs.receiveShadow = true; root.add(cliffs);

  // A closed bed under the seams, with no circular platter beyond the hex coast.
  const points = border.flatMap(cell => {
    const p = worldFor(`${cell.q},${cell.r}`);
    return Array.from({ length: 6 }, (_, i) => [p.x + Math.sin(i * Math.PI / 3) * radius, p.z + Math.cos(i * Math.PI / 3) * radius]);
  }).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const hull = [];
  for (const point of points) { while (hull.length > 1 && cross(hull.at(-2), hull.at(-1), point) <= 0) hull.pop(); hull.push(point); }
  const lowerLength = hull.length;
  for (const point of points.slice().reverse()) { while (hull.length > lowerLength && cross(hull.at(-2), hull.at(-1), point) <= 0) hull.pop(); hull.push(point); }
  hull.pop();
  // Recess the solid core behind the fractured blocks. Otherwise its convex
  // wall bridges their recesses and hides the cliff silhouette at low angles.
  const shape = new THREE.Shape(hull.map(([x, z]) => new THREE.Vector2(x * .952, -z * .952)));
  const bedGeo = new THREE.ExtrudeGeometry(shape, { depth: 2.3, bevelEnabled: false });
  bedGeo.rotateX(-Math.PI / 2); bedGeo.translate(0, -2.42, 0); bedGeo.clearGroups();
  const bed = new THREE.Mesh(bedGeo, new THREE.MeshStandardMaterial({ color: 0x151920, roughness: 1 }));
  bed.receiveShadow = true; root.add(bed);

  // Scenery lives only on the blocked outer wall. Entry and playable cells stay clear.
  const sites = border.filter(c => c.type === 'B');
  const rubbleGeo = new THREE.DodecahedronGeometry(1, 0);
  const rubble = new THREE.InstancedMesh(rubbleGeo, material, sites.length * 4);
  const masonryGeo = new THREE.BoxGeometry(1, 1, 1);
  const masonry = new THREE.InstancedMesh(masonryGeo, material, sites.length * 8);
  let masonryCount = 0;
  sites.forEach((cell, i) => {
    const p = worldFor(`${cell.q},${cell.r}`), rand = randomFor(i * 913 + 94);
    for (let j = 0; j < 4; j++) {
      const scale = .055 + rand() * .1;
      dummy.position.set(p.x + (rand() - .5) * .8, .18 + scale * .22, p.z + (rand() - .5) * .8);
      dummy.rotation.set(rand(), rand() * 6, rand()); dummy.scale.set(scale * 1.5, scale * .75, scale); dummy.updateMatrix();
      rubble.setMatrixAt(i * 4 + j, dummy.matrix);
      rubble.setColorAt(i * 4 + j, color.setScalar(.75 + rand() * .5));
    }
    if(i%2)return;
    const facing=Math.atan2(p.x,p.z),style=i%4,towers=style===2?2:1;
    for(let tower=0;tower<towers;tower++){
      const courses=style===0?5+Math.floor(rand()*3):style===1?2+Math.floor(rand()*3):3+Math.floor(rand()*3);
      const lateral=towers===2?(tower?1:-1)*.24:0;
      for(let course=0;course<courses;course++){
        const taper=1-course*.055,lean=style===3?course*.035:0;
        const width=(style===0?.38:style===1?.66:.45)*taper;
        dummy.position.set(p.x+Math.cos(facing)*lateral+Math.sin(facing)*lean,.27+course*(style===0?.34:.28),p.z-Math.sin(facing)*lateral+Math.cos(facing)*lean);
        dummy.rotation.set(style===3?.035*course:0,facing+(rand()-.5)*.11,style===1&&course===courses-1?.14:0);
        dummy.scale.set(width,style===0?.31:.25,width*(style===1?.76:.9));dummy.updateMatrix();
        masonry.setMatrixAt(masonryCount,dummy.matrix);masonry.setColorAt(masonryCount++,color.setScalar(.72+rand()*.38));
      }
    }
  });
  masonry.count = masonryCount;
  masonry.receiveShadow = rubble.receiveShadow = true;
  root.add(masonry, rubble);

  // A few low-poly hanging chains sell the floating ruin silhouette. All links
  // share one geometry/material and therefore remain a single draw call.
  const mobile=matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  const chainRuns=Math.min(mobile?4:7,Math.floor(sites.length/3)),linksPerRun=mobile?7:11;
  const chainGeometry=new THREE.TorusGeometry(.09,.022,4,7);
  const chainMaterial=new THREE.MeshStandardMaterial({color:0x40352f,roughness:.68,metalness:.62});
  const chains=new THREE.InstancedMesh(chainGeometry,chainMaterial,chainRuns*linksPerRun);
  const ordered=sites.slice().sort((a,b)=>Math.atan2(worldFor(`${a.q},${a.r}`).z,worldFor(`${a.q},${a.r}`).x)-Math.atan2(worldFor(`${b.q},${b.r}`).z,worldFor(`${b.q},${b.r}`).x));
  const localNormal=new THREE.Vector3(0,0,1),normal=new THREE.Vector3();let chainIndex=0;
  for(let run=0;run<chainRuns;run++){
    const startCell=ordered[Math.floor(run*ordered.length/chainRuns)],endCell=ordered[(Math.floor(run*ordered.length/chainRuns)+2)%ordered.length];
    const start=worldFor(`${startCell.q},${startCell.r}`),end=worldFor(`${endCell.q},${endCell.r}`);
    for(let link=0;link<linksPerRun;link++){
      const t=link/(linksPerRun-1),x=THREE.MathUtils.lerp(start.x,end.x,t),z=THREE.MathUtils.lerp(start.z,end.z,t),length=Math.hypot(x,z)||1;
      normal.set(link%2?-(end.z-start.z):x/length,0,link%2?(end.x-start.x):z/length).normalize();
      dummy.position.set(x+x/length*.42,.05-Math.sin(t*Math.PI)*.95,z+z/length*.42);
      dummy.quaternion.setFromUnitVectors(localNormal,normal);dummy.scale.setScalar(.9);dummy.updateMatrix();chains.setMatrixAt(chainIndex++,dummy.matrix);
    }
  }
  chains.count=chainIndex;chains.instanceMatrix.needsUpdate=true;chains.castShadow=false;chains.receiveShadow=true;root.add(chains);
  return root;
}

export function makeContactShadow() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(2,3,7,.65)'); gradient.addColorStop(.4, 'rgba(2,3,7,.38)'); gradient.addColorStop(1, 'rgba(2,3,7,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, toneMapped: false });
}
