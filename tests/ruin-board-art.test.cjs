const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const threeURL = pathToFileURL(path.join(root, 'vendor/three.core.min.js')).href;
const source = fs.readFileSync(path.join(root, 'ruin-board-art.js'), 'utf8').replace("from 'three'", `from '${threeURL}'`);
const artPromise = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const threePromise = import(threeURL);

test('worn hexes keep a level contact surface and stay inside their legal footprint', async () => {
  const art = await artPromise;
  const THREE = await threePromise;
  for (const depth of [.18, .24, .28]) for (let variant = 0; variant < 6; variant++) {
    const geometry = art.makeWornHexGeometry(.72, depth, variant);
    const positions = geometry.attributes.position, normals = geometry.attributes.normal;
    const top = geometry.groups[1];
    for (let i = 0; i < positions.count; i++) {
      assert.ok(Math.hypot(positions.getX(i), positions.getZ(i)) <= .720001);
      assert.ok(Number.isFinite(normals.getY(i)));
    }
    for (let i = top.start; i < top.start + top.count; i++) {
      assert.ok(Math.abs(positions.getY(i) - depth / 2) < 1e-6);
      assert.ok(normals.getY(i) > .99, 'top must face up for lighting and picking');
    }
    const mesh = new THREE.Mesh(geometry, [0, 1, 2].map(() => new THREE.MeshBasicMaterial()));
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0));
    assert.ok(ray.intersectObject(mesh).length, 'hex center remains clickable');
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < top.start; i++) {
      p.fromBufferAttribute(positions, i); n.fromBufferAttribute(normals, i);
      assert.ok(p.x * n.x + p.z * n.z > 0, 'bevel/side normals face outward');
    }
  }
});

test('all original playable centers still pick their own instance, including near edges', async () => {
  const art = await artPromise, THREE = await threePromise;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const columns = JSON.parse(html.match(/const COLUMNS=(\{[^\n]+\});/)[1]);
  const cells = Object.entries(columns).flatMap(([q, c]) => [...c.cells].map((type, i) => ({ q: +q, r: c.r0 + i, type }))).filter(c => 'PTG'.includes(c.type));
  const mesh = new THREE.InstancedMesh(art.makeWornHexGeometry(.72 * .988, .18, 2), [0, 1, 2].map(() => new THREE.MeshBasicMaterial()), cells.length);
  const positions = cells.map(c => new THREE.Vector3(Math.sqrt(3) * (c.q + (c.r - 11) / 2) * .72, .02, 1.5 * (c.r - 11) * .72));
  positions.forEach((p, i) => mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
  mesh.computeBoundingSphere(); mesh.updateMatrixWorld(true);
  positions.forEach((p, i) => {
    for (const [x, z] of [[0, 0], [.45, 0], [-.45, 0], [0, .48], [0, -.48]]) {
      const hit = new THREE.Raycaster(new THREE.Vector3(p.x + x, 3, p.z + z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0];
      assert.equal(hit?.instanceId, i);
      assert.ok(Math.abs(hit.point.y - .11) < 1e-6);
    }
  });
});
