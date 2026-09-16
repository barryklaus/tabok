import * as THREE from 'three';
import { simulateDiceThrow, sampleDiceThrow } from './dice-physics.js?v=20260915D1';
import { faceTexture, offerFaceTexture, DICE_PALETTES, preloadTreasureIcons } from './dice-reference-art.js?v=20260915D1';
await preloadTreasureIcons();
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
];
const FACE_SETS = {
  Movement: ['1', '2', '3', '4', '5', '6'],
  Treasure: ['CHOOSE', 'CHOOSE', 'CHOOSE', 'BLANK', 'BLANK', 'BLANK'],
  Action: ['TAKE', 'TAKE', 'TAKE', 'GIVE', 'GIVE', 'STEAL'],
  Rune: ['WARP', 'DOUBLE', 'PHASE', 'BALANCE', 'FORTUNE', 'TIME'],
  Offer: Array.from({length:20},(_,index)=>String(index+1))
};

function resultFaceIndex(labels, result) {
  const wanted = String(result).toUpperCase();
  const matches = labels.map((label, index) => String(label).toUpperCase() === wanted ? index : -1).filter(index => index >= 0);
  return matches[Math.floor(Math.random() * matches.length)] ?? 2;
}

// Rounded ceramic with actual pip depressions; the same face labels feed art,
// geometry and result selection. Built once for each cached Movement D6.
function makePippedGeometry(labels) {
  const segments = 36, half = 1.025, edge = .145;
  const geometry = new THREE.BoxGeometry(half*2,half*2,half*2,segments,segments,segments);
  const positions=geometry.attributes.position,normals=geometry.attributes.normal,uv=geometry.attributes.uv;
  const patterns={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
  const point=new THREE.Vector3(),inner=new THREE.Vector3(),delta=new THREE.Vector3();
  const verticesPerFace=(segments+1)**2;
  for(let i=0;i<positions.count;i++){
    point.fromBufferAttribute(positions,i);inner.copy(point).clampScalar(-half+edge,half-edge);
    delta.copy(point).sub(inner).normalize();point.copy(inner).addScaledVector(delta,edge);
    positions.setXYZ(i,point.x,point.y,point.z);normals.setXYZ(i,delta.x,delta.y,delta.z);
    const face=Math.floor(i/verticesPerFace),normal=FACE_NORMALS[face];
    const u=(uv.getX(i)-.5)*half*2,v=(uv.getY(i)-.5)*half*2;
    for(const [x,y]of patterns[Number(labels[face])]||[]){
      const dx=u-x*(105/512*half*2),dy=v+y*(105/512*half*2),r=37/512*half*2,d2=(dx*dx+dy*dy)/(r*r);
      if(d2>=1)continue;
      point.addScaledVector(normal,-.072*(1-d2)**2);positions.setXYZ(i,point.x,point.y,point.z);
    }
  }
  // Recompute the cavity normals; soften duplicate face seams by position.
  geometry.computeVertexNormals();
  const sums=new Map();
  for(let i=0;i<positions.count;i++){
    const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>v.toFixed(5)).join(',');
    if(!sums.has(key))sums.set(key,new THREE.Vector3());sums.get(key).add(new THREE.Vector3().fromBufferAttribute(normals,i));
  }
  for(let i=0;i<positions.count;i++){
    const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>v.toFixed(5)).join(',');
    const n=sums.get(key).normalize();normals.setXYZ(i,n.x,n.y,n.z);
  }
  geometry.computeBoundingSphere();return geometry;
}

export class TabokDice3D {
  constructor(host) {
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fate-dice-canvas'; this.canvas.setAttribute('aria-label', 'Physical 3D dice');
    host.before(this.canvas); host.classList.add('fate-dice-fallback');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 2.2, .1, 50); this.camera.position.set(0, 7.2, 8.6); this.camera.lookAt(0, .55, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.add(new THREE.HemisphereLight(0xe7efff, 0x211b1a, 2.2));
    this.key = new THREE.SpotLight(0xfff3dc, 64, 25, Math.PI / 4, .48, 1.4); this.key.position.set(-3, 7, 5); this.key.castShadow = true; this.scene.add(this.key);
    const violet = new THREE.PointLight(0xa249ff, 28, 12, 2); violet.position.set(4, 2, 2); this.scene.add(violet);this.rim=violet;
    this.dieGeometry = new RoundedBoxGeometry(2.05, 2.05, 2.05, 4, .115);
    this.dieResources = new Map();
    this.preparedSignature = '';
    this.animationGeneration = 0; this.pendingResolve = null; this.animationFrame = null;
    this.makeTray(); this.dice = [];
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.canvas); this.resize();
  }

  makeTray() {
    this.trayParts = [];
    const tray = new THREE.Mesh(new RoundedBoxGeometry(11.5, .24, 7.5, 3, .1), new THREE.MeshStandardMaterial({ color: 0x171922, roughness: .96 }));
    tray.name = 'Dice rolling tray'; tray.position.y = -.12; tray.receiveShadow = true; this.scene.add(tray);
    this.trayParts.push(tray);
    const rim = new THREE.MeshStandardMaterial({ color: 0x383642, roughness: .63, metalness: .15 });
    for (const [x,z,w,d] of [[-5.6,0,.18,7.5],[5.6,0,.18,7.5],[0,-3.65,11.3,.18],[0,3.65,11.3,.18]]) {
      const wall = new THREE.Mesh(new RoundedBoxGeometry(w,.28,d,2,.04), rim);
      wall.position.set(x,.12,z); wall.castShadow = wall.receiveShadow = true; this.scene.add(wall);
      this.trayParts.push(wall);
    }
  }

  supports(specs) {
    const singleDie=specs?.length===1&&(Object.hasOwn(FACE_SETS,specs[0].label)||specs[0].label==='Last Chance');
    const offerOnly=specs?.length===1&&specs[0].label==='Offer';
    const turnCast=(specs?.length===2||specs?.length===3)&&specs[0].label==='Movement'&&['Treasure','Rune'].includes(specs[1].label)&&(specs.length===2||specs[2].label==='Offer');
    return (singleDie||offerOnly||turnCast)&&specs.every(spec=>spec.rolling!==false);
  }

  clearDice() {
    // Geometry, face textures and shader-ready materials are deliberately
    // retained. Rebuilding up to 36 large GPU textures every cast caused the
    // visible hitch at the beginning of a roll.
    this.dice.forEach(die => this.scene.remove(die));
    this.dice = [];
  }

  dieResource(kind,faceLabels=null) {
    const labels=(faceLabels?.length===6?faceLabels:FACE_SETS[kind]).map(String),key=kind+'|'+labels.join(',');
    if (this.dieResources.has(key)) return this.dieResources.get(key);
    const materials = labels.map((label, faceIndex) => {
      const {texture,emissiveMap} = faceTexture(label, kind, faceIndex);
      return new THREE.MeshStandardMaterial({
        map: texture, emissiveMap, emissive:0x000000, emissiveIntensity:0, bumpMap: texture, bumpScale: .026,
        color: 0xffffff, roughness: .3, metalness: .025
      });
    });
    const frame = new THREE.Group(); // Smooth ceramic edges, without metal cages.
    const geometry=kind==='Movement'?makePippedGeometry(labels):null;
    const resource = {labels,materials,frame,geometry};this.dieResources.set(key,resource);return resource;
  }

  buildDice(kind, x, faceLabels=null) {
    // Last Chance is the Offering D20 under a different rules label. Route it
    // through the exact same geometry, numbered faces, materials and cache.
    if(kind==='Offer'||kind==='Last Chance')return this.buildOfferDie(x,faceLabels);
    const {labels,materials,frame,geometry} = this.dieResource(kind,faceLabels);
    materials.forEach(material=>{material.emissive.set(0x000000);material.emissiveIntensity=0});
    const die = new THREE.Mesh(geometry||this.dieGeometry, materials);die.add(frame.clone(true));
    die.position.set(x, 1.05, 0); die.scale.setScalar(1);die.rotation.set(0,0,0);die.castShadow = true; die.receiveShadow = true; die.userData = { kind, labels };
    this.scene.add(die); this.dice.push(die); return die;
  }

  buildOfferDie(x, faceLabels=null) {
    const labels=(faceLabels?.length===20?faceLabels:FACE_SETS.Offer).map(String),key='Offer|'+labels.join(',');
    let resource=this.dieResources.get(key);
    if(!resource){
      const geometry=new THREE.IcosahedronGeometry(1.46,0),body=new THREE.MeshStandardMaterial({color:0xe8e4df,roughness:.3,metalness:.025});
      const template=new THREE.Group(),stone=new THREE.Mesh(geometry,body);stone.castShadow=true;stone.receiveShadow=true;template.add(stone);
      template.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry,16),new THREE.LineBasicMaterial({color:0x6a6470,transparent:true,opacity:.25})));
      const positions=geometry.attributes.position,faceNormals=[],resultMaterials=[];
      for(let face=0;face<20;face++){
        const vertices=[0,1,2].map(i=>new THREE.Vector3().fromBufferAttribute(positions,face*3+i));
        const [a,b,c]=vertices,center=a.clone().add(b).add(c).multiplyScalar(1/3),normal=new THREE.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize();
        if(normal.dot(center)<0)normal.negate();faceNormals.push(normal.clone());
        const {texture,emissiveMap}=offerFaceTexture(labels[face]);
        const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap,bumpMap:texture,bumpScale:.009,emissive:0x000000,emissiveIntensity:0,roughness:.3,metalness:.025});
        // Full triangular surfaces share the die's actual vertices. There are
        // no small square decals, transparent corners, or rotated face labels.
        const faceGeometry=new THREE.BufferGeometry();
        faceGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(v=>v.clone().sub(center).multiplyScalar(.991).add(center).addScaledVector(normal,.006).toArray()),3));
        faceGeometry.setAttribute('uv',new THREE.Float32BufferAttribute([.5,1-20/512,20/512,1-461/512,492/512,1-461/512],2));
        faceGeometry.computeVertexNormals();
        const panel=new THREE.Mesh(faceGeometry,material);panel.name='D20 face '+labels[face];template.add(panel);resultMaterials.push(material);
      }
      resource={template,faceNormals,resultMaterials,restHeight:1.46*Math.sqrt((5+2*Math.sqrt(5))/15)+.006};this.dieResources.set(key,resource);
    }
    const {faceNormals,resultMaterials}=resource,die=resource.template.clone(true);
    die.position.set(x,1.35,0);die.userData={kind:'Offer',labels,faceNormals,resultMaterials,restHeight:resource.restHeight};this.resetDieGlow(die);this.scene.add(die);this.dice.push(die);return die;
  }

  resetDieGlow(die) {
    const materials=die.userData.resultMaterials||(Array.isArray(die.material)?die.material:[]);
    materials.forEach(material=>{material.emissive?.set(0x000000);material.emissiveIntensity=0});
  }

  prepare(specs, color = '#9d62d4') {
    this.leaveSelection();
    if (!this.supports(specs)) return false;
    const signature=specs.map(spec=>spec.label+':'+(spec.faces||[]).join(',')).join('|');
    if(signature===this.preparedSignature&&this.dice.length===specs.length){
      this.dice.forEach(die=>this.resetDieGlow(die));
      this.key.color.set(0xffeedb);this.rim.color.set(specs[0].label==='Action'?0x53cbb7:specs[0].label==='Treasure'?0xe6af62:0xa879e0);this.rim.intensity=14;this.canvas.dataset.diceCount=String(specs.length);this.canvas.classList.add('active');this.resize();return true;
    }
    this.clearDice(); this.key.color.set(0xffeedb);this.rim.color.set(specs[0].label==='Action'?0x53cbb7:specs[0].label==='Treasure'?0xe6af62:0xa879e0);this.rim.intensity=14;
    const positions = specs.length === 3 ? [-2.45,0,2.45] : specs.length === 2 ? [-1.45,1.45] : [0];
    specs.forEach((spec,index) => this.buildDice(spec.label,positions[index],spec.faces));
    this.preparedSignature=signature;
    this.canvas.dataset.diceCount=String(specs.length); this.canvas.classList.add('active'); this.resize(); return true;
  }

  targetQuaternion(die, result, index) {
    const face = resultFaceIndex(die.userData.labels, result);
    die.userData.resultFace = face;
    const normal=die.userData.faceNormals?.[face]||FACE_NORMALS[face];
    const align = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
    const turns = this.dice.length === 3 ? [.16,0,-.16] : this.dice.length === 2 ? [.14,-.16] : [0];
    const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turns[index] || 0);
    return turn.multiply(align);
  }

  cancelAnimation() {
    this.animationGeneration++;
    if (this.animationFrame != null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    const resolve = this.pendingResolve; this.pendingResolve = null;
    resolve?.(false);
  }

  cast(specs, duration = 1850, color = '#9d62d4') {
    this.cancelAnimation();
    if (!this.prepare(specs, color)) return Promise.resolve(false);
    this.dice.forEach((die, index) => { die.scale.setScalar(1); this.targetQuaternion(die, specs[index].result, index); });
    let plan;
    try { plan = simulateDiceThrow(this.dice); }
    catch (error) {
      // Do not block a game turn if the simulation cannot settle. Present the
      // already-resolved result immediately; never invent a different outcome.
      this.dice.forEach((die,index) => { die.position.set((index-(this.dice.length-1)/2)*2.9,die.userData.restHeight||1.035,0); die.quaternion.copy(this.targetQuaternion(die,specs[index].result,index)); });
      this.canvas.classList.remove('casting'); this.canvas.classList.add('revealed'); this.render();
      return Promise.resolve(true);
    }
    this.lastThrow = plan;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const generation = this.animationGeneration, begun = performance.now();
    const rollDuration = reduced ? 0 : Math.max(120, Number(duration) || 1850);
    this.canvas.classList.remove('revealed'); this.canvas.classList.add('casting');
    return new Promise(resolve => {
      this.pendingResolve = resolve;
      const frame = now => {
        if (generation !== this.animationGeneration) return;
        const progress = rollDuration ? Math.min(1, (now - begun) / rollDuration) : 1;
        sampleDiceThrow(plan, progress).forEach((pose,index) => {
          this.dice[index].position.copy(pose.position); this.dice[index].quaternion.copy(pose.quaternion);
        });
        this.render();
        if (progress < 1) { this.animationFrame = requestAnimationFrame(frame); return; }
        this.dice.forEach(die => {
          const material = die.userData.resultMaterials?.[die.userData.resultFace] || die.material?.[die.userData.resultFace];
          material?.emissive?.set(DICE_PALETTES[die.userData.kind]?.glow || 0xb783ff);
          if (material) material.emissiveIntensity = .3;
        });
        this.canvas.classList.remove('casting'); this.canvas.classList.add('revealed'); this.render();
        this.animationFrame = null; this.pendingResolve = null; resolve(true);
      };
      this.animationFrame = requestAnimationFrame(frame);
    });
  }

  claim(duration=2600,color='#a887ff') {
    this.cancelAnimation();
    const generation=this.animationGeneration;
    if(!this.prepare([{label:'Rune'}],color))return Promise.resolve(false);
    const die=this.dice[0],begun=performance.now();
    this.canvas.classList.add('rune-claim-3d');
    return new Promise(resolve=>{
      this.pendingResolve=resolve;
      const frame=now=>{
        if(generation!==this.animationGeneration)return;
        const t=Math.min(1,(now-begun)/duration),arrive=1-Math.pow(1-Math.min(1,t/.34),3),depart=Math.max(0,(t-.78)/.22);
        die.position.x=0;
        die.position.y=THREE.MathUtils.lerp(.25,1.55,arrive)+Math.sin(t*Math.PI*5)*.14*(1-depart);
        die.position.z=THREE.MathUtils.lerp(1.7,0,arrive);
        die.rotation.x+=.025*(1-t*.55);die.rotation.y+=.052*(1-t*.55);die.rotation.z+=.014;
        const scale=1+Math.sin(Math.min(1,t/.38)*Math.PI)*.16+depart*.34;die.scale.setScalar(scale);
        this.render();
        if(t<1)this.animationFrame=requestAnimationFrame(frame);else{this.canvas.classList.remove('rune-claim-3d');this.animationFrame=null;this.pendingResolve=null;resolve(true)}
      };
      requestAnimationFrame(frame);
    });
  }

  // One GPU canvas, with a fixed viewport for each accessible selection button.
  // These are the same cached ceramic meshes and D20 used by the original tray.
  showSelection(specs, selected) {
    this.cancelAnimation();
    const signature='selection|'+specs.map(s=>s.label+':'+(s.faces||[]).join(',')).join('|');
    if(signature!==this.preparedSignature){
      this.clearDice();specs.forEach(s=>this.buildDice(s.label,0,s.faces));
      this.preparedSignature=signature;
    }
    this.selectionMode=true;
    this.host.append(this.canvas);this.host.classList.add('ds-physical');
    this.canvas.classList.add('selection-canvas','active');
    this.trayParts.forEach(part=>part.visible=false);
    if(!this.selectionFloor){
      this.selectionFloor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.22}));
      this.selectionFloor.rotation.x=-Math.PI/2;this.selectionFloor.receiveShadow=true;this.scene.add(this.selectionFloor);
      this.selectionCamera=new THREE.OrthographicCamera(-3,3,3,-3,.1,50);
      this.selectionCamera.position.set(0,7,8);this.selectionCamera.lookAt(0,1,0);
    }
    this.selectionFloor.visible=true;this.rim.intensity=8;
    this.dice.forEach((die,index)=>{
      this.resetDieGlow(die);die.visible=true;
      die.userData.selected=selected.includes(specs[index].label);
      die.userData.selectionLabel=specs[index].label;
      die.position.set(0,(die.userData.restHeight||1.035)+(die.userData.selected ? .22 : 0),0);
      die.quaternion.copy(this.targetQuaternion(die,die.userData.labels[0],index));
      die.rotateY(.18);
    });
    this.resize();return true;
  }

  leaveSelection() {
    if(!this.selectionMode)return;
    this.selectionMode=false;this.host.before(this.canvas);
    this.host.classList.remove('ds-physical');this.canvas.classList.remove('selection-canvas');
    this.trayParts.forEach(part=>part.visible=true);this.selectionFloor.visible=false;
    this.dice.forEach(die=>die.visible=true);
    this.renderer.setScissorTest(false);this.renderer.autoClear=true;
  }

  async castSelection(specs) {
    this.cancelAnimation();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rolls=specs.map(spec=>{
      const die=this.dice.find(d=>d.userData.selectionLabel===spec.label);
      if(!die)throw new Error('Unavailable selection die');
      const start={position:die.position.clone(),quaternion:die.quaternion.clone()};
      const target=this.targetQuaternion(die,spec.result,0);
      let plan=null;
      if(!reduced){try{plan=simulateDiceThrow([die])}catch(error){/* Keep the already chosen rules result. */}}
      return {die,start,plan,target};
    });
    this.selectionRolls=rolls;
    return this.selectionTween(reduced?0:900,t=>{
      rolls.forEach(({die,start,plan,target})=>{
        if(plan){
          const pose=sampleDiceThrow(plan,Math.max(0,(t-.12)/.88))[0];
          const end=plan.frames.at(-1)[0].position;
          // Compact the launch into its own slot: physical spin and bounce,
          // with no roaming into a stationary neighbour or a camera movement.
          const rest=die.userData.restHeight||1.035;
          const position=new THREE.Vector3((pose.position.x-end.x)*.12,rest+(pose.position.y-rest)*.42,.48+(pose.position.z-end.z)*.12);
          const enter=Math.min(1,t/.12);
          die.position.copy(start.position).lerp(position,enter);
          die.quaternion.copy(start.quaternion).slerp(pose.quaternion,enter);
        }else{
          die.position.set(0,die.userData.restHeight||1.035,.48);die.quaternion.copy(target);
        }
      });
      if(t===1)rolls.forEach(({die})=>{
        const material=die.userData.resultMaterials?.[die.userData.resultFace]||die.material?.[die.userData.resultFace];
        material?.emissive?.set(0xffdfab);if(material)material.emissiveIntensity=.22;
      });
    });
  }

  returnSelection() {
    const rolls=this.selectionRolls||[],starts=rolls.map(({die})=>die.position.clone());
    rolls.forEach(({die})=>this.resetDieGlow(die));
    return this.selectionTween(matchMedia('(prefers-reduced-motion: reduce)').matches?0:180,t=>{
      rolls.forEach(({die},i)=>die.position.copy(starts[i]).lerp(new THREE.Vector3(0,(die.userData.restHeight||1.035)+(die.userData.selected ? .22 : 0),0),1-(1-t)**3));
    });
  }

  selectionTween(duration,update) {
    const generation=this.animationGeneration,begun=performance.now();
    return new Promise(resolve=>{
      this.pendingResolve=resolve;
      const frame=now=>{
        if(generation!==this.animationGeneration)return;
        const t=duration?Math.min(1,(now-begun)/duration):1;update(t);this.render();
        if(t<1){this.animationFrame=requestAnimationFrame(frame);return}
        this.animationFrame=null;this.pendingResolve=null;resolve(true);
      };
      this.animationFrame=requestAnimationFrame(frame);
    });
  }

  hide() { this.cancelAnimation(); this.leaveSelection(); this.canvas.classList.remove('active', 'casting', 'revealed', 'rune-claim-3d'); }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth || 720), height = Math.max(1, this.canvas.clientHeight || 300);
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height;
    const framing = Math.max(1, 1.8 / this.camera.aspect);
    this.camera.position.set(0, 10.5 * framing, 12.5 * framing); this.camera.lookAt(0, 1.1, 0);
    this.camera.updateProjectionMatrix(); this.render();
  }

  render() {
    if(!this.selectionMode){this.renderer.render(this.scene,this.camera);return}
    const bounds=this.canvas.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
    this.renderer.autoClear=false;this.renderer.setScissorTest(false);this.renderer.clear();this.renderer.setScissorTest(true);
    this.dice.forEach(die=>die.visible=false);
    for(const die of this.dice){
      const stage=this.host.querySelector('[data-dice-choice="'+die.userData.selectionLabel+'"] .ds-stage');
      if(!stage)continue;
      const box=stage.getBoundingClientRect(),w=box.width,h=box.height;
      if(!w||!h)continue;
      const unit=2.8/Math.min(82,w*.68),camera=this.selectionCamera;
      camera.left=-w*unit/2;camera.right=w*unit/2;camera.top=h*unit/2;camera.bottom=-h*unit/2;camera.updateProjectionMatrix();
      this.renderer.setViewport(box.left-bounds.left,bounds.bottom-box.bottom,w,h);
      this.renderer.setScissor(box.left-bounds.left,bounds.bottom-box.bottom,w,h);
      die.visible=true;this.renderer.render(this.scene,camera);die.visible=false;
    }
    this.dice.forEach(die=>die.visible=true);this.renderer.setScissorTest(false);
    this.renderer.setViewport(0,0,bounds.width,bounds.height);
  }
}
