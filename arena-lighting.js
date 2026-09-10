import * as THREE from 'three';

// A quiet fill keeps the routes readable; local lights provide the contrast.
export const ARENA_LIGHTING = Object.freeze({
  exposure: 1.16, hemisphere: .38, ambient: .1, moon: 1.25, rim: .72,
  torch: 48, player: 3.2
});

export function makeLightPool(color, radius, opacity = .22) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: `varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main(){
        float r=length((vUv-.5)*2.);
        float falloff=pow(max(0.,1.-r),2.4);
        gl_FragColor=vec4(uColor,falloff*uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
  pool.rotation.x = -Math.PI / 2;
  pool.raycast = () => {};
  return pool;
}

export function makePlayerAura(color) {
  const tint = new THREE.Color(color);
  const ring = (inner, outer, opacity) => {
    const geometry = new THREE.RingGeometry(inner, outer, 6);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: tint, transparent: true, opacity, toneMapped: false,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    mesh.raycast = () => {};
    return mesh;
  };
  // The thin, bright hex identifies the occupied cell without filling its face.
  const root = ring(.577, .603, .88);
  root.name = 'Traveler light';
  const halo = ring(.55, .635, .19);
  halo.position.y = -.002;
  const pool = makeLightPool(tint, 1.65, .48);
  pool.position.y = -.006;
  const light = new THREE.PointLight(tint, ARENA_LIGHTING.player, 3.4, 2);
  light.position.set(.22, .68, .3);
  // Real uplight catches boots, clothing and metal. No extra shadow pass.
  root.add(halo, pool, light);

  const positions = new Float32Array(14 * 3);
  const seeds = Array.from({ length: 14 }, (_, i) => ({
    angle: i * 2.39996, radius: .25 + (i % 4) * .095, phase: i / 14
  }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  // Include the whole animated range when the camera clips the board edge.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .65, 0), 1.1);
  const sparks = new THREE.Points(geometry, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: tint.clone() }, uOpacity: { value: .55 }, uPixelRatio: { value: 1 } },
    vertexShader: `uniform float uPixelRatio; varying float vFade;
      void main(){
        vec4 viewPosition=modelViewMatrix*vec4(position,1.);
        vFade=sin(clamp(position.y/1.3,0.,1.)*3.14159);
        gl_PointSize=clamp(48.*uPixelRatio/-viewPosition.z,1.,4.);
        gl_Position=projectionMatrix*viewPosition;
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vFade;
      void main(){
        float glow=pow(max(0.,1.-length(gl_PointCoord-.5)*2.),2.);
        gl_FragColor=vec4(mix(uColor,vec3(1.),.3),glow*vFade*uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  sparks.raycast = () => {};
  root.add(sparks);
  root.userData.updateAura = (time, reducedMotion, quality, pixelRatio = 1) => {
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 1.9) * .045;
    root.material.opacity = .88 * pulse;
    pool.material.uniforms.uOpacity.value = .48 * pulse;
    light.intensity = ARENA_LIGHTING.player * pulse;
    sparks.visible = !reducedMotion && quality !== 'lite' && quality !== 'ultra';
    sparks.material.uniforms.uPixelRatio.value = pixelRatio;
    if (!sparks.visible) return;
    seeds.forEach((seed, i) => {
      const rise = (time * .18 + seed.phase) % 1;
      positions[i * 3] = Math.cos(seed.angle) * seed.radius;
      positions[i * 3 + 1] = .03 + rise * 1.25;
      positions[i * 3 + 2] = Math.sin(seed.angle) * seed.radius;
    });
    geometry.attributes.position.needsUpdate = true;
  };
  return root;
}
