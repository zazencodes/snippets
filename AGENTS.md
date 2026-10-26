# AGENTS.md

Snippets adds saved prompt instructions to a message in Claude Code, Codex, Pi
and OpenCode. Snippets are markdown files in `~/.config/snippets/`.

- `install.sh`: interactive installer, run with `curl ... | bash`. It clones
  the repo into `~/.local/share/snippets`, which the plugins load from. The
  README's install prompt has an agent follow this script.
- `claude-code/`: Claude Code plugin (`/snippets` menu, `hooks/register.tsx`).
- `codex/`: Codex plugin; `codex/sync` turns snippets into skills and reinstalls.
- `pi/`: Pi package (`/snippets` menu, `snippets.ts`).
- `opencode/`: OpenCode plugin; expands `#<snippet-id>` in a message.
- `skills/manage-snippets/`: skill for listing, adding, editing and removing snippets.

Each harness parses snippet files itself; keep the frontmatter rules
(`name`, `description`, `placement`, `order`) identical across all of them.

## Branches

- `main`: the project, with no snippets in it.
- `alex-snippets`: `main` plus Alex's snippets in `snippets/`. `install.sh` copies
  them from this branch when asked.

Keep the two in sync: make every project change on `main`, and only add or
edit files in `snippets/` on `alex-snippets`. Never merge `alex-snippets` into
`main`. The `Sync alex-snippets with main` workflow merges `main` into
`alex-snippets` on every push to `main`; if it fails on a conflict, merge `main`
into `alex-snippets` by hand and push.
