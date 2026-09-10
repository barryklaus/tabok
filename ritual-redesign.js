(() => {
  'use strict';
  document.documentElement.classList.add('ritual-redesign');

  function buildCodex() {
    const body = document.querySelector('.guide-scroll-body');
    if (!body || body.querySelector('.ritual-codex')) return;
    const children = [...body.children];
    const hud = document.createElement('section');
    hud.className = 'ritual-hud';
    hud.innerHTML = '<div class="ritual-hud-kicker">The living artifact</div><div class="ritual-hud-title"><b>The Crossing</b><span id="ritualStatus">AWAITING FATE</span></div><div class="ritual-hud-stats"><span class="ritual-hud-stat"><small>RELIC</small><b id="ritualRelic">0</b></span><span class="ritual-hud-stat"><small>ODDITY</small><b id="ritualOddity">0</b></span><span class="ritual-hud-stat"><small>KEEPSAKE</small><b id="ritualKeepsake">0</b></span></div>';
    const details = document.createElement('details');
    details.className = 'ritual-codex';
    details.innerHTML = '<summary>Rules &amp; Codex</summary><div class="ritual-codex-body"></div>';
    const codexBody = details.querySelector('.ritual-codex-body');
    children.forEach(child => codexBody.appendChild(child));
    body.append(hud, details);
  }

  function syncHud() {
    const current = document.querySelector('.traveler.current');
    const title = document.getElementById('turnTitle');
    const status = document.getElementById('ritualStatus');
    const nextStatus=(title?.textContent || 'Awaiting fate').replace(/^P\d\s*·\s*/,'').toUpperCase();
    if (status && status.textContent!==nextStatus) status.textContent = nextStatus;
    if (!current) return;
    const counts = [...current.querySelectorAll('.item-sprite b')].slice(0,3).map(n => n.textContent || '0');
    ['ritualRelic','ritualOddity','ritualKeepsake'].forEach((id,i) => { const node=document.getElementById(id),next=counts[i] || '0'; if(node&&node.textContent!==next) node.textContent=next; });
  }

  function enhanceChat() {
    const chat = document.getElementById('globalChat');
    const head = chat?.querySelector('.chat-head');
    if (!chat || !head || head.querySelector('.chat-collapse')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-collapse';
    button.setAttribute('aria-label','Minimize room chat');
    button.textContent = '−';
    button.addEventListener('click',() => {
      const collapsed = chat.classList.toggle('collapsed');
      button.textContent = collapsed ? '+' : '−';
      button.setAttribute('aria-label',collapsed ? 'Open room chat' : 'Minimize room chat');
      try { localStorage.setItem('tabok-chat-collapsed',collapsed ? '1' : '0'); } catch (_) {}
    });
    let collapsed = matchMedia('(max-width: 900px)').matches;
    try {
      const saved = localStorage.getItem('tabok-chat-collapsed');
      if (saved !== null) collapsed = saved === '1';
    } catch (_) {}
    chat.classList.toggle('collapsed',collapsed);
    button.textContent = collapsed ? '+' : '−';
    head.appendChild(button);
  }

  function init() {
    buildCodex();
    syncHud();
    enhanceChat();
    const observer = new MutationObserver(() => { buildCodex(); syncHud(); enhanceChat(); });
    const shell = document.querySelector('.shell');
    if (shell) observer.observe(shell,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
