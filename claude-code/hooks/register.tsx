import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

type Snippet = {
  id: string
  name: string
  description: string
  placement: 'prepend' | 'append'
  order: number
  body: string
}

const PANE = 'snippets'
// Ids (filenames) of the snippets toggled on for the next message.
const active = atom({ plugin: 'snippets', key: 'active' } as const, [])
// The menu's search text, and the highlighted row among the snippets it matches.
const query = atom({ plugin: 'snippets', key: 'query' } as const, '')
const cursor = atom({ plugin: 'snippets', key: 'cursor' } as const, 0)

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

async function snippetsDir($: EngineInterface): Promise<string> {
  const home = await $.env.get('HOME')
  if (!home) throw new Error('snippets: HOME is not set')
  return `${home}/.config/snippets`
}

function matching(snippets: Snippet[], text: string): Snippet[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  return snippets.filter(s => {
    const haystack = `${s.name} ${s.description} ${s.id}`.toLowerCase()
    return words.every(word => haystack.includes(word))
  })
}

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(other => other !== id) : [...ids, id]
}

/** All snippets, prepend group first, then append, each sorted by (order, name). */
async function loadSnippets($: EngineInterface): Promise<Snippet[]> {
  const dir = await snippetsDir($)
  if (!(await $.fs.exists(dir))) throw new Error(`snippets: snippet folder ${dir} does not exist`)

  const snippets: Snippet[] = []
  for (const entry of await $.fs.list(dir)) {
    if (!entry.name.toLowerCase().endsWith('.md')) continue
    snippets.push(parseSnippet(entry.name, await $.fs.read(`${dir}/${entry.name}`)))
  }
  const byOrder = (a: Snippet, b: Snippet) => a.order - b.order || a.name.localeCompare(b.name)
  return [
    ...snippets.filter(s => s.placement === 'prepend').sort(byOrder),
    ...snippets.filter(s => s.placement === 'append').sort(byOrder),
  ]
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'snippets',
      description: 'Toggle prompt snippets for your next message',
    })
    await update($, active, () => [])

    return next(e)
  })

  on('command.run', { command: 'snippets' }, async $ => {
    const snippets = await loadSnippets($)
    await update($, query, () => '')
    await update($, cursor, () => 0)
    await $.ui.open({
      id: PANE,
      title: 'snippets',
      focus: true,
      closeOnEscape: true,
      holdToasts: true,
      rows: snippets.length + 14,
    })

    return {}
  })

  // The search field keeps the keyboard. With it focused, Down asks to move the
  // ring to the first row and Up wraps it to the last: refuse the move and walk
  // the highlight instead, so typing always filters.
  on('ui.focus', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (e.origin.kind !== 'person' || e.element === undefined || e.element === 'search') return next(e)

    const rows = matching(await loadSnippets($), await read($, query))
    const step = e.element === rows[0]?.id ? 1 : e.element === rows[rows.length - 1]?.id ? -1 : 0
    if (rows.length > 1 && step !== 0) {
      await update($, cursor, at => (at + step + rows.length) % rows.length)
    }

    return { deny: 'snippets: the search field keeps the keyboard' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    // The mobile app draws no text field yet, and the menu is a search field.
    if (!('Input' in ui)) return <ui.Text>The snippets menu needs a keyboard.</ui.Text>
    const { Box, Button, Input, Text } = ui
    const snippets = await loadSnippets($)
    const toggled = await read($, active)
    const text = await read($, query)
    const rows = matching(snippets, text)
    const at = Math.min(await read($, cursor), Math.max(0, rows.length - 1))
    const highlighted = rows[at]

    if (snippets.length === 0) {
      return <Text dimColor>No snippets in {await snippetsDir($)}</Text>
    }

    const row = (s: Snippet) => (
      <Button key={s.id} plain onPress={() => update($, active, ids => toggle(ids, s.id))}>
        {s === highlighted ? '› ' : '  '}
        {toggled.includes(s.id) ? '[x] ' : '[ ] '}
        {s.name}
        {s.description ? <Text dimColor> — {s.description}</Text> : ''}
      </Button>
    )
    const prepends = rows.filter(s => s.placement === 'prepend')
    const appends = rows.filter(s => s.placement === 'append')

    return (
      <Box flexDirection="column">
        <Input
          key="search"
          autoFocus
          label="Search"
          placeholder="type to filter"
          submitLabel="toggle"
          value={text}
          onInput={async (value: string) => {
            await update($, query, () => value)
            await update($, cursor, () => 0)
          }}
          onSubmit={async () => {
            if (highlighted) await update($, active, ids => toggle(ids, highlighted.id))
            await update($, query, () => '')
            // The cleared search shows every snippet; stay on the one just toggled.
            await update($, cursor, () => Math.max(0, snippets.indexOf(highlighted as Snippet)))
          }}
        />
        <Text> </Text>
        {rows.length === 0 && <Text dimColor>No snippet matches "{text}"</Text>}
        {prepends.length > 0 && <Text color="suggestion">↑ PREPEND — added before your message</Text>}
        {prepends.map(row)}
        {prepends.length > 0 && appends.length > 0 && <Text> </Text>}
        {appends.length > 0 && <Text color="warning">↓ APPEND — added after your message</Text>}
        {appends.map(row)}
        <Text> </Text>
        <Text dimColor>type to filter · ↑↓ move · Enter toggle · Esc close</Text>
        {highlighted && (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>
              {highlighted.placement} · order {highlighted.order} · {highlighted.id}
            </Text>
            <Text>{highlighted.body}</Text>
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const ids = await read($, active)
    if (e.props.hasSurvey || ids.length === 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const chosen = (await loadSnippets($)).filter(s => ids.includes(s.id))
    const names = (placement: Snippet['placement']) =>
      chosen.filter(s => s.placement === placement).map(s => s.name).join(' · ')

    return (
      <Box flexDirection="column">
        {names('prepend') && <Text color="suggestion">↑ prepend: {names('prepend')}</Text>}
        {names('append') && <Text color="warning">↓ append: {names('append')}</Text>}
      </Box>
    )
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.origin.kind !== 'composer') return next(e)
    const ids = await read($, active)
    if (ids.length === 0) return next(e)

    // A toggled snippet whose file was deleted since is simply no longer on.
    const chosen = (await loadSnippets($)).filter(s => ids.includes(s.id))
    await update($, active, () => [])
    const bodies = (placement: Snippet['placement']) =>
      chosen.filter(s => s.placement === placement).map(s => s.body)

    return next({ ...e, text: [...bodies('prepend'), e.text, ...bodies('append')].join('\n\n') })
  })
}
