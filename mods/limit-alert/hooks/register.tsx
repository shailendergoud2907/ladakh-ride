import type { Register } from 'claude-code'

export const register: Register = on => {
  let warned = 0

  on('session.measure', async ($, e, next) => {
    const five = e.rateLimits.find(r => r.kind === 'five_hour')
    const used = five ? five.percentUsed : 0
    if (used < 70) warned = 0
    if (used >= 95 && warned < 95) {
      warned = 95
      void $.ui.toast(`5-hour limit at ${Math.round(used)}%. Almost out, wrap up or switch to a lighter task.`, { timeoutMs: 10_000 })
    } else if (used >= 80 && warned < 80) {
      warned = 80
      void $.ui.toast(`5-hour limit at ${Math.round(used)}%. Plan to wrap up soon.`, { timeoutMs: 8_000 })
    }

    return next(e)
  })
}
