/* A fixed three-die tray. CSS 3D faces keep selection and rolls lightweight. */
(function(root){
  'use strict';
  const names=['Movement','Treasure','Rune'];
  const faces={Movement:['1','2','3','4','5','6'],Treasure:['CHOOSE','CHOOSE','CHOOSE','BLANK','BLANK','BLANK'],Rune:['WARP','DOUBLE','PHASE','BALANCE','FORTUNE','TIME']};
  const symbols={CHOOSE:'◇',BLANK:'—',WARP:'↗',DOUBLE:'×2',PHASE:'⬡',BALANCE:'⚖',FORTUNE:'✦',TIME:'⌛'};
  const normalize=selection=>names.filter(name=>Array.isArray(selection)&&selection.includes(name));
  function face(label){return '<span class="ds-symbol">'+(symbols[label]||label)+'</span>'+(symbols[label]?'<small>'+label+'</small>':'')}
  function markup(selection=[]){
    const selected=normalize(selection);
    return '<div class="dice-selection-row" role="group" aria-label="Select dice to roll">'+names.map(name=>{
      const on=selected.includes(name),labels=faces[name];
      return '<button type="button" class="ds-option ds-'+name.toLowerCase()+'" data-dice-choice="'+name+'" aria-label="'+name+' die" aria-pressed="'+on+'"><span class="ds-stage" aria-hidden="true"><span class="ds-shadow"></span><span class="ds-lift"><span class="ds-cube">'+labels.map((label,i)=>'<span class="ds-face ds-face-'+i+'">'+face(label)+'</span>').join('')+'</span></span></span><strong class="ds-name">'+name+'</strong><span class="ds-indicator">'+(on?'✓ Selected':'Select')+'</span><span class="ds-result" aria-live="polite"></span></button>';
    }).join('')+'</div>';
  }
  function mount(host,control,selection,onToggle,onRoll){
    host.innerHTML=markup(selection);
    host.querySelectorAll('[data-dice-choice]').forEach(button=>button.onclick=()=>onToggle(button.dataset.diceChoice));
    control.innerHTML='<button type="button" class="ds-roll" id="rollSelectedDice" '+(!normalize(selection).length?'disabled':'')+'>ROLL SELECTED</button>';
    control.querySelector('button').onclick=onRoll;
  }
  async function roll(host,control,specs){
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const buttons=[...host.querySelectorAll('[data-dice-choice]')],rollButton=control.querySelector('button');
    buttons.forEach(button=>button.disabled=true);
    if(rollButton){rollButton.disabled=true;rollButton.textContent='ROLLING…'}
    const rolling=specs.map(spec=>{
      const button=buttons.find(button=>button.dataset.diceChoice===spec.label);
      if(!button)return null;
      const result=String(spec.result);
      if(!faces[spec.label]?.includes(result))throw new Error('Invalid die result');
      const labels=faces[spec.label],resultIndex=labels.indexOf(result);
      button.querySelectorAll('.ds-face').forEach((panel,index)=>{panel.innerHTML=face(labels[(resultIndex+index)%labels.length])});
      button.classList.add('is-rolling');
      return{button,result};
    }).filter(Boolean);
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    await wait(reduced?100:780);
    rolling.forEach(({button,result})=>{button.classList.remove('is-rolling');button.classList.add('is-result');button.querySelector('.ds-result').textContent=result==='CHOOSE'?'Choose treasure':result==='BLANK'?'Blank':result;button.setAttribute('aria-label',button.dataset.diceChoice+' die: '+result)});
    if(rollButton)rollButton.textContent='RESULTS';
    await wait(420);
    rolling.forEach(({button})=>{button.classList.remove('is-result');button.classList.add('is-returning')});
    await wait(reduced?0:180);
    rolling.forEach(({button})=>button.classList.remove('is-returning'));
    if(rollButton)rollButton.textContent='ROLL SELECTED';
  }
  root.TabokDiceSelection={names,faces,normalize,markup,mount,roll};
  if(typeof module==='object'&&module.exports)module.exports=root.TabokDiceSelection;
})(typeof window==='object'?window:globalThis);
