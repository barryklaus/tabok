const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tray=require('../dice-selection.js'),balance=require('../balance-rules.js'),html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const resolver=html.slice(html.indexOf('    async function resolveSelectedDice(p){'),html.indexOf('    function renderTurn(){'));
test('all fifteen combinations roll only dice currently earned by the player',async()=>{
 for(const high of [false,true])for(const rune of [false,true])for(const inventory of [[0,0,0],[0,2,0]])for(let mask=1;mask<16;mask++){
  const requested=tray.names.filter((_,i)=>mask&(1<<i)),player={name:'Traveler',controller:'human',rune,inventory},selected=tray.normalize(requested,tray.available(player)),casts=[],effects=[];
  const ctx={window:{TabokDiceSelection:{...tray,roll:async(_host,_control,specs)=>casts.push(specs.map(s=>s.label))}},game:{turn:{selectedDice:requested}},busy:true,BALANCE:balance,MOVE:[4],TREASURE_FACES:['CHOOSE'],RUNE_FAMILIES:{WAYFARER:['FORTUNE']},pick:faces=>faces[0],els:{turnRollStatus:{},turnRollDice:{},turnRollControl:{},dice:{},turnRoll:{}},die:()=>'',addLog(){},applyCanonicalRune(_p,face){effects.push(face)},renderAll(){},finishMovement:async()=>{ctx.finished=true}};
  vm.createContext(ctx);vm.runInContext(resolver,ctx);
  if(high)ctx.pick=faces=>faces.at(-1);
  await ctx.resolveSelectedDice(player);
  assert.deepEqual(Array.from(ctx.game.turn.selectedDice),selected);
  assert.equal(ctx.busy,false);
  if(!selected.length){assert.equal(casts.length,0);assert.equal(ctx.game.phase,'choose');continue}
  assert.deepEqual(Array.from(casts[0]),selected);
  assert.equal(ctx.game.turn.remaining,selected.includes('Movement')?4:0);
  assert.equal(ctx.game.turn.treasure,selected.includes('Treasure')?'CHOOSE':undefined);
  assert.equal(effects.length,selected.includes('Rune')?1:0);
  assert.equal(ctx.game.turn.withOffer,selected.includes('Offer'));
  assert.equal(ctx.game.turn.offerRoll,selected.includes('Offer')?(high?20:1):undefined);
  assert.equal(ctx.game.turn.offerCount,selected.includes('Offer')?balance.offerTransferCount(high?20:1):0);
  assert.equal(Boolean(ctx.finished),!selected.includes('Movement'));
  assert.equal(ctx.busy,false);
 }
});
test('Rune and Offering are absent until earned and disappear when no longer eligible',()=>{
 assert.deepEqual(tray.available(),['Movement','Treasure']);
 assert.deepEqual(tray.available({rune:true,inventory:[0,0,0]}),['Movement','Treasure','Rune']);
 assert.deepEqual(tray.available({rune:false,inventory:[0,0,1]}),['Movement','Treasure','Offer']);
 assert.deepEqual(tray.available({rune:true,inventory:[1,0,0]}),tray.names);
 assert.deepEqual(tray.normalize(['Rune','Offer','Movement','Rune','Unknown'],tray.available()),['Movement']);
 assert.equal((tray.markup().match(/<button /g)||[]).length,2);
 assert.doesNotMatch(tray.markup(['Rune','Offer']),/data-dice-choice="(?:Rune|Offer)"/);
 const all=tray.markup([],tray.names);
 assert.equal((all.match(/<button /g)||[]).length,4);
 assert.equal((all.match(/ds-d20-face/g)||[]).length,20);
 assert.equal((all.match(/aria-pressed="false"/g)||[]).length,4);
 assert.deepEqual(tray.faces.Offer,Array.from({length:20},(_,i)=>String(i+1)));
});
test('selection and roll entry points both validate the active player inventory',()=>{
 const source=html.slice(html.indexOf('    function toggleTurnDie('),html.indexOf('    async function resolveSelectedDice('));
 assert.match(source,/available\(active\(\)\)\.includes\(name\)/);
 assert.ok(source.includes('normalize(game.turn?.selectedDice,window.TabokDiceSelection.available(active()))'));
 assert.match(html,/if\(turn\.withOffer\)\{beginOfferPhase\(\);return\}/);
});
