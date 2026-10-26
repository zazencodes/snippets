#!/usr/bin/env bash
# Install snippets for your coding agents:
#   curl -fsSL https://raw.githubusercontent.com/zazencodes/snippets/main/install.sh | bash
# Clones the repo into ~/.local/share/snippets (or updates it), which the plugins
# load from, then sets up the agents you choose.
set -euo pipefail

REPO="$HOME/.local/share/snippets"
SNIPPETS_DIR="$HOME/.config/snippets"

ask() {
  local answer
  # stdin is this script when piped from curl, so read the answer from the terminal.
  read -r -p "$1 [y/n] " answer </dev/tty
  case "$answer" in
    y | Y) return 0 ;;
    n | N) return 1 ;;
    *) echo "Answer y or n." >&2; ask "$1" ;;
  esac
}

claude=0 codex=0 pi=0 opencode=0
ask "Install for Claude Code?" && claude=1
ask "Install for Codex?" && codex=1
ask "Install for Pi?" && pi=1
ask "Install for OpenCode?" && opencode=1
if ((claude + codex + pi + opencode == 0)); then
  echo "No agent chosen, nothing to install." >&2
  exit 1
fi
alex=0 skill=0
ask "Start with Alex's snippets? (yours with the same name are kept)" && alex=1
ask "Add the manage-snippets skill, so your agent can add and edit snippets?" && skill=1

if [[ -d "$REPO" ]]; then
  git -C "$REPO" pull --quiet --ff-only
else
  git clone --quiet https://github.com/zazencodes/snippets "$REPO"
fi
mkdir -p "$SNIPPETS_DIR"
if ((alex)); then
  # Alex's snippets live on the alex-snippets branch, in snippets/.
  tmp="$(mktemp -d)"
  git -C "$REPO" fetch --quiet origin alex-snippets
  git -C "$REPO" archive FETCH_HEAD snippets | tar -x -C "$tmp"
  for file in "$tmp"/snippets/*.md; do
    [[ -e "$SNIPPETS_DIR/$(basename "$file")" ]] || cp "$file" "$SNIPPETS_DIR"/
  done
  rm -rf "$tmp"
fi

link_skill() {
  mkdir -p "$1"
  ln -sfn "$REPO/skills/manage-snippets" "$1/manage-snippets"
}

if ((claude)); then
  claude plugin marketplace add "$REPO"
  claude plugin install snippets@snippets
  if ((skill)); then link_skill "$HOME/.claude/skills"; fi
fi
if ((codex)); then
  codex plugin marketplace add "$REPO"
  "$REPO/codex/sync"
fi
if ((pi)); then
  pi install "$REPO/pi"
fi
if ((opencode)); then
  mkdir -p "$HOME/.config/opencode/plugins"
  ln -sfn "$REPO/opencode/snippets.ts" "$HOME/.config/opencode/plugins/snippets.ts"
fi
# Codex, Pi and OpenCode all read skills from ~/.agents/skills.
if ((skill && (codex || pi || opencode))); then link_skill "$HOME/.agents/skills"; fi

echo "snippets: installed. Your snippets are in $SNIPPETS_DIR"
