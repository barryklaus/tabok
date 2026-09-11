const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const threeURL = pathToFileURL(path.join(root, 'vendor/three.core.min.js')).href;
const source = fs.readFileSync(path.join(root, 'arena-lighting.js'), 'utf8').replace("from 'three'", `from '${threeURL}'`);
const artPromise = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('Ambient preference handles missing, corrupt and out-of-range saved values', async () => {
  const { normalizeAmbientLevel, DEFAULT_AMBIENT_LEVEL } = await artPromise;
  for (const value of [null, undefined, '', 'broken', NaN, Infinity, true]) {
    assert.equal(normalizeAmbientLevel(value), DEFAULT_AMBIENT_LEVEL);
  }
  assert.equal(normalizeAmbientLevel('0'), 0);
  assert.equal(normalizeAmbientLevel('72'), 72);
  assert.equal(normalizeAmbientLevel(-20), 0);
  assert.equal(normalizeAmbientLevel(200), 100);
});

test('Ambient range preserves the original night and progressively reveals shadows', async () => {
  const { arenaFillAt, ARENA_LIGHTING } = await artPromise;
  const original = arenaFillAt(0), recommended = arenaFillAt(55), bright = arenaFillAt(100);
  assert.equal(original.hemisphere, ARENA_LIGHTING.hemisphere);
  assert.equal(original.ambient, ARENA_LIGHTING.ambient);
  assert.equal(original.skyColor.getHex(), 0x877ba8);
  assert.equal(original.groundColor.getHex(), 0x160b08);
  assert.equal(original.ambientColor.getHex(), 0x21101f);
  for (const key of ['hemisphere', 'ambient']) {
    assert.ok(original[key] < recommended[key] && recommended[key] < bright[key]);
  }
});

test('Traveler lighting stays local, follows its anchor, and cannot intercept board picking', async () => {
  const { makePlayerAura } = await artPromise;
  const THREE = await import(threeURL);
  const aura = makePlayerAura('#f174b9');
  aura.position.set(4, .155, 7);
  aura.userData.updateAura(3, false, 'full');
  aura.updateMatrixWorld(true);
  const light = aura.children.find(child => child.isPointLight);
  assert.ok(light.distance <= 3.5, 'local uplight must not wash over distant routes');
  assert.equal(light.castShadow, false, 'no per-player shadow render');
  const relative = light.getWorldPosition(new THREE.Vector3()).sub(aura.position);
  aura.position.set(-5, .155, 2);
  aura.updateMatrixWorld(true);
  assert.ok(light.getWorldPosition(new THREE.Vector3()).sub(aura.position).distanceTo(relative) < 1e-6);
  const ray = new THREE.Raycaster(new THREE.Vector3(-5, 3, 2), new THREE.Vector3(0, -1, 0));
  assert.equal(ray.intersectObject(aura, true).length, 0);
  let vertices = 0;
  aura.traverse(node => { if (node.geometry) vertices += node.geometry.attributes.position.count; });
  assert.ok(vertices < 100, 'six auras must remain a small geometry addition');
});

test('Reduced motion and low quality keep player illumination while removing moving sparks', async () => {
  const { makePlayerAura } = await artPromise;
  const aura = makePlayerAura('#54b8ee');
  const sparks = aura.children.find(child => child.isPoints);
  const light = aura.children.find(child => child.isPointLight);
  for (const quality of ['full', 'auto', 'lite', 'ultra']) {
    aura.userData.updateAura(1, true, quality);
    const intensity = light.intensity;
    aura.userData.updateAura(100, true, quality);
    assert.equal(light.intensity, intensity);
    assert.ok(light.intensity > 0);
    assert.equal(sparks.visible, false);
    aura.userData.updateAura(100, false, quality);
    assert.equal(sparks.visible, quality === 'full' || quality === 'auto');
  }
  for (const time of [0, 1, 100, 10000]) {
    aura.userData.updateAura(time, false, 'full');
    for (const value of sparks.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
  }
});
