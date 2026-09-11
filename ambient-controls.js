const STORAGE_KEY = 'tabok.ambient-light.v1';
const DEFAULT_LEVEL = 55;

// A device preference, deliberately separate from multiplayer and saved game state.
export function installAmbientControls(board, parent) {
  const panel = document.createElement('details');
  panel.className = 'arena-light-controls';
  panel.innerHTML = `<summary>✧ <span>Lighting</span></summary>
    <div class="arena-light-panel">
      <div class="arena-light-heading"><label for="arenaAmbient">Ambient light</label><output for="arenaAmbient" id="arenaAmbientValue"></output></div>
      <input id="arenaAmbient" type="range" min="0" max="100" step="1" aria-describedby="arenaAmbientHelp">
      <div class="arena-light-scale"><span>Original night</span><span>Moonlit</span></div>
      <p id="arenaAmbientHelp">Lift the shadows. Keep the mystery.</p>
      <button type="button" class="arena-light-reset">Restore recommended</button>
    </div>`;
  const slider = panel.querySelector('input');
  const output = panel.querySelector('output');
  const apply = value => {
    const level = board.setAmbientLight(value);
    slider.value = String(level);
    output.textContent = `${level}%`;
    slider.setAttribute('aria-valuetext', `${level}% ambient light`);
    return level;
  };
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) { /* Private browsing can block storage. */ }
  apply(saved);
  const save = value => {
    const level = apply(value);
    try { localStorage.setItem(STORAGE_KEY, String(level)); } catch (_) { /* Live adjustment still works. */ }
  };
  slider.addEventListener('input', () => save(slider.value));
  panel.querySelector('button').addEventListener('click', () => save(DEFAULT_LEVEL));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { panel.open = false; panel.querySelector('summary').focus(); }
    event.stopPropagation();
  });
  for (const event of ['pointerdown', 'pointerup', 'click', 'dblclick', 'wheel']) {
    panel.addEventListener(event, e => e.stopPropagation());
  }
  parent.append(panel);
  return panel;
}
