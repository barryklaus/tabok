const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ready=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(root,'portal-riddle.js'),'utf8')).toString('base64'));
test('portal riddle starts hidden, eases into view on hover and fades away on exit',async()=>{
 const {PortalRiddleReveal}=await ready,r=new PortalRiddleReveal();
 assert.equal(r.sample(0).visible,false);r.hover(true);r.sample(10);
 const midway=r.sample(190);assert.ok(midway.opacity>0&&midway.opacity<1);assert.ok(midway.y<3.3);
 assert.equal(r.sample(370).opacity,1);r.hover(false);r.sample(400);
 assert.equal(r.sample(660).visible,false);
});
test('tap reveal expires, can be refreshed and resets when the riddle changes',async()=>{
 const {PortalRiddleReveal}=await ready,r=new PortalRiddleReveal();
 r.reveal(0);r.sample(0);assert.equal(r.sample(400).opacity,1);
 r.reveal(6000);assert.equal(r.sample(7000).opacity,1);
 r.sample(12500);assert.equal(r.sample(12800).visible,false);
 r.reveal(13000);r.sample(13400);r.reset();assert.equal(r.sample(14000).visible,false);
});
test('reduced motion reveals immediately without lift or zoom; dismissal is immediate',async()=>{
 const {PortalRiddleReveal}=await ready,r=new PortalRiddleReveal();r.hover(true);
 assert.deepEqual(r.sample(0,true),{visible:true,opacity:1,y:3.3,scale:1});
 r.dismiss();assert.equal(r.sample(1,true).visible,false);
});
test('actual board pointer handlers preserve portal entry, ignore orbit drags and support touch dismissal',async()=>{
 const {PortalRiddleReveal}=await ready,source=fs.readFileSync(path.join(root,'true3d-board.js'),'utf8');
 const method=source.slice(source.indexOf('  bindInput() {'),source.indexOf('\n  pick(event) {'));
 const handlers={},calls=[];
 const board={canvas:{style:{},addEventListener(n,fn){handlers[n]=fn}},highlightRoot:{children:[]},riddleReveal:new PortalRiddleReveal(),config:{onPortal(){calls.push('portal')},onHex(id){calls.push(id)}},pick:e=>e.hit===null?null:{id:e.hit||'PORTAL'},actorIdForHit:()=>null,idForHit:hit=>hit?.id};
 Object.assign(board,new Function('THREE','return {'+method+'}')({Raycaster:class{},Vector2:class{}}));board.bindInput();
 const e={clientX:0,clientY:0,button:0,pointerType:'mouse'};
 handlers.pointermove(e);assert.equal(board.riddleReveal.sample(0,true).visible,true);
 handlers.pointerleave(e);assert.equal(board.riddleReveal.sample(1,true).visible,false);
 handlers.pointerdown(e);handlers.pointermove({...e,clientX:30});handlers.pointerup({...e,clientX:30});assert.equal(calls.length,0);
 const touch={...e,pointerType:'touch'};handlers.pointerdown(touch);handlers.pointerup(touch);handlers.pointerleave(touch);
 assert.deepEqual(calls,['portal']);assert.equal(board.riddleReveal.sample(performance.now(),true).visible,true);
 handlers.pointerdown({...e,hit:'1,2'});handlers.pointerup({...e,hit:'1,2'});assert.deepEqual(calls,['portal','1,2']);assert.equal(board.riddleReveal.sample(performance.now(),true).visible,false);
 handlers.pointerdown(touch);handlers.pointerup(touch);handlers.pointercancel();assert.equal(board.riddleReveal.sample(performance.now(),true).visible,false);
});
