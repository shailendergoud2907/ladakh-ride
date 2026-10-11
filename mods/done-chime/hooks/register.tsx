import type { Register } from 'claude-code'

const MIN_MS = 30_000

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const out = await next(e)
    if (e.agentId === undefined && !e.isAborted && e.durationMs >= MIN_MS) {
      void $.ui.toast(`Done in ${Math.round(e.durationMs / 1000)} s.`)
      void $.audio.play({ asset: 'sounds/done.wav' }).catch(() => undefined)
    }

    return out
  })
}
