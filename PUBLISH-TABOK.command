#!/bin/bash
# Double-click in Finder, or run ./PUBLISH-TABOK.command "Release message".
set -euo pipefail
cd "$(dirname "$0")"
runtime_dir="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
git_bin="$(command -v git || true)"
node_bin="$(command -v node || true)"
if [[ -z "$git_bin" && -x "$runtime_dir/bin/fallback/git" ]]; then git_bin="$runtime_dir/bin/fallback/git"; fi
if [[ -z "$node_bin" && -x "$runtime_dir/node/bin/node" ]]; then node_bin="$runtime_dir/node/bin/node"; fi
if [[ -z "$git_bin" || -z "$node_bin" ]]; then echo 'Git and Node.js are required to publish.'; exit 1; fi
if [[ "$("$git_bin" branch --show-current)" != main ]]; then echo 'Switch to main before publishing.'; exit 1; fi
case "$("$git_bin" remote get-url origin)" in
  https://github.com/barryklaus/tabok.git|git@github.com:barryklaus/tabok.git) ;;
  *) echo 'This shortcut only publishes the barryklaus/tabok repository.'; exit 1 ;;
esac
if [[ -n "$("$git_bin" ls-files --others --exclude-standard)" ]]; then
  echo 'Add the new files you want to publish to Git first, then run this shortcut again.'
  "$git_bin" status --short
  exit 1
fi
"$git_bin" diff --check
"$git_bin" diff --cached --check
"$node_bin" --test tests/*.test.cjs
"$git_bin" fetch origin main
if ! "$git_bin" merge-base --is-ancestor origin/main HEAD; then
  echo 'GitHub has newer changes. Pull and resolve them before publishing.'; exit 1
fi
"$git_bin" add -u
if ! "$git_bin" diff --cached --quiet; then
  "$git_bin" commit -m "${1:-Publish TABOK update $(date '+%Y-%m-%d %H:%M')}"
fi
if ! "$git_bin" push origin HEAD:main; then
  printf '\nThe tested update is committed locally.\nOpen GitHub Desktop, select tabok, and click Push origin to use its saved sign-in.\n'
  exit 1
fi
printf '\nPublished to GitHub. Pages will deploy shortly:\nhttps://barryklaus.github.io/tabok/\n'
