import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { getSettingsListTheme } from '@earendil-works/pi-coding-agent'
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent'
import { type SettingItem, SettingsList } from '@earendil-works/pi-tui'

type Snippet = {
  id: string
  name: string
  description: string
  placement: 'prepend' | 'append'
  order: number
  body: string
}

const SNIPPETS_DIR = join(homedir(), '.config', 'snippets')
const WIDGET = 'snippets'

function parseSnippet(id: string, raw: string): Snippet {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) throw new Error(`snippets: ${id} has no frontmatter`)
  const [, frontmatter = '', rawBody = ''] = match

  const meta: Record<string, string> = {}
  for (const line of frontmatter.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/)
    if (kv?.[1] && kv[2] !== undefined) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '')
  }

  const placement = meta.placement ?? 'append'
  if (placement !== 'prepend' && placement !== 'append') {
    throw new Error(`snippets: ${id} has placement "${placement}", expected prepend or append`)
  }
  if (meta.order !== undefined && !/^-?\d+$/.test(meta.order)) {
    throw new Error(`snippets: ${id} has order "${meta.order}", expected a whole number`)
  }
  const body = rawBody.trim()
  if (!body) throw new Error(`snippets: ${id} has an empty body`)

  return {
    id,
    name: meta.name || id.replace(/\.md$/i, ''),
    description: meta.description ?? '',
    placement,
    order: meta.order === undefined ? 9999 : Number(meta.order),
    body,
  }
}

/** All snippets, prepend group first, then append, each sorted by (order, name). */
function loadSnippets(): Snippet[] {
  const snippets = readdirSync(SNIPPETS_DIR)
    .filter(name => name.toLowerCase().endsWith('.md'))
    .map(name => parseSnippet(name, readFileSync(join(SNIPPETS_DIR, name), 'utf8')))
  const byOrder = (a: Snippet, b: Snippet) => a.order - b.order || a.name.localeCompare(b.name)
  return [
    ...snippets.filter(s => s.placement === 'prepend').sort(byOrder),
    ...snippets.filter(s => s.placement === 'append').sort(byOrder),
  ]
}

export default function (pi: ExtensionAPI) {
  // Ids (filenames) of the snippets toggled on for the next message.
  let active: string[] = []

  function showActive(ctx: ExtensionContext) {
    const chosen = loadSnippets().filter(s => active.includes(s.id))
    const names = (placement: Snippet['placement']) =>
      chosen.filter(s => s.placement === placement).map(s => s.name).join(' · ')
    const lines = [
      names('prepend') && ctx.ui.theme.fg('accent', `↑ prepend: ${names('prepend')}`),
      names('append') && ctx.ui.theme.fg('warning', `↓ append: ${names('append')}`),
    ].filter(Boolean)
    ctx.ui.setWidget(WIDGET, lines.length > 0 ? lines : undefined)
  }

  pi.registerCommand('snippets', {
    description: 'Toggle prompt snippets for your next message',
    handler: async (_args, ctx) => {
      if (ctx.mode !== 'tui') throw new Error('snippets: /snippets needs the interactive terminal UI')
      const snippets = loadSnippets()
      if (snippets.length === 0) {
        ctx.ui.notify(`No snippets in ${SNIPPETS_DIR}`, 'warning')
        return
      }

      await ctx.ui.custom((tui, theme, _keybindings, done) => {
        const items: SettingItem[] = snippets.map(s => ({
          id: s.id,
          label: `${s.placement === 'prepend' ? '↑' : '↓'} ${s.name}`,
          description: [s.description, s.body].filter(Boolean).join('\n\n'),
          currentValue: active.includes(s.id) ? 'on' : 'off',
          values: ['on', 'off'],
        }))
        const list = new SettingsList(
          items,
          Math.min(items.length + 2, 15),
          getSettingsListTheme(),
          (id, value) => {
            active = value === 'on' ? [...active, id] : active.filter(other => other !== id)
            showActive(ctx)
          },
          () => done(undefined),
          { enableSearch: true },
        )
        return {
          render: (width: number) => [theme.fg('accent', theme.bold('Snippets')), '', ...list.render(width)],
          invalidate: () => list.invalidate(),
          handleInput: (data: string) => {
            list.handleInput(data)
            tui.requestRender()
          },
        }
      })
    },
  })

  pi.on('input', async (event, ctx) => {
    if (event.source !== 'interactive' || active.length === 0) return { action: 'continue' }

    // A toggled snippet whose file was deleted since is simply no longer on.
    const chosen = loadSnippets().filter(s => active.includes(s.id))
    active = []
    showActive(ctx)
    const bodies = (placement: Snippet['placement']) =>
      chosen.filter(s => s.placement === placement).map(s => s.body)

    return { action: 'transform', text: [...bodies('prepend'), event.text, ...bodies('append')].join('\n\n') }
  })
}
