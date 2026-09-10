import * as THREE from 'three';
import { faceTexture, offerFaceTexture, DICE_PALETTES, preloadTreasureIcons } from './dice-reference-art.js?v=20260910G2';
await preloadTreasureIcons();
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
];
const FACE_SETS = {
  Movement: ['1', '2', '3', '4', '5', '6'],
  Treasure: ['RELIC', 'ODDITY', 'KEEPSAKE', 'BLANK', 'BLANK', 'BLANK'],
  Action: ['TAKE', 'TAKE', 'TAKE', 'GIVE', 'GIVE', 'STEAL'],
  Rune: ['×2', '×3', 'SWAP', 'PLUNDER', 'RIFT', 'WILD'],
  Offer: Array.from({length:20},(_,index)=>String(index+1))
};

function resultFaceIndex(labels, result) {
  const wanted = String(result).toUpperCase();
  const matches = labels.map((label, index) => String(label).toUpperCase() === wanted ? index : -1).filter(index => index >= 0);
  return matches[Math.floor(Math.random() * matches.length)] ?? 2;
}

export class TabokDice3D {
  constructor(host) {
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fate-dice-canvas'; this.canvas.setAttribute('aria-label', 'Physical 3D Movement, Action, and Rune dice');
    host.before(this.canvas); host.classList.add('fate-dice-fallback');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 2.2, .1, 50); this.camera.position.set(0, 7.2, 8.6); this.camera.lookAt(0, .55, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.add(new THREE.HemisphereLight(0xbda8ff, 0x1a0c05, 2.1));
    this.key = new THREE.SpotLight(0xffd895, 58, 25, Math.PI / 4, .48, 1.4); this.key.position.set(-3, 7, 5); this.key.castShadow = true; this.scene.add(this.key);
    const violet = new THREE.PointLight(0xa249ff, 28, 12, 2); violet.position.set(4, 2, 2); this.scene.add(violet);this.rim=violet;
    this.dieGeometry = new RoundedBoxGeometry(2.05, 2.05, 2.05, 4, .115);
    this.dieResources = new Map();
    this.preparedSignature = '';
    this.makeTray(); this.dice = [];
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.canvas); this.resize();
  }

  makeTray() {
    const altar=new THREE.Group();altar.name='Celestial dice instrument';this.scene.add(altar);
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(4.7,4.76,.12,64),new THREE.MeshStandardMaterial({color:0x080706,roughness:.9,metalness:.08}));
    tray.position.y=-.09;tray.receiveShadow=true;altar.add(tray);
    const metal=new THREE.MeshStandardMaterial({color:0x8c6b3d,roughness:.58,metalness:.55});
    const rim=new THREE.Mesh(new THREE.TorusGeometry(4.46,.025,5,96),metal);
    rim.rotation.x=Math.PI/2;rim.position.y=-.018;altar.add(rim);
    for(const radius of[2.72,3.58]){
      const orbit=new THREE.Mesh(new THREE.TorusGeometry(radius,.009,3,96),new THREE.MeshBasicMaterial({color:0xb89658,transparent:true,opacity:.28}));
      orbit.rotation.x=Math.PI/2;orbit.position.y=-.014;altar.add(orbit);
    }
    const points=[];
    for(let index=0;index<24;index++){
      const angle=index/24*Math.PI*2,inner=index%6===0?4.12:4.25,outer=4.42;
      points.push(new THREE.Vector3(Math.cos(angle)*inner,-.008,Math.sin(angle)*inner),new THREE.Vector3(Math.cos(angle)*outer,-.008,Math.sin(angle)*outer));
    }
    for(let index=0;index<4;index++){
      const angle=index*Math.PI/2,radius=3.58,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,s=.12;
      points.push(new THREE.Vector3(x,-.006,z-s),new THREE.Vector3(x+s,-.006,z),new THREE.Vector3(x+s,-.006,z),new THREE.Vector3(x,-.006,z+s),new THREE.Vector3(x,-.006,z+s),new THREE.Vector3(x-s,-.006,z),new THREE.Vector3(x-s,-.006,z),new THREE.Vector3(x,-.006,z-s));
    }
    const geometry=new THREE.BufferGeometry().setFromPoints(points);
    altar.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xc3a064,transparent:true,opacity:.48})));
  }

  supports(specs) {
    const singleDie=specs?.length===1&&Object.hasOwn(FACE_SETS,specs[0].label);
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
        color: 0xffffff, roughness: .52, metalness: .38
      });
    });
    // Physical metal seams catch light independently from the etched face maps.
    const frame=new THREE.Group(),edgeMaterial=new THREE.MeshStandardMaterial({color:DICE_PALETTES[kind]?.metal||'#9876ad',roughness:.34,metalness:.78});
    const edgeGeometry=new THREE.CylinderGeometry(.016,.016,1.78,6);
    for(let axis=0;axis<3;axis++)for(const a of [-1,1])for(const b of [-1,1]){
      const edge=new THREE.Mesh(edgeGeometry,edgeMaterial),pos=[0,0,0];pos[(axis+1)%3]=a*.981;pos[(axis+2)%3]=b*.981;edge.position.set(...pos);
      if(axis===0)edge.rotation.z=Math.PI/2;else if(axis===2)edge.rotation.x=Math.PI/2;frame.add(edge);
    }
    const resource = {labels,materials,frame};this.dieResources.set(key,resource);return resource;
  }

  buildDice(kind, x, faceLabels=null) {
    if(kind==='Offer')return this.buildOfferDie(x,faceLabels);
    const {labels,materials,frame} = this.dieResource(kind,faceLabels);
    materials.forEach(material=>{material.emissive.set(0x000000);material.emissiveIntensity=0});
    const die = new THREE.Mesh(this.dieGeometry, materials);die.add(frame.clone(true));
    die.position.set(x, 1.05, 0); die.scale.setScalar(1);die.rotation.set(0,0,0);die.castShadow = true; die.receiveShadow = true; die.userData = { kind, labels };
    this.scene.add(die); this.dice.push(die); return die;
  }

  buildOfferDie(x, faceLabels=null) {
    const labels=(faceLabels?.length===20?faceLabels:FACE_SETS.Offer).map(String),key='Offer|'+labels.join(',');
    let resource=this.dieResources.get(key);
    if(!resource){
      const geometry=new THREE.IcosahedronGeometry(1.46,0),body=new THREE.MeshStandardMaterial({color:0x24132e,roughness:.54,metalness:.32});
      const template=new THREE.Group(),stone=new THREE.Mesh(geometry,body);stone.castShadow=true;stone.receiveShadow=true;template.add(stone);
      template.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry,16),new THREE.LineBasicMaterial({color:0xc096a8,transparent:true,opacity:.95})));
      const positions=geometry.attributes.position,faceNormals=[],resultMaterials=[];
      for(let face=0;face<20;face++){
        const vertices=[0,1,2].map(i=>new THREE.Vector3().fromBufferAttribute(positions,face*3+i));
        const [a,b,c]=vertices,center=a.clone().add(b).add(c).multiplyScalar(1/3),normal=new THREE.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize();
        if(normal.dot(center)<0)normal.negate();faceNormals.push(normal.clone());
        const {texture,emissiveMap}=offerFaceTexture(labels[face]);
        const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap,bumpMap:texture,bumpScale:.009,emissive:0x000000,emissiveIntensity:0,roughness:.48,metalness:.38});
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
    const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turns[index]);
    return turn.multiply(align);
  }

  cast(specs, duration = 1750, color = '#9d62d4') {
    if (!this.prepare(specs, color)) return Promise.resolve(false);
    const landings = this.dice.length === 3 ? [-2.45,0,2.45] : this.dice.length === 2 ? [-1.45,1.45] : [0];
    const launches = this.dice.length === 3 ? [-4.1,0,4.1] : this.dice.length === 2 ? [-2.8,2.8] : [-2.5];
    const starts = this.dice.map((die, index) => {
      const direction=index%2?-1:1;
      die.position.set(launches[index],4.1+index*.28,-1.5+index*.28);
      die.rotation.set(direction>0?-1.2:1.7,direction>0?1.4:-.9,direction>0?-1.5:.7);
      return { quaternion: die.quaternion.clone(), target: this.targetQuaternion(die, specs[index].result, index) };
    });
    this.canvas.classList.add('casting'); const begun = performance.now(); let brakingStarted = false;
    return new Promise(resolve => {
      const frame = now => {
        const t = Math.min(1, (now - begun) / duration), brake = Math.max(0, (t - .62) / .38);
        this.dice.forEach((die, index) => {
          const direction = index % 2 ? -1 : 1;
          if (!brakingStarted) {
            die.rotation.x += (.19 - t * .08) * direction; die.rotation.y += .24 - t * .1; die.rotation.z += .15 * direction;
          }
          const landingX = landings[index];
          die.position.x = THREE.MathUtils.lerp(launches[index],landingX,Math.min(1,t*1.28));
          die.position.z = THREE.MathUtils.lerp(-1.5 + index * .35, 0, Math.min(1, t * 1.35));
          die.position.y = (die.userData.restHeight||1.05) + Math.abs(Math.sin(t * Math.PI * 4.4 + index * .42)) * 2.65 * Math.pow(1 - t, 1.35);
          if (brake > 0) die.quaternion.slerp(starts[index].target, .045 + brake * .16);
        });
        if (t >= .62 && !brakingStarted) { brakingStarted = true; starts.forEach((start, index) => { start.quaternion.copy(this.dice[index].quaternion); }); }
        this.render();
        if (t < 1) requestAnimationFrame(frame); else {
          this.dice.forEach((die, index) => {
            die.position.set(landings[index],die.userData.restHeight||1.05,0); die.quaternion.copy(starts[index].target);
            const material = die.userData.resultMaterials?.[die.userData.resultFace]||die.material?.[die.userData.resultFace];
            material?.emissive?.set(DICE_PALETTES[die.userData.kind]?.glow || 0xb783ff); if(material)material.emissiveIntensity = .72;
          });
          this.canvas.classList.remove('casting'); this.canvas.classList.add('revealed'); this.render(); resolve(true);
        }
      };
      requestAnimationFrame(frame);
    });
  }

  claim(duration=2600,color='#a887ff') {
    if(!this.prepare([{label:'Rune'}],color))return Promise.resolve(false);
    const die=this.dice[0],begun=performance.now();
    this.canvas.classList.add('rune-claim-3d');
    return new Promise(resolve=>{
      const frame=now=>{
        const t=Math.min(1,(now-begun)/duration),arrive=1-Math.pow(1-Math.min(1,t/.34),3),depart=Math.max(0,(t-.78)/.22);
        die.position.x=0;
        die.position.y=THREE.MathUtils.lerp(.25,1.55,arrive)+Math.sin(t*Math.PI*5)*.14*(1-depart);
        die.position.z=THREE.MathUtils.lerp(1.7,0,arrive);
        die.rotation.x+=.025*(1-t*.55);die.rotation.y+=.052*(1-t*.55);die.rotation.z+=.014;
        const scale=1+Math.sin(Math.min(1,t/.38)*Math.PI)*.16+depart*.34;die.scale.setScalar(scale);
        this.render();
        if(t<1)requestAnimationFrame(frame);else{this.canvas.classList.remove('rune-claim-3d');resolve(true)}
      };
      requestAnimationFrame(frame);
    });
  }

  hide() { this.canvas.classList.remove('active', 'casting', 'revealed'); }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth || 720), height = Math.max(1, this.canvas.clientHeight || 300);
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.render();
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
