import type { Register } from 'claude-code'

const LEH_M = 3500
const KHARDUNG_LA_M = 5359

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const tokens = e.context.tokens ?? 0
    const percent =
      e.context.percent ?? (e.context.window > 0 ? (tokens / e.context.window) * 100 : 0)
    const p = Math.max(0, Math.min(100, Math.round(percent)))
    const metres = Math.round(LEH_M + ((KHARDUNG_LA_M - LEH_M) * p) / 100)
    void $.ui.status(
      `Leh to Khardung La ${p}% (${String(metres).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} m)`,
    )

    return next(e)
  })
}
