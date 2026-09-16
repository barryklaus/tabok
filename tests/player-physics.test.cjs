const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.search(new RegExp('^    (?:async )?function '+name+'\\(','m'));assert.ok(start>=0,name);const rest=html.slice(start),next=rest.slice(1).search(/^    (?:async )?function /m);return next<0?rest:rest.slice(0,next+1)}
function setup(blocker='player'){
 const p={p:'P1',name:'Traveler',pos:'0,0',status:'active',controller:'human',inventory:[0,0,0]},other={p:'P2',name:'Other',pos:'2,0',status:'active',controller:'human'},moves=[],logs=[];
 const ctx={game:{players:[p,...(blocker==='player'?[other]:[])],monsters:blocker==='monster'?[{id:'M1',pos:'2,0'}]:[],turn:{phaseOccupancy:false,remaining:4,path:[]},phase:'move'},busy:false,playable:new Set(['0,0','1,0','2,0','3,0','4,0']),entries:new Set(),firstStep:new Map(),gateway:new Set(['4,0']),DIR:{A:[0,-1],B:[1,-1],C:[1,0],D:[0,1],E:[-1,1],F:[-1,0]},key:(q,r)=>q+','+r,parse:id=>id.split(',').map(Number),active:()=>p,animateActor:async(id,from,to)=>{moves.push({id,from,to})},clearLegal(){},focusCamera(){},collectEquipment:async()=>{},addLog:message=>logs.push(message),renderAll(){},finishMovement(){ctx.finished=true},finishRunePower(){ctx.runeFinished=true},hideDecisionPanel(){},color:()=> 'Purple'};
 vm.createContext(ctx);
 for(const name of ['neighbors','hexOccupied','playerNeighbors','canPlayerStep','movePlayerStep','graphNeighbors','boardDistance','humanDestinationPlans','exactAIPath','chooseHumanDestination','chooseHex','runeSwapTargets','resolveRuneSwap'])vm.runInContext(source(name),ctx);
 return{ctx,p,other,moves,logs};
}
test('neither normal nor Phase routes cross another player or monster',()=>{
 for(const blocker of ['player','monster'])for(const phase of [false,true]){
  const{ctx,p}=setup(blocker);ctx.game.turn.phaseOccupancy=phase;
  const routes=ctx.humanDestinationPlans(p,8).routes;
  assert.deepEqual([...routes.keys()],['1,0']);
  assert.equal(ctx.exactAIPath('0,0',3,'3,0',false,p),null);
  assert.equal(ctx.exactAIPath('0,0',3,'3,0'),null);
 }
});
test('routes can go around blockers but every intermediate hex remains open and adjacent',()=>{
 const{ctx,p}=setup();ctx.playable.add('1,1');ctx.playable.add('2,1');
 const route=ctx.humanDestinationPlans(p,8).routes.get('3,0');assert.ok(route);
 let from=p.pos;for(const to of route){assert.ok(ctx.graphNeighbors(from).includes(to));assert.equal(ctx.hexOccupied(to,p),false);from=to}
 assert.equal(from,'3,0');assert.equal(route.includes('2,0'),false);
});
test('the movement step refuses occupied destinations and non-adjacent jumps before animation',async()=>{
 for(const blocker of ['player','monster']){
  const{ctx,p,moves}=setup(blocker);assert.equal(await ctx.movePlayerStep(p,'3,0'),false);assert.equal(moves.length,0);
  assert.equal(await ctx.movePlayerStep(p,'1,0'),true);assert.equal(p.pos,'1,0');
  assert.equal(await ctx.movePlayerStep(p,'2,0'),false);assert.equal(p.pos,'1,0');assert.equal(moves.length,1);
 }
});
test('a stale route stops adjacent to the blocker instead of animating through it',async()=>{
 for(const blocker of ['player','monster']){
  const{ctx,p,moves}=setup(blocker);ctx.humanDestinationPlans=()=>({routes:new Map([['4,0',['1,0','2,0','3,0','4,0']]])});
  await ctx.chooseHumanDestination('4,0');assert.equal(p.pos,'1,0');assert.deepEqual(moves.map(m=>m.to),['1,0']);assert.equal(ctx.game.turn.remaining,0);assert.equal(ctx.finished,true);assert.equal(ctx.busy,false);
 }
});
test('CPU direct moves cannot jump over or land on another actor',async()=>{
 const{ctx,p,moves}=setup('monster');p.controller='cpu';
 await ctx.chooseHex('3,0',true);assert.equal(moves.length,0);assert.equal(p.pos,'0,0');
 await ctx.chooseHex('1,0',true);await ctx.chooseHex('2,0',true);assert.deepEqual(moves.map(m=>m.to),['1,0']);assert.equal(p.pos,'1,0');
});
test('legacy Soul Exchange cannot move either player into the other occupied hex',async()=>{
 const{ctx,p,other,moves}=setup();ctx.game.phase='rune';
 assert.equal(ctx.runeSwapTargets(p).length,0);await ctx.resolveRuneSwap(other);assert.equal(p.pos,'0,0');assert.equal(other.pos,'2,0');assert.equal(moves.length,0);assert.equal(ctx.runeFinished,true);
});
test('an occupied Portal is not offered as a route',()=>{
 const{ctx,p,other}=setup();other.pos='PORTAL';assert.equal(ctx.humanDestinationPlans(p,8).routes.has('PORTAL'),false);
});
test('the animation boundary also rejects unvalidated player jumps',async()=>{
 const{ctx,p}=setup('monster');ctx.webglBoard={isTrue3D:true,animateActor(){throw Error('Illegal animation reached renderer')}};
 vm.runInContext(source('animateActor'),ctx);
 assert.equal(await ctx.animateActor(p.p,'0,0','3,0',200),false);
 p.pos='1,0';assert.equal(await ctx.animateActor(p.p,'1,0','2,0',200),false);
});
test('legacy Riftwalk follows adjacent open hexes and cannot cross a blocked corridor',async()=>{
 const{ctx,p,moves}=setup('monster');ctx.game.phase='rune';ctx.cells=new Map([...ctx.playable].map(id=>[id,'P']));
 for(const name of ['runeRiftCandidates','chooseRuneRift'])vm.runInContext(source(name),ctx);
 assert.equal(ctx.runeRiftCandidates(p).includes('3,0'),false);await ctx.chooseRuneRift('3,0');assert.equal(moves.length,0);
 for(const id of ['1,1','2,1']){ctx.playable.add(id);ctx.cells.set(id,'P')}
 await ctx.chooseRuneRift('3,0');assert.equal(p.pos,'3,0');assert.equal(ctx.runeFinished,true);
 for(const move of moves){assert.ok(ctx.graphNeighbors(move.from).includes(move.to));assert.notEqual(move.to,'2,0')}
});
test('rejection skips starting hexes occupied by either players or monsters',()=>{
 const{ctx,p}=setup('monster');p.start='2,0';p.pos='3,0';ctx.entries=new Set(['2,0','4,0']);
 ctx.game.players.push({p:'P2',status:'active',pos:'4,0'});ctx.emitted=[];ctx.emitPortalVisual=(type,actor,to)=>ctx.emitted.push(to);
 vm.runInContext(source('nearestOpenHex')+source('reject'),ctx);ctx.reject(p);
 assert.notEqual(p.pos,'2,0');assert.notEqual(p.pos,'4,0');assert.equal(ctx.hexOccupied(p.pos,p),false);assert.equal(ctx.emitted[0],p.pos);
});
