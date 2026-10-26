/** A snippet's filename in the snippet folder, e.g. "verify.md". */
export type SnippetId = string

declare module 'claude-code' {
  interface PluginState {
    snippets: { active: SnippetId[]; query: string; cursor: number }
  }
}
