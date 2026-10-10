import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Ride } from '../types'

const ride = atom({ plugin: 'ladakh-ride', key: 'ride' } as const, null)
const isHidden = atom({ plugin: 'ladakh-ride', key: 'isHidden' } as const, false)

const W = 720
const H = 168
const START_X = 44
const END_X = 676
const LEH_M = 3500
const KHARDUNG_LA_M = 5359

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const fmtK = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : `${n}`)
const fmtInt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const roadY = (x: number) => 142 - 7 * Math.sin((x / W) * Math.PI * 3)

const toRide = (
  context: { tokens?: number; window: number; percent?: number },
  rateLimits: { kind: string; percentUsed: number }[],
): Ride => {
  const tokens = context.tokens ?? 0
  const percent = clamp(
    context.percent ?? (context.window > 0 ? (tokens / context.window) * 100 : 0),
  )
  const five = rateLimits.find(r => r.kind === 'five_hour')

  return {
    percent: Math.round(percent),
    tokens,
    window: context.window,
    fiveHour: five ? five.percentUsed : null,
  }
}

const roadPath = (from: number, to: number) => {
  const pts: string[] = []
  for (let x = from; x <= to; x += 8) {
    pts.push(`${pts.length === 0 ? 'M' : 'L'}${x} ${roadY(x).toFixed(1)}`)
  }
  pts.push(`L${to} ${roadY(to).toFixed(1)}`)

  return pts.join(' ')
}

const flags = () => {
  const colors = ['#2f6fd0', '#f4f4f4', '#d6403a', '#2f9e5a', '#f2c230']
  const out: string[] = []
  for (let i = 0; i < 17; i++) {
    const t = 0.03 + i * 0.058
    const x = 2 * (1 - t) * t * 360 + t * t * W
    const y = (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * 34 + t * t * 10
    const dur = (2 + (i % 3) * 0.45).toFixed(2)
    out.push(
      `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g>` +
        `<animateTransform attributeName="transform" type="skewX" values="0;-7;0;6;0" dur="${dur}s" repeatCount="indefinite"/>` +
        `<polygon points="0,0 11,0 5.5,15" fill="${colors[i % 5]}" opacity="0.95"/></g></g>`,
    )
  }

  return out.join('')
}

const bike = (x: number, y: number, angle: number) => {
  const wheel = (cx: number) =>
    `<circle cx="${cx}" cy="-10" r="10" fill="#d8d3c8" fill-opacity="0.18" stroke="#1d1d20" stroke-width="3"/>` +
    `<g><animateTransform attributeName="transform" type="rotate" from="0 ${cx} -10" to="360 ${cx} -10" dur="0.55s" repeatCount="indefinite"/>` +
    `<line x1="${cx - 9}" y1="-10" x2="${cx + 9}" y2="-10" stroke="#8a8d93" stroke-width="1"/>` +
    `<line x1="${cx}" y1="-19" x2="${cx}" y2="-1" stroke="#8a8d93" stroke-width="1"/></g>`
  const dust = (delay: string) =>
    `<circle cx="-12" cy="-5" r="2" fill="#e3d2b0"><animate attributeName="cx" values="-10;-34" dur="1.1s" begin="${delay}" repeatCount="indefinite"/>` +
    `<animate attributeName="r" values="2;7" dur="1.1s" begin="${delay}" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0.7;0" dur="1.1s" begin="${delay}" repeatCount="indefinite"/></circle>`

  return (
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(1.3)">` +
    dust('0s') +
    dust('0.55s') +
    `<path d="M38 -29 L66 -37 L66 -21 Z" fill="#fff3a8" opacity="0.22"/>` +
    `<path d="M9 -8 L-9 -9" stroke="#c9ccd1" stroke-width="3.2" stroke-linecap="round"/>` +
    wheel(0) +
    wheel(34) +
    `<path d="M-10 -17 Q0 -24 10 -17" fill="none" stroke="#8b1a1a" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M24 -17 Q34 -25 44 -17" fill="none" stroke="#8b1a1a" stroke-width="2.5" stroke-linecap="round"/>` +
    `<rect x="12" y="-18" width="11" height="9" rx="2" fill="#6c7078"/>` +
    `<rect x="14" y="-24" width="7" height="6" rx="1" fill="#8d9199"/>` +
    `<path d="M0 -10 L10 -22 L26 -24 L31 -30" fill="none" stroke="#2b2b2f" stroke-width="2" stroke-linejoin="round"/>` +
    `<line x1="34" y1="-10" x2="30" y2="-31" stroke="#b9bcc2" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M-9 -38 h16 a2.5 2.5 0 0 1 0 5 h-16 a2.5 2.5 0 0 1 0 -5 Z" fill="#3e6b7a" stroke="#27444f" stroke-width="0.8"/>` +
    `<rect x="-8" y="-32" width="14" height="8" rx="2" fill="#a9743a" stroke="#5b3b1b" stroke-width="0.8"/>` +
    `<line x1="-1" y1="-32" x2="-1" y2="-24" stroke="#5b3b1b" stroke-width="1"/>` +
    `<path d="M-2 -25 Q4 -30 11 -26 L10 -22 L-2 -22 Z" fill="#2b2118"/>` +
    `<path d="M11 -26 Q18 -36 29 -30 Q28 -23 20 -22 Z" fill="#8b1a1a" stroke="#d9b45a" stroke-width="0.9"/>` +
    `<path d="M29 -33 L36 -36" stroke="#1d1d20" stroke-width="2.6" stroke-linecap="round"/>` +
    `<circle cx="36" cy="-29" r="3.6" fill="#f6e58d" stroke="#b9bcc2" stroke-width="1.2"/>` +
    `<path d="M6 -24 L16 -19 L22 -12" fill="none" stroke="#2f3b52" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M5 -26 L9 -42" fill="none" stroke="#c0562b" stroke-width="6.5" stroke-linecap="round"/>` +
    `<path d="M9 -40 L27 -34 L32 -34" fill="none" stroke="#c0562b" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="11" cy="-49" r="6.2" fill="#f2c14e" stroke="#9a6d12" stroke-width="0.8"/>` +
    `<path d="M14.5 -51 L19 -49 L14.5 -45.5 Z" fill="#1b2a4a"/>` +
    `<path d="M5 -45 Q-5 -45 -12 -41" fill="none" stroke="#d94a38" stroke-width="2.6" stroke-linecap="round">` +
    `<animate attributeName="d" values="M5 -45 Q-5 -45 -12 -41;M5 -45 Q-5 -50 -13 -46;M5 -45 Q-5 -45 -12 -41" dur="0.7s" repeatCount="indefinite"/></path>` +
    `</g>`
  )
}

const scene = (percent: number) => {
  const p = clamp(percent)
  const bx = START_X + (p / 100) * (END_X - START_X)
  const by = roadY(bx)
  const angle = (Math.atan2(roadY(bx + 5) - roadY(bx - 5), 10) * 180) / Math.PI
  const sunY = 38 + p * 0.45
  const dusk = (p / 100) * 0.3
  const peaks: [number, number][] = [[60, 56], [150, 40], [270, 52], [400, 34], [540, 50], [660, 46]]
  const snow = peaks
    .map(([x, y]) => `<polygon points="${x},${y} ${x - 16},${y + 10} ${x - 8},${y + 8} ${x - 3},${y + 13} ${x + 3},${y + 8} ${x + 9},${y + 12} ${x + 16},${y + 10}" fill="#f6f8fb"/>`)
    .join('')
  const stones = [25, 50, 75]
    .map(pc => {
      const x = START_X + (pc / 100) * (END_X - START_X)
      return `<rect x="${x - 8}" y="150" width="16" height="11" rx="3" fill="#d8c9ac"/><text x="${x}" y="158.5" font-size="7" text-anchor="middle" fill="#4a3a2c" font-family="system-ui, sans-serif">${pc}%</text>`
    })
    .join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f3763"/><stop offset="0.6" stop-color="#6f8cc0"/><stop offset="1" stop-color="#f1bd82"/></linearGradient>` +
    `<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd6df"/><stop offset="1" stop-color="#1b86a3"/></linearGradient>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    `<circle cx="610" cy="${sunY.toFixed(1)}" r="15" fill="#ffd98a" opacity="0.92"/>` +
    `<path d="M0 108 L60 56 L100 82 L150 40 L210 84 L270 52 L335 88 L400 34 L470 84 L540 50 L600 90 L660 46 L720 86 L720 112 L0 112 Z" fill="#7f93b5"/>` +
    snow +
    `<path d="M0 118 Q60 90 130 104 T250 100 T380 106 T520 96 T650 104 T720 98 L720 130 L0 130 Z" fill="#a7825a"/>` +
    `<path d="M0 126 Q90 106 200 116 T420 112 T620 116 T720 110 L720 134 L0 134 Z" fill="#8e6a47"/>` +
    `<ellipse cx="360" cy="124" rx="250" ry="9" fill="url(#lake)"/>` +
    `<path d="M170 122 h60 M300 125 h80 M430 121 h70" stroke="#e8fbff" stroke-width="1" opacity="0.6"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="3s" repeatCount="indefinite"/></path>` +
    `<path d="M0 130 Q120 124 240 129 T480 128 T720 130 L720 ${H} L0 ${H} Z" fill="#6b5240"/>` +
    `<text x="360" y="126" font-size="7" letter-spacing="2" text-anchor="middle" fill="#e8fbff" opacity="0.85" font-family="system-ui, sans-serif">PANGONG TSO</text>` +
    `<g><rect x="9" y="121" width="18" height="7" rx="1" fill="#f3ece0"/><path d="M11 121 Q18 103 25 121 Z" fill="#f7f2e8" stroke="#d6c9b0" stroke-width="0.6"/><rect x="17.2" y="100" width="1.6" height="9" fill="#d9b45a"/><circle cx="18" cy="99" r="1.8" fill="#d9b45a"/></g>` +
    `<rect width="${W}" height="${H}" fill="#e0663a" opacity="${dusk.toFixed(2)}"/>` +
    `<path d="${roadPath(START_X - 24, END_X + 24)}" fill="none" stroke="#4a3a2c" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${roadPath(START_X - 24, END_X + 24)}" fill="none" stroke="#3a3a40" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${roadPath(START_X, END_X)}" fill="none" stroke="#f2d36b" stroke-width="1.4" stroke-dasharray="8 8"/>` +
    (p > 0
      ? `<path d="${roadPath(START_X, Math.max(START_X + 1, Math.round(bx)))}" fill="none" stroke="#ffcf6a" stroke-width="3" stroke-linecap="round" opacity="0.9"/>`
      : '') +
    stones +
    `<text x="${START_X}" y="${H - 3}" font-size="9" font-weight="700" text-anchor="middle" fill="#f3e4c8" font-family="system-ui, sans-serif">LEH 3,500 m</text>` +
    `<text x="${END_X + 30}" y="${H - 3}" font-size="9" font-weight="700" text-anchor="end" fill="#f3e4c8" font-family="system-ui, sans-serif">KHARDUNG LA 5,359 m</text>` +
    `<path d="M0 8 Q360 34 720 10" fill="none" stroke="#3b2f25" stroke-width="1"/>` +
    flags() +
    bike(bx, by, angle) +
    `</svg>`
  )
}

export const register: Register = on => {
  let lastBand = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ride',
      description: 'Show or hide the Ladakh ride above the prompt',
    })

    try {
      const usage = await $.session.usage()
      await update($, ride, () => toRide(usage.context, usage.rateLimits))
    } catch {
      // No reading yet: the bike waits at Leh until the first response.
    }

    return next(e)
  })

  on('command.run', { command: 'ride' }, async $ => {
    const wasHidden = await read($, isHidden)
    await update($, isHidden, () => !wasHidden)

    return {
      text: wasHidden ? 'The ride is back above your prompt.' : 'Ride hidden. Type /ride to bring it back.',
    }
  })

  on('session.measure', async ($, e, next) => {
    const next_ = toRide(e.context, e.rateLimits)
    await update($, ride, () => next_)

    const band = next_.percent >= 90 ? 2 : next_.percent >= 75 ? 1 : 0
    if (band > lastBand) {
      $.ui.toast(
        band === 2
          ? `Khardung La is in sight: context ${next_.percent}% full. A fresh chat or /compact clears the road.`
          : `Past Pangong: context ${next_.percent}% full.`,
      )
    }
    lastBand = band

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) {
      return next(e)
    }

    const state = await read($, ride)
    const percent = state?.percent ?? 0
    const altitude = LEH_M + (percent / 100) * (KHARDUNG_LA_M - LEH_M)
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui

    const caption =
      state === null || state.tokens === 0
        ? 'Waiting at Leh. Send a message and the ride begins.'
        : `Leh to Khardung La: ${percent}% of context used (${fmtK(state.tokens)} of ${fmtK(state.window)} tokens), about ${fmtInt(altitude)} m up` +
          (state.fiveHour === null ? '' : `. 5-hour limit ${Math.round(state.fiveHour)}%`)

    const picture =
      'Svg' in ui ? (
        <ui.Svg
          key="scene"
          source={scene(percent)}
          alt={`A Royal Enfield riding the road from Leh to Khardung La, ${percent} percent of the way`}
          isInteractive
        />
      ) : (
        <Text key="track">
          {`Leh ${'-'.repeat(Math.round((percent / 100) * 36))}[RE]${'-'.repeat(36 - Math.round((percent / 100) * 36))} Khardung La`}
        </Text>
      )

    return (
      <Box flexDirection="column">
        {picture}
        <Box>
          <Text dimColor>{caption} </Text>
          <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
        </Box>
      </Box>
    )
  })
}
