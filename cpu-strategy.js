/* Decisions use visible inventory, health and board position, never hidden rolls. */
(function(root){
  'use strict';
  // Prefer a small, even collection. This is a heuristic, not the Portal formula.
  const inventoryCost=values=>values.reduce((sum,n)=>sum+Math.abs(n-1)*4,0)+(Math.max(...values)-Math.min(...values))*2+Math.max(0,values.reduce((a,b)=>a+b,0)-3)*.35;
  function treasureIndex(values,delta=1){
    let best=-1,score=Infinity;
    values.forEach((n,i)=>{if(delta<0&&!n)return;const next=values.slice();next[i]+=delta;const cost=inventoryCost(next);if(cost<score){best=i;score=cost}});
    return best;
  }
  function offeredInventory(values,count){
    const next=values.slice();for(let n=0;n<count;n++){const i=treasureIndex(next,-1);if(i<0)break;next[i]--}return next;
  }
  function selectDice(player,portalDistance=Infinity){
    const values=player.inventory,selected=['Movement'],cost=inventoryCost(values),next=values.slice();
    next[treasureIndex(values)]++;
    if(inventoryCost(next)<cost)selected.push('Treasure');
    // Rune usually helps; preserve a ready pattern when already at the Portal.
    if(player.rune&&(cost>0||portalDistance>3||player.life<=2))selected.push('Rune');
    // The D20 may remove one OR two pieces. Consider both before committing.
    if(values.some(n=>n>0)&&(inventoryCost(offeredInventory(values,1))+inventoryCost(offeredInventory(values,2)))/2<cost)selected.push('Offer');
    return selected;
  }
  function offerChoice(player,recipients){
    const index=treasureIndex(player.inventory,-1);if(index<0)return null;
    let target=null,worsening=0;
    for(const other of recipients){const after=other.inventory.slice();after[index]++;const difference=inventoryCost(after)-inventoryCost(other.inventory);if(difference>worsening){target=other;worsening=difference}}
    return {index,target,discard:!target};
  }
  const api={inventoryCost,treasureIndex,offeredInventory,selectDice,offerChoice};
  root.TabokCPU=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
