(function(){
  'use strict';

  const RUNES=['◇','△','○','✦'];
  const NAMES=['STOP','REACTION','HOLD','DODGE','REMEMBER','ESCAPE','SWAT THE FLY'];
  const copy={
    STOP:'Stop the orbiting light inside the golden judgment arc.',
    REACTION:'Wait for the dormant sigil to ignite—then strike before it fades.',
    HOLD:'Hold the seal to gather power. Release while the charge rests in the golden band.',
    DODGE:'One refuge will glow. Touch it before the Seventh strikes.',
    REMEMBER:'Witness the rune sequence, then repeat it from memory.',
    ESCAPE:'Follow the illuminated path through the collapsing lattice.',
    'SWAT THE FLY':'Catch the impossible fly three times before it escapes.'
  };

  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const shuffle=a=>a.slice().sort(()=>Math.random()-.5);

  function nextTrial(seen=[]){
    const available=NAMES.filter(name=>!seen.includes(name));
    const name=pick(available.length?available:NAMES);
    return {name,seen:available.length?[...seen,name]:[name]};
  }

  function playerAlert(player){
    const state=player.controller==='cpu'?'CPU ATTEMPT IN PROGRESS':'SURVIVE NOW';
    return '<div class="challenge-player-alert trial-player-alert" role="alert" aria-live="assertive"><small>Trial-or-Die belongs to</small><strong>'+player.p+' · '+player.name+'</strong><em>'+state+'</em></div>';
  }

  function shell(player,reason,name){
    return playerAlert(player)+'<section class="balance-trial" data-trial="'+name+'"><small class="trial-reason">'+reason+'</small><p class="trial-instruction">'+copy[name]+'</p><div class="trial-stage" id="trialStage" aria-live="polite"><div class="trial-ready"><i>◇</i><span>THE SEVENTH PREPARES JUDGMENT</span></div></div><div class="trial-clock" aria-label="Trial time remaining"><i id="trialTimerBar"></i></div><div class="trial-status" id="trialStatus">Ready yourself. The clock begins when the trial awakens.</div></section>';
  }

  function run(options){
    const {player,reason,host,onPass,onFail,onClose}=options;
    const chosen=options.name&&NAMES.includes(options.name)?{name:options.name,seen:options.seen||[]}:nextTrial(options.seen||[]);
    const name=chosen.name,stage=()=>host.querySelector('#trialStage'),status=()=>host.querySelector('#trialStatus'),bar=()=>host.querySelector('#trialTimerBar');
    let finished=false,started=0,duration=0,timer=null,raf=null,cleanups=[];
    host.innerHTML=shell(player,reason,name);

    const later=(fn,ms)=>{const id=setTimeout(fn,ms);cleanups.push(()=>clearTimeout(id));return id};
    const listen=(node,type,fn,settings)=>{node.addEventListener(type,fn,settings);cleanups.push(()=>node.removeEventListener(type,fn,settings))};
    const setStatus=text=>{const node=status();if(node)node.textContent=text};
    const cleanup=()=>{cleanups.splice(0).forEach(fn=>fn());clearInterval(timer);cancelAnimationFrame(raf)};
    const settle=passed=>{
      if(finished)return;
      finished=true;cleanup();
      const root=host.querySelector('.balance-trial');
      root?.classList.remove('trial-live');
      root?.classList.add(passed?'trial-passed':'trial-failed');
      setStatus(passed?'PASS · THE SEVENTH RELEASES YOU':'FAIL · THE SEVENTH CLAIMS YOU');
      const meter=bar();if(meter)meter.style.transform='scaleX('+(passed?1:0)+')';
      if(passed)onPass?.(name);else onFail?.(name);
      setTimeout(()=>onClose?.(passed,name),1050);
    };
    const beginClock=(ms=6500)=>{
      duration=ms;started=performance.now();
      const root=host.querySelector('.balance-trial');root?.style.setProperty('--trial-duration',ms+'ms');root?.classList.add('trial-live');
      timer=setTimeout(()=>settle(false),ms);
    };
    const cpuAttempt=(delay=1500,chance=.72)=>{if(player.controller==='cpu')later(()=>settle(Math.random()<chance),delay)};

    const startReaction=()=>{
      stage().innerHTML='<button id="trialReaction" class="trial-sigil trial-reaction dormant" type="button" aria-label="Strike the sigil">◇</button>';
      const button=host.querySelector('#trialReaction');let lit=false;
      beginClock(5200);setStatus('Wait. A premature strike is fatal.');
      listen(button,'click',()=>settle(lit));
      later(()=>{if(finished)return;lit=true;button.classList.remove('dormant');button.classList.add('lit');button.textContent='STRIKE';setStatus('NOW · STRIKE');later(()=>settle(false),1500);if(player.controller==='cpu')later(()=>settle(Math.random()<.72),240+Math.random()*520)},900+Math.random()*1200);
    };

    const startStop=()=>{
      stage().innerHTML='<button id="trialStop" class="trial-orbit" type="button" aria-label="Stop the orbiting light"><span class="trial-safe-arc"></span><i class="trial-orbit-light"></i><b>STOP</b></button>';
      const button=host.querySelector('#trialStop'),period=1800,zero=performance.now();
      beginClock(7000);setStatus('Stop the light within the golden arc.');
      listen(button,'click',()=>{const phase=((performance.now()-zero)%period)/period;settle(phase<.105||phase>.895)});
      cpuAttempt(1500+Math.random()*2200);
    };

    const startHold=()=>{
      stage().innerHTML='<div class="trial-charge"><div class="trial-charge-track"><span class="trial-charge-safe"></span><i id="trialChargeFill"></i></div><button id="trialHold" class="trial-hold-pad" type="button">HOLD THE SEAL</button></div>';
      const button=host.querySelector('#trialHold'),fill=host.querySelector('#trialChargeFill');let charging=false,charge=0,chargeStart=0,overcharge=null;
      beginClock(7000);setStatus('Press and hold. Release inside the golden band.');
      const down=event=>{event.preventDefault();if(charging)return;charging=true;chargeStart=performance.now();fill.classList.add('charging');button.setPointerCapture?.(event.pointerId);button.textContent='RELEASE IN GOLD';overcharge=later(()=>settle(false),2350)};
      const up=event=>{event.preventDefault();if(!charging)return;charging=false;clearTimeout(overcharge);charge=Math.min(1,(performance.now()-chargeStart)/2300);fill.classList.remove('charging');fill.style.transform='scaleX('+charge+')';settle(charge>=.58&&charge<=.78)};
      listen(button,'pointerdown',down);listen(button,'pointerup',up);listen(button,'pointercancel',up);
      if(player.controller==='cpu')later(()=>{charging=true;chargeStart=performance.now();fill.classList.add('charging');later(()=>{charging=false;settle(Math.random()<.72)},1450)},650);
    };

    const startDodge=()=>{
      const safe=Math.floor(Math.random()*3);
      stage().innerHTML='<div class="trial-dodge">'+[0,1,2].map(i=>'<button id="trialDodge'+i+'" class="trial-refuge" type="button" aria-label="Refuge '+(i+1)+'">'+RUNES[i]+'</button>').join('')+'</div>';
      const buttons=[0,1,2].map(i=>host.querySelector('#trialDodge'+i));
      beginClock(4300);setStatus('Watch for the safe refuge.');
      buttons.forEach((button,i)=>listen(button,'click',()=>settle(i===safe)));
      later(()=>{buttons[safe].classList.add('safe');setStatus('DODGE NOW');later(()=>settle(false),1700)},900);
      if(player.controller==='cpu')later(()=>settle(Math.random()<.72),1850);
    };

    const startRemember=()=>{
      const sequence=Array.from({length:3},()=>Math.floor(Math.random()*RUNES.length));let cursor=0;
      stage().innerHTML='<div class="trial-memory"><div class="trial-memory-reveal" id="trialMemoryReveal">◇</div><div class="trial-rune-choices hidden" id="trialRuneChoices">'+RUNES.map((r,i)=>'<button id="trialRune'+i+'" type="button">'+r+'</button>').join('')+'</div></div>';
      const reveal=host.querySelector('#trialMemoryReveal'),choices=host.querySelector('#trialRuneChoices');setStatus('Memorize the three runes.');
      sequence.forEach((r,i)=>later(()=>{reveal.textContent=RUNES[r];reveal.classList.remove('pulse');void reveal.offsetWidth;reveal.classList.add('pulse')},550+i*650));
      later(()=>{reveal.textContent='?';choices.classList.remove('hidden');beginClock(6000);setStatus('Repeat the sequence.');RUNES.forEach((_,i)=>listen(host.querySelector('#trialRune'+i),'click',()=>{if(i!==sequence[cursor])return settle(false);cursor++;setStatus(cursor===sequence.length?'Sequence complete.':'Correct · '+cursor+' of '+sequence.length);if(cursor===sequence.length)settle(true)}));cpuAttempt(1500)},2650);
    };

    const startEscape=()=>{
      const path=Array.from({length:4},()=>Math.floor(Math.random()*3));let row=0;
      stage().innerHTML='<div class="trial-escape">'+path.map((_,r)=>'<div class="trial-escape-row" data-row="'+r+'">'+[0,1,2].map(c=>'<button id="trialEscape'+r+'_'+c+'" type="button" '+(r?'disabled':'')+'>'+RUNES[(r+c)%RUNES.length]+'</button>').join('')+'</div>').join('')+'</div>';
      beginClock(7000);setStatus('Follow the faintly illuminated path.');
      const awaken=current=>{host.querySelectorAll('.trial-escape-row').forEach((line,i)=>line.classList.toggle('current',i===current));const correct=host.querySelector('#trialEscape'+current+'_'+path[current]);correct.classList.add('path-glow');host.querySelectorAll('.trial-escape-row[data-row="'+current+'"] button').forEach(button=>button.disabled=false)};
      path.forEach((_,r)=>[0,1,2].forEach(c=>listen(host.querySelector('#trialEscape'+r+'_'+c),'click',()=>{if(r!==row||c!==path[row])return settle(false);host.querySelectorAll('.trial-escape-row[data-row="'+row+'"] button').forEach(button=>button.disabled=true);row++;if(row===path.length)return settle(true);awaken(row)})));
      awaken(0);cpuAttempt(1800);
    };

    const startFly=()=>{
      stage().innerHTML='<div class="trial-fly-field"><button id="trialFly" class="trial-fly" type="button" aria-label="Catch the impossible fly">✦</button><span id="trialFlyCount">0 / 3</span></div>';
      const fly=host.querySelector('#trialFly'),count=host.querySelector('#trialFlyCount');let hits=0;
      const move=()=>{fly.style.setProperty('--fly-x',(8+Math.random()*78)+'%');fly.style.setProperty('--fly-y',(8+Math.random()*68)+'%');fly.style.setProperty('--fly-r',(-28+Math.random()*56)+'deg')};
      beginClock(7500);setStatus('Catch it three times.');move();
      listen(fly,'click',()=>{hits++;count.textContent=hits+' / 3';if(hits>=3)return settle(true);move();setStatus('Again · '+hits+' of 3')});
      if(player.controller==='cpu')later(()=>settle(Math.random()<.72),2100);
    };

    const starters={STOP:startStop,REACTION:startReaction,HOLD:startHold,DODGE:startDodge,REMEMBER:startRemember,ESCAPE:startEscape,'SWAT THE FLY':startFly};
    later(()=>starters[name](),850);
    return {name,seen:chosen.seen,cancel:()=>{finished=true;cleanup()}};
  }

  window.TabokTrialOrDie={NAMES,nextTrial,run};
})();
