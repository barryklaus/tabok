import * as THREE from 'three';

// Three broad light bands keep sculpted silhouettes crisp while the albedo
// carries the hand-painted detail. Shared by every tile and architectural mesh.
const bands = new THREE.DataTexture(new Uint8Array([92, 164, 238]), 3, 1, THREE.RedFormat);
bands.minFilter = bands.magFilter = THREE.NearestFilter;
bands.generateMipmaps = false;
bands.needsUpdate = true;

export function celestialMaterial(options = {}) {
  const { roughness, metalness, ...surface } = options;
  return new THREE.MeshToonMaterial({ ...surface, gradientMap: bands });
}

export function shadeCelestialArchitecture(root) {
  const converted = new Map();
  root.traverse(node => {
    if (!node.isMesh || !node.material) return;
    const convert = original => {
      if (!original.isMeshStandardMaterial) return original;
      if (!converted.has(original)) {
        const material = celestialMaterial({
          color: original.color, map: original.map,
          bumpMap: original.bumpMap, bumpScale: Math.min(original.bumpScale ?? .02, .025),
          emissive: original.emissive, emissiveIntensity: original.emissiveIntensity,
          side: original.side, transparent: original.transparent, opacity: original.opacity,
          depthWrite: original.depthWrite, flatShading: original.flatShading,
          vertexColors: original.vertexColors
        });
        material.name = original.name + ' · painted';
        converted.set(original, material);
      }
      return converted.get(original);
    };
    node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material);
  });
  // Only use this on independently constructed architecture, before rendering.
  converted.forEach((_, original) => original.dispose());
}

// Guardians animate their own material references. Keep those exact objects so
// awakening, damage flashes and rune pulses continue to update the visible mesh.
export function shadeCelestialSculpture(root) {
  const seen = new Set();
  root.traverse(node => {
    for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
      if (!material?.isMeshStandardMaterial || seen.has(material)) continue;
      seen.add(material);
      material.roughness = Math.max(.72, material.roughness);
      material.metalness = Math.min(.22, material.metalness);
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `
          #include <lights_fragment_end>
          float paintedLight = max(max(reflectedLight.directDiffuse.r, reflectedLight.directDiffuse.g), reflectedLight.directDiffuse.b);
          float paintedBand = floor(paintedLight * 5.0 + 0.5) / 5.0;
          reflectedLight.directDiffuse *= mix(1.0, paintedBand / max(paintedLight, 0.0001), 0.65);
        `);
      };
      material.customProgramCacheKey = () => 'tabok-painted-sculpture-v1';
      material.needsUpdate = true;
    }
  });
}
