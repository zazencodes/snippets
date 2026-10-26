---
name: manage-snippets
description: List, add, edit or remove the user's prompt snippets in ~/.config/snippets. Use when the user asks what snippets they have, or to save something as a snippet, change one, or delete one.
---

# Manage snippets

Snippets are markdown files in `~/.config/snippets/`, one per snippet. The
`snippets` plugin for Claude Code, Codex, Pi and OpenCode reads them; the user
adds them to their next message.

```markdown
---
name: Verify
description: Check facts instead of assuming them
placement: append
order: 10
---
Verify instead of assuming. Check every fact the work depends on.
```

- `placement`: `prepend` (added before the message) or `append` (after it).
- `order`: whole number, sorts snippets within their placement.
- The filename is the snippet's id: short, kebab-case, `.md`.
- The body is one to three sentences, in the user's words where they gave them.

To list them, show each snippet's name, placement and description. To add or
edit one, write the file, then show the user what you wrote. To remove one,
confirm which file, then delete it.

After any change, if the user has the Codex plugin installed (`codex plugin
list` shows `snippets@snippets`), run `codex/sync` from the repository this
skill lives in, two folders above this file. Codex keeps a copy of the
snippets and only sees changes after a sync.
