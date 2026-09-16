const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const cpu=require('../cpu-strategy.js'),tray=require('../dice-selection.js'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),mp=fs.readFileSync(path.join(__dirname,'../multiplayer.js'),'utf8');
function source(name,text=html){const start=text.search(new RegExp('^[ \\t]*(?:async )?function '+name+'\\(','m')),rest=text.slice(start),line=rest.indexOf('\n')+1,next=rest.slice(line).search(/^[ \t]*(?:async )?function /m);assert.ok(start>=0,name);return next<0?rest:rest.slice(0,next+line)}
test('CPU builds a small balanced inventory and avoids spoiling a ready pattern',()=>{
 const p={inventory:[0,0,0],life:4,rune:false};assert.deepEqual(cpu.selectDice(p,2),['Movement','Treasure']);
 p.inventory=[1,1,0];assert.equal(cpu.treasureIndex(p.inventory),2);assert.ok(cpu.selectDice(p,2).includes('Treasure'));assert.ok(!cpu.selectDice(p,2).includes('Offer'));
 p.inventory=[1,1,1];p.rune=true;assert.deepEqual(cpu.selectDice(p,2),['Movement']);assert.ok(cpu.selectDice(p,8).includes('Rune'));
 p.inventory=[4,1,1];assert.ok(cpu.selectDice(p,2).includes('Offer'));assert.equal(cpu.treasureIndex(p.inventory,-1),0);
});
test('CPU never selects unearned dice and never mutates inventory while planning',()=>{
 for(let a=0;a<5;a++)for(let b=0;b<5;b++)for(let c=0;c<5;c++)for(const rune of [false,true]){
  const p={inventory:[a,b,c],rune,life:2},before=p.inventory.slice(),selection=cpu.selectDice(p,4);
  assert.deepEqual(selection,tray.normalize(selection,tray.available(p)));assert.ok(selection.length);assert.deepEqual(p.inventory,before);
 }
});
test('CPU offerings shed excess and do not complete a rival’s missing set',()=>{
 const p={inventory:[3,1,1]},rival={inventory:[0,1,1]};let choice=cpu.offerChoice(p,[rival]);assert.equal(choice.index,0);assert.equal(choice.discard,true);
 const full={inventory:[1,1,1]};choice=cpu.offerChoice(p,[rival,full]);assert.equal(choice.target,full);assert.equal(choice.discard,false);assert.deepEqual(full.inventory,[1,1,1]);
 assert.equal(cpu.offerChoice({inventory:[0,0,0]},[]),null);
});
test('CPU route planning takes an open detour around occupants and advances toward the Portal',()=>{
 const edges={A:['B','D'],B:['A','C'],C:['B','E'],D:['A','E'],E:['D','C','PORTAL'],PORTAL:[]},p={pos:'A',life:4,inventory:[1,1,1],rune:true};
 const ctx={window:{TabokCPU:cpu},game:{round:1,turn:{remaining:3,path:[]},monsters:[],runes:new Map()},gateway:new Set(['E']),graphNeighbors:id=>edges[id],hexOccupied:id=>id==='B',chooseAIGoal:()=> 'PORTAL',aiThreat:()=>0};
 vm.createContext(ctx);for(const name of ['humanDestinationPlans','aiDistances','aiHeadsPortal','chooseCPURoute'])vm.runInContext(source(name),ctx);
 const route=ctx.chooseCPURoute(p);assert.deepEqual(Array.from(route),['D','E','PORTAL']);assert.equal(ctx.aiDistances(p,'PORTAL').get('A'),3);assert.equal(ctx.aiDistances(p,'A').has('B'),false);
});
test('CPU endpoint planning favors a safe route and ignores an unreachable Rune',()=>{
 const p={pos:'A',life:1,inventory:[0,0,0],rune:false},ctx={game:{turn:{remaining:2,path:[]},runes:new Map([['BLOCKED',1]])},chooseAIGoal:()=> 'PORTAL',aiDistances:()=>new Map([['SAFE',3],['DANGER',2]]),aiHeadsPortal:()=>false,aiThreat:(_p,id)=>id==='DANGER'?15:0,humanDestinationPlans:()=>({routes:new Map([['SAFE',['SAFE']],['DANGER',['DANGER']]])})};
 vm.createContext(ctx);vm.runInContext(source('chooseCPURoute'),ctx);vm.runInContext(source('nearestAIRune'),ctx);
 assert.deepEqual(Array.from(ctx.chooseCPURoute(p)),['SAFE']);assert.equal(ctx.nearestAIRune(p),null);
});
test('CPU dice are visible to online spectators while human dice remain private',()=>{
 const ctx={els:{turnRoll:{dataset:{}}},game:{phase:'roll'},room:{phase:'game'},localOwnsSlot:()=>false};vm.createContext(ctx);vm.runInContext(source('localCanViewTurnRoll',mp),ctx);
 assert.equal(ctx.localCanViewTurnRoll({p:'P1',controller:'cpu'}),true);assert.equal(ctx.localCanViewTurnRoll({p:'P2',controller:'human'}),false);
 ctx.localOwnsSlot=()=>true;assert.equal(ctx.localCanViewTurnRoll({p:'P2',controller:'human'}),true);
 assert.match(html,/active\(\)\.controller==='cpu'&&automated!==true/);assert.match(html,/CPU PREPARING ROLL/);
});
test('guest 3D snapshots reattach the local renderer without replaying an unchanged roll',async()=>{
 let shows=0,casts=0,returns=0;const renderer={canvas:{},selectionMode:false,animationGeneration:0,showSelection(){shows++;this.selectionMode=true},castSelection(){casts++;return Promise.resolve(false)},render(){},hide(){this.selectionMode=false},returnSelection(){returns++}};
 const host={querySelectorAll:()=>[],append(){}};
 const state={phase:'roll',selected:['Movement'],specs:[{label:'Movement',faces:tray.faces.Movement,result:'4'}]};
 tray.restorePhysical(host,renderer,state);tray.restorePhysical(host,renderer,state);await Promise.resolve();
 assert.equal(shows,1);assert.equal(casts,1);assert.equal(returns,0);
 state.phase='choose';tray.restorePhysical(host,renderer,state);assert.equal(shows,2);assert.equal(casts,1);
});
