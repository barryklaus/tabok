/* The Riddle Crossing: deterministic rules, with randomness supplied by the host. */
(function(root){
  'use strict';
  const ARTIFACTS=['Hourglass','Mirror','Lantern','Key','Crown','Quill','Bell','Anchor','Compass','Book','Seed','Mask'];
  const COMMONS=['Sun Shard','Moon Pearl'];
  const RUNE_FACES=['WARP','DOUBLE','PHASE','HEIST','FORTUNE','TIME'];
  const shuffle=(items,rng=Math.random)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  function expedition(library,sites,rng=Math.random,previousId=null){
    const choices=library.filter(r=>r.id!==previousId),riddle=choices[Math.floor(rng()*choices.length)];
    if(!riddle||!riddle.accepted.length||riddle.accepted.length>3)throw Error('Invalid riddle library');
    const selected=shuffle([...riddle.accepted,...shuffle(ARTIFACTS.filter(a=>!riddle.accepted.includes(a)),rng).slice(0,6-riddle.accepted.length)],rng);
    return {riddle:{...riddle,accepted:[...riddle.accepted]},selected,items:selected.map((name,i)=>({id:name,kind:'artifact',name,pos:sites[i],home:sites[i]}))};
  }
  function verdict(player,riddle,artifact){return Boolean(riddle.accepted.includes(artifact)&&player.artifacts.includes(artifact)&&player.inventory[0]>=1&&player.inventory[1]>=1)}
  function heistResult(n){if(!Number.isInteger(n)||n<1||n>20)throw Error('D20 requires 1–20');return n===10?'reroll':n<10?'fail':'success'}
  function transferArtifact(from,to,name){const index=from.artifacts.indexOf(name);if(index<0||to.artifacts.includes(name))return false;from.artifacts.splice(index,1);to.artifacts.push(name);from.inventory[2]=from.artifacts.length;to.inventory[2]=to.artifacts.length;return true}
  function claim(state,player,item,turn){
    if(!item||item.pos!==player.pos||!state.boardTreasures.includes(item))return false;
    if(item.kind==='artifact'){if(player.artifacts.includes(item.name))return false;player.artifacts.push(item.name);player.inventory[2]=player.artifacts.length;item.pos=null;return true}
    if(item.readyRound>state.round||(turn.collectedSites||[]).includes(item.id))return false;
    player.inventory[item.common]++;item.readyRound=state.round+1;(turn.collectedSites||(turn.collectedSites=[])).push(item.id);return true;
  }
  function returnArtifacts(state,player,openSites,rng=Math.random){
    for(const name of player.artifacts){const item=state.boardTreasures.find(t=>t.kind==='artifact'&&t.name===name);if(!item)continue;const used=new Set(state.boardTreasures.filter(t=>t.pos).map(t=>t.pos));const available=openSites.filter(pos=>!used.has(pos));item.pos=available.length?available[Math.floor(rng()*available.length)]:null;item.pendingRespawn=!item.pos;}
    player.artifacts=[];player.inventory[2]=0;
  }
  function retryRespawns(state,openSites,rng=Math.random){for(const item of state.boardTreasures.filter(t=>t.pendingRespawn)){const used=new Set(state.boardTreasures.filter(t=>t.pos).map(t=>t.pos)),available=openSites.filter(pos=>!used.has(pos));if(available.length){item.pos=available[Math.floor(rng()*available.length)];delete item.pendingRespawn}}}
  // CPU interpretation reads only the published phrase and visible artifact identities.
  // It never receives the answer key. Wrong public attempts remove that candidate.
  const WORDS={Hourglass:'sand grain time waiting upper lower waist chamber falling deadline countdown desert',Mirror:'reflection reflected face surface light image twin portrait appearance return glass',Lantern:'light flame fuel oil wick darkness night fire shelter dawn',Key:'lock teeth door access permission turn opening notches secret enter',Crown:'king queen head authority ruler inheritance power royal kingdom command',Quill:'ink feather write written hand words signature bird marks pen',Bell:'sound voice tongue ring hollow metal clapper strike announcement warning',Anchor:'ship sea seabed chain hold weight grip bottom drift stay',Compass:'direction north needle bearing guide magnetic point circle journey',Book:'page leaves spine cover story words read world memory chapter',Seed:'grow soil root future beginning plant coat food tree water',Mask:'face identity hide expression person actor role appearance wear eyes'};
  function guesses(phrase,visible,rejected=[]){const words=phrase.toLowerCase().match(/[a-z]+/g)||[];return visible.filter(a=>!rejected.includes(a)).map(name=>({name,score:words.reduce((n,w)=>n+(WORDS[name].split(' ').some(k=>w===k||w===k+'s')?1:0),0)})).sort((a,b)=>b.score-a.score||ARTIFACTS.indexOf(a.name)-ARTIFACTS.indexOf(b.name)).map(x=>x.name)}
  const api={ARTIFACTS,COMMONS,RUNE_FACES,shuffle,expedition,verdict,heistResult,transferArtifact,claim,returnArtifacts,retryRespawns,guesses};root.TabokTreasure=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
