// Local presentation only: never changes turns, movement or multiplayer state.
export class PortalRiddleReveal {
  constructor(){this.reset()}
  reset(){this.hovered=false;this.until=0;this.progress=0;this.target=0;this.from=0;this.started=0}
  hover(value){this.hovered=Boolean(value);if(!value)this.until=0}
  reveal(now){this.until=now+6500}
  dismiss(){this.hovered=false;this.until=0}
  sample(now,reducedMotion=false){
    const target=this.hovered||now<this.until?1:0;
    if(target!==this.target){this.from=this.progress;this.target=target;this.started=now}
    const t=Math.min(1,Math.max(0,(now-this.started)/(target?360:260)));
    const eased=1-Math.pow(1-t,3);
    this.progress=reducedMotion?target:this.from+(target-this.from)*eased;
    return {visible:this.progress>.001,opacity:this.progress,y:3.3-(reducedMotion?0:.32*(1-this.progress)),scale:reducedMotion?1:.97+.03*this.progress};
  }
}
