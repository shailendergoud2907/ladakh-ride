import { expect, test } from 'claude-code/testing'

test('blocks rm -rf on home, passes ordinary commands', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }) as never)
  const bad = await $.tool.call({ tool: 'Bash', command: 'rm -rf ~' } as never)
  console.log(JSON.stringify(bad)); expect(JSON.stringify(bad)).toContain('blocked')
  const fine = await $.tool.call({ tool: 'Bash', command: 'ls -la' } as never)
  expect((fine as { isError?: boolean }).isError).not.toBe(true)
})
