/* Host-authoritative visual events. Rules are still resolved once by the host;
   peers animate immutable actor descriptions, not locally guessed state diffs. */
let portalVisualSequence = 0;
let portalVisualGeneration = 0;
const portalVisualSession = Date.now().toString(36);
const portalVisualPending = new Set();

function portalActorDescriptor(actor) {
  return actor.p
    ? {id:actor.p,kind:'player',pos:actor.pos,charId:actor.charId,color:actor.color,name:actor.name}
    : {id:actor.id,kind:'monster',pos:actor.pos,major:Boolean(actor.major),name:actor.major?'The Sovereign':actor.id};
}

function receivePortalVisual(event) {
  if (!['major','minor','crossing','rejection','death','pounce','fireball'].includes(event?.type) || typeof event.id!=='string') return Promise.resolve();
  const actor=event.actor;
  if (!actor || !/^(P[1-6]|M[1-3]|MAJOR)$/.test(actor.id) || !['player','monster'].includes(actor.kind)) return Promise.resolve();
  const validPosition=pos=>pos==='PORTAL'||(typeof pos==='string'&&/^-?\d{1,2},\d{1,2}$/.test(pos));
  if(!validPosition(actor.pos)||(event.destination&&!validPosition(event.destination)))return Promise.resolve();
  if(event.paths&&(!Array.isArray(event.paths)||event.paths.length>3||event.paths.some(path=>!Array.isArray(path)||path.length>30||path.some(pos=>!validPosition(pos)))))return Promise.resolve();
  const generation=portalVisualGeneration;
  const ready=webglBoard?.ready || (async()=>{
    const started=performance.now();
    while(!webglBoard?.isTrue3D&&generation===portalVisualGeneration&&performance.now()-started<12000)await new Promise(resolve=>setTimeout(resolve,100));
    await webglBoard?.ready;
  })();
  // Usually synchronous preparation is essential: retain the actor before the next snapshot.
  const play=()=>generation===portalVisualGeneration&&webglBoard?.isTrue3D ? webglBoard.playPortalEvent(event) : Promise.resolve();
  const promise=webglBoard?.cinematics ? play() : ready.then(play);
  return Promise.resolve(promise).catch(error=>console.warn('TABOK portal event recovered:',error));
}

function emitPortalVisual(type, actor, destination, details={}) {
  const event={id:portalVisualSession+'-'+(++portalVisualSequence),type,actor:portalActorDescriptor(actor),destination,speed:game?.speed||'cinematic'};
  if(details.paths)event.paths=details.paths;
  if(Number.isFinite(details.rage))event.rage=Math.max(0,Math.min(4,details.rage));
  window.TabokBroadcastVisual?.(event);
  const pending=receivePortalVisual(event);
  portalVisualPending.add(pending);pending.finally(()=>portalVisualPending.delete(pending));
  if(type!=='death'){
    clearTimeout(cpuTimer);clearTimeout(portalRevealTimer);busy=true;
    els.message.classList.add('hidden');pauseAmbient(false);
  }
  requestAnimationFrame(()=>{if(game){renderTokens();renderPlayers();syncTrue3DBoard();}});
  return pending;
}

function waitForPortalVisuals(callback) {
  const expedition=game;busy=true;
  Promise.all([...portalVisualPending]).then(()=>{
    if(game!==expedition)return;
    busy=false;pauseAmbient(false);if(callback)callback();
  });
}

window.TabokReceiveVisual=receivePortalVisual;

function resetPortalVisuals(){portalVisualGeneration++;webglBoard?.resetPortalEvents();portalVisualPending.clear();}
