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

## Testing

Test in a throwaway `HOME` so the real agent configs stay untouched: start a tmux session with `HOME` set to an empty scratch folder and `PATH` including the agent CLIs, then run the curl one-liner (it installs `main` from GitHub) and answer every question.

- Installer: all four agents install, and running it again succeeds.
- Pi: in that session, `pi`, then `/snippets`, toggle two snippets, send a message; the transcript shows the bodies around it. Without a login the model call fails afterwards, which is fine.
- OpenCode: `opencode run --print-logs '#plan-first' say hi` in that home, then `opencode export <session>`; the stored user message has the snippet body.
- Claude Code: `claude plugin test claude-code`.
