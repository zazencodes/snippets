import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Plugin } from '@opencode-ai/plugin'

type Snippet = {
  id: string
  placement: 'prepend' | 'append'
  order: number
  body: string
}

const SNIPPETS_DIR = join(homedir(), '.config', 'snippets')
// A snippet is added by typing `#<id>` as its own word, e.g. `#no-tests`. Quotes
// and punctuation may touch it: `opencode run "..."` keeps the quotes in the text.
const MENTION = /(^|[\s"'(])#([A-Za-z0-9][\w-]*)(?=$|[\s"'.,;:!?)])/g

function parseSnippet(file: string, raw: string): Snippet {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) throw new Error(`snippets: ${file} has no frontmatter`)
  const [, frontmatter = '', rawBody = ''] = match

  const meta: Record<string, string> = {}
  for (const line of frontmatter.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/)
    if (kv?.[1] && kv[2] !== undefined) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '')
  }

  const placement = meta.placement ?? 'append'
  if (placement !== 'prepend' && placement !== 'append') {
    throw new Error(`snippets: ${file} has placement "${placement}", expected prepend or append`)
  }
  if (meta.order !== undefined && !/^-?\d+$/.test(meta.order)) {
    throw new Error(`snippets: ${file} has order "${meta.order}", expected a whole number`)
  }
  const body = rawBody.trim()
  if (!body) throw new Error(`snippets: ${file} has an empty body`)

  return {
    id: file.replace(/\.md$/i, ''),
    placement,
    order: meta.order === undefined ? 9999 : Number(meta.order),
    body,
  }
}

function loadSnippets(): Map<string, Snippet> {
  const files = readdirSync(SNIPPETS_DIR).filter(name => name.toLowerCase().endsWith('.md'))
  const snippets = files.map(file => parseSnippet(file, readFileSync(join(SNIPPETS_DIR, file), 'utf8')))
  return new Map(snippets.map(s => [s.id, s]))
}

export const SnippetsPlugin: Plugin = async () => ({
  'chat.message': async (_input, output) => {
    const part = output.parts.find(p => p.type === 'text' && !p.synthetic)
    if (part?.type !== 'text') return

    const snippets = loadSnippets()
    const chosen: Snippet[] = []
    const text = part.text
      .replace(MENTION, (mention, space: string, id: string) => {
        const snippet = snippets.get(id)
        if (!snippet) return mention
        if (!chosen.includes(snippet)) chosen.push(snippet)
        return space
      })
      .trim()
    if (chosen.length === 0) return

    const bodies = (placement: Snippet['placement']) =>
      chosen
        .filter(s => s.placement === placement)
        .sort((a, b) => a.order - b.order)
        .map(s => s.body)
    part.text = [...bodies('prepend'), text, ...bodies('append')].join('\n\n')
  },
})
