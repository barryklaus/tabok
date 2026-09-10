import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
];
const FACE_SETS = {
  Movement: ['1', '1', '2', '2', '3', '3'],
  Action: ['TAKE', 'TAKE', 'TAKE', 'GIVE', 'GIVE', 'STEAL'],
  Rune: ['×2', '×3', 'SWAP', 'PLUNDER', 'RIFT', 'WILD']
};

function faceTexture(label, kind, faceIndex = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const movement = kind === 'Movement';
  const rune = kind === 'Rune';
  const glow = movement ? '#e9a942' : rune ? '#8e65db' : '#e1a94e';
  const glowLight = movement ? '#ffe3a0' : rune ? '#e5d5ff' : '#ffe2a1';
  const metal = rune ? '#8c6cab' : '#9b7138';

  // Flat, worn ruin stone matching the board. Energy belongs to the result,
  // not to the body of a die that is still tumbling.
  const base = context.createRadialGradient(172, 118, 18, 256, 256, 370);
  base.addColorStop(0, rune ? '#21192b' : '#211b16');
  base.addColorStop(.42, rune ? '#130f1c' : '#120f0c');
  base.addColorStop(1, '#050505');
  context.fillStyle = base; context.fillRect(0, 0, 512, 512);

  // Fine stone grain and non-emissive fractures.
  let seed = label.split('').reduce((sum, letter) => sum + letter.charCodeAt(0), movement ? 73 : 191);
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let index = 0; index < 850; index++) {
    const shade = 18 + Math.floor(random() * 28);
    context.fillStyle = `rgba(${shade + (movement ? 8 : 5)},${shade},${shade + (movement ? 0 : 11)},${.05 + random() * .12})`;
    context.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 3);
  }
  context.save(); context.strokeStyle = 'rgba(7,6,8,.72)'; context.lineWidth = 3;
  for (let crack = 0; crack < 8; crack++) {
    let x = 95 + random() * 320, y = 85 + random() * 340; context.beginPath(); context.moveTo(x, y);
    for (let step = 0; step < 4; step++) { x += (random() - .5) * 54; y += 16 + random() * 30; context.lineTo(x, y); }
    context.stroke();
  }
  context.restore();

  // Celestial face plate: clipped gold frame, inset medallion and precision marks.
  context.lineJoin = 'round'; context.shadowBlur = 0;
  const outerPlate = new Path2D('M86 28H426L484 86V426L426 484H86L28 426V86Z');
  context.strokeStyle = metal; context.lineWidth = 15; context.stroke(outerPlate);
  context.strokeStyle = 'rgba(224,176,92,.48)'; context.lineWidth = 3;
  context.stroke(new Path2D('M92 49H420L463 92V420L420 463H92L49 420V92Z'));
  context.strokeStyle = 'rgba(189,170,140,.4)'; context.lineWidth = 3;
  [[72,72,1,1],[440,72,-1,1],[72,440,1,-1],[440,440,-1,-1]].forEach(([x,y,sx,sy]) => {
    context.beginPath(); context.moveTo(x, y + sy * 54); context.quadraticCurveTo(x, y, x + sx * 54, y); context.stroke();
    context.beginPath(); context.moveTo(x + sx * 17, y + sy * 17); context.lineTo(x + sx * 34, y + sy * 34); context.stroke();
  });
  context.beginPath(); context.arc(256,256,151,0,Math.PI*2); context.strokeStyle='rgba(159,113,51,.72)'; context.lineWidth=5; context.stroke();
  context.beginPath(); context.arc(256,256,127,0,Math.PI*2); context.strokeStyle='rgba(218,166,77,.38)'; context.lineWidth=2; context.stroke();
  for(let tick=0;tick<12;tick++){
    const angle=tick*Math.PI/6,inner=tick%3===0?132:139,outer=147;
    context.beginPath();context.moveTo(256+Math.cos(angle)*inner,256+Math.sin(angle)*inner);context.lineTo(256+Math.cos(angle)*outer,256+Math.sin(angle)*outer);context.strokeStyle='rgba(216,163,76,.7)';context.lineWidth=tick%3===0?4:2;context.stroke();
  }
  const diamond=(x,y,size=8)=>{context.beginPath();context.moveTo(x,y-size);context.lineTo(x+size,y);context.lineTo(x,y+size);context.lineTo(x-size,y);context.closePath();context.strokeStyle='rgba(218,166,77,.78)';context.lineWidth=3;context.stroke()};
  [[256,70],[442,256],[256,442],[70,256]].forEach(([x,y])=>diamond(x,y,8));

  const orb = (x, y, radius = 46) => {
    context.save(); context.shadowBlur = 0;
    context.fillStyle = '#171318'; context.beginPath(); context.arc(x, y, radius + 9, 0, Math.PI * 2); context.fill();
    const core = context.createRadialGradient(x - radius * .24, y - radius * .3, 2, x, y, radius);
    core.addColorStop(0, '#fffde4'); core.addColorStop(.25, glowLight); core.addColorStop(.62, glow); core.addColorStop(1, movement ? '#743100' : rune ? '#003c52' : '#35004f');
    context.fillStyle = core; context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = metal; context.lineWidth = 10; context.stroke();
    context.strokeStyle = 'rgba(255,255,255,.52)'; context.lineWidth = 3; context.beginPath(); context.arc(x, y, radius - 10, -.9, 1.45); context.stroke(); context.restore();
  };

  const drawMovement = value => {
    context.save(); context.fillStyle=glowLight; context.shadowColor=glow; context.shadowBlur=10;
    context.font='112px Georgia, "Times New Roman", serif';context.textAlign='center';context.textBaseline='middle';
    context.fillText(String(value),256,264);context.restore();
  };
  const symbolStroke = () => { context.strokeStyle = glowLight; context.fillStyle=glowLight; context.lineWidth = 15; context.lineCap = 'round'; context.lineJoin = 'round'; context.shadowColor=glow; context.shadowBlur = 10; };
  const arrowHead = (x, y, angle) => {
    const length = 29, spread = .62; context.beginPath();
    context.moveTo(x - Math.cos(angle - spread) * length, y - Math.sin(angle - spread) * length); context.lineTo(x, y);
    context.lineTo(x - Math.cos(angle + spread) * length, y - Math.sin(angle + spread) * length); context.stroke();
  };
  const sparkle = (x,y,r=18) => {context.beginPath();context.moveTo(x,y-r);context.quadraticCurveTo(x+5,y-5,x+r,y);context.quadraticCurveTo(x+5,y+5,x,y+r);context.quadraticCurveTo(x-5,y+5,x-r,y);context.quadraticCurveTo(x-5,y-5,x,y-r);context.closePath();context.fill()};
  const palm = (flip=false) => {context.save();if(flip){context.translate(512,0);context.scale(-1,1)}context.beginPath();context.moveTo(133,293);context.quadraticCurveTo(184,276,222,288);context.lineTo(276,309);context.quadraticCurveTo(299,318,318,302);context.lineTo(352,272);context.quadraticCurveTo(365,258,379,272);context.quadraticCurveTo(385,281,374,293);context.lineTo(326,348);context.quadraticCurveTo(301,374,261,365);context.lineTo(177,343);context.lineTo(133,343);context.stroke();context.restore()};
  const treasureChest=()=>{context.save();context.lineWidth=13;context.strokeRect(190,207,132,92);context.beginPath();context.moveTo(190,242);context.lineTo(322,242);context.moveTo(256,242);context.lineTo(256,270);context.stroke();context.beginPath();context.arc(256,207,66,Math.PI,0);context.stroke();context.restore()};
  const hood=()=>{context.save();context.beginPath();context.moveTo(256,144);context.quadraticCurveTo(174,159,171,260);context.quadraticCurveTo(180,348,256,370);context.quadraticCurveTo(332,348,341,260);context.quadraticCurveTo(338,159,256,144);context.closePath();context.stroke();context.beginPath();context.moveTo(208,262);context.quadraticCurveTo(229,244,248,266);context.moveTo(304,262);context.quadraticCurveTo(283,244,264,266);context.stroke();context.restore()};
  const drawAction = action => {
    context.save(); symbolStroke();
    if (action === 'TAKE') {
      if(faceIndex%2===0){palm();sparkle(266,197,27)}else{treasureChest();sparkle(348,169,14)}
    } else if (action === 'GIVE') {
      palm(faceIndex%2===0);context.beginPath();context.moveTo(256,181);context.lineTo(220,230);context.lineTo(292,230);context.closePath();context.fill();sparkle(faceIndex%2===0?350:162,185,12);
    } else {
      if(faceIndex%2===0){context.beginPath();context.arc(247,258,105,-.6,Math.PI*1.42);context.stroke();arrowHead(334,200,-.35);palm(true)}else{hood()}
    }
    context.restore();
  };

  const drawRune = power => {
    context.save(); symbolStroke(); context.strokeStyle = glowLight; context.fillStyle = glowLight; context.translate(256,256);
    const runeGem = (x,y,r=24) => {
      context.save(); context.shadowBlur=0; context.fillStyle=glow;
      context.beginPath(); context.arc(x,y,r,0,Math.PI*2); context.fill(); context.strokeStyle=metal; context.lineWidth=7; context.stroke(); context.restore();
    };
    if (power === '×2' || power === '×3') {
      const count = power === '×2' ? 2 : 3;
      for (let index = 0; index < count; index++) {
        const x = (index - (count - 1) / 2) * 83;
        context.beginPath(); context.moveTo(x - 23,-55); context.lineTo(x + 23,55); context.moveTo(x + 23,-55); context.lineTo(x - 23,55); context.stroke();
      }
    } else if (power === 'SWAP') {
      context.beginPath(); context.arc(0,0,112,-2.65,-.18); context.stroke(); arrowHead(108,-20,.42);
      context.beginPath(); context.arc(0,0,112,.5,2.95); context.stroke(); arrowHead(-108,20,Math.PI+.42);
      runeGem(-58,0); runeGem(58,0);
    } else if (power === 'PLUNDER') {
      [[-105,-78],[105,-78],[0,118]].forEach(([x,y]) => {
        runeGem(x,y,22); const tx=x*.28,ty=y*.28;
        context.beginPath(); context.moveTo(x*.72,y*.72); context.lineTo(tx,ty); context.stroke(); arrowHead(tx,ty,Math.atan2(-y,-x));
      });
      runeGem(0,0,39);
    } else if (power === 'RIFT') {
      context.beginPath(); context.ellipse(0,0,68,132,0,0,Math.PI*2); context.stroke();
      context.beginPath(); context.moveTo(-138,0); context.lineTo(-78,0); context.moveTo(78,0); context.lineTo(138,0); context.stroke();
      context.beginPath(); context.moveTo(0,-104); context.lineTo(-28,-42); context.lineTo(19,-5); context.lineTo(-23,45); context.lineTo(0,105); context.stroke();
    } else {
      context.beginPath(); context.moveTo(-34,-134); context.lineTo(40,-48); context.lineTo(2,-22); context.lineTo(58,20); context.lineTo(-28,134); context.lineTo(-4,42); context.lineTo(-62,4); context.closePath(); context.fill();
      context.strokeStyle=metal; context.lineWidth=5; context.beginPath(); context.arc(0,0,158,0,Math.PI*2); context.stroke();
    }
    context.restore();
  };

  if (movement) drawMovement(Number(label)); else if (rune) drawRune(label); else drawAction(label);
  const mobileUpload=matchMedia('(max-width:900px), (pointer:coarse)').matches;
  const uploadCanvas=source=>{if(!mobileUpload)return source;const scaled=document.createElement('canvas');scaled.width=scaled.height=256;scaled.getContext('2d').drawImage(source,0,0,256,256);return scaled};
  const texture = new THREE.CanvasTexture(uploadCanvas(canvas)); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=512;const glowContext=glowCanvas.getContext('2d'),source=context.getImageData(0,0,512,512),mask=glowContext.createImageData(512,512);
  for(let y=78;y<434;y++)for(let x=78;x<434;x++){const i=(y*512+x)*4,luma=source.data[i]*.2126+source.data[i+1]*.7152+source.data[i+2]*.0722;if(luma>145){const value=Math.min(255,Math.max(0,(luma-145)*2.35));mask.data[i]=mask.data[i+1]=mask.data[i+2]=value;mask.data[i+3]=255}}
  glowContext.putImageData(mask,0,0);const emissiveMap=new THREE.CanvasTexture(uploadCanvas(glowCanvas));emissiveMap.colorSpace=THREE.SRGBColorSpace;emissiveMap.anisotropy=8;
  return {texture,emissiveMap};
}

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
    const violet = new THREE.PointLight(0xa249ff, 28, 12, 2); violet.position.set(4, 2, 2); this.scene.add(violet);
    this.dieGeometry = new RoundedBoxGeometry(2.05, 2.05, 2.05, 5, .24);
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
    const runeOnly=specs?.length===1&&specs[0].label==='Rune';
    const turnCast=(specs?.length===2||specs?.length===3)&&specs[0].label==='Movement'&&specs[1].label==='Action'&&(specs.length===2||specs[2].label==='Rune');
    return (runeOnly||turnCast)&&specs.every(spec=>spec.rolling!==false);
  }

  clearDice() {
    // Geometry, face textures and shader-ready materials are deliberately
    // retained. Rebuilding up to 36 large GPU textures every cast caused the
    // visible hitch at the beginning of a roll.
    this.dice.forEach(die => this.scene.remove(die));
    this.dice = [];
  }

  dieResource(kind) {
    if (this.dieResources.has(kind)) return this.dieResources.get(kind);
    const labels = FACE_SETS[kind];
    const materials = labels.map((label, faceIndex) => {
      const {texture,emissiveMap} = faceTexture(label, kind, faceIndex);
      return new THREE.MeshStandardMaterial({
        map: texture, emissiveMap, emissive:0x000000, emissiveIntensity:0, bumpMap: texture, bumpScale: .026,
        color: 0xffffff, roughness: .62, metalness: .22
      });
    });
    const resource = {labels,materials};this.dieResources.set(kind,resource);return resource;
  }

  buildDice(kind, x) {
    const {labels,materials} = this.dieResource(kind);
    materials.forEach(material=>{material.emissive.set(0x000000);material.emissiveIntensity=0});
    const die = new THREE.Mesh(this.dieGeometry, materials);
    die.position.set(x, 1.05, 0); die.scale.setScalar(1);die.rotation.set(0,0,0);die.castShadow = true; die.receiveShadow = true; die.userData = { kind, labels };
    this.scene.add(die); this.dice.push(die); return die;
  }

  prepare(specs, color = '#9d62d4') {
    if (!this.supports(specs)) return false;
    const signature=specs.map(spec=>spec.label).join('|');
    if(signature===this.preparedSignature&&this.dice.length===specs.length){
      this.dice.forEach(die=>die.material.forEach(material=>{material.emissive.set(0x000000);material.emissiveIntensity=0}));
      this.key.color.set(color);this.canvas.dataset.diceCount=String(specs.length);this.canvas.classList.add('active');this.resize();return true;
    }
    this.clearDice(); this.key.color.set(color);
    const positions = specs.length === 3 ? [-2.45,0,2.45] : specs.length === 2 ? [-1.45,1.45] : [0];
    specs.forEach((spec,index) => this.buildDice(spec.label,positions[index]));
    this.preparedSignature=signature;
    this.canvas.dataset.diceCount=String(specs.length); this.canvas.classList.add('active'); this.resize(); return true;
  }

  targetQuaternion(die, result, index) {
    const face = resultFaceIndex(die.userData.labels, result);
    die.userData.resultFace = face;
    const align = new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[face], new THREE.Vector3(0, 1, 0));
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
          die.position.y = 1.05 + Math.abs(Math.sin(t * Math.PI * 4.4 + index * .42)) * 2.65 * Math.pow(1 - t, 1.35);
          if (brake > 0) die.quaternion.slerp(starts[index].target, .045 + brake * .16);
        });
        if (t >= .62 && !brakingStarted) { brakingStarted = true; starts.forEach((start, index) => { start.quaternion.copy(this.dice[index].quaternion); }); }
        this.render();
        if (t < 1) requestAnimationFrame(frame); else {
          this.dice.forEach((die, index) => {
            die.position.set(landings[index],1.05,0); die.quaternion.copy(starts[index].target);
            const material = die.material[die.userData.resultFace];
            material.emissive.set(die.userData.kind === 'Movement' ? 0xffaa38 : die.userData.kind === 'Rune' ? 0x50e8ff : 0xd45aff); material.emissiveIntensity = 1.45;
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
