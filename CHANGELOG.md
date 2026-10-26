# Changelog

## [Unreleased]

### Added

- Added embedded Claude Code and Codex demo videos to the README

## [0.1.0] - 2026-10-26

### Added

- Added the install script (`curl -fsSL https://raw.githubusercontent.com/zazencodes/snippets/main/install.sh | bash`), which sets up Claude Code, Codex, Pi and OpenCode, can start you with Alex's snippets, and can add the `manage-snippets` skill; run it again to update
- Added an install prompt to paste into a coding agent instead of running the script
- Added the Claude Code plugin: `/snippets` toggles snippets on for your next message, shows them above the prompt, and writes them before or after your message
- Added the Codex plugin: each snippet is a `$snippets:<id>` skill, kept in sync with `codex/sync`
- Added the Pi extension: `/snippets` toggles snippets on for your next message, like in Claude Code
- Added the OpenCode plugin: `#<snippet>` in a message is replaced by that snippet
- Added the `manage-snippets` skill for listing, adding, editing and removing snippets
