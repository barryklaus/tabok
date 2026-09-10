const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const bridge=fs.readFileSync(path.join(root,'portal-events.js'),'utf8');
const multiplayer=fs.readFileSync(path.join(root,'multiplayer.js'),'utf8');
const event={id:'host-session-1',type:'rejection',actor:{id:'P1',kind:'player',pos:'PORTAL',charId:'misty',name:'Custom Name'},destination:'0,0'};

function context(board){
 const calls=[];const c={window:{},game:{round:1},webglBoard:board,performance,console,setTimeout,clearTimeout,Date,Promise,
 requestAnimationFrame:fn=>{},cpuTimer:null,portalRevealTimer:null,busy:false,
 els:{message:{classList:{add(){}}}},pauseAmbient(){},renderTokens(){},renderPlayers(){},syncTrue3DBoard(){}};
 if(!board)c.webglBoard={isTrue3D:true,cinematics:{},ready:Promise.resolve(),playPortalEvent:e=>{calls.push(e);return Promise.resolve()},resetPortalEvents(){}};
 vm.createContext(c);vm.runInContext(bridge,c);return{c,calls};
}

test('game scripts parse, including the inline engine',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');let count=0;
 for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  if(/src=|importmap|type="module"/.test(match[1]))continue;
  new vm.Script(match[2]);count++;
 }
 assert.ok(count>0);
 new vm.Script(multiplayer);new vm.Script(bridge);
});

test('visual descriptors preserve custom names and start destinations without changing rules',async()=>{
 const {c,calls}=context();const sent=[];c.window.TabokBroadcastVisual=e=>sent.push(e);
 const hero={p:'P1',name:'Custom Name',charId:'misty',pos:'PORTAL',color:'#fa8774',inventory:[2,1,0]};
 await c.emitPortalVisual('rejection',hero,'0,0');
 assert.equal(hero.pos,'PORTAL');assert.deepEqual(hero.inventory,[2,1,0]);
 assert.equal(sent[0].actor.name,'Custom Name');assert.equal(sent[0].destination,'0,0');assert.equal(calls.length,1);
 assert.equal(vm.runInContext('portalVisualPending.size',c),0);
});

test('invalid network events cannot create actors',async()=>{
 const {c,calls}=context();
 for(const invalid of [{...event,type:'other'},{...event,actor:{...event.actor,id:'P999'}},{...event,destination:'not-a-hex'},{...event,actor:{...event.actor,pos:'99,INVALID'}}])await c.receivePortalVisual(invalid);
 assert.equal(calls.length,0);
});

test('pounce and fireball visual events validate bounded board paths',async()=>{
 const {c,calls}=context();
 const pounce={...event,id:'host-pounce',type:'pounce',actor:{id:'M1',kind:'monster',pos:'2,2',name:'M1'},destination:'4,3'};
 const fireball={...event,id:'host-fireball',type:'fireball',actor:{id:'MAJOR',kind:'monster',pos:'5,5',major:true,name:'The Sovereign'},destination:'5,5',paths:[['5,5','6,5','7,5']],rage:2};
 await c.receivePortalVisual(pounce);await c.receivePortalVisual(fireball);
 assert.equal(calls.length,2);
 await c.receivePortalVisual({...fireball,id:'bad-path',paths:[['5,5','outside']]});
 assert.equal(calls.length,2);
});

test('a state snapshot during renderer startup does not drop a visual event',async()=>{
 let ready;const received=[];const {c}=context({isTrue3D:true,ready:new Promise(r=>ready=r),playPortalEvent:e=>{received.push(e);return Promise.resolve()}});
 const pending=c.receivePortalVisual(event);c.game={round:2};ready();await pending;
 assert.equal(received.length,1);
});

test('reset cancels events still waiting for renderer startup',async()=>{
 let ready;const received=[];const {c}=context({isTrue3D:true,ready:new Promise(r=>ready=r),playPortalEvent:e=>{received.push(e);return Promise.resolve()},resetPortalEvents(){}});
 const pending=c.receivePortalVisual(event);c.resetPortalVisuals();ready();await pending;assert.equal(received.length,0);
});

test('only host broadcasts; the guest receives the explicit event once through the network handler',()=>{
 const sent=[],played=[];let snapshots=0;
 const c={window:{TabokReceiveVisual:e=>played.push(e)},isHost:true,room:{phase:'game'},broadcast:data=>sent.push(data),queueSnapshot:()=>snapshots++,applyGameSnapshot(){},applyUI(){},showRoomNotice(){}};
 vm.createContext(c);
 const install=multiplayer.split('\n').find(line=>line.includes('window.TabokBroadcastVisual='));vm.runInContext(install,c);
 c.window.TabokBroadcastVisual(event);assert.equal(sent.length,1);assert.equal(snapshots,1);assert.equal(sent[0].type,'visual-event');
 c.isHost=false;c.window.TabokBroadcastVisual(event);assert.equal(sent.length,1);
 const receive=multiplayer.match(/  function receiveFromHost\(data\) \{[\s\S]+?\n  \}/)[0];vm.runInContext(receive,c);
 c.receiveFromHost(sent[0]);assert.equal(played.length,1);assert.equal(played[0],event);
});

test('rejected or crossed actors are emitted before their rule-state changes',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/function cross\(p,source\)\{[^\n]*emitPortalVisual\('crossing'[\s\S]*?p.status='crossed'/);
 assert.match(html,/function reject\(p\)\{emitPortalVisual\('rejection',p,p.start\);p.pos=p.start/);
 assert.match(html,/function kill\(p,events\)\{emitPortalVisual\('death',p,p.pos\);p.status='dead'/);
 assert.ok(!html.includes('webglBoard?.portalExit'));
});

test('Rift Hunt rules use four Hearts, x2 Minors, fourth-rejection Major and bounded Rage',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/inventory:\[0,0,0\],life:4,/);
 assert.match(html,/monster=\{id:'M'\+n,pos:open,moveMultiplier:2/);
 assert.match(html,/else if\(n===4\).*summonMajorMonster/);
 assert.match(html,/monster\.rage=Math\.min\(4,n-4\)/);
 assert.match(html,/MINOR_ACTION=\['ATTACK','ATTACK','ATTACK','POUNCE','POUNCE','POUNCE'\]/);
 assert.match(html,/applyDamage\(traveler,2,m\.id\+' direct Rift Pounce'/);
 assert.match(html,/applyDamage\(impact\.target,2,'Major Fireball '/);
 assert.ok(!html.includes('Color Attack'));
});

test('Living Diorama stages idles, portal cards, Pounce concealment and rejection flailing',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const travelers=fs.readFileSync(path.join(root,'sculpted-travelers.js'),'utf8');
 const monsters=fs.readFileSync(path.join(root,'sculpted-monsters.js'),'utf8');
 const cinematics=fs.readFileSync(path.join(root,'portal-cinematics.js'),'utf8');
 assert.match(travelers,/idleBehaviorCount=30/);
 assert.match(travelers,/mode==='blast'/);
 assert.match(monsters,/idleBehaviorCount=18/);
 assert.match(monsters,/idleBehaviorCount=24/);
 assert.match(cinematics,/event\.type === 'rejection' \? 'blast'/);
 assert.match(cinematics,/actor\.visible=u<\.36\|\|u>=\.58/);
 assert.match(html,/data-final=/);
 assert.match(html,/820\+index\*1380/);
 assert.match(html,/Math\.pow\(progress,3\.8\)\*330/);
 assert.match(html,/p\.name\+' finds a path'/);
});

test('Grounded Legends removes plinths, faces travel and shares character speech',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const board=fs.readFileSync(path.join(root,'true3d-board.js'),'utf8');
 const travelers=fs.readFileSync(path.join(root,'sculpted-travelers.js'),'utf8');
 const monsters=fs.readFileSync(path.join(root,'sculpted-monsters.js'),'utf8');
 const cinematics=fs.readFileSync(path.join(root,'portal-cinematics.js'),'utf8');
 const actorFactory=board.match(/makeActor\(actor\) \{([\s\S]*?)\n  clearGroup\(/)?.[1]||'';
 const talks=cinematics.match(/const CROSSING_TALKS = \[([\s\S]*?)\];/)?.[1]||'';
 assert.ok(!actorFactory.includes('CylinderGeometry'),'actor factory must not create visible plinth cylinders');
 assert.match(board,/\(major \? \.26 : 0\) - bounds\.min\.y/);
 assert.match(board,/const atEntrance=actor\.kind==='player'&&actor\.start&&actor\.pos===actor\.start/);
 assert.match(board,/targetHeading=Math\.atan2\(dx,dz\)/);
 assert.match(board,/movementMode=journeyLength>=3\?'run':'walk'/);
 assert.ok(!board.includes("'slide'"));
 assert.match(travelers,/\['move','walk','run','crouch','jump','acro'\]/);
 assert.match(monsters,/mode==='move'\|\|mode==='walk'/);
 assert.match(monsters,/mode==='move'\|\|mode==='levitate'/);
 assert.equal([...talks.matchAll(/'([^']+)'/g)].length,50);
 assert.match(cinematics,/board\.showActorSpeech\?\./);
 assert.match(cinematics,/eventPhrase\(event,event\.type==='crossing'\?CROSSING_TALKS:REJECTION_TALKS\)/);
 assert.match(html,/journeyLength:route\.length/);
});

test('Decision Altar synchronizes choices, actor clicks and Sovereign execution',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const multiplayer=fs.readFileSync(path.join(root,'multiplayer.js'),'utf8');
 const board=fs.readFileSync(path.join(root,'true3d-board.js'),'utf8');
 const monsters=fs.readFileSync(path.join(root,'sculpted-monsters.js'),'utf8');
 const cinematics=fs.readFileSync(path.join(root,'portal-cinematics.js'),'utf8');
 assert.match(html,/id="actionDecisionOverlay"/);
 assert.match(html,/Automate treasure actions/);
 assert.match(html,/window\.TabokSelect3DActor=select3DActor/);
 assert.match(html,/actor-tooltip-health/);
 assert.match(multiplayer,/window\.TabokRoute3DActor=route3DActor/);
 assert.match(multiplayer,/autoTreasureActions/);
 assert.match(board,/playMajorKill\(targetId/);
 assert.match(monsters,/execution=mode==='kill'/);
 assert.match(cinematics,/summonSpin=major&&!this\.reduced/);
});

test('Free Camera uses left orbit and right pan without click-to-focus',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const board=fs.readFileSync(path.join(root,'true3d-board.js'),'utf8');
 assert.match(board,/controls\.enablePan = true/);
 assert.match(board,/mouseButtons\.LEFT = THREE\.MOUSE\.ROTATE/);
 assert.match(board,/mouseButtons\.RIGHT = THREE\.MOUSE\.PAN/);
 assert.match(board,/touches\.TWO = THREE\.TOUCH\.DOLLY_PAN/);
 assert.doesNotMatch(board,/this\.focusOn\(actorId \|\| id, hit\.point\)/);
 assert.match(html,/Left-drag to orbit · Right-drag to move/);
});

test('Correction pass adds heart feedback, Major reroll and delayed carried verdict',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const board=fs.readFileSync(path.join(root,'true3d-board.js'),'utf8');
 const cinematics=fs.readFileSync(path.join(root,'portal-cinematics.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'portal-events.css'),'utf8');
 assert.match(board,/return new THREE\.Vector3\([^;]+, \.11,/);
 assert.match(board,/damageFeedback\(id, hearts = 1\)/);
 assert.match(html,/webglBoard\?\.damageFeedback\?\.\(p\.p,left\)/);
 assert.match(html,/MAJOR_MODE=\[[^\]]+'EXTRA TURN'\]/);
 assert.match(html,/monsterTurns\.push\(m\)/);
 assert.match(html,/rolls all three dice again/);
 assert.match(html,/function portalVerdict\(p,traveler,matches\)/);
 assert.match(html,/cardHTML\(q\.cards,false\)\+'<div class="result">[^<]+<\/div>'\+portalVerdict/);
 assert.match(css,/\.portal-verdict\.match/);
 assert.match(css,/\.actor-speech-bubble\.heart-loss/);
 assert.match(cinematics,/event\.type==='crossing'\?4200:3950/);
});

test('Starpath removes replay, resolves automation authoritatively, shortens Portal routes and simplifies lobby start',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const multiplayer=fs.readFileSync(path.join(root,'multiplayer.js'),'utf8');
 const cosmic=fs.readFileSync(path.join(root,'cosmic-sanctuary.js'),'utf8');
 assert.doesNotMatch(html,/id='replayHighlight'|id="replayHighlight"|Replay last moment/);
 assert.match(html,/function automationAuthority\(\)/);
 assert.match(html,/if\(busy\)\{actionAutoTimer=setTimeout\(attempt,120\)/);
 assert.match(multiplayer,/window\.TabokCanRunAutomation=\(\)=>!room\|\|room\.phase!=='game'\|\|isHost/);
 assert.match(html,/if\(!routes\.has\('PORTAL'\)\)routes\.set\('PORTAL',route\)/);
 assert.match(html,/game\.turn\.remaining>=1&&gateway\.has/);
 assert.match(html,/surrenders any unused movement/);
 assert.match(multiplayer,/capacity:2/);
 assert.match(multiplayer,/hostSeat\.kind = 'human'/);
 assert.match(multiplayer,/mp-start-path/);
 assert.match(multiplayer,/function scheduleInitiativeRolls\(\)/);
 assert.match(cosmic,/canvas\.width = mobile \? 1024 : 2048/);
 assert.match(cosmic,/new THREE\.SphereGeometry\(62,mobile\?20:28,mobile\?12:16\)/);
 assert.match(cosmic,/LinearMipmapLinearFilter/);
});

test('automatic Grand Plunder releases the post-movement treasure resolver',async()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const source=['queueAutomatedTreasureAction','queueAutomatedPlunder','finishMovement'].map(name=>html.split('\n').find(line=>line.includes('function '+name+'('))?.trim()).join('\n');
 assert.ok(!source.includes('undefined'),'automation functions must remain available to the engine');
 const turn={runePower:'PLUNDER',autoResolveState:'running'},player={inventory:[0,0,0]},target={inventory:[1,0,0]};
 const c={game:{phase:'rune',turn},actionAutoTimer:null,busy:false,plunderRuns:0,actionRuns:0,setTimeout,clearTimeout,
  timing:()=>0,automationAuthority:()=>true,active:()=>player,runePlunderTargets:()=>[target],plunderRequired:()=>1,
  chooseCPUPlunder:()=>[0],resolveRunePlunder:()=>{c.plunderRuns++},finishRunePower(){},clearLegal(){},renderAll(){},cpuAction(){c.actionRuns++}};
 vm.createContext(c);vm.runInContext(source,c);
 vm.runInContext('queueAutomatedPlunder()',c);await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(c.plunderRuns,1);assert.equal(turn.autoPlunderResolveState,'running');
 await vm.runInContext('finishMovement()',c);
 assert.equal(c.game.phase,'action');assert.equal(turn.autoPlunderResolveState,undefined);assert.equal(turn.autoResolveState,undefined);
 vm.runInContext('queueAutomatedTreasureAction()',c);await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(c.actionRuns,1);assert.equal(turn.autoActionResolveState,'running');
});

test('Render Discipline reuses dice resources and removes invisible competing GPU work',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const board=fs.readFileSync(path.join(root,'true3d-board.js'),'utf8');
 const dice=fs.readFileSync(path.join(root,'true3d-dice.js'),'utf8');
 const bust=fs.readFileSync(path.join(root,'character-bust-preview.js'),'utf8');
 assert.match(dice,/this\.dieResources = new Map\(\)/);
 assert.match(dice,/signature===this\.preparedSignature&&this\.dice\.length===specs\.length/);
 assert.match(dice,/scaled\.width=scaled\.height=256/);
 assert.doesNotMatch(dice,/die\.geometry\.dispose\(\); die\.material\.forEach/);
 assert.match(board,/this\.renderer\.shadowMap\.autoUpdate = false/);
 assert.match(board,/setPresentationPaused\(paused\)/);
 assert.match(board,/this\.portalDebrisMesh = new THREE\.InstancedMesh/);
 assert.match(board,/this\.suspended \|\| this\.presentationPaused/);
 assert.match(bust,/document\.hidden\|\|this\.presentationPaused/);
 assert.match(html,/webglBoard\?\.setPresentationPaused\?\.\(paused\)/);
 assert.match(html,/if\(physical\)pauseAmbient\(false\)/);
});

test('Gilded Fate uses reference-matched treasure art and engraved symbol dice',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const dice=fs.readFileSync(path.join(root,'true3d-dice.js'),'utf8');
 for(const name of ['relic','oddity','keepsake']){
  const asset=`assets/treasure-${name}-gilded-v1.png`;
  assert.match(html,new RegExp(asset.replaceAll('.','\\.')));
  assert.ok(fs.existsSync(path.join(root,asset)),`${name} production icon must exist`);
 }
 assert.match(html,/true3d-dice\.js\?v=20260909I1/);
 assert.match(dice,/Celestial face plate/);
 assert.match(dice,/new Path2D\('M86 28H426/);
 assert.match(dice,/context\.fillText\(String\(value\),256,264\)/);
 assert.match(dice,/const treasureChest=/);
 assert.match(dice,/const hood=/);
 assert.match(dice,/faceTexture\(label, kind, faceIndex\)/);
});

test('Celestial Concord unifies notices and renders the sculpted Traveler bust',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'celestial-ui.css'),'utf8');
 const board=fs.readFileSync(path.join(root,'true3d-board.js'),'utf8');
 const bust=fs.readFileSync(path.join(root,'character-bust-preview.js'),'utf8');
 const cosmic=fs.readFileSync(path.join(root,'cosmic-sanctuary.js'),'utf8');
 assert.match(html,/character-bust-preview\.js\?v=20260909I1/);
 assert.match(html,/character-bust-stage/);
 for(const selector of ['portal-judgment','rune-claim-fx','challenge-player-alert','portal-magic-words','actor-speech-bubble','impact-fx'])assert.match(css,new RegExp(selector));
 assert.match(css,/Celestial Concord/);
 assert.match(board,/quality === 'full' \|\| quality === 'auto'/);
 assert.match(board,/node\.castShadow = false/);
 assert.match(cosmic,/quality==='ultra'\?36:84/);
 assert.match(bust,/createSculptedTraveler/);
 assert.match(bust,/now-this\.lastFrame>=66/);
});

test('Mobile Anchor prevents Safari eviction, rejoins guests and restores full Cinematic detail',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const board=fs.readFileSync(path.join(root,'true3d-board.js'),'utf8');
 const bust=fs.readFileSync(path.join(root,'character-bust-preview.js'),'utf8');
 const cosmic=fs.readFileSync(path.join(root,'cosmic-sanctuary.js'),'utf8');
 const ruin=fs.readFileSync(path.join(root,'ruin-board-art.js'),'utf8');
 assert.match(html,/Cinematic · highest quality/);
 assert.match(cosmic,/canvas\.width = mobile \? 1024 : 2048/);
 assert.match(ruin,/matches \? 256 : 512/);
 assert.match(bust,/this\.available=!matchMedia/);
 assert.match(multiplayer,/tabok-active-guest-room/);
 assert.match(multiplayer,/scheduleGuestReconnect/);
 assert.match(multiplayer,/Restoring your mobile session/);
 assert.match(board,/quality === 'auto' && !mobile \? 2048 : 1024/);
 assert.match(board,/quality === 'auto' && !mobile \? 6/);
 assert.match(board,/quality === 'full' \|\| quality === 'auto'/);
 assert.match(board,/this\.portalDebrisMesh\.count = quality === 'full' \|\| quality === 'auto'/);
 assert.match(board,/webglcontextlost/);
});
