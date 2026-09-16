const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tray=require('../dice-selection.js'),html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const resolver=html.slice(html.indexOf('    async function resolveSelectedDice(p){'),html.indexOf('    function renderTurn(){'));
test('all seven selections roll and resolve only the requested dice',async()=>{
 for(let mask=1;mask<8;mask++){
  const selected=tray.names.filter((_,i)=>mask&(1<<i)),casts=[],effects=[];
  const ctx={window:{TabokDiceSelection:{...tray,roll:async(_host,_control,specs)=>casts.push(specs.map(s=>s.label))}},game:{turn:{selectedDice:selected}},busy:true,MOVE:[4],TREASURE_FACES:['CHOOSE'],RUNE_FAMILIES:{WAYFARER:['FORTUNE']},pick:faces=>faces[0],els:{turnRollStatus:{},turnRollDice:{},turnRollControl:{},dice:{},turnRoll:{}},die:()=>'',addLog(){},applyCanonicalRune(_p,face){effects.push(face)},renderAll(){},finishMovement:async()=>{ctx.finished=true}};
  vm.createContext(ctx);vm.runInContext(resolver,ctx);
  await ctx.resolveSelectedDice({name:'Traveler',controller:'human'});
  assert.deepEqual(Array.from(casts[0]),selected);
  assert.equal(ctx.game.turn.remaining,selected.includes('Movement')?4:0);
  assert.equal(ctx.game.turn.treasure,selected.includes('Treasure')?'CHOOSE':undefined);
  assert.equal(effects.length,selected.includes('Rune')?1:0);
  assert.equal(Boolean(ctx.finished),!selected.includes('Movement'));
  assert.equal(ctx.busy,false);
 }
});
test('selection rejects unknown dice, removes duplicates, and starts empty',()=>{
 assert.deepEqual(tray.normalize(['Rune','Offer','Movement','Rune']),['Movement','Rune']);
 assert.equal((tray.markup().match(/<button /g)||[]).length,3);
 assert.equal((tray.markup().match(/aria-pressed="false"/g)||[]).length,3);
});
