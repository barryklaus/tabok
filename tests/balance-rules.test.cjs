const test=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../balance-rules.js');

test('The Balance exposes only the three canonical turn choices',()=>{
  assert.deepEqual(Object.values(rules.TURN_TYPES),['NORMAL','RUNE','OFFER']);
  assert.deepEqual(rules.MOVEMENT_D6,[1,2,3,4,5,6]);
  assert.deepEqual(rules.TREASURE_D6,['CHOOSE','CHOOSE','CHOOSE','BLANK','BLANK','BLANK']);
  const simpleRunes=['WARP','DOUBLE','PHASE','BALANCE','FORTUNE','TIME'];
  Object.values(rules.RUNE_FAMILIES).forEach(faces=>assert.deepEqual(faces,simpleRunes));
});

test('balanced inventory probabilities follow the canonical burden curve',()=>{
  const cases=[[0,.10],[1,.50],[2,.25],[3,.15],[4,.05],[5,.01],[6,.0099],[7,.005],[8,.0025],[9,.001],[10,.0005],[99,.0005]];
  cases.forEach(([count,probability])=>assert.equal(rules.crossingProbability([count,count,count]),probability));
});

test('near-balanced probabilities are order independent and burden sensitive',()=>{
  const cases=[[[1,1,0],.20],[[2,1,1],.20],[[2,2,1],.18],[[3,2,2],.15],[[3,3,2],.13],[[4,3,3],.09],[[4,4,3],.09],[[5,4,4],.05],[[5,5,4],.05],[[6,5,5],.01],[[7,7,6],.005]];
  cases.forEach(([inventory,probability])=>{
    assert.equal(rules.crossingProbability(inventory),probability);
    assert.equal(rules.crossingProbability([...inventory].reverse()),probability);
  });
});

test('asymmetric inventory follows spread and never reaches zero',()=>{
  const cases=[[[3,2,1],.09],[[7,4,3],.07],[[10,4,4],.05],[[20,10,10],.01],[[25,10,10],.0099],[[30,10,10],.005],[[40,10,10],.0025],[[60,10,10],.001],[[100,10,10],.0005]];
  cases.forEach(([inventory,probability])=>assert.equal(rules.crossingProbability(inventory),probability));
});

test('rejection awakens one balanced or one-to-two uneven dormant statues',()=>{
  assert.equal(rules.portalAwakeningCount([2,2,2],()=>.99,6),1);
  assert.equal(rules.portalAwakeningCount([4,1,1],()=>.49,6),1);
  assert.equal(rules.portalAwakeningCount([4,1,1],()=>.50,6),2);
  assert.equal(rules.portalAwakeningCount([4,1,1],()=>.99,1),1);
  assert.equal(rules.portalAwakeningCount([4,1,1],()=>.99,0),0);
});

test('Last Chance rerolls every ten until survival or death',()=>{
  let rolls=[10,10,11];assert.deepEqual(rules.lastChance(()=>rolls.shift()),{rolls:[10,10,11],outcome:'SURVIVE'});
  rolls=[10,9];assert.deepEqual(rules.lastChance(()=>rolls.shift()),{rolls:[10,9],outcome:'DIE'});
});

test('monster dice distinguish multipliers from attacks',()=>{
  assert.deepEqual(rules.minorMonsterRoll(4,'×3'),{movement:4,chaos:'×3',distance:12,networkAttack:false});
  assert.deepEqual(rules.minorMonsterRoll(6,'NETWORK ATTACK'),{movement:6,chaos:'NETWORK ATTACK',distance:0,networkAttack:true});
  assert.deepEqual(rules.majorMonsterRoll(6,'×6'),{movement:6,chaos:'×6',distance:36,fireball:false});
  assert.deepEqual(rules.majorMonsterRoll(2,'FIREBALL'),{movement:2,chaos:'FIREBALL',distance:0,fireball:true});
});
