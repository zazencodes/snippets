import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

const DIR = '/home/me/.config/snippets'
const FILES: Record<string, string> = {
  'orient.md': '---\nname: Orient\ndescription: Look around first\nplacement: prepend\norder: 10\n---\nGet oriented first.\n',
  'verify.md': '---\nname: Verify\nplacement: append\norder: 20\n---\nVerify, do not assume.\n',
  'ask.md': '---\nname: Ask\norder: 10\n---\nAsk before acting.\n',
}

const PANE = {
  plugin: 'snippets',
  component: 'Pane',
  requestId: 'snippets',
  props: {
    title: 'snippets',
    isFocused: true,
    bodyColumns: 80,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const BAND = {
  plugin: 'snippets',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

const SUBMIT = { text: 'Fix the login bug', wait: false, origin: { kind: 'composer' } } as const

function engine(on: Parameters<TestBody>[1], files = FILES) {
  on('env.get', () => ({ value: '/home/me' }))
  on('fs.exists', (_, e) => ({ value: e.path === DIR }))
  on('fs.list', () => ({
    value: Object.keys(files).map(name => ({ name, kind: 'file', size: 1, mtimeMs: 0, isLink: false })),
  }))
  on('fs.read', (_, e) => ({ value: files[e.path.slice(DIR.length + 1)] ?? '' }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
}

test('toggled snippets wrap the next message in order, then reset', async ($, on) => {
  engine(on)
  const menu = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await menu.press({ key: 'verify.md' })
  await menu.press({ key: 'ask.md' })
  await menu.press({ key: 'orient.md' })
  expect((await menu.find({ key: 'orient.md' }))?.text).toContain('[x] Orient')
  await menu.unmount()

  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await band.find({ type: 'Text', text: /prepend/ }))?.text).toBe('↑ prepend: Orient')
  expect((await band.find({ type: 'Text', text: /append/ }))?.text).toBe('↓ append: Ask · Verify')
  await band.unmount()

  const sent = await $.prompt.submit(SUBMIT)
  expect('text' in sent && sent.text).toBe(
    'Get oriented first.\n\nFix the login bug\n\nAsk before acting.\n\nVerify, do not assume.',
  )

  const again = await $.prompt.submit(SUBMIT)
  expect('text' in again && again.text).toBe('Fix the login bug')
})

test('pressing a snippet twice turns it off', async ($, on) => {
  engine(on)
  const menu = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await menu.press({ key: 'verify.md' })
  await menu.press({ key: 'verify.md' })
  expect((await menu.find({ key: 'verify.md' }))?.text).toContain('[ ] Verify')
  await menu.unmount()

  const sent = await $.prompt.submit(SUBMIT)
  expect('text' in sent && sent.text).toBe('Fix the login bug')
})

test('a prompt that is not typed by the person keeps the toggles', async ($, on) => {
  engine(on)
  const menu = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await menu.press({ key: 'verify.md' })
  await menu.unmount()

  const notified = await $.prompt.submit({ ...SUBMIT, origin: { kind: 'task-notification' } })
  expect('text' in notified && notified.text).toBe('Fix the login bug')

  const sent = await $.prompt.submit(SUBMIT)
  expect('text' in sent && sent.text).toBe('Fix the login bug\n\nVerify, do not assume.')
})

test('typing filters the menu, Enter toggles the top match and clears the search', async ($, on) => {
  engine(on)
  const menu = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await menu.input({ key: 'search', text: 'ver', kind: 'change' })
  expect(await menu.find({ key: 'verify.md' })).toBeDefined()
  expect(await menu.find({ key: 'ask.md' })).toBeUndefined()

  await menu.input({ key: 'search', text: 'ver' })
  expect(await menu.find({ key: 'ask.md' })).toBeDefined()
  expect((await menu.find({ key: 'verify.md' }))?.text).toContain('› [x] Verify')
  await menu.unmount()

  const sent = await $.prompt.submit(SUBMIT)
  expect('text' in sent && sent.text).toBe('Fix the login bug\n\nVerify, do not assume.')
})

test('a search with no match toggles nothing', async ($, on) => {
  engine(on)
  const menu = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await menu.input({ key: 'search', text: 'zzz', kind: 'change' })
  expect((await menu.find({ type: 'Text', text: /No snippet matches/ }))?.text).toBe('No snippet matches "zzz"')
  await menu.input({ key: 'search', text: 'zzz' })
  await menu.unmount()

  const sent = await $.prompt.submit(SUBMIT)
  expect('text' in sent && sent.text).toBe('Fix the login bug')
})

test('a snippet with a bad placement stops the menu from drawing', async ($, on) => {
  engine(on, { 'bad.md': '---\nplacement: middle\n---\nHi.\n' })
  // The hook throws "snippets: bad.md has placement ..."; the engine skips it and
  // names that reason in the transcript, so nothing is left to draw the pane.
  await expect($.ui.mount({ ...PANE, surface: 'terminal' })).rejects.toThrow()
})
