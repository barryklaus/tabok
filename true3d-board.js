import * as THREE from 'three';
import { createCosmicSanctuary } from './cosmic-sanctuary.js?v=20260909H1';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTravelerPilot } from './character-3d-travelers.js?v=20260907G4';
import { createMonsterPilot } from './monster-3d-models.js?v=20260908A1';
import { PortalCinematics } from './portal-cinematics.js?v=20260908A1';
import { makeRuinStoneMaps, makeWornHexGeometry, makeRuinFoundation, makeContactShadow } from './ruin-board-art.js?v=20260909H2';

const SQRT3 = Math.sqrt(3);
const HEX_RADIUS = .72;
const PORTAL_R = 2.08;
const COLORS = { P: 0xa979c4, T: 0x55a8a0, G: 0xb1aa9c, B: 0x211d19, W: 0xe0c68e };
// Keep the grey network at the same perceived value as purple and teal even
// when it catches the moon and temple lights.
const TILE_TINTS = { P: 0xffffff, T: 0xffffff, G: 0xddd8d0, B: 0xc4bfb6, W: 0xffffff };
const TILE_SIDES = { P: 0x716779, T: 0x5a7375, G: 0x77736c, B: 0x4a4542, W: 0xa29372 };
const PORTAL_LOOKS = {
  idle: [23, 1, new THREE.Color(0x53129a), new THREE.Color(0xd44dff)],
  rejected: [34, 1.28, new THREE.Color(0x8f174f), new THREE.Color(0xff4fb7)],
  reckoning: [43, 1.58, new THREE.Color(0x76112b), new THREE.Color(0xff326e)],
  crossing: [38, 1.42, new THREE.Color(0x176aaa), new THREE.Color(0x70f6ff)]
};
const PLAYER_ART = {
  misty: 'assets/traveler-0-0.png', cliff: 'assets/traveler-1-0.png',
  paige: 'assets/traveler-2-0.png', justin: 'assets/traveler-3-0.png',
  sue: 'assets/traveler-4-0.png', wanday: 'assets/traveler-5-0.png'
};

function parse(id) {
  const [q, r] = id.split(',').map(Number);
  return { q, r };
}

function idOf(q, r) { return q + ',' + r; }

function worldFor(id) {
  if (id === 'PORTAL') return new THREE.Vector3(0, .16, 0);
  const { q, r } = parse(id);
  const rr = r - 11;
  // Playable tile centers sit at y=.02 with .18 height: their true top is .11.
  return new THREE.Vector3(SQRT3 * (q + rr / 2) * HEX_RADIUS, .11, 1.5 * rr * HEX_RADIUS);
}

function annularSegmentGeometry(innerRadius, outerRadius, span, depth) {
  const shape = new THREE.Shape(), steps = 5;
  for (let i = 0; i <= steps; i++) {
    const angle = -span / 2 + span * i / steps;
    const x = Math.sin(angle) * outerRadius, y = Math.cos(angle) * outerRadius;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const angle = -span / 2 + span * i / steps;
    shape.lineTo(Math.sin(angle) * innerRadius, Math.cos(angle) * innerRadius);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSegments: 1, bevelSize: .035,
    bevelThickness: .035, curveSegments: 2
  });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function makePortalRuneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d'), cx = 512, cy = 512;
  ctx.clearRect(0, 0, 1024, 1024);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 18;
  const patterns = [
    [[0,-1],[0,1],[-.62,.15],[.62,.15]],
    [[-.62,-.72],[.55,.72],[-.55,.72],[.62,-.72]],
    [[-.66,-.62],[.48,-.15],[-.48,.18],[.66,.65]],
    [[0,-.9],[.62,0],[0,.9],[-.62,0],[0,-.9]],
    [[-.62,-.68],[-.15,0],[-.62,.68],[.62,.68],[.15,0],[.62,-.68]],
    [[-.7,0],[.7,0],[0,-.82],[0,.82]],
    [[-.62,-.72],[0,-.22],[.62,-.72],[0,.78],[-.62,-.72]],
    [[-.68,-.7],[.68,-.7],[-.42,.1],[.48,.1],[-.68,.72],[.68,.72]]
  ];
  for (let i = 0; i < 20; i++) {
    const angle = i / 20 * Math.PI * 2, radius = 466;
    ctx.save();
    ctx.translate(cx + Math.sin(angle) * radius, cy - Math.cos(angle) * radius);
    ctx.rotate(angle);
    ctx.beginPath();
    const points = patterns[i % patterns.length], scale = 34;
    points.forEach(([x,y], n) => n ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale));
    ctx.stroke();
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeLanternGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,238,174,1)');
  gradient.addColorStop(.16, 'rgba(255,174,73,.82)');
  gradient.addColorStop(.48, 'rgba(255,91,26,.22)');
  gradient.addColorStop(1, 'rgba(255,54,12,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeStoneHeightTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'), image = ctx.createImageData(size, size);
  // Deterministic layered stone grain: no downloads and identical on every client.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const broad = Math.sin(x * .075) * 15 + Math.cos(y * .061) * 14 + Math.sin((x + y) * .031) * 10;
      const fine = Math.sin(x * .39 + Math.cos(y * .13) * 2.4) * 7 + Math.cos(y * .34) * 5;
      const grain = ((x * 73 + y * 151 + x * y * 13) % 29) - 14;
      const value = Math.max(38, Math.min(218, 128 + broad + fine + grain * .55));
      const offset = (y * size + x) * 4;
      image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  // Recessed cracks cut through the generated relief.
  ctx.strokeStyle = 'rgb(24,24,24)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    let seed = (i * 97 + 41) % size;
    ctx.lineWidth = 1 + i % 3;
    ctx.beginPath();
    ctx.moveTo(seed, -4);
    for (let y = 0; y <= size + 8; y += 22) {
      seed = (seed * 53 + 19) % size;
      ctx.lineTo(seed, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1.4);
  texture.anisotropy = 4;
  return texture;
}

function tileVariantFor(q, r) {
  // Stable on every client, so multiplayer boards remain visually identical.
  return Math.abs(q * 17 + r * 31 + q * r * 7) % 6;
}

const PORTAL_VERTEX = `
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;

const PORTAL_FRAGMENT = `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);
  }
  void main(){
    vec2 p=(vUv-.5)*2.;
    float r=length(p), a=atan(p.y,p.x), t=uTime;
    if(r>1.) discard;
    float n=noise(p*5.5+vec2(t*.12,-t*.15));
    float spiralA=.5+.5*sin(a*7.-r*18.+t*2.25+n*3.2);
    float spiralB=.5+.5*sin(a*4.+r*24.-t*1.55+n*4.1);
    float veins=pow(max(spiralA*spiralB,0.),2.35);
    float rim=pow(smoothstep(.42,1.,r),2.0);
    float pulse=.84+.16*sin(t*2.1-r*10.);
    float energy=(.12+veins*.9+n*.18)*rim*pulse*uPower;
    float abyss=1.-smoothstep(.02,.58,r);
    vec3 color=mix(vec3(.002,.001,.008),uColorA,energy*.72);
    color+=uColorB*energy*energy*1.25;
    color=mix(color,vec3(.001,0.,.005),abyss*.82);
    float stars=step(.992,hash(floor((p+2.)*92.+floor(t*.35))))*(1.-r)*.8;
    color+=uColorB*stars;
    gl_FragColor=vec4(color,1.);
  }
`;

const PORTAL_MIST_FRAGMENT = `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(91.7,251.3)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
  void main(){
    vec2 p=(vUv-.5)*2.; float r=length(p),a=atan(p.y,p.x),t=uTime;
    if(r>.995||r<.61)discard;
    float turbulence=noise(vec2(a*3.2-r*4.+t*.32,r*9.-t*.44));
    float tongues=.5+.5*sin(a*13.+r*22.-t*3.1+turbulence*5.);
    float edge=smoothstep(.61,.76,r)*(1.-smoothstep(.88,.995,r));
    float alpha=edge*(.12+tongues*.48+turbulence*.26)*uPower;
    vec3 color=mix(uColorA,uColorB,tongues);
    gl_FragColor=vec4(color,alpha*.72);
  }
`;

const DOME_VERTEX = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDirection;
  void main(){
    vUv=uv;
    vec4 viewPosition=modelViewMatrix*vec4(position,1.0);
    vNormalView=normalize(normalMatrix*normal);
    vViewDirection=normalize(-viewPosition.xyz);
    gl_Position=projectionMatrix*viewPosition;
  }
`;

const DOME_FRAGMENT = `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDirection;
  void main(){
    float facing=max(dot(normalize(vNormalView),normalize(vViewDirection)),0.0);
    float fresnel=pow(1.0-facing,2.35);
    float branchA=pow(1.0-abs(sin(vUv.x*35.0+sin(vUv.y*19.0+uTime*.9)*2.2)),42.0);
    float branchB=pow(1.0-abs(sin((vUv.x+vUv.y)*26.0-cos(vUv.x*17.0-uTime*.7)*1.8)),48.0);
    float pulse=.78+.22*sin(uTime*2.1+vUv.y*8.0);
    float lightning=(branchA+branchB)*(.12+fresnel*.38)*pulse;
    float alpha=(.035+fresnel*.29+lightning*.72)*uPower;
    vec3 color=uColor*(.34+fresnel*1.28+lightning*2.35);
    gl_FragColor=vec4(color,clamp(alpha,0.0,.72));
  }
`;

const FAULTLINE_VERTEX = `
  varying vec2 vUv;
  void main(){
    vec4 local=vec4(position,1.0);
    #ifdef USE_INSTANCING
      local=instanceMatrix*local;
    #endif
    vUv=local.xz/33.1+.5;
    gl_Position=projectionMatrix*modelViewMatrix*local;
  }
`;

const FAULTLINE_FRAGMENT = `
  uniform float uTime;
  uniform float uMajor;
  uniform float uQuality;
  varying vec2 vUv;
  float hash11(float p){return fract(sin(p*127.1)*43758.5453123);}
  void main(){
    vec2 p=(vUv-.5)*2.0;
    float radius=length(p);
    float edge=1.0-smoothstep(.78,1.0,radius);
    float core=exp(-radius*3.25);
    float breath=.84+.16*sin(uTime*(uMajor>.5?2.15:.72));
    float base=(mix(.035,.09,uMajor)+core*mix(.105,.245,uMajor))*breath*edge;

    float cycle=mix(8.7,3.65,uMajor);
    float epoch=floor(uTime/cycle);
    float phase=fract(uTime/cycle);
    float strike=smoothstep(.006,.018,phase)*(1.0-smoothstep(.055,.092,phase));
    float seed=hash11(epoch+19.7);
    float angle=seed*6.2831853;
    float theta=atan(p.y,p.x);
    float delta=atan(sin(theta-angle),cos(theta-angle));
    float jag=.052*sin(radius*39.0+seed*21.0)+.023*sin(radius*83.0+seed*9.0);
    float trunk=1.0-smoothstep(.018,.062,abs(delta+jag));
    float forkMask=smoothstep(.31,.43,radius);
    float forkA=(1.0-smoothstep(.014,.052,abs(delta+jag-(radius-.31)*.28)))*forkMask;
    float forkB=(1.0-smoothstep(.014,.052,abs(delta+jag+(radius-.31)*.23)))*forkMask;
    float bolt=max(trunk,max(forkA,forkB))*(1.0-smoothstep(.9,.99,radius));
    float lightning=bolt*strike*uQuality*edge;
    vec3 quiet=mix(vec3(.20,.025,.34),vec3(.43,.055,.68),core);
    vec3 flash=mix(vec3(.62,.18,1.0),vec3(.95,.55,1.0),bolt);
    vec3 color=quiet*base+flash*lightning*1.35;
    float alpha=clamp(base+lightning*.92,0.0,.82);
    gl_FragColor=vec4(color,alpha);
  }
`;

function disposeObject(root) {
  const disposedMaterials = new Set();
  root.traverse(node => {
    if (node.geometry) node.geometry.dispose();
    if (node.material && (!node.userData.preserveMaterial || node.userData.ownedActorMaterial)) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(material => { if (!disposedMaterials.has(material)) { material.dispose(); disposedMaterials.add(material); } });
    }
  });
}

export class TabokTrue3DBoard {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.isTrue3D = true;
    this.cells = new Map();
    this.pickables = [];
    this.actors = new Map();
    this.occupancyGlows = new Map();
    this.actorSpeech = new Set();
    this.itemRoot = new THREE.Group();
    this.actorRoot = new THREE.Group();
    this.occupancyRoot = new THREE.Group();
    this.highlightRoot = new THREE.Group();
    this.effectRoot = new THREE.Group();
    this.transientEffects = [];
    this.summonCinematic = null;
    this.itemSignature = '';
    this.legalSignature = '';
    this.templeLights = [];
    this.startedAt = performance.now();
    this.pointerStart = null;
    this.hovered = null;
    this.stateSignature = '';
    this.portalState = 'idle';
    this.quality = 'full';
    this.renderRatio = 1;
    this.renderRatioMin = .72;
    this.renderRatioMax = 1.25;
    this.adaptiveResolution = true;
    this.frameTimes = [];
    this.lastFrameAt = performance.now();
    this.lastQualityCheckAt = this.lastFrameAt;
    this.qualityRecoveryChecks = 0;
    this.lastArcUpdateAt = 0;
    this.lastDebrisUpdateAt = 0;
    this.lastActorModelUpdateAt = 0;
    this.lastSpeechUpdateAt = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.tabletProfile = matchMedia('(max-width:1180px) and (pointer:coarse)').matches;
    this.framingKey = '';
    this.suspended = document.hidden;
    this.presentationPaused = document.documentElement.classList.contains('effects-paused');
    this.ready = this.init();
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    // Keep the DOM interface Retina-sharp while the expensive 3D framebuffer
    // begins at a sensible density. High Fidelity adjusts this value gently to
    // hold 60 fps instead of blindly rendering a 5K backing canvas.
    this.renderer.setPixelRatio(this.renderRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.34;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Nearly every shadow caster is fixed architecture. Render its depth map
    // only when quality/context state changes instead of rebuilding it at 60 Hz.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050305);
    this.scene.fog = new THREE.FogExp2(0x070508, .014);
    this.camera = new THREE.PerspectiveCamera(42, 1, .1, 90);
    this.camera.position.set(0, 18.5, 23.5);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, .15, 0);
    this.controls.enableRotate = true;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .075;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.panSpeed = .72;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 38;
    this.controls.minPolarAngle = .28;
    this.controls.maxPolarAngle = 1.39;
    this.controls.rotateSpeed = .62;
    this.controls.zoomSpeed = .8;
    this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    this.canvas.tabIndex = 0;
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('contextmenu', event => event.preventDefault());
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.suspended = true;
      document.documentElement.classList.remove('true3d-active');
      document.documentElement.classList.add('board-plate-mode');
      document.documentElement.classList.add('gpu-context-lost');
      window.dispatchEvent(new CustomEvent('tabok-gpu-paused'));
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.suspended = document.hidden;
      this.lastFrameAt = performance.now();
      this.frameTimes.length = 0;
      this.renderer.shadowMap.needsUpdate = true;
      document.documentElement.classList.remove('gpu-context-lost');
      document.documentElement.classList.remove('board-plate-mode');
      document.documentElement.classList.add('true3d-active');
      this.resize();
      window.dispatchEvent(new CustomEvent('tabok-gpu-restored'));
    });

    this.textureLoader = new THREE.TextureLoader();
    await this.loadTextures();
    this.stoneHeightTexture = makeStoneHeightTexture();
    this.ruinStoneMaps = {};
    for (const type of ['P', 'T', 'G', 'B', 'W']) {
      this.ruinStoneMaps[type] = makeRuinStoneMaps(this.textures.G.image, type, Math.min(4, this.renderer.capabilities.getMaxAnisotropy()));
    }
    this.contactShadowMaterial = makeContactShadow();
    this.makeLights();
    this.makeGround();
    this.cosmicSanctuary = createCosmicSanctuary(this.scene, this.ruinStoneMaps.G);
    this.makeBoard();
    this.makePortal();
    this.scene.add(this.itemRoot, this.actorRoot, this.occupancyRoot, this.highlightRoot, this.effectRoot);
    this.bindInput();
    this.setQuality('full');
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement);
    this.resize();
    try {
      if (this.renderer.compileAsync) await this.renderer.compileAsync(this.scene, this.camera);
      else this.renderer.compile(this.scene, this.camera);
    } catch (_) {
      // Compilation is an optional warm-up; rendering remains the fallback.
    }
    this.visibilityHandler = () => {
      this.suspended = document.hidden;
      this.lastFrameAt = performance.now();
      this.frameTimes.length = 0;
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.renderer.setAnimationLoop(() => this.render());
    document.documentElement.classList.add('true3d-active');
    document.documentElement.dataset.gpuBackend = 'three-webgl';
    window.dispatchEvent(new CustomEvent('tabok-true3d-ready'));
    return this;
  }

  loadTexture(url) {
    return new Promise((resolve, reject) => this.textureLoader.load(url, texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      resolve(texture);
    }, undefined, reject));
  }

  async loadTextures() {
    const sources = {
      P: 'assets/astral-obsidian-v2.jpg', T: 'assets/astral-teal-v2.jpg',
      G: 'assets/astral-limestone-v2.jpg', wall: 'assets/ruin-wall-texture.png'
    };
    this.textures = {};
    await Promise.all(Object.entries(sources).map(async ([key, url]) => { this.textures[key] = await this.loadTexture(url); }));
    for (const texture of Object.values(this.textures)) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(keyTextureRepeat(texture), keyTextureRepeat(texture));
    }
  }

  makeLights() {
    this.hemisphereLight = new THREE.HemisphereLight(0x877ba8, 0x160b08, .78);
    this.scene.add(this.hemisphereLight);

    this.ambientLight = new THREE.AmbientLight(0x21101f, .16);
    this.scene.add(this.ambientLight);

    this.moonLight = new THREE.DirectionalLight(0xd8d0ff, 4.25);
    this.moonLight.position.set(-9, 18, 10);
    this.moonLight.castShadow = true;
    // A 1024 map is indistinguishable at the board camera distance but costs a
    // quarter of the fill/memory of the former 2048 map on Retina displays.
    this.moonLight.shadow.mapSize.set(1024, 1024);
    this.moonLight.shadow.camera.left = this.moonLight.shadow.camera.bottom = -19;
    this.moonLight.shadow.camera.right = this.moonLight.shadow.camera.top = 19;
    this.moonLight.shadow.bias = -.00035;
    this.moonLight.shadow.normalBias = .035;
    this.scene.add(this.moonLight);

    this.rimLight = new THREE.DirectionalLight(0x6f3696, 2.05);
    this.rimLight.position.set(11, 8, -13);
    this.scene.add(this.rimLight);

    const glowTexture = makeLanternGlowTexture();
    const flameGeometry = new THREE.SphereGeometry(.1, 8, 6);
    const torchMaterial = new THREE.MeshStandardMaterial({ color: 0x665136, roughness: .73, metalness: .35 });
    const torchGeometry = new THREE.CylinderGeometry(.12, .22, 1.08, 6);
    const bowlGeometry = new THREE.CylinderGeometry(.25, .13, .19, 8);
    const wallSites = this.config.cells.filter(cell => cell.type === 'B' && Math.max(Math.abs(cell.q), Math.abs(cell.r - 11), Math.abs(cell.q + cell.r - 11)) >= 10);
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2;
      const target = new THREE.Vector3(Math.sin(angle) * 13.1, .11, Math.cos(angle) * 13.1);
      const site = wallSites.reduce((best, cell) => {
        const p = worldFor(idOf(cell.q, cell.r));
        return !best || p.distanceToSquared(target) < best.distance ? { p, distance: p.distanceToSquared(target) } : best;
      }, null);
      const { x, z } = site ? site.p : target;
      const stand = new THREE.Mesh(torchGeometry, torchMaterial);
      stand.position.set(x, .74, z);
      const bowl = new THREE.Mesh(bowlGeometry, torchMaterial);
      bowl.position.set(x, 1.34, z);
      this.scene.add(stand, bowl);
      const light = new THREE.PointLight(i % 2 ? 0xffb35a : 0xff7d2d, 30, 7.8, 2);
      light.position.set(x, 1.52, z);
      light.userData.baseIntensity = 30;
      light.userData.phase = i * 1.73;
      const flame = new THREE.Mesh(
        flameGeometry,
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd48a : 0xffad54 })
      );
      flame.position.copy(light.position);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture, color: 0xff9b42, transparent: true,
        opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      glow.position.copy(light.position);
      glow.scale.set(1.75, 1.75, 1);
      this.scene.add(light, flame, glow);
      this.templeLights.push({ light, flame, glow, phase: i * 1.73 });
    }
  }

  makeGround() {
    this.ruinFoundation = makeRuinFoundation(this.config.cells, worldFor, HEX_RADIUS, this.ruinStoneMaps.G);
    this.scene.add(this.ruinFoundation);

    this.faultlineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMajor: { value: 0 },
        uQuality: { value: 1 }
      },
      vertexShader: FAULTLINE_VERTEX,
      fragmentShader: FAULTLINE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    // The luminous bed follows the board silhouette; a circular plane would
    // reveal a floating halo outside the new cliff edge when the camera orbits.
    const seamGeo = new THREE.CylinderGeometry(HEX_RADIUS * 1.008, HEX_RADIUS * 1.008, .006, 6);
    seamGeo.clearGroups();
    this.faultlinePlane = new THREE.InstancedMesh(seamGeo, this.faultlineMaterial, this.config.cells.length);
    const seamMatrix = new THREE.Matrix4();
    this.config.cells.forEach((cell, index) => {
      const p = worldFor(idOf(cell.q, cell.r));
      seamMatrix.makeTranslation(p.x, -.066, p.z);
      this.faultlinePlane.setMatrixAt(index, seamMatrix);
    });
    this.faultlinePlane.renderOrder = 1;
    this.scene.add(this.faultlinePlane);
  }

  makeBoard() {
    const topMaterials = {};
    const sideMaterials = {};
    for (const type of ['P', 'T', 'G', 'B', 'W']) {
      const maps = this.ruinStoneMaps[type];
      topMaterials[type] = new THREE.MeshStandardMaterial({
        map: maps.map, bumpMap: maps.bump, bumpScale: .045,
        color: TILE_TINTS[type], roughness: .91, metalness: .015
      });
      sideMaterials[type] = new THREE.MeshStandardMaterial({
        map: this.ruinStoneMaps.G.map, bumpMap: this.ruinStoneMaps.G.bump, bumpScale: .035,
        color: TILE_SIDES[type], roughness: .93, metalness: .015
      });
    }
    const geometries = {
      playable: Array.from({ length: 6 }, (_, v) => makeWornHexGeometry(HEX_RADIUS * .988, .18, v)),
      blocked: Array.from({ length: 6 }, (_, v) => makeWornHexGeometry(HEX_RADIUS * .988, .28, v)),
      entry: Array.from({ length: 6 }, (_, v) => makeWornHexGeometry(HEX_RADIUS, .24, v))
    };
    // Each tile used to be a separate mesh and shadow caster. Grouping equal
    // tiles into instanced batches preserves every textured hex while reducing
    // hundreds of draw submissions to a few dozen.
    const batches = new Map();
    for (const cell of this.config.cells) {
      const id = idOf(cell.q, cell.r);
      const portalDistance = Math.max(Math.abs(cell.q), Math.abs(cell.r - 11), Math.abs(cell.q + cell.r - 11));
      if (cell.type === 'B' && portalDistance <= 1) continue;
      const playable = 'PTG'.includes(cell.type);
      const variant = tileVariantFor(cell.q, cell.r);
      const shape = cell.type === 'W' ? 'entry' : playable ? 'playable' : 'blocked';
      const key = `${cell.type}:${variant}:${shape}`;
      if (!batches.has(key)) batches.set(key, { type: cell.type, variant, shape, playable, cells: [] });
      batches.get(key).cells.push({ id, y: cell.type === 'B' ? .06 : .02 });
    }
    const matrix = new THREE.Matrix4();
    for (const batch of batches.values()) {
      const mesh = new THREE.InstancedMesh(
        geometries[batch.shape][batch.variant],
        // Older iPad Safari can drop multi-material instanced meshes entirely.
        this.tabletProfile ? topMaterials[batch.type] : [sideMaterials[batch.type], topMaterials[batch.type], sideMaterials[batch.type]],
        batch.cells.length
      );
      const instanceIds = [];
      batch.cells.forEach(({ id, y }, instanceId) => {
        const position = worldFor(id);
        matrix.makeTranslation(position.x, y, position.z);
        mesh.setMatrixAt(instanceId, matrix);
        mesh.setColorAt(instanceId, new THREE.Color().setScalar(.94 + batch.variant * .024));
        instanceIds.push(id);
        this.cells.set(id, { mesh, instanceId });
      });
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      mesh.userData = { instanceIds, playable: batch.playable };
      this.scene.add(mesh);
      if (batch.playable || batch.type === 'W') this.pickables.push(mesh);
    }
  }

  makePortal() {
    this.portal = new THREE.Group();
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(2.06, 2.1, .28, 64),
      new THREE.MeshStandardMaterial({ color: 0x100b0e, bumpMap: this.stoneHeightTexture, bumpScale: .06, roughness: .82, metalness: .28 })
    );
    well.position.y = .08;
    well.receiveShadow = true;
    this.portal.add(well);

    this.portalStoneMaterial = new THREE.MeshStandardMaterial({
      map: this.textures.wall, bumpMap: this.stoneHeightTexture, bumpScale: .055,
      color: 0x30282f, emissive: 0x3b0a55,
      emissiveIntensity: .12, roughness: .9, metalness: .12
    });
    const segmentCount = 20, span = Math.PI * 2 / segmentCount * .91;
    const stones = new THREE.InstancedMesh(
      annularSegmentGeometry(1.78, 2.06, span, .22),
      this.portalStoneMaterial,
      segmentCount
    );
    const transform = new THREE.Matrix4();
    for (let i = 0; i < segmentCount; i++) {
      transform.makeRotationY(i / segmentCount * Math.PI * 2);
      transform.setPosition(0, .45 + (i % 3 === 0 ? .018 : 0), 0);
      stones.setMatrixAt(i, transform);
    }
    stones.castShadow = stones.receiveShadow = true;
    stones.userData.pickPortal = true;
    this.portal.add(stones);

    this.portalCapMaterial = new THREE.MeshStandardMaterial({
      map: this.textures.wall,
      displacementMap: this.stoneHeightTexture,
      displacementScale: .105,
      displacementBias: -.045,
      bumpMap: this.stoneHeightTexture,
      bumpScale: .075,
      color: 0x3d333c,
      emissive: 0x35084d,
      emissiveIntensity: .09,
      roughness: .91,
      metalness: .1,
      side: THREE.DoubleSide
    });
    const capGeometry = new THREE.RingGeometry(1.8, 2.025, 8, 4, -span / 2, span);
    capGeometry.rotateX(-Math.PI / 2);
    this.portalCaps = new THREE.InstancedMesh(capGeometry, this.portalCapMaterial, segmentCount);
    for (let i = 0; i < segmentCount; i++) {
      transform.makeRotationY(i / segmentCount * Math.PI * 2);
      transform.setPosition(0, .485 + (i % 3 === 0 ? .018 : 0), 0);
      this.portalCaps.setMatrixAt(i, transform);
    }
    this.portalCaps.receiveShadow = true;
    this.portalCaps.userData.pickPortal = true;
    this.portal.add(this.portalCaps);

    const lipMaterial = new THREE.MeshStandardMaterial({
      map: this.textures.wall, bumpMap: this.stoneHeightTexture, bumpScale: .045,
      color: 0x3b3039, emissive: 0x3b0a55,
      emissiveIntensity: .14, roughness: .82, metalness: .2
    });
    this.portalLips = [
      new THREE.Mesh(new THREE.TorusGeometry(1.765, .06, 8, 96), lipMaterial),
      new THREE.Mesh(new THREE.TorusGeometry(2.04, .045, 8, 96), lipMaterial)
    ];
    this.portalLips.forEach(lip => {
      lip.rotation.x = Math.PI / 2;
      lip.position.y = .47;
      lip.castShadow = lip.receiveShadow = true;
      lip.userData.pickPortal = true;
      this.portal.add(lip);
    });

    this.portalEnergyMaterial = new THREE.MeshBasicMaterial({
      color: 0xd561ff, transparent: true, opacity: .78,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.portalEnergyRims = [
      new THREE.Mesh(new THREE.TorusGeometry(1.75, .02, 6, 96), this.portalEnergyMaterial),
      new THREE.Mesh(new THREE.TorusGeometry(2.015, .014, 6, 96), this.portalEnergyMaterial)
    ];
    this.portalEnergyRims.forEach(rim => {
      rim.rotation.x = Math.PI / 2;
      rim.position.y = .505;
      this.portal.add(rim);
    });

    this.portalVortexMaterial = new THREE.ShaderMaterial({
      vertexShader: PORTAL_VERTEX, fragmentShader: PORTAL_FRAGMENT,
      uniforms: {
        uTime: { value: 0 }, uPower: { value: 1 },
        uColorA: { value: new THREE.Color(0x53129a) },
        uColorB: { value: new THREE.Color(0xd44dff) }
      },
      side: THREE.DoubleSide
    });
    this.portalVortex = new THREE.Mesh(new THREE.CircleGeometry(1.76, 96), this.portalVortexMaterial);
    this.portalVortex.rotation.x = -Math.PI / 2;
    this.portalVortex.position.y = .35;
    this.portalVortex.userData.pickPortal = true;
    this.portal.add(this.portalVortex);

    this.portalMistMaterial = new THREE.ShaderMaterial({
      vertexShader: PORTAL_VERTEX, fragmentShader: PORTAL_MIST_FRAGMENT,
      uniforms: {
        uTime: { value: 0 }, uPower: { value: 1 },
        uColorA: { value: new THREE.Color(0x6c20d5) },
        uColorB: { value: new THREE.Color(0xff63ee) }
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.portalMist = new THREE.Mesh(new THREE.CircleGeometry(1.88, 96), this.portalMistMaterial);
    this.portalMist.rotation.x = -Math.PI / 2;
    this.portalMist.position.y = .53;
    this.portal.add(this.portalMist);

    this.portalRuneMaterial = new THREE.MeshBasicMaterial({
      map: makePortalRuneTexture(), color: 0xc961ff, transparent: true,
      opacity: .9, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.portalRunes = new THREE.Mesh(new THREE.CircleGeometry(2.035, 96), this.portalRuneMaterial);
    this.portalRunes.rotation.x = -Math.PI / 2;
    this.portalRunes.position.y = .505;
    this.portal.add(this.portalRunes);

    this.portalDomeMaterial = new THREE.ShaderMaterial({
      vertexShader: DOME_VERTEX,
      fragmentShader: DOME_FRAGMENT,
      uniforms: {
        uTime: { value: 0 }, uPower: { value: 1 },
        uColor: { value: new THREE.Color(0xc95cff) }
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.portalDome = new THREE.Mesh(
      new THREE.SphereGeometry(1.74, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      this.portalDomeMaterial
    );
    this.portalDome.position.y = .48;
    this.portalDome.userData.pickPortal = true;
    this.portal.add(this.portalDome);

    this.portalArcs = [];
    for (let i = 0; i < 7; i++) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
      const material = new THREE.LineBasicMaterial({
        color: 0xef9cff, transparent: true, opacity: .78,
        depthWrite: false, blending: THREE.AdditiveBlending
      });
      const arc = new THREE.Line(geometry, material);
      arc.userData.phase = i / 7 * Math.PI * 2;
      this.portal.add(arc);
      this.portalArcs.push(arc);
    }

    this.portalDebris = [];
    const debrisGeometry = new THREE.DodecahedronGeometry(.1, 0);
    const debrisMaterial = new THREE.MeshStandardMaterial({ color: 0x19121c, emissive: 0x501173, emissiveIntensity: .28, roughness: .94 });
    for (let i = 0; i < 12; i++) {
      this.portalDebris.push({
        angle: i / 12 * Math.PI * 2, radius: 1.18 + (i % 5) * .13,
        speed: (i % 2 ? -.13 : .17) * (1 + (i % 3) * .12),
        height: .72 + (i % 4) * .16, phase: i * 1.71,
        scale: .55 + (i % 4) * .24
      });
    }
    this.portalDebrisMesh = new THREE.InstancedMesh(debrisGeometry, debrisMaterial, this.portalDebris.length);
    this.portalDebrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.portalDebrisDummy = new THREE.Object3D();
    this.portal.add(this.portalDebrisMesh);

    this.portalLight = new THREE.PointLight(0xb345ff, 16, 7, 2);
    this.portalLight.position.y = 1.35;
    this.portal.add(this.portalLight);

    this.portalSpotlight = new THREE.SpotLight(0xc955ff, 18, 13, Math.PI / 4.5, .72, 1.7);
    this.portalSpotlight.position.set(0, 8.5, 0);
    this.portalSpotlight.target.position.set(0, 0, 0);
    this.scene.add(this.portalSpotlight, this.portalSpotlight.target);
    this.portal.userData.pickPortal = true;
    this.scene.add(this.portal);
    this.pickables.push(well, stones, this.portalCaps, this.portalVortex, this.portalDome, ...this.portalLips);
    [well, stones, this.portalCaps, this.portalVortex, this.portalDome, ...this.portalLips].forEach(mesh => { mesh.userData.pickPortal = true; });
  }

  bindInput() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.canvas.addEventListener('pointerdown', event => { this.pointerStart = { x: event.clientX, y: event.clientY, button: event.button }; });
    this.canvas.addEventListener('pointermove', event => {
      if (this.pointerStart && Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 5) return;
      const hit = this.pick(event);
      const id = this.actorIdForHit(hit) || this.idForHit(hit);
      if (id !== this.hovered) {
        this.hovered = id;
        this.canvas.style.cursor = id ? 'pointer' : 'grab';
        this.config.onHover?.(id, event);
        this.highlightRoot.children.forEach(child => {
          const focused = child.userData.id === id;
          child.scale.setScalar(focused ? 1.075 : 1);
          if (child.material) child.material.opacity = focused ? child.userData.hoverOpacity : child.userData.baseOpacity;
        });
      }
    });
    this.canvas.addEventListener('pointerup', event => {
      const start = this.pointerStart;
      this.pointerStart = null;
      if (!start || start.button !== 0 || event.button !== 0 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
      const hit = this.pick(event);
      if (!hit) return;
      const id = this.idForHit(hit), actorId = this.actorIdForHit(hit);
      if (actorId) this.config.onActor?.(actorId);
      else if (id === 'PORTAL') this.config.onPortal?.();
      else if (id) this.config.onHex?.(id);
    });
    this.canvas.addEventListener('pointerleave', () => {
      this.pointerStart = null;
      this.hovered = null;
      this.canvas.style.cursor = 'grab';
      this.config.onHover?.(null);
      this.highlightRoot.children.forEach(child => {
        child.scale.setScalar(1);
        if (child.material) child.material.opacity = child.userData.baseOpacity;
      });
    });
  }

  pick(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    this.pointer.y = -(event.clientY - rect.top) / rect.height * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects([...this.pickables, this.actorRoot], true)[0] || null;
  }

  actorIdForHit(hit) {
    let object = hit?.object;
    while (object) {
      if (object.userData?.actorId) return object.userData.actorId;
      object = object.parent;
    }
    return null;
  }

  idForHit(hit) {
    const object = hit?.object;
    if (!object) return null;
    let parent = object;
    while (parent) { if (parent.userData?.pickPortal) return 'PORTAL'; parent = parent.parent; }
    if (Number.isInteger(hit.instanceId) && object.userData.instanceIds) return object.userData.instanceIds[hit.instanceId] || null;
    return object.userData.id || null;
  }

  focusOn(id, point = null) {
    if (!id || !this.controls) return;
    const actor = this.actors.get(id);
    const destination = actor ? actor.position.clone() : id === 'PORTAL' ? worldFor('PORTAL') : point ? point.clone() : worldFor(id);
    destination.y = actor?.userData.major ? .7 : .15;
    this.cameraFocus = { from: this.controls.target.clone(), to: destination, started: performance.now(), duration: 360 };
  }

  makeSprite(url, width, height, centerY = .04) {
    const texture = this.textureLoader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: .035, depthWrite: false }));
    sprite.center.set(.5, centerY);
    sprite.scale.set(width, height, 1);
    sprite.position.y = .13;
    sprite.castShadow = true;
    return sprite;
  }

  makeEquipment(type) {
    const group = new THREE.Group();
    const bronze = new THREE.MeshStandardMaterial({ color: 0x9d6428, roughness: .38, metalness: .78 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe3b454, roughness: .3, metalness: .86 });
    const teal = new THREE.MeshStandardMaterial({ color: 0x176f75, roughness: .44, metalness: .62 });
    if (type === 'S') {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .075, 12, 1, false), bronze);
      plate.rotation.x = Math.PI / 2;
      plate.position.y = .31;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.245, .027, 6, 12), gold);
      rim.position.set(0, .31, .045);
      const boss = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 7), gold);
      boss.scale.z = .45;
      boss.position.set(0, .31, .075);
      const spokeA = new THREE.Mesh(new THREE.BoxGeometry(.32, .028, .035), gold);
      const spokeB = spokeA.clone();
      spokeA.position.set(0, .31, .073);
      spokeB.position.set(0, .31, .073);
      spokeB.rotation.z = Math.PI / 2;
      group.add(plate, rim, boss, spokeA, spokeB);
    } else {
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(.155, .23, .34, 6), teal);
      torso.position.y = .31;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(.13, .025, 6, 12), gold);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = .49;
      const skirt = new THREE.Mesh(new THREE.ConeGeometry(.235, .19, 6, 1, true), bronze);
      skirt.position.y = .1;
      const shoulderGeometry = new THREE.SphereGeometry(.095, 10, 6);
      const left = new THREE.Mesh(shoulderGeometry, gold);
      const right = left.clone();
      left.scale.set(1.25, .72, .9);
      right.scale.copy(left.scale);
      left.position.set(-.19, .42, 0);
      right.position.set(.19, .42, 0);
      const chest = new THREE.Mesh(new THREE.BoxGeometry(.05, .25, .025), gold);
      chest.position.set(0, .31, .16);
      group.add(torso, collar, skirt, left, right, chest);
    }
    group.traverse(node => {
      if (!node.isMesh) return;
      // These pieces are tiny, emissive focal points. Their moving shadow-map
      // contribution is invisible at play distance, so keep only receiving.
      node.castShadow = false;
      node.receiveShadow = true;
    });
    group.rotation.y = -.24;
    group.userData.equipment = true;
    return group;
  }

  makeRuneDie() {
    const group = new THREE.Group();
    const geometry = new THREE.DodecahedronGeometry(.29, 0);
    const stone = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        map: this.textures.P, color: 0x5a397a, emissive: 0x35105f,
        emissiveIntensity: .42, roughness: .68, metalness: .28
      })
    );
    const inner = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0xb974ff, transparent: true, opacity: .2,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    inner.scale.setScalar(.82);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 12),
      new THREE.LineBasicMaterial({ color: 0xe4b8ff, transparent: true, opacity: .82 })
    );
    group.add(stone, inner, edges);
    group.traverse(node => { if (node.isMesh) { node.castShadow = false; node.receiveShadow = true; } });
    group.userData.rune = true;
    return group;
  }

  makeOccupancyGlow(actor) {
    const major = actor.kind === 'monster' && actor.major;
    const radius = major ? .8 : actor.kind === 'monster' ? .66 : .61;
    const color = new THREE.Color(actor.kind === 'player' ? actor.color : major ? '#d95cff' : '#ff526d');
    const geometry = new THREE.RingGeometry(radius * .7, radius, 6);
    geometry.rotateX(-Math.PI / 2);
    const glow = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: major ? .34 : .2,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.NormalBlending
      })
    );
    glow.rotation.y = Math.PI / 6;
    glow.position.copy(worldFor(actor.pos));
    glow.position.y = .125;
    glow.userData.occupancy = true;
    glow.userData.baseOpacity = major ? .34 : .2;
    glow.userData.phase = actor.id.length * .73 + actor.pos.length * .19;
    glow.userData.actorId = actor.id;
    glow.userData.actorKey = `${actor.kind}|${actor.major ? 1 : 0}|${actor.color || ''}`;
    this.occupancyRoot.add(glow);
    this.occupancyGlows.set(actor.id, glow);
  }

  makeActor(actor) {
    const group = new THREE.Group();
    const major = actor.major;
    let visual;
    try {
      visual = actor.kind === 'player' ? createTravelerPilot(actor.charId || 'misty') : createMonsterPilot(major ? 'major' : 'minor');
      // Keep silhouettes readable without letting them spill beyond their board hex.
      const scale = actor.kind === 'player' ? (actor.charId === 'justin' ? .33 : .36) : major ? .36 : .47;
      visual.scale.setScalar(scale);
      visual.position.y = 0;
      visual.traverse(node => {
        if (node.userData.galleryPlatform) node.visible = false;
        if (!node.isMesh) return;
        node.userData.preserveMaterial = true;
        node.userData.actorModelMesh = true;
        // Tiny animated figures read through their contact glow and key light;
        // six skinned shadow casters were a disproportionate frame-time spike.
        node.castShadow = false;
        node.receiveShadow = false;
      });
      // The group remains the invisible rules/selection anchor. The rendered
      // feet are fitted to the real tile surface; only the Major levitates.
      visual.userData.setMode?.('idle');
      group.userData.visual3D = visual;
      group.add(visual);
    } catch (error) {
      console.warn('TABOK 3D actor unavailable; using illustrated fallback.', error);
      if (actor.kind === 'player') visual = this.makeSprite(PLAYER_ART[actor.charId] || PLAYER_ART.misty, 1.18, 1.65);
      else if (major) visual = this.makeSprite('assets/major-monster-fullbody-v1.png', 1.8, 2.65);
      else {
        visual = this.makeSprite('assets/monster-sprite.png', 1.34, 1.5, .2);
        visual.material.map.repeat.set(1 / 4, 1);
        visual.material.map.offset.set(0,0);
        visual.center.x=.47;
      }
      visual.position.y = 0;
      group.add(visual);
    }
    // Fit after attachment so Box3 includes the complete transformed hierarchy.
    // Traveler and Minor feet kiss the tile; the Major keeps half its old hover.
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(visual);
    if (Number.isFinite(bounds.min.y)) visual.position.y += (major ? .26 : 0) - bounds.min.y;
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(major ? 1.35 : .85, major ? 1.35 : .85), this.contactShadowMaterial.clone());
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = .009;
    contact.material.opacity = major ? .35 : .85;
    contact.raycast = () => {};
    group.add(contact);
    if (!group.userData.summoning && !group.userData.departing) group.position.copy(worldFor(actor.pos));
    group.userData.actorId = actor.id;
    group.userData.actorKey = `${actor.kind}|${actor.charId || ''}|${major ? 1 : 0}`;
    group.userData.actorKind = actor.kind;
    group.userData.major = !!major;
    group.userData.heading = visual?.rotation.y || 0;
    this.actorRoot.add(group);
    this.actors.set(actor.id, group);
    // Summons are explicit events, never a side effect of receiving a snapshot.
    return group;
  }

  clearGroup(group) {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      disposeObject(child);
    }
  }

  removeActor(id) {
    const actor = this.actors.get(id);
    if (actor?.userData.departing || actor?.userData.cinematicLocks) { actor.userData.pendingRemoval = true; return; }
    if (actor) {
      clearTimeout(actor.userData.actionTimer);clearTimeout(actor.userData.damageFlashTimer);actor.userData.actionResolve?.();
      this.actorRoot.remove(actor);
      disposeObject(actor);
      this.actors.delete(id);
    }
    const glow = this.occupancyGlows.get(id);
    if (glow) {
      this.occupancyRoot.remove(glow);
      disposeObject(glow);
      this.occupancyGlows.delete(id);
    }
  }

  syncActor(actor) {
    const actorKey = `${actor.kind}|${actor.charId || ''}|${actor.major ? 1 : 0}`;
    let group = this.actors.get(actor.id);
    if (group && group.userData.actorKey !== actorKey) {
      this.removeActor(actor.id);
      group = null;
    }
    if (!group) group = this.makeActor(actor);
    if (group.userData.cinematicLocks) group.userData.cinematicSnapshotPos = actor.pos;
    if (!group.userData.summoning && !group.userData.departing && !group.userData.cinematicLocks) group.position.copy(worldFor(actor.pos));
    if (group.userData.visual3D && actor.pos !== 'PORTAL' && !group.userData.cinematicLocks) {
      const atEntrance=actor.kind==='player'&&actor.start&&actor.pos===actor.start;
      if (atEntrance||!group.userData.hasTravelHeading) group.userData.heading = Math.atan2(-group.position.x, -group.position.z);
      group.userData.visual3D.rotation.y = group.userData.heading;
    }

    const glowKey = `${actor.kind}|${actor.major ? 1 : 0}|${actor.color || ''}`;
    let glow = this.occupancyGlows.get(actor.id);
    if (glow && glow.userData.actorKey !== glowKey) {
      this.occupancyRoot.remove(glow);
      disposeObject(glow);
      this.occupancyGlows.delete(actor.id);
      glow = null;
    }
    if (!glow) {
      this.makeOccupancyGlow(actor);
      glow = this.occupancyGlows.get(actor.id);
    }
    glow.position.copy(worldFor(actor.pos));
    glow.position.y = .125;
    glow.visible = !group.userData.cinematicLocks;
  }

  syncItems(state) {
    const signature = JSON.stringify([state.equipment, state.runes]);
    if (signature === this.itemSignature) return;
    this.itemSignature = signature;
    this.clearGroup(this.itemRoot);
    state.equipment.forEach(([pos, items]) => items.forEach((item, index) => {
      const equipment = this.makeEquipment(item);
      equipment.position.copy(worldFor(pos));
      equipment.position.x += (index - (items.length - 1) / 2) * .34;
      equipment.position.y = .2;
      this.itemRoot.add(equipment);
    }));
    state.runes.forEach(([pos, count]) => {
      if (count < 1) return;
      const die = this.makeRuneDie();
      die.position.copy(worldFor(pos));
      die.position.y = .55;
      this.itemRoot.add(die);
    });
  }

  syncLegalHighlights(state) {
    const signature = JSON.stringify([state.legal, state.portalLegal, state.turnColor]);
    if (signature === this.legalSignature) return;
    this.legalSignature = signature;
    this.clearGroup(this.highlightRoot);
    state.legal.forEach((id, index) => {
      const color = new THREE.Color(index === 0 ? 0xf7e4b5 : state.turnColor || '#d6aa58');
      const geometry = new THREE.RingGeometry(.575, .635, 6);
      geometry.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: index === 0 ? .52 : .38, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      ring.rotation.y = Math.PI / 6;
      ring.position.copy(worldFor(id));
      ring.position.y = .132;
      ring.userData.id = id;
      ring.userData.baseOpacity = index === 0 ? .52 : .38;
      ring.userData.hoverOpacity = .92;
      this.highlightRoot.add(ring);
    });
    if (state.portalLegal) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.28, 2.42, 64),
        new THREE.MeshBasicMaterial({ color: 0xffd58a, transparent: true, opacity: .48, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = .142;
      ring.userData.id = 'PORTAL';
      ring.userData.baseOpacity = .48;
      ring.userData.hoverOpacity = .88;
      this.highlightRoot.add(ring);
    }
  }

  syncState(state) {
    if (!state) return;
    const signature = JSON.stringify(state);
    if (signature === this.stateSignature) return;
    this.stateSignature = signature;
    this.majorPresent = state.monsters.some(monster => monster.major);
    const actors = [
      ...state.players.map(player => ({ ...player, kind: 'player' })),
      ...state.monsters.map(monster => ({ ...monster, kind: 'monster' }))
    ];
    const nextIds = new Set(actors.map(actor => actor.id));
    [...this.actors.keys()].forEach(id => { if (!nextIds.has(id)) this.removeActor(id); });
    actors.forEach(actor => this.syncActor(actor));
    this.syncItems(state);
    this.syncLegalHighlights(state);
  }

  setPortalState(state) { this.portalState = state || 'idle'; }

  setPresentationPaused(paused) {
    this.presentationPaused = Boolean(paused);
    if (!this.presentationPaused) {
      this.lastFrameAt = performance.now();
      this.frameTimes.length = 0;
    }
  }

  playPortalEvent(event) {
    if (!this.cinematics) this.cinematics = new PortalCinematics(this, worldFor, disposeObject);
    return this.cinematics.play(event);
  }

  resetPortalEvents() { this.cinematics?.reset(); }

  setQuality(quality = 'auto') {
    this.quality = quality;
    const dpr = Math.max(1, devicePixelRatio || 1);
    const mobile = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    // Cinematic remains the richest rendering path. Its adaptive floor prevents
    // a transient effect from turning into a long frame-rate collapse, but the
    // full lighting, portal geometry, debris and animation set stay enabled.
    this.adaptiveResolution = quality === 'full' || quality === 'auto';
    this.renderRatioMin = quality === 'auto' ? (mobile ? .72 : .9) : quality === 'full' ? (mobile ? .68 : .72) : quality === 'lite' ? .62 : 1;
    this.renderRatioMax = Math.min(dpr, quality === 'auto' ? (mobile ? 1 : 1.5) : quality === 'full' ? (mobile ? .92 : 1.2) : quality === 'ultra' ? 1 : .82);
    this.renderRatio = this.adaptiveResolution ? Math.min(this.renderRatioMax, quality === 'auto' ? (mobile ? .9 : 1.3) : (mobile ? .86 : 1.05)) : this.renderRatioMax;
    this.renderer.setPixelRatio(this.renderRatio);
    this.lastFrameAt = performance.now();
    this.lastQualityCheckAt = this.lastFrameAt;
    this.frameTimes.length = 0;
    this.qualityRecoveryChecks = 0;
    document.documentElement.dataset.renderScale = String(this.renderRatio);
    this.renderer.shadowMap.enabled = quality !== 'ultra' && quality !== 'lite';
    this.renderer.shadowMap.needsUpdate = this.renderer.shadowMap.enabled;
    this.actorRoot.traverse(node => {
      if (node.userData.actorModelMesh) node.castShadow = false;
    });
    const shadowSize = quality === 'auto' && !mobile ? 2048 : 1024;
    if (this.moonLight.shadow.mapSize.x !== shadowSize) {
      this.moonLight.shadow.mapSize.set(shadowSize, shadowSize);
      this.moonLight.shadow.map?.dispose();
      this.moonLight.shadow.map = null;
    }
    if (this.faultlineMaterial) this.faultlineMaterial.uniforms.uQuality.value = quality === 'ultra' ? .25 : quality === 'lite' ? .42 : 1;
    const enabledLights = quality === 'auto' && !mobile ? 6 : quality === 'auto' || quality === 'full' ? 3 : 2;
    this.templeLights.forEach((entry, index) => {
      // Every lantern and glow stays visible; only the costly lights are reduced.
      const enabled = enabledLights === 6 || (enabledLights === 3 ? index % 2 === 0 : index % 3 === 0);
      entry.light.visible = enabled;
      entry.glow.material.opacity = .7;
    });
    this.portalArcs?.forEach((arc, index) => {
      arc.visible = quality === 'full' || quality === 'auto' || index % 2 === 0;
    });
    if (this.portalDebrisMesh) this.portalDebrisMesh.count = quality === 'full' || quality === 'auto' ? this.portalDebris.length : Math.ceil(this.portalDebris.length / 2);
    if (this.portalCapMaterial) {
      this.portalCapMaterial.displacementScale = quality === 'ultra' ? .035 : quality === 'lite' ? .065 : .105;
      this.portalCapMaterial.bumpScale = quality === 'ultra' ? .035 : .075;
    }
    this.resize();
  }

  tuneResolution(now) {
    if (!this.adaptiveResolution || this.suspended) return;
    const delta = now - this.lastFrameAt;
    this.lastFrameAt = now;
    if (delta > 4 && delta < 100) this.frameTimes.push(delta);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    if (now - this.lastQualityCheckAt < 900 || this.frameTimes.length < 30) return;
    const average = this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length;
    const fps = 1000 / average;
    let next = this.renderRatio;
    if (fps < 57.5) {
      next = Math.max(this.renderRatioMin, this.renderRatio - (fps < 48 ? .18 : .1));
      this.qualityRecoveryChecks = 0;
    } else if (fps > 59.5 && this.renderRatio < this.renderRatioMax) {
      this.qualityRecoveryChecks += 1;
      if (this.qualityRecoveryChecks >= 3) {
        next = Math.min(this.renderRatioMax, this.renderRatio + .05);
        this.qualityRecoveryChecks = 0;
      }
    } else {
      this.qualityRecoveryChecks = 0;
    }
    if (Math.abs(next - this.renderRatio) >= .025) {
      this.renderRatio = Math.round(next * 100) / 100;
      this.renderer.setPixelRatio(this.renderRatio);
      this.resize();
      document.documentElement.dataset.renderScale = String(this.renderRatio);
    }
    this.lastQualityCheckAt = now;
    this.frameTimes.length = 0;
  }

  resetCamera() {
    this.applyResponsiveFraming(true);
  }

  applyResponsiveFraming(force = false) {
    if (!this.camera || !this.controls) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const mobile = matchMedia('(max-width:900px), (max-width:1180px) and (pointer:coarse)').matches;
    const portrait = rect.height > rect.width * 1.08;
    const key = mobile ? (portrait ? 'mobile-portrait' : 'mobile-landscape') : 'desktop';
    if (!force && key === this.framingKey) return;
    this.framingKey = key;
    this.controls.target.set(0, .15, 0);
    if (key === 'mobile-portrait') {
      this.camera.fov = 48;
      this.camera.position.set(0, 27.5, 26);
    } else if (key === 'mobile-landscape') {
      this.camera.fov = 44;
      this.camera.position.set(0, 20.5, 25.5);
    } else {
      this.camera.fov = 42;
      this.camera.position.set(0, 18.5, 23.5);
    }
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  orbitCamera(direction = 1) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * Math.PI / 10);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  playActorAction(id, mode = 'idle', duration = 900) {
    const actor = this.actors.get(id), visual = actor?.userData.visual3D;
    if (!visual?.userData.setMode) return Promise.resolve();
    visual.userData.setMode(mode);
    clearTimeout(actor.userData.actionTimer);
    actor.userData.actionResolve?.();
    return new Promise(resolve => {
      actor.userData.actionResolve=resolve;
      actor.userData.actionTimer = setTimeout(() => {
        if (actor.userData.visual3D === visual && !actor.userData.cinematicLocks) visual.userData.setMode('idle');
        actor.userData.actionResolve=null;
        resolve();
      }, duration);
    });
  }

  playMajorKill(targetId, duration = 1050) {
    const major = this.actors.get('MAJOR'), target = this.actors.get(targetId);
    const visual = major?.userData.visual3D;
    if (!major || !target || !visual) return Promise.resolve();
    const dx = target.position.x - major.position.x, dz = target.position.z - major.position.z;
    const heading = Math.atan2(dx, dz);
    visual.rotation.y = heading; major.userData.heading = heading; major.userData.hasTravelHeading = true;
    target.userData.visual3D?.userData.setMode?.('blast');
    this.damageFeedback(targetId, 1);
    const start = major.position.clone(), direction = new THREE.Vector3(dx, 0, dz).normalize(), reach = Math.min(.32, Math.max(0, Math.hypot(dx,dz)-1));
    const strike = start.clone().addScaledVector(direction, reach), started = performance.now();
    visual.userData.setMode?.('kill');
    return new Promise(resolve => {
      const step = now => {
        const u = Math.min(1, (now-started)/duration), lunge = Math.sin(u*Math.PI)**2;
        major.position.lerpVectors(start, strike, lunge);
        if (u < 1) requestAnimationFrame(step); else { major.position.copy(start);visual.userData.setMode?.('idle');target.userData.visual3D?.userData.setMode?.('idle');resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  createSkyBeam(position, color = 0x8eeeff, duration = 1050, power = 1) {
    const root = new THREE.Group(), material = new THREE.MeshBasicMaterial({color,transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.08 * power,.34 * power,9,10,1,true),material);
    beam.position.y=4.5;root.add(beam);
    const ringMaterial=material.clone(),rings=[];
    for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry((.34+i*.18)*power,.025*power,5,24),ringMaterial);ring.rotation.x=Math.PI/2;ring.position.y=.2+i*.08;root.add(ring);rings.push(ring)}
    const light=new THREE.PointLight(color,10*power,5*power,2);light.position.y=1.1;root.add(light);root.position.copy(position);root.position.y=.14;this.effectRoot.add(root);
    this.transientEffects.push({root,material,ringMaterial,rings,light,started:performance.now(),duration,type:'beam'});
  }

  lightningStrike(position, power = 1) {
    const root=new THREE.Group(),material=new THREE.LineBasicMaterial({color:0xf2d7ff,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});
    for(let branch=0;branch<3;branch++){const points=[];for(let i=0;i<10;i++){const u=i/9,spread=(1-u)*(.28+branch*.08)*power;points.push(new THREE.Vector3(position.x+Math.sin(i*8.7+branch)*spread,9-u*8.7,position.z+Math.cos(i*6.3+branch)*spread))}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);root.add(line)}
    const light=new THREE.PointLight(0xeed8ff,28*power,10*power,2);light.position.copy(position);light.position.y=1.6;root.add(light);this.effectRoot.add(root);this.transientEffects.push({root,material,light,started:performance.now(),duration:420,type:'lightning'});
  }

  pickupBurst(id, type = 'rune') {
    const actor=this.actors.get(id);if(!actor)return;
    const color=type==='armor'?0xffc35c:type==='shield'?0x72d9ff:0xa66cff;
    this.createSkyBeam(actor.position,color,type==='rune'?1350:1050,type==='rune'?1.18:1);
    this.playActorAction(id,type==='rune'?'rune':'receive',type==='rune'?1250:900);
  }


  animateActor(id, from, to, duration = 320, traversal = {}) {
    const actor = this.actors.get(id);
    if (!actor) return Promise.resolve();
    const start = worldFor(from), end = worldFor(to), started = performance.now(), visual = actor.userData.visual3D;
    const dx=end.x-start.x,dz=end.z-start.z,targetHeading=Math.atan2(dx,dz);
    const priorHeading=Number.isFinite(actor.userData.heading)?actor.userData.heading:targetHeading;
    const headingDelta=Math.atan2(Math.sin(targetHeading-priorHeading),Math.cos(targetHeading-priorHeading));
    actor.userData.heading=targetHeading;actor.userData.hasTravelHeading=true;
    const journeyLength=Math.max(1,Number(traversal.journeyLength)||1),journeyStep=Math.max(0,Number(traversal.journeyStep)||0);
    let movementMode='walk';
    if(actor.userData.major) movementMode='levitate';
    else if(actor.userData.actorKind==='player') movementMode=journeyLength>=3?'run':'walk';
    visual?.userData.setMode?.(movementMode);
    return new Promise(resolve => {
      const step = now => {
        const t = Math.min(1, (now - started) / duration);
        const eased = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        if(visual)visual.rotation.y=priorHeading+headingDelta*Math.min(1,t/.18);
        actor.position.lerpVectors(start, end, eased);
        if (t < 1) requestAnimationFrame(step); else { actor.position.copy(end);if(visual)visual.rotation.y=targetHeading;visual?.userData.setMode?.('idle');resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  showActorSpeech(id, text, duration = 2500, className = '') {
    const actor=this.actors.get(id);if(!actor||!text)return;
    const node=document.createElement('div');node.className='actor-speech-bubble'+(className?' '+className:'');node.textContent=text;node.setAttribute('role','status');
    const visual=actor.userData.visual3D,bounds=visual?new THREE.Box3().setFromObject(visual):null,head=bounds&&Number.isFinite(bounds.max.y)?Math.max(1.15,bounds.max.y-actor.position.y+.14):1.35;
    document.body.append(node);const entry={id,node,height:className==='heart-loss'?head+.12:head};this.actorSpeech.add(entry);this.positionActorSpeech(entry);
    setTimeout(()=>{node.classList.add('leaving');setTimeout(()=>{node.remove();this.actorSpeech.delete(entry)},220)},Math.max(500,duration-220));
  }

  positionActorSpeech(entry) {
    const point=this.actorScreenPoint(entry.id,entry.height);if(!point){entry.node.style.display='none';return}
    entry.node.style.display='';entry.node.style.left=point.x+'px';entry.node.style.top=point.y+'px';
  }

  damageFeedback(id, hearts = 1) {
    const actor=this.actors.get(id);if(!actor||hearts<1)return;
    this.showActorSpeech(id,'−'+hearts+' '+(hearts===1?'♥':'♥♥'),1650,'heart-loss');
    clearTimeout(actor.userData.damageFlashTimer);
    if(!actor.userData.damageMaterials){actor.userData.damageMaterials=[];actor.traverse(node=>{if(!node.isMesh)return;for(const mat of(Array.isArray(node.material)?node.material:[node.material])){if(!mat?.emissive||actor.userData.damageMaterials.some(x=>x.mat===mat))continue;actor.userData.damageMaterials.push({mat,color:mat.emissive.clone(),intensity:mat.emissiveIntensity||0})}})}
    actor.userData.damageMaterials.forEach(({mat})=>{mat.emissive.set(0xff183d);mat.emissiveIntensity=1.45});
    actor.userData.damageFlashTimer=setTimeout(()=>actor.userData.damageMaterials?.forEach(({mat,color,intensity})=>{mat.emissive.copy(color);mat.emissiveIntensity=intensity}),720);
  }

  actorScreenPoint(id,height=.72) {
    const actor=this.actors.get(id);
    if(!actor||!this.camera||!this.canvas)return null;
    const point=actor.position.clone();
    point.y+=height;
    point.project(this.camera);
    const rect=this.canvas.getBoundingClientRect();
    return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.applyResponsiveFraming();
  }

  render() {
    const now = performance.now();
    if (this.suspended || this.presentationPaused) return;
    this.tuneResolution(now);
    const time = (now - this.startedAt) / 1000;
    this.cosmicSanctuary?.update(time, this.quality, this.reducedMotion);
    if (this.faultlineMaterial) {
      this.faultlineMaterial.uniforms.uTime.value = time;
      const target = this.majorPresent ? 1 : 0;
      this.faultlineMaterial.uniforms.uMajor.value += (target - this.faultlineMaterial.uniforms.uMajor.value) * .035;
    }
    if(this.cameraFocus){const t=Math.min(1,(now-this.cameraFocus.started)/this.cameraFocus.duration),eased=1-Math.pow(1-t,3);this.controls.target.lerpVectors(this.cameraFocus.from,this.cameraFocus.to,eased);if(t>=1)this.cameraFocus=null}
    this.controls.update();
    if(now-this.lastSpeechUpdateAt>=33){this.actorSpeech.forEach(entry=>this.positionActorSpeech(entry));this.lastSpeechUpdateAt=now}
    const cinematic=this.summonCinematic,cinematicAge=cinematic?(now-cinematic.started):Infinity,cinematicLive=cinematicAge<cinematic?.duration;
    const reducedMotion=this.reducedMotion;
    const majorStorm=cinematicLive&&cinematic.major&&!reducedMotion;
    const stormProgress=cinematicLive?cinematicAge/cinematic.duration:1;
    const flash=majorStorm?Math.max(...[.15,.3,.49].map(at=>Math.max(0,1-Math.abs(stormProgress-at)*65))):0;
    this.hemisphereLight.intensity=majorStorm ? .12 : .78;this.ambientLight.intensity=majorStorm ? .025 : .16;this.moonLight.intensity=majorStorm?(flash?7.5:.38):4.25;this.rimLight.intensity=majorStorm?(flash?6.5:.35):2.05;
    const shake=cinematicLive&&!reducedMotion?(majorStorm?flash:Math.max(0,1-cinematicAge/400)):0;
    this.canvas.style.transform=shake?'translate('+(Math.sin(now*.091)*shake*3).toFixed(2)+'px,'+(Math.cos(now*.117)*shake*2).toFixed(2)+'px)':'';
    if(cinematic&&!cinematicLive){this.summonCinematic=null;this.canvas.style.transform=''}
    this.templeLights.forEach(entry => {
      const flicker = 1 + Math.sin(time * 7.7 + entry.phase) * .055 + Math.sin(time * 13.1 + entry.phase * 1.7) * .026;
      entry.light.intensity = entry.light.userData.baseIntensity * flicker * (majorStorm ? .035 + flash*.55 : 1);
      entry.flame.scale.y = 1 + Math.sin(time * 9.3 + entry.phase) * .16;
      entry.glow.material.opacity = .66 + Math.sin(time * 5.4 + entry.phase) * .11;
    });
    const look = PORTAL_LOOKS[this.portalState] || PORTAL_LOOKS.idle;
    const intensity = look[0] * (.94 + Math.sin(time * 2.15) * .06);
    this.portalLight.intensity += (intensity - this.portalLight.intensity) * .06;
    this.portalSpotlight.color.lerp(look[3], .04);
    this.portalSpotlight.intensity += (look[0] * .74 - this.portalSpotlight.intensity) * .045;
    this.portalVortexMaterial.uniforms.uTime.value = time;
    this.portalMistMaterial.uniforms.uTime.value = time;
    this.portalDomeMaterial.uniforms.uTime.value = time;
    this.portalVortexMaterial.uniforms.uPower.value += (look[1] - this.portalVortexMaterial.uniforms.uPower.value) * .045;
    this.portalMistMaterial.uniforms.uPower.value = this.portalVortexMaterial.uniforms.uPower.value;
    this.portalDomeMaterial.uniforms.uPower.value = .82 + (this.portalVortexMaterial.uniforms.uPower.value - 1) * .32;
    const colorA = look[2], colorB = look[3];
    this.portalVortexMaterial.uniforms.uColorA.value.lerp(colorA, .04);
    this.portalVortexMaterial.uniforms.uColorB.value.lerp(colorB, .04);
    this.portalMistMaterial.uniforms.uColorA.value.copy(this.portalVortexMaterial.uniforms.uColorA.value);
    this.portalMistMaterial.uniforms.uColorB.value.copy(this.portalVortexMaterial.uniforms.uColorB.value);
    this.portalDomeMaterial.uniforms.uColor.value.lerp(colorB, .045);
    this.portalRuneMaterial.color.lerp(colorB, .045);
    this.portalRuneMaterial.opacity = .76 + Math.sin(time * 2.35) * .16;
    this.portalEnergyMaterial.color.lerp(colorB, .045);
    this.portalEnergyMaterial.opacity = .64 + Math.sin(time * 2.9) * .2;
    const updateArcGeometry = now - this.lastArcUpdateAt >= 1000 / 30;
    this.portalArcs.forEach((arc, index) => {
      arc.material.color.lerp(colorB, .08);
      arc.material.opacity = .48 + Math.sin(time * 11.7 + index * 1.9) * .28;
      if (!updateArcGeometry || !arc.visible) return;
      const positions = arc.geometry.attributes.position.array;
      const phase = arc.userData.phase + time * (.08 + index * .004);
      for (let point = 0; point < 8; point++) {
        const progress = point / 7;
        const angle = phase + (progress - .5) * .22;
        const jitter = Math.sin(time * 23 + point * 7.3 + index * 3.1) * .026;
        const radius = 1.79 + jitter;
        positions[point * 3] = Math.sin(angle) * radius;
        positions[point * 3 + 1] = .54 + Math.sin(progress * Math.PI) * (.12 + .05 * Math.sin(time * 8 + index));
        positions[point * 3 + 2] = Math.cos(angle) * radius;
      }
      arc.geometry.attributes.position.needsUpdate = true;
    });
    if (updateArcGeometry) this.lastArcUpdateAt = now;
    this.portalStoneMaterial.emissive.lerp(colorA, .035);
    this.portalStoneMaterial.emissiveIntensity = .06 + look[1] * .07 + Math.sin(time * 1.7) * .025;
    this.portalCapMaterial.emissive.lerp(colorA, .035);
    this.portalCapMaterial.emissiveIntensity = .045 + look[1] * .055 + Math.sin(time * 1.7) * .02;
    this.portalRunes.rotation.z = time * .025;
    this.portalMist.rotation.z = -time * .055;
    const debrisInterval = this.quality === 'full' || this.quality === 'auto' ? 1000 / 30 : 1000 / 20;
    if (this.portalDebrisMesh && now - this.lastDebrisUpdateAt >= debrisInterval) {
      const count = this.portalDebrisMesh.count;
      for (let index = 0; index < count; index++) {
        const data = this.portalDebris[index], angle = data.angle + time * data.speed, shard = this.portalDebrisDummy;
        shard.position.set(Math.sin(angle) * data.radius, data.height + Math.sin(time * 1.35 + data.phase) * .13, Math.cos(angle) * data.radius);
        shard.rotation.set(time * (.18 + index * .007), time * (.25 - index * .005), time * .12);
        shard.scale.setScalar(data.scale);shard.updateMatrix();this.portalDebrisMesh.setMatrixAt(index, shard.matrix);
      }
      this.portalDebrisMesh.instanceMatrix.needsUpdate = true;
      this.lastDebrisUpdateAt = now;
    }
    this.itemRoot.children.forEach((item, index) => {
      if (item.userData.rune) {
        item.rotation.y = time * .72 + index;
        item.rotation.x = .18 + Math.sin(time * .58 + index) * .08;
        item.position.y = .5 + Math.sin(time * 1.8 + index) * .055;
      } else if (item.userData.equipment) {
        item.rotation.y = time * .82 + index * 1.7;
        item.position.y = .2 + Math.sin(time * 1.55 + index) * .035;
      }
    });
    this.occupancyRoot.children.forEach(glow => {
      if (!glow.userData.occupancy) return;
      const pulse = .88 + Math.sin(time * 2.6 + glow.userData.phase) * .08;
      glow.scale.setScalar(pulse);
      glow.material.opacity = glow.userData.baseOpacity * (.86 + Math.sin(time * 2.6 + glow.userData.phase) * .14);
    });
    const actorInterval = this.quality === 'lite' ? 66 : 33;
    if (now - this.lastActorModelUpdateAt >= actorInterval) {
      this.actorRoot.children.forEach(actor => {
        const visual = actor.userData.visual3D;
        if (!visual?.userData.update || visual.userData.cinematicFrozen) return;
        if (actor.userData.summonUntil && now >= actor.userData.summonUntil) {
          actor.userData.summonUntil = 0;
          visual.userData.setMode?.('idle');
        }
        visual.userData.update(time);
      });
      this.lastActorModelUpdateAt = now;
    }
    this.transientEffects=this.transientEffects.filter(effect=>{const u=(now-effect.started)/effect.duration;if(u>=1){this.effectRoot.remove(effect.root);disposeObject(effect.root);return false}const fade=Math.sin(Math.min(1,u)*Math.PI);effect.root.scale.setScalar(.72+u*.55);effect.material.opacity=effect.type==='lightning'?Math.max(0,1-u*1.3):fade*.82;if(effect.ringMaterial)effect.ringMaterial.opacity=fade*.9;if(effect.rings)effect.rings.forEach((ring,index)=>ring.scale.setScalar(1+u*(2.2+index*.35)));if(effect.light)effect.light.intensity*=(effect.type==='lightning' ? .72 : .94);return true});
    // Anchor the compact judgment on first load too, before any event is played.
    if (!this.cinematics) this.cinematics = new PortalCinematics(this, worldFor, disposeObject);
    this.cinematics.update(now);
    this.renderer.render(this.scene, this.camera);
  }
}

function keyTextureRepeat() { return 1; }
