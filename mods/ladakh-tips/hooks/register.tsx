import type { Register } from 'claude-code'

const TIPS = [
  'Give yourself two full days in Leh (about 3,500 m) before going higher. Altitude sickness does not care how fit you are.',
  'Headache, nausea or poor sleep that gets worse as you climb: stop, rest and go down. Do not push over a pass to keep the schedule.',
  'Fill the tank in Leh before heading toward Nubra. Fuel stops are far apart and not always open.',
  'Start early. Streams on high roads swell in the afternoon melt and crossings get harder.',
  'Carry more water than you think you need. Dry air at altitude dehydrates you quietly.',
  'Pack layers. A road can go from sun to sleet in an hour near the passes.',
  'Ride slower than the road allows. Gravel patches and loose sand hide around blind corners.',
  'Keep stops at the top of a pass short. The air is thin and a few minutes is plenty for the photo.',
  'Check current road and permit rules with a local before you leave. They change with the season.',
]
let next = Math.floor(Math.random() * TIPS.length)

export const register: Register = on => {
  on('session.start', async ($, e, nextHook) => {
    await $.command.register({ name: 'ladakh', description: 'A Ladakh riding tip' })

    return nextHook(e)
  })

  on('command.run', { command: 'ladakh' }, async () => {
    const tip = TIPS[next % TIPS.length]
    next += 1

    return { text: `Ladakh tip: ${tip}` }
  })
}
