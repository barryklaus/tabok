const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../treasure-rules.js'),library=require('../riddle-library.js'),source=fs.readFileSync(require('node:path').join(__dirname,'../treasure-game.js'),'utf8');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function setup(){
 const columns=JSON.parse(html.match(/const COLUMNS=(.*);/)[1]),playable=new Set(),entries=new Set();
 for(const [q,col]of Object.entries(columns))for(let i=0;i<col.cells.length;i++){const id=q+','+(col.r0+i);if('PTG'.includes(col.cells[i]))playable.add(id);if(col.cells[i]==='W')entries.add(id)}
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){}},querySelector(){return null},appendChild(){}});
 const ctx={window:{TabokTreasure:T,TabokRiddles:library},Math,Set,Map,localStorage:{getItem(){return null},setItem(){}},document:{createElement:node,querySelectorAll(){return[]},getElementById:node},playable,entries,RUNE_SITES:['5,1','10,6','5,16','-5,21','-10,16','-5,6'],JUDGE_SITES:['-3,17','3,14','6,8','3,5','-3,8','-6,14'],TREASURES:[],webglBoard:null,busy:false,equipmentRenderKey:'',els:{players:node(),account:node(),equipment:node(),message:node(),messageContinue:node()},key:(q,r)=>q+','+r,spatialTransform:x=>x,svg:node,logs:[],active(){return ctx.game.players[0]},newState(){return{players:[{p:'P1',name:'A',pos:'0,0',inventory:[0,0,0],status:'active',controller:'human'}],round:1,turn:{},runes:new Map(),monsters:[],dormantJudges:6,finishPlace:0}},hexOccupied(id,p){return ctx.game.players.some(x=>x!==p&&x.status==='active'&&x.pos===id)||ctx.game.monsters.some(x=>x.pos===id)},boardDistance(a,b){const [q,r]=a.split(',').map(Number),[x,y]=b.split(',').map(Number);return(Math.abs(q-x)+Math.abs(r-y)+Math.abs(q+r-x-y))/2},neighbors(id){const[q,r]=id.split(',').map(Number);return[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].map(([x,y])=>(q+x)+','+(r+y))},addLog(s){ctx.logs.push(s)},collectEquipment:async()=>{},cross(p){p.status='crossed'},kill(p,e){p.status='dead';p.inventory=[0,0,0];e.push('old')},renderPlayers(){},renderEquipment(){},applyCanonicalRune(){},runeResultDescription(){return''},renderRollGuidance(){},endMonsterPhase(){ctx.game.round++},summonMajorMonster(){ctx.game.seventhAwake=true;return{spawned:true}},showMessage(...args){ctx.message=args},waitForPortalVisuals:cb=>cb(),playCrossingAnimation:(_p,cb)=>cb(),reject(p){p.pos='0,0'},finishPlayerTurn(){ctx.finished=true},offerRecipients(){return ctx.game.players.slice(1)},aiDistances(){return new Map([...playable].map(x=>[x,1]))},nearestAIRune(){return null}};
 for(const name of ['showCrossingIntro','renderAccounting','syncTrue3DBoard','awakenDormantJudges','actorReaction','clearLegal','hideDecisionPanel','presentDecisionPanel','finishMovement','continueAfterTreasure','renderTreasureRewardControls','chooseTreasureReward','resolvePortal','finalizeBalancePortal','renderOfferControls','offerTreasure','aiHeadsPortal','chooseAIGoal','chooseCPUDice','take','steal','give','resolveRunePlunder','renderAll','finishOffering'])ctx[name]=()=>{};
 vm.createContext(ctx);vm.runInContext(source,ctx);ctx.game=ctx.newState();return ctx;
}
test('real board setup preserves six shrines and statues and places 18 non-overlapping treasures',()=>{const c=setup(),s=c.game;assert.equal(s.boardTreasures.length,18);assert.equal(new Set(s.boardTreasures.map(t=>t.pos)).size,18);for(const t of s.boardTreasures){assert.ok(c.playable.has(t.pos));assert.ok(!c.RUNE_SITES.includes(t.pos));assert.ok(!c.JUDGE_SITES.includes(t.pos))}assert.equal(s.boardTreasures.filter(t=>t.common===0).length,6);assert.equal(s.boardTreasures.filter(t=>t.common===1).length,6);assert.equal(s.supply,undefined)});
test('HEX-v2 fixes the exact marked hexes and preserves sixfold symmetry for each treasure type',()=>{
 const c=setup(),items=c.game.boardTreasures;
 const expected=[
  ['-4,7','4,3','8,7','4,15','-4,19','-8,15'],
  ['0,5','6,5','6,11','0,17','-6,17','-6,11'],
  ['-2,9','2,7','4,9','2,13','-2,15','-4,13']
 ];
 const groups=[items.filter(t=>t.kind==='artifact'),items.filter(t=>t.common===0),items.filter(t=>t.common===1)];
 groups.forEach((group,i)=>{
  const positions=Array.from(group,t=>t.pos);assert.deepEqual(positions,expected[i]);
  for(const pos of positions){const[q,r]=pos.split(',').map(Number);assert.ok(positions.includes((11-r)+','+(q+r)),'rotated marker stays in its group')}
 });
});
test('dormant statues block movement and nearest awakening does not overlap or assume numeric order',()=>{const c=setup();assert.ok(c.hexOccupied(c.JUDGE_SITES[4]));assert.deepEqual(Array.from(c.awakenDormantJudges(1,'-3,7')),['M5']);assert.deepEqual(Array.from(c.game.awakeStatues),[5]);assert.equal(c.game.monsters[0].pos,c.JUDGE_SITES[4]);assert.ok(c.hexOccupied(c.JUDGE_SITES[4]));assert.ok(c.hexOccupied(c.JUDGE_SITES[0]));});
test('step collection updates named inventory and wakes only one sleeping statue',async()=>{const c=setup(),p=c.active(),item=c.game.boardTreasures[0];p.pos=item.pos;await c.collectEquipment(p);assert.equal(p.artifacts[0],item.name);assert.equal(item.pos,null);assert.equal(c.game.dormantJudges,5);await c.collectEquipment(p);assert.equal(c.game.dormantJudges,5)});
test('Portal rejection never wakes a statue or consumes inventory',()=>{const c=setup(),p=c.active();p.inventory=[1,1,0];c.game.pendingPortal={p,success:false};c.finalizeBalancePortal();assert.equal(c.game.dormantJudges,6);assert.deepEqual(p.inventory,[1,1,0])});
test('successful crossing consumes the two commons and returns all unique artifacts',async()=>{const c=setup(),p=c.active(),item=c.game.boardTreasures[0];p.pos=item.pos;await c.collectEquipment(p);p.inventory[0]=p.inventory[1]=1;c.game.pendingPortal={p,success:true};c.finalizeBalancePortal();assert.equal(p.status,'crossed');assert.equal(p.inventory.join(','),'0,0,0');assert.ok(item.pos);assert.ok(!c.hexOccupied(item.pos));assert.equal(p.artifacts.length,0)});
test('death returns artifacts and keeps the inventory count consistent',async()=>{const c=setup(),p=c.active(),item=c.game.boardTreasures[0];p.pos=item.pos;await c.collectEquipment(p);c.kill(p,[]);assert.equal(p.status,'dead');assert.ok(item.pos);assert.equal(p.artifacts.length,0)});
test('offering an artifact transfers its identity and discarding respawns that same object',async()=>{const c=setup(),p=c.active(),item=c.game.boardTreasures[0];p.pos=item.pos;await c.collectEquipment(p);const rival={p:'P2',name:'B',status:'active',inventory:[0,0,0],artifacts:[],pos:'1,1'};c.game.players.push(rival);c.game.phase='offer';c.game.turn.offerRemaining=1;await c.offerTreasure(2,rival,false,item.name);assert.equal(rival.artifacts[0],item.name);assert.equal(p.artifacts.length,0);c.game.players.reverse();c.game.turn.offerRemaining=1;await c.offerTreasure(2,null,true,item.name);assert.equal(rival.artifacts.length,0);assert.ok(item.pos)});
test('CPU does not select an unearned Rune or Offer and uses a visible treasure goal',()=>{const c=setup(),p=c.active();assert.deepEqual(Array.from(c.chooseCPUDice(p)),['Movement','Treasure']);const goal=c.chooseAIGoal(p);assert.ok(c.game.boardTreasures.some(t=>t.pos===goal));p.rune=true;assert.ok(c.chooseCPUDice(p).includes('Rune'))});

test('Heist rerolls a ten in the physical tray, transfers one artifact, and resumes the turn',async()=>{
 const c=setup(),p=c.active(),item=c.game.boardTreasures[0];
 const rival={p:'P2',name:'B',status:'active',inventory:[0,0,1],artifacts:[item.name],pos:'1,1'};
 item.pos=null;c.game.players.push(rival);p.controller='cpu';c.game.turn.heistPending=true;
 const faces=[10,11],seen=[];c.Math=Object.create(Math);c.Math.random=()=>((faces.shift()||11)-.5)/20;
 c.dice3D={hide(){}};for(const name of ['turnRoll','turnRollKicker','turnRollName','turnRollRole','turnRollStatus','turnRollDice','turnRollControl'])c.els[name]={};
 let done;const finished=new Promise(resolve=>done=resolve);c.continueAfterTreasure=done;
 c.window.TabokDiceSelection={mount(){},async roll(_h,_c,specs){seen.push(specs[0].result);assert.equal(c.game.heistRoll.specs[0].result,specs[0].result)}};
 await c.finishMovement();await finished;
 assert.deepEqual(seen,[10,11]);assert.equal(p.artifacts[0],item.name);assert.equal(rival.artifacts.length,0);assert.equal(c.game.heistRoll,undefined);assert.equal(c.busy,false);
});

test('Heist fails without transferring on 1–9 and does not block an empty-target turn',async()=>{
 const c=setup();c.active().controller='cpu';c.game.turn.heistPending=true;
 let continued=false;c.continueAfterTreasure=()=>continued=true;await c.finishMovement();assert.ok(continued);
 for(let n=1;n<10;n++)assert.equal(T.heistResult(n),'fail');
});
