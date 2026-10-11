import type { Register } from 'claude-code'

type Timer = { cancel: () => void }

export const register: Register = on => {
  let tick: Timer | null = null
  let done: Timer | null = null

  const stop = () => {
    tick?.cancel()
    done?.cancel()
    tick = null
    done = null
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'focus',
      description: '/focus 25 starts a focus timer, /focus stop cancels it',
    })

    return next(e)
  })

  on('command.run', { command: 'focus' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'stop') {
      stop()
      void $.ui.status(undefined)

      return { text: 'Focus timer stopped.' }
    }

    const minutes = arg === '' ? 25 : Number(arg)
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      return { text: 'Use /focus 25 (minutes, 1 to 240) or /focus stop.' }
    }

    stop()
    const endsAt = (await $.clock.now()) + minutes * 60_000
    const show = async () => {
      const left = Math.max(0, Math.ceil((endsAt - (await $.clock.now())) / 60_000))
      void $.ui.status(`Focus: ${left} min left`)
    }
    await show()
    tick = $.clock.every(30_000, () => void show())
    done = $.clock.after(minutes * 60_000, () => {
      stop()
      void $.ui.status(undefined)
      void $.ui.toast(`Focus block done (${minutes} min). Take a break.`, { timeoutMs: 15_000 })
    })

    return { text: `Focus timer set for ${minutes} min.` }
  })
}
