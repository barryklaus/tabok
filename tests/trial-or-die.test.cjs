const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'trial-or-die.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const multiplayer=fs.readFileSync(path.join(root,'multiplayer.js'),'utf8');

test('Trial-or-Die exposes seven non-repeating trials',()=>{
  const context={window:{},Math};
  vm.runInNewContext(source,context);
  const api=context.window.TabokTrialOrDie;
  assert.deepEqual(Array.from(api.NAMES),['STOP','REACTION','HOLD','DODGE','REMEMBER','ESCAPE','SWAT THE FLY']);
  let seen=[];
  for(let i=0;i<7;i++){
    const result=api.nextTrial(seen);
    assert.ok(!seen.includes(result.name));
    seen=Array.from(result.seen);
  }
  assert.equal(new Set(seen).size,7);
});

test('each trial has a distinct interactive implementation',()=>{
  for(const starter of ['startStop','startReaction','startHold','startDodge','startRemember','startEscape','startFly'])assert.match(source,new RegExp('const '+starter+'='));
  assert.match(source,/pointerdown/);
  assert.match(source,/trialMemoryReveal/);
  assert.match(source,/trialEscape/);
  assert.match(source,/hits>=3/);
  assert.match(source,/phase<\.105\|\|phase>\.895/);
});

test('CPU Travelers autonomously resolve every trial family',()=>{
  assert.match(source,/const cpuAttempt=/);
  assert.match(source,/startStop[\s\S]*?cpuAttempt\(/);
  assert.match(source,/startReaction[\s\S]*?player\.controller==='cpu'/);
  assert.match(source,/startHold[\s\S]*?player\.controller==='cpu'/);
  assert.match(source,/startDodge[\s\S]*?player\.controller==='cpu'/);
  assert.match(source,/startRemember[\s\S]*?cpuAttempt\(/);
  assert.match(source,/startEscape[\s\S]*?cpuAttempt\(/);
  assert.match(source,/startFly[\s\S]*?player\.controller==='cpu'/);
  assert.match(multiplayer,/challengedTraveler\?\.controller==='cpu'/);
});

test('the game records the challenged player and preserves instant-death stakes',()=>{
  assert.match(html,/game\.challengePlayer=p\.p/);
  assert.match(html,/els\.message\.dataset\.challengePlayer=p\.p/);
  assert.match(html,/onFail:name=>\{events\.push\(p\.name\+' failed '/);
  assert.match(html,/kill\(p,events\)/);
  assert.match(html,/trial-or-die\.js\?v=20260911T1/);
});

test('multiplayer routes trial clicks and hold gestures only to the challenged Traveler',()=>{
  assert.match(multiplayer,/els\.message\.dataset\.challengePlayer\|\|game\?\.challengePlayer/);
  assert.match(multiplayer,/challengePlayer:els\.message\.dataset\.challengePlayer/);
  assert.match(multiplayer,/command\.kind==='pointer'/);
  assert.match(multiplayer,/closest\('\.trial-hold-pad'\)/);
  assert.match(multiplayer,/localCanUseMessage\(event\.target\)/);
});

test('every ordinary lethal hit receives the private Last Chance D20',()=>{
  assert.match(html,/if\(p\.life<=0\)await resolveLastChance\(p,reason,events\)/);
  assert.match(html,/id="lastChanceRollButton"/);
  assert.match(html,/1–9 die · 10 cast again · 11–20 survive on 1 Heart/);
  assert.match(html,/while\(roll===10\)/);
  assert.match(html,/if\(roll>=11\)\{p\.life=1/);
  assert.match(html,/game\.challengePlayer=p\.p;els\.turnRoll\.dataset\.challengePlayer=p\.p/);
  assert.match(multiplayer,/turnRoll\.dataset\.challengePlayer\|\|game\?\.challengePlayer/);
  assert.match(multiplayer,/document\.querySelector\('#'\+cssEscape\(command\.id\)\)/);
});
