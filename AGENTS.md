# TABOK workspace

- The user's sole TABOK update folder is `/Users/barryklaus/Documents/Codex/2026-09-15/on-our-barryklaus-github-io-tabok`. Do not update other TABOK copies or `tabok-3d`.
- Git remote: `https://github.com/barryklaus/tabok.git`; working branch: `main`; public site: `https://barryklaus.github.io/tabok/`.
- Preserve the physics rule: players cannot share or pass through another active player or monster's hex, including Rune movement. Validate each actual step, not just its destination.
- Show CPU dice rolls in the same read-only 3D selection tray, locally and to online spectators. CPU decisions may use visible board state, but must not change dice odds or inspect future rolls.
- For every TABOK update, test and commit locally, then push online through GitHub Desktop and verify the live GitHub Pages version. The user explicitly wants publishing included by default; do not leave completed updates local-only unless they ask. If publishing is blocked, clearly distinguish committed local work from the live site.
