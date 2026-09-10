(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TabokBalance=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const TURN_TYPES=Object.freeze({NORMAL:'NORMAL',RUNE:'RUNE',OFFER:'OFFER'});
  const MOVEMENT_D6=Object.freeze([1,2,3,4,5,6]);
  const TREASURE_D6=Object.freeze(['RELIC','ODDITY','KEEPSAKE','BLANK','BLANK','BLANK']);
  const OFFER_D20=Object.freeze({ONE:[1,10],TWO:[11,20]});
  const RUNE_FAMILIES=Object.freeze({
    WAYFARER:['WARP','WARP','SWAP','REWIND','PHASE','WILD'],
    WARDEN:['BIND','BIND','PHASE','PUSH','BAIT','WILD'],
    TRICKSTER:['SWAP','SWAP','PULL','PUSH','MIRROR','WILD'],
    ORACLE:['REROLL','REROLL','TRANSMUTE','REWIND','TIME','WILD']
  });
  const MINOR_CHAOS_D6=Object.freeze(['×1','×2','×3','×4','×5','NETWORK ATTACK']);
  const MAJOR_CHAOS_D6=Object.freeze(['FIREBALL','×2','×3','×4','×5','×6']);

  function normalizeInventory(inventory){
    if(!Array.isArray(inventory)||inventory.length!==3)throw new TypeError('Inventory must contain Relic, Oddity and Keepsake counts.');
    return inventory.map(value=>Math.max(0,Math.floor(Number(value)||0)));
  }

  function inventorySpread(inventory){
    const values=normalizeInventory(inventory);
    return Math.max(...values)-Math.min(...values);
  }

  function burdenDecay(level){
    if(level<=6)return .0099;
    if(level===7)return .005;
    if(level===8)return .0025;
    if(level===9)return .001;
    return .0005;
  }

  function balancedProbability(level){
    if(level===0)return .10;
    if(level===1)return .50;
    if(level===2)return .25;
    if(level===3)return .15;
    if(level===4)return .05;
    if(level===5)return .01;
    return burdenDecay(level);
  }

  function nearBalancedProbability(inventory){
    const values=normalizeInventory(inventory).sort((a,b)=>a-b),maximum=values[2],total=values[0]+values[1]+values[2];
    if(maximum<=2)return total<=4?.20:.18;
    if(maximum===3)return total<=7?.15:.13;
    if(maximum===4)return .09;
    if(maximum===5)return .05;
    if(maximum===6)return .01;
    return burdenDecay(maximum);
  }

  function asymmetricProbability(spread){
    if(spread<=10)return Math.max(.01,(11-spread)/100);
    if(spread<=15)return .0099;
    if(spread<=20)return .005;
    if(spread<=30)return .0025;
    if(spread<=50)return .001;
    return .0005;
  }

  function crossingProbability(inventory){
    const values=normalizeInventory(inventory),spread=Math.max(...values)-Math.min(...values);
    if(spread===0)return balancedProbability(values[0]);
    if(spread===1)return nearBalancedProbability(values);
    return asymmetricProbability(spread);
  }

  function portalAwakeningCount(inventory,random=Math.random,remainingDormant=6){
    const remaining=Math.max(0,Math.floor(remainingDormant));
    if(!remaining)return 0;
    const wanted=inventorySpread(inventory)>=2&&(Number(random())||0)>=.5?2:1;
    return Math.min(wanted,remaining);
  }

  function offerTransferCount(d20){return Number(d20)>=11?2:1}

  function lastChance(rollD20){
    const rolls=[];
    for(let guard=0;guard<100;guard++){
      const roll=Math.max(1,Math.min(20,Math.floor(Number(rollD20()))));rolls.push(roll);
      if(roll===10)continue;
      return{rolls,outcome:roll>=11?'SURVIVE':'DIE'};
    }
    throw new Error('Last Chance reroll limit exceeded.');
  }

  function minorMonsterRoll(movement,chaos){
    const move=Math.max(1,Math.min(6,Math.floor(Number(movement))));
    if(chaos==='NETWORK ATTACK')return{movement:move,chaos,distance:0,networkAttack:true};
    const multiplier=Math.max(1,Math.min(5,Number(String(chaos).replace('×',''))||1));
    return{movement:move,chaos:'×'+multiplier,distance:move*multiplier,networkAttack:false};
  }

  function majorMonsterRoll(movement,chaos){
    const move=Math.max(1,Math.min(6,Math.floor(Number(movement))));
    if(chaos==='FIREBALL')return{movement:move,chaos,distance:0,fireball:true};
    const multiplier=Math.max(2,Math.min(6,Number(String(chaos).replace('×',''))||2));
    return{movement:move,chaos:'×'+multiplier,distance:move*multiplier,fireball:false};
  }

  function rollFace(faces,random=Math.random){return faces[Math.min(faces.length-1,Math.floor((Number(random())||0)*faces.length))]}

  return{
    VERSION:'3.2',TURN_TYPES,MOVEMENT_D6,TREASURE_D6,OFFER_D20,RUNE_FAMILIES,MINOR_CHAOS_D6,MAJOR_CHAOS_D6,
    normalizeInventory,inventorySpread,crossingProbability,portalAwakeningCount,offerTransferCount,lastChance,
    minorMonsterRoll,majorMonsterRoll,rollFace
  };
});
