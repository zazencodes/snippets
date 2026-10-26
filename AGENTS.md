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

This section is for the maintainer (Alex of ZazenCodes). Anyone else
working in a clone or fork can ignore it.

- `main`: the project, with no snippets in it.
- `alex-snippets`: `main` plus Alex's snippets in `snippets/`. `install.sh` copies
  them from this branch when asked. Alex's live snippets in `~/.config/snippets`
  are the source of truth; to publish them, copy them into `snippets/` on this branch,
  commit and push.

Keep the two in sync: make every project change on `main`, and only add or
edit files in `snippets/` on `alex-snippets`. Never merge `alex-snippets` into
`main`. The `Sync alex-snippets with main` workflow is meant to merge `main` into
`alex-snippets` on every push to `main`, but GitHub has not been starting it. So
after every push to `main`, check `git fetch origin && git merge-base --is-ancestor
origin/main origin/alex-snippets`; if that fails, merge `main` into
`alex-snippets` by hand and push.

## Changelog

`CHANGELOG.md`. Add an entry under `## [Unreleased]` with every user-facing change, in the subsections `### Breaking Changes`, `### Added`, `### Changed`, `### Fixed`, `### Removed`. Read the section first and append to existing subsections. Released sections (`## [X.Y.Z] - date`) are immutable.

## Testing

Test in a throwaway `HOME` so the real agent configs stay untouched: start a tmux session with `HOME` set to an empty scratch folder and `PATH` including the agent CLIs, then run the curl one-liner (it installs `main` from GitHub) and answer every question.

- Installer: all four agents install, and running it again succeeds.
- Pi: in that session, `pi`, then `/snippets`, toggle two snippets, send a message; the transcript shows the bodies around it. Without a login the model call fails afterwards, which is fine.
- OpenCode: `opencode run --print-logs '#plan-first' say hi` in that home, then `opencode export <session>`; the stored user message has the snippet body.
- Claude Code: `claude plugin test claude-code`.

## Releasing

For versioning, release preparation, publishing, or recovering a failed release, load and follow [.agents/skills/release/SKILL.md](.agents/skills/release/SKILL.md).
