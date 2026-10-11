import { expect, mock, test } from 'claude-code/testing'

const props = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 30,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 29 },
  view: {},
} as never

const NOTHING = { type: 'Box', props: {}, children: [] } as never

for (const surface of ['terminal', 'desktop'] as const) {
  test(`shows the ride on ${surface} once usage is measured`, async ($, on) => {
    on('session.measure', (_$, e) => ({ changed: e.changed }) as never)
    await $.session.measure({
      context: { tokens: 100000, window: 200000, percent: 50 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 23 }],
      changed: ['context'],
    } as never)

    const ui = await $.ui.mount({ plugin: 'ladakh-ride', surface, component: 'AbovePrompt', props })
    const drawn = JSON.stringify(await ui.drawn())
    expect(drawn).toContain('50% of context used')
    expect(drawn).toContain('5-hour limit 23%')

    if (surface === 'desktop') {
      expect(await ui.find({ type: 'Svg' })).toBeDefined()
    } else {
      expect(await ui.find({ type: 'Text', text: /Khardung La/ })).toBeDefined()
    }
  })
}

test('waits at Leh before any usage and hides on press', async ($, on) => {
  on('ui.render', () => NOTHING)
  const ui = await $.ui.mount({ plugin: 'ladakh-ride', surface: 'desktop', component: 'AbovePrompt', props })
  expect(JSON.stringify(await ui.drawn())).toContain('Parked at Leh')
  expect(JSON.stringify(await ui.drawn())).toContain('parked on a mountain road')
  await ui.press({ key: 'hide' })
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
})

test('/focus shows the minutes left in the band and clears when done', async ($, on) => {
  const clock = mock.clock(on)
  on('command.run', () => ({ text: '' }) as never)
  on('ui.render', () => NOTHING)
  await $.command.run({ command: 'focus', args: '5' } as never)
  let ui = await $.ui.mount({ plugin: 'ladakh-ride', surface: 'desktop', component: 'AbovePrompt', props })
  expect(JSON.stringify(await ui.drawn())).toContain('Focus: 5 min left')
  await clock.advance(5 * 60_000 + 1000)
  ui = await $.ui.mount({ plugin: 'ladakh-ride', surface: 'desktop', component: 'AbovePrompt', props })
  expect(JSON.stringify(await ui.drawn())).not.toContain('Focus:')
})
