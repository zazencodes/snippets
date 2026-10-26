# Snippets

Reusable prompt instructions you add to a message in Claude Code, Codex, Pi and OpenCode.

<p align="center">
  <a href="https://github.com/zazencodes/snippets/releases/latest"><img src="https://img.shields.io/github/v/release/zazencodes/snippets" alt="Latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPLv3-blue" alt="License: GPLv3"></a>
  <img src="https://img.shields.io/badge/Claude%20Code-ready-D97757?logo=claude&logoColor=white" alt="Claude Code ready">
  <img src="https://img.shields.io/badge/Codex-ready-000000?logo=openai&logoColor=white" alt="Codex ready">
  <img src="https://img.shields.io/badge/Pi-ready-000000?logo=pi&logoColor=white" alt="Pi ready">
  <img src="https://img.shields.io/badge/OpenCode-ready-000000?logo=opencode&logoColor=white" alt="OpenCode ready">
</p>

You probably type the same few instructions again and again: "make a plan first",
"don't write tests", "ask me if you're unsure". Save each one as a snippet, then add
it to a message in a couple of keystrokes.

## Install

Use the install script or install with a prompt.

### Install script

```sh
curl -fsSL https://raw.githubusercontent.com/zazencodes/snippets/main/install.sh | bash
```

The installer asks:

- which agents to set up (Claude Code, Codex, Pi, OpenCode)
- whether to start with my snippets
- whether to add the `manage-snippets` skill so you can ask your agent to list, add, change or remove snippets.

This script will also update the software if you already have it installed.

### Prompt

Paste this into your coding agent:

```
Install snippets from https://github.com/zazencodes/snippets for me. Read its
install.sh, ask me the same questions it asks, then set it up based on my answers.
```

## Claude Code

https://github.com/user-attachments/assets/19a48c19-010e-4287-97c3-5f6b4ddd5fc0

Type `/snippets`, search, and press Enter on each snippet you want:

```
Search: plan

↑ PREPEND — added before your message
› [ ] Plan first — Present a simple plan and wait for approval
```

The ones you picked show above the prompt:

```
↑ prepend: Plan first
↓ append: No tests
❯ fix the login bug
```

When you send, they're written into your message:

```
Start by making a simple plan and present it to me. Don't make any changes until I've approved it.

fix the login bug

You don't need to write or run tests for this. Just use your logic to double-check it; I'll do the testing myself.
```

They switch off after each message.

## Codex

https://github.com/user-attachments/assets/1289c469-f1f6-43a9-bbd4-2c067c64af05

Type `$snippets:` and pick from the list:

```
› Snippet: No tests             [Skill] Don't write or run tests, use your logic
  Snippet: Plan first           [Skill] Present a simple plan and wait for approval
  Snippet: Ask questions        [Skill] Stop and ask instead of guessing
› $snippets:
```

Your message shows the snippet names, and Codex follows them:

```
› $snippets:plan-first  $snippets:no-tests  add a --shout flag to greet.py

• I'll use snippets:plan-first to inspect greet.py and propose a plan before editing.
  I'll also follow snippets:no-tests and won't write or run tests.
• Plan:
  1. Use argparse to accept the name and an optional --shout flag.
  2. Make --shout uppercase the full greeting: HELLO, ALEX!.
  3. Review the change without writing or running tests.
  Approve this plan?
```

After you add or change a snippet, run `~/.local/share/snippets/codex/sync` again (the `manage-snippets` skill
does it for you).

## Pi

Type `/snippets`, search, and press Enter on each snippet you want. It works like
Claude Code: the ones you picked show above the editor, are written into your next
message, then switch off.

## OpenCode

Type `#` and the snippet's filename anywhere in your message:

```
#plan-first fix the login bug #no-tests
```

Each `#<snippet>` is replaced by the snippet, placed before or after your message.

## Writing snippets

Each snippet is a markdown file in `~/.config/snippets/`:

```markdown
---
name: No tests
description: Don't write or run tests, use your logic
placement: append
---
You don't need to write or run tests for this. Just use your logic to double-check it.
```

- `placement`: `prepend` puts it before your message, `append` after it (the default).
  Codex ignores it.
- `order`: optional number to sort snippets.

Or skip the file and ask your agent: "save that as a snippet".

## License

[GPLv3](LICENSE). Inspired by the `prompt-snippets` extension for Pi in
[amosblomqvist/pi-config](https://github.com/amosblomqvist/pi-config).

<p align="center">
  <a href="https://zazencodes.com/?utm_source=github&utm_medium=referral&utm_campaign=snippets">
    <img
      src="docs/assets/zazencodes-banner.png"
      alt="ZazenCodes — Engineering for the Agentic Era"
      width="100%"
    >
  </a>
  <br>
  Created by <a href="https://zazencodes.com/">ZazenCodes</a>
</p>
