/* Inventory-aware dice tray. CSS 3D faces keep selection and rolls lightweight. */
(function(root){
  'use strict';
  const names=['Movement','Treasure','Rune','Offer'];
  const faces={Movement:['1','2','3','4','5','6'],Treasure:['CHOOSE','CHOOSE','CHOOSE','BLANK','BLANK','BLANK'],Rune:['WARP','DOUBLE','PHASE','BALANCE','FORTUNE','TIME'],Offer:Array.from({length:20},(_,i)=>String(i+1))};
  const symbols={CHOOSE:'◇',BLANK:'—',WARP:'↗',DOUBLE:'×2',PHASE:'⬡',BALANCE:'⚖',FORTUNE:'✦',TIME:'⌛'};
  const available=player=>names.filter(name=>name==='Rune'?Boolean(player?.rune):name==='Offer'?Boolean(player?.inventory?.some(count=>count>0)):true);
  const normalize=(selection,allowed=names)=>names.filter(name=>allowed.includes(name)&&Array.isArray(selection)&&selection.includes(name));
  // Twenty real triangular planes form the Offering icosahedron, not a D6 skin.
  const t=(1+Math.sqrt(5))/2,vertices=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(p=>p.map(x=>x/Math.hypot(1,t)*.7));
  const triangles=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),unit=a=>a.map(x=>x/Math.hypot(...a)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const front=triangles[0].map(i=>vertices[i]),axisX=unit(sub(front[1],front[0])),axisZ=unit(cross(sub(front[1],front[0]),sub(front[2],front[0]))),axisY=cross(axisZ,axisX);
  const oriented=vertices.map(p=>[dot(p,axisX),dot(p,axisY),dot(p,axisZ)]);
  const d20Styles=triangles.map(indices=>{
    const points=indices.map(i=>oriented[i]),center=points[0].map((_,i)=>points.reduce((sum,p)=>sum+p[i],0)/3),u=unit(sub(points[1],points[0])),n=unit(cross(sub(points[1],points[0]),sub(points[2],points[0]))),v=cross(n,u);
    const polygon=points.map(p=>{const delta=sub(p,center);return (50+dot(delta,u)*100)+'% '+(50+dot(delta,v)*100)+'%'}).join(',');
    return 'clip-path:polygon('+polygon+');transform:translate3d('+center.map(x=>'calc(var(--die-size) * '+x+')').join(',')+') matrix3d('+[...u,0,...v,0,...n,0,0,0,0,1].join(',')+');';
  });
  function face(label){return '<span class="ds-symbol">'+(symbols[label]||label)+'</span>'+(symbols[label]?'<small>'+label+'</small>':'')}
  function markup(selection=[],allowed=available()){
    const visible=normalize(allowed),selected=normalize(selection,visible);
    return '<div class="dice-selection-row" style="--dice-count:'+visible.length+'" role="group" aria-label="Select dice to roll">'+visible.map(name=>{
      const on=selected.includes(name),labels=faces[name];
      return '<button type="button" class="ds-option ds-'+name.toLowerCase()+'" data-dice-choice="'+name+'" aria-label="'+(name==='Offer'?'Offering D20':name+' die')+'" aria-pressed="'+on+'"><span class="ds-stage" aria-hidden="true"><span class="ds-shadow"></span><span class="ds-lift"><span class="ds-cube">'+labels.map((label,i)=>'<span class="ds-face ds-face-'+i+(name==='Offer'?' ds-d20-face':'')+'" '+(name==='Offer'?'style="'+d20Styles[i]+'"':'')+'>'+face(label)+'</span>').join('')+'</span></span></span><strong class="ds-name">'+(name==='Offer'?'Offering D20':name)+'</strong><span class="ds-indicator">'+(on?'✓ Selected':'Select')+'</span><span class="ds-result" aria-live="polite"></span></button>';
    }).join('')+'</div>';
  }
  function mount(host,control,selection,onToggle,onRoll,allowed=available()){
    host.innerHTML=markup(selection,allowed);
    host.querySelectorAll('[data-dice-choice]').forEach(button=>button.onclick=()=>onToggle(button.dataset.diceChoice));
    control.innerHTML='<button type="button" class="ds-roll" id="rollSelectedDice" '+(!normalize(selection,allowed).length?'disabled':'')+'>ROLL SELECTED</button>';
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
  root.TabokDiceSelection={names,faces,available,normalize,markup,mount,roll};
  if(typeof module==='object'&&module.exports)module.exports=root.TabokDiceSelection;
})(typeof window==='object'?window:globalThis);
