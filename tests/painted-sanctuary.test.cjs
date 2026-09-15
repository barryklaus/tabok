const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const threeURL = pathToFileURL(path.join(root, 'vendor/three.core.min.js')).href;
const dataURL = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const readModule = name => import(dataURL(fs.readFileSync(path.join(root, name), 'utf8').replace("from 'three'", `from '${threeURL}'`)));

test('cel shading preserves the animated material and all gameplay geometry', async () => {
  const THREE = await import(threeURL);
  const { shadeCelestialSculpture, celestialMaterial } = await readModule('celestial-materials.js');
  const original = new THREE.MeshStandardMaterial({ color: '#6a5c81', emissive: '#9b4cee' });
  const geometry = new THREE.BoxGeometry();
  const sculpture = new THREE.Group(), model = new THREE.Mesh(geometry, original);
  sculpture.add(model); shadeCelestialSculpture(sculpture);
  assert.equal(model.material, original);
  assert.equal(model.geometry, geometry);
  original.emissiveIntensity = 2.8;
  assert.equal(model.material.emissiveIntensity, 2.8);
  const { ShaderLib } = await import(pathToFileURL(path.join(root, 'vendor/three.module.min.js')).href);
  const shader = { fragmentShader: ShaderLib.standard.fragmentShader };
  original.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /float paintedLight/);
  assert.ok(shader.fragmentShader.includes('#include <lights_fragment_end>'));
  assert.equal(celestialMaterial().gradientMap, celestialMaterial().gradientMap);
});

test('perimeter banners are finite, stay below play, and cannot intercept a move', async () => {
  const THREE = await import(threeURL);
  const { makeRuinFoundation } = await readModule('ruin-board-art.js');
  global.matchMedia = () => ({ matches: false });
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const columns = JSON.parse(html.match(/const COLUMNS=(\{[^\n]+\});/)[1]);
  const cells = Object.entries(columns).flatMap(([q, c]) => [...c.cells].map((type, i) => ({ q: +q, r: c.r0 + i, type })));
  const worldFor = id => { const [q, r] = id.split(',').map(Number); return new THREE.Vector3(Math.sqrt(3) * (q + (r - 11) / 2) * .72, .11, 1.5 * (r - 11) * .72); };
  const foundation = makeRuinFoundation(cells, worldFor, .72, { map: null, bump: null });
  const flags = foundation.children.filter(mesh => mesh.name === 'Celestial perimeter banners');
  assert.equal(flags.length, 3);
  for (const mesh of flags) {
    mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh);
    assert.ok(bounds.max.y < 0);
    for (const value of mesh.instanceMatrix.array) assert.ok(Number.isFinite(value));
    for (const value of mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    const hits = []; mesh.raycast(new THREE.Raycaster(), hits); assert.equal(hits.length, 0);
  }
});
