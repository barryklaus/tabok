import * as THREE from 'three';
import { createSculptedTraveler } from './sculpted-travelers.js?v=20260908D1';

function disposeModel(root){
  root?.traverse(node=>{
    if(!node.isMesh)return;
    node.geometry?.dispose?.();
    for(const material of(Array.isArray(node.material)?node.material:[node.material]))material?.dispose?.();
  });
}

export class TabokBustPreview {
  constructor(){
    // Avoid a second WebGL context on iPhone/iPad. The main board retains the
    // full 3D cast; the preview uses its illustrated fallback on mobile so
    // Safari cannot evict the game tab under GPU memory pressure.
    this.available=!matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    if(!this.available)return;
    this.canvas=document.createElement('canvas');
    this.canvas.className='character-bust-canvas';
    this.canvas.setAttribute('aria-hidden','true');
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(25,1,.1,20);
    this.camera.position.set(0,2.8,5.15);
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.18;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.15));
    this.scene.add(new THREE.HemisphereLight(0xf0d9ad,0x100b13,2.15));
    const key=new THREE.DirectionalLight(0xffd796,4.8);key.position.set(-3,5,5);this.scene.add(key);
    const rim=new THREE.DirectionalLight(0x7c56a8,3.2);rim.position.set(4,3,-3);this.scene.add(rim);
    this.clock=new THREE.Clock();this.visible=false;this.presentationPaused=document.documentElement.classList.contains('effects-paused');this.lastFrame=0;this.boundFrame=now=>this.frame(now);
    this.observer=new IntersectionObserver(entries=>{this.visible=Boolean(entries[0]?.isIntersecting);if(this.visible)this.requestFrame()},{threshold:.05});
  }

  attach(host){
    if(!host||!this.available)return;
    host.append(this.canvas);this.visible=true;this.observer.disconnect();this.observer.observe(host);this.resize();this.requestFrame();
  }

  show(id){
    if(!this.available)return;
    if(this.id===id&&this.model)return;
    if(this.model){this.scene.remove(this.model);disposeModel(this.model)}
    this.id=id;this.model=createSculptedTraveler(id);this.model.scale.setScalar(1.12);this.model.position.set(0,.02,0);this.model.rotation.y=.08;
    this.scene.add(this.model);this.frameModel();this.clock.start();this.renderOnce();this.requestFrame();
  }

  hide(){this.visible=false}

  setPresentationPaused(paused){this.presentationPaused=Boolean(paused);if(!this.presentationPaused&&this.visible)this.requestFrame()}

  resize(){
    const rect=this.canvas.parentElement?.getBoundingClientRect();if(!rect)return;
    const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
    this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.frameModel();this.renderOnce();
  }

  frameModel(){
    if(!this.model)return;
    this.model.updateWorldMatrix(true,true);
    const box=new THREE.Box3().setFromObject(this.model),size=box.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<=0)return;
    // Crop below the chest, but calculate the camera from each sculpture's
    // actual hair/head bounds so tall hairstyles never push the face away.
    const lower=box.min.y+size.y*.43,upper=box.max.y+size.y*.035;
    const target=new THREE.Vector3((box.min.x+box.max.x)*.5,(lower+upper)*.5,(box.min.z+box.max.z)*.5);
    const visibleHeight=upper-lower,visibleWidth=size.x*1.08;
    const halfFov=THREE.MathUtils.degToRad(this.camera.fov*.5);
    const distance=Math.max(visibleHeight/(2*Math.tan(halfFov)),visibleWidth/(2*Math.tan(halfFov)*Math.max(.5,this.camera.aspect)))*1.06;
    this.camera.position.set(target.x,target.y+.015,target.z+distance);
    this.camera.lookAt(target);this.camera.updateProjectionMatrix();
  }

  requestFrame(){if(!this.frameRequest)this.frameRequest=requestAnimationFrame(this.boundFrame)}

  frame(now){
    this.frameRequest=0;if(!this.visible||!this.model||document.hidden||this.presentationPaused)return;
    // The bust is intentionally capped at 15 fps. At this small size it still
    // reads as alive while leaving the main 3D board nearly the full GPU budget.
    if(now-this.lastFrame>=66){this.lastFrame=now;this.model.userData.update?.(this.clock.getElapsedTime());this.renderer.render(this.scene,this.camera)}
    this.requestFrame();
  }

  renderOnce(){if(this.model)this.renderer.render(this.scene,this.camera)}
}
