import { expect, test } from 'claude-code/testing'

test('/ladakh answers with a tip', async ($, on) => {
  on('command.run', () => ({ text: '' }) as never)
  const out = await $.command.run({ command: 'ladakh', args: '' } as never)
  expect(JSON.stringify(out)).toContain('Ladakh tip:')
})
