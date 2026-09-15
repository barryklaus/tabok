import * as THREE from 'three';
import { celestialMaterial } from './celestial-materials.js?v=20260915A1';

function canvasTexture(canvas, colorSpace = THREE.SRGBColorSpace) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

function makeDistantField(random, mobile) {
  const canvas = document.createElement('canvas');
  canvas.width = mobile ? 1024 : 2048; canvas.height = mobile ? 512 : 1024;
  const context = canvas.getContext('2d');
  context.fillStyle = '#788bb5'; context.fillRect(0, 0, canvas.width, canvas.height);
  // Unresolved lights are baked into the one background texture: no draw cost.
  const image = context.getImageData(0, 0, canvas.width, canvas.height), data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    const noise = random(), star = noise > .9965 ? 16 + random() * 46 : random() * 3.2;
    data[index] = 113 + star * .78; data[index + 1] = 131 + star * .84;
    data[index + 2] = 177 + star; data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = canvasTexture(canvas); texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function makeMidField(random, mobile) {
  const canvas = document.createElement('canvas');
  canvas.width = mobile ? 768 : 1536; canvas.height = mobile ? 384 : 768;
  const context = canvas.getContext('2d'); context.clearRect(0, 0, canvas.width, canvas.height);
  const count = mobile ? 230 : 430;
  for (let index = 0; index < count; index++) {
    const x = random() * canvas.width, y = random() * canvas.height;
    const rare = random() > .91, radius = rare ? 1.2 + random() * 1.9 : .35 + random() * .8;
    const alpha = .2 + random() * .58, warm = random() > .72;
    context.fillStyle = warm ? `rgba(231,210,174,${alpha})` : `rgba(196,210,228,${alpha})`;
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
    if (rare) {
      context.fillStyle = `rgba(238,233,216,${alpha * .38})`;
      context.fillRect(x - radius * 3.4, y - .3, radius * 6.8, .6);
      context.fillRect(x - .3, y - radius * 3.4, .6, radius * 6.8);
    }
  }
  return canvasTexture(canvas);
}

function makeCloseStar() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d'), gradient = context.createRadialGradient(128,128,1,128,128,124);
  gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(.035,'rgba(255,255,255,.98)');
  gradient.addColorStop(.12,'rgba(255,255,255,.42)'); gradient.addColorStop(.42,'rgba(255,255,255,.075)');
  gradient.addColorStop(1,'rgba(255,255,255,0)'); context.fillStyle=gradient; context.fillRect(0,0,256,256);
  context.fillStyle='rgba(255,255,255,.42)'; context.fillRect(20,127,216,2); context.fillRect(127,20,2,216);
  return canvasTexture(canvas);
}

// One locally hosted painted cloud panorama, two star depths and instanced ruins.
// The baked star field remains a fallback if the artwork cannot load.
export function createCosmicSanctuary(scene, stoneMaps) {
  let seed=71943;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const mobile=matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  const distant=makeDistantField(random,mobile);scene.background=distant;scene.backgroundIntensity=.82;
  // Mirrored longitude closes the wrap without a hard edge. The vertical crop
  // places the cloud horizon behind the board at the default elevated camera.
  const skyMaterial=new THREE.ShaderMaterial({
    uniforms:{uGalaxy:{value:null}},
    vertexShader:`varying vec3 vDirection;
      void main(){
        vDirection=position;
        vec4 clip=projectionMatrix*mat4(mat3(viewMatrix*modelMatrix))*vec4(position,1.);
        gl_Position=clip.xyww;
      }`,
    fragmentShader:`uniform sampler2D uGalaxy;varying vec3 vDirection;
      void main(){
        vec3 d=normalize(vDirection);
        vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5);
        vec2 paintedUv=vec2(uv.x*2.,clamp(uv.y*1.8+.13,.015,.985));
        vec3 nebula=texture2D(uGalaxy,paintedUv).rgb;
        float pole=smoothstep(.96,.995,abs(d.y));
        gl_FragColor=vec4(mix(nebula*.92,vec3(.24,.30,.47),pole),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),skyMaterial);
  sky.name='Painted cloud sanctuary';sky.frustumCulled=false;sky.renderOrder=-100;sky.visible=false;sky.raycast=()=>{};
  sky.rotation.set(0,2.765,0);scene.add(sky);
  let disposed=false;
  const galaxy=new THREE.TextureLoader().load(new URL('./assets/celestial-sky-v1.jpg',import.meta.url).href,texture=>{
    if(disposed){texture.dispose();return}
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=THREE.MirroredRepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    skyMaterial.uniforms.uGalaxy.value=texture;sky.visible=true;
  },undefined,()=>{/* Keep the lightweight star field if the image is unavailable. */});
  const root=new THREE.Group();root.name='Three-depth star sanctuary';scene.add(root);

  const middleTexture=makeMidField(random,mobile);
  const middleGeometry=new THREE.SphereGeometry(62,mobile?20:28,mobile?12:16);
  const middleMaterial=new THREE.MeshBasicMaterial({map:middleTexture,transparent:true,opacity:.2,side:THREE.BackSide,depthWrite:false,fog:false});
  const middle=new THREE.Mesh(middleGeometry,middleMaterial);middle.rotation.y=.37;middle.renderOrder=-20;root.add(middle);

  const closeTexture=makeCloseStar(),closeStars=[],hues=[0xf4eee1,0xd9e5f3,0xf1dcc4,0xe2def6,0xd5e9e6];
  const closeCount=mobile?6:10;
  for(let index=0;index<closeCount;index++){
    const angle=index/closeCount*Math.PI*2+random()*.4,radius=34+random()*14,height=4+random()*18;
    const material=new THREE.SpriteMaterial({map:closeTexture,color:hues[index%hues.length],transparent:true,opacity:.24+random()*.24,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
    const star=new THREE.Sprite(material),size=.45+random()*.9;
    star.position.set(Math.sin(angle)*radius,height,Math.cos(angle)*radius);star.scale.set(size,size,1);star.renderOrder=-10;root.add(star);closeStars.push(star);
  }

  const stone=celestialMaterial({map:stoneMaps.map,bumpMap:stoneMaps.bump,bumpScale:.018,color:0x7585af});
  const object=new THREE.Object3D();
  const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),stone,84),motion=[];
  for(let index=0;index<84;index++){
    const angle=random()*Math.PI*2,radius=18+random()*19;
    motion.push({pos:new THREE.Vector3(Math.sin(angle)*radius,-7+random()*11,Math.cos(angle)*radius),phase:random()*6.28,scale:.25+random()*1.45,rotation:new THREE.Euler(random()*3,random()*3,random()*3)});
  }
  rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);rocks.frustumCulled=false;root.add(rocks);
  const blocks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),stone,180);let count=0;
  for(let index=0;index<12;index++){
    const angle=index/12*Math.PI*2+.12,radius=16.1+random()*.8,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
    const style=index%4,towers=style===2?2:1;
    for(let tower=0;tower<towers;tower++){
      const levels=style===0?6:style===1?3:style===2?4:5,lateral=towers===2?(tower?1:-1)*.58:0;
      for(let level=0;level<levels;level++){
        const taper=1-level*(style===0?.065:.035),lean=style===3?level*.095:0;
        object.position.set(x+Math.cos(angle)*lateral+Math.sin(angle)*lean,level*(style===0?.68:.61)-.3,z-Math.sin(angle)*lateral+Math.cos(angle)*lean);
        object.rotation.set(style===3?.035*level:.025,angle+(random()-.5)*.055,style===1&&level===levels-1?.19:.035);
        object.scale.set((style===0?.46:.58)*taper,style===0?.64:.57,(style===1?.86:.64)*taper);object.updateMatrix();blocks.setMatrixAt(count++,object.matrix);
      }
    }
    for(let rubble=0;rubble<6;rubble++){object.position.set(x+(random()-.5)*2.5,-.85+random()*.35,z+(random()-.5)*2.5);object.rotation.set(random()*.5,random()*6.28,random()*.3);object.scale.set(.35+random()*.65,.25+random()*.4,.4+random()*.6);object.updateMatrix();blocks.setMatrixAt(count++,object.matrix)}
  }
  blocks.count=count;blocks.instanceMatrix.needsUpdate=true;blocks.receiveShadow=true;root.add(blocks);
  let last=-Infinity;
  return {
    update(time,quality,reducedMotion){
      const interval=quality==='ultra'?1/12:1/24;if(time-last<interval)return;last=time;rocks.count=quality==='ultra'?36:84;
      motion.slice(0,rocks.count).forEach((item,index)=>{object.position.copy(item.pos);object.position.y+=reducedMotion?0:Math.sin(time*.16+item.phase)*.18;object.rotation.copy(item.rotation);if(!reducedMotion)object.rotation.y+=time*.008;object.scale.set(item.scale*.75,item.scale*1.6,item.scale);object.updateMatrix();rocks.setMatrixAt(index,object.matrix)});rocks.instanceMatrix.needsUpdate=true;
    },
    dispose(){
      disposed=true;galaxy.dispose();sky.removeFromParent();sky.geometry.dispose();skyMaterial.dispose();
      scene.background=null;root.removeFromParent();rocks.geometry.dispose();blocks.geometry.dispose();middleGeometry.dispose();middleMaterial.dispose();
      closeStars.forEach(star=>star.material.dispose());stone.dispose();distant.dispose();middleTexture.dispose();closeTexture.dispose();
    }
  };
}
