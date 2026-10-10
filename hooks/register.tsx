import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Ride } from '../types'

const ride = atom({ plugin: 'ladakh-ride', key: 'ride' } as const, null)
const isHidden = atom({ plugin: 'ladakh-ride', key: 'isHidden' } as const, false)

const LEH_M = 3500
const KHARDUNG_LA_M = 5359

const fmtK = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : `${n}`)
const fmtInt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

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

const INK = '#151a26'
const W = 720
const START_X = 44
const END_X = 676
const clamp = (n: number) => Math.max(0, Math.min(100, n))
const roadY = (x: number) => 142 - 7 * Math.sin((x / W) * Math.PI * 3)

const roadPath = (from: number, to: number) => {
  const pts: string[] = []
  for (let x = from; x <= to; x += 8) {
    pts.push(`${pts.length === 0 ? 'M' : 'L'}${x} ${roadY(x).toFixed(1)}`)
  }
  pts.push(`L${to} ${roadY(to).toFixed(1)}`)

  return pts.join(' ')
}

const flags = (n: number, sag: number) => {
  const colors = ['#2f6fd0', '#f4f4f4', '#d6403a', '#2f9e5a', '#f2c230']
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const t = 0.03 + (i * 0.94) / n
    const x = 2 * (1 - t) * t * 360 + t * t * W
    const y = (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * sag + t * t * 10
    const dur = (2 + (i % 3) * 0.45).toFixed(2)
    out.push(
      `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g>` +
        `<animateTransform attributeName="transform" type="skewX" values="0;-7;0;6;0" dur="${dur}s" repeatCount="indefinite"/>` +
        `<polygon points="0,0 11,0 5.5,15" fill="${colors[i % 5]}" stroke="${INK}" stroke-width="0.4"/></g></g>`,
    )
  }

  return out.join('')
}

// A solid side-view adventure motorcycle, facing right, ground at y=0.
// Local size is about 150 wide and 105 tall with a rider.
const bike = (o: { spin: boolean; rider: boolean; stand: boolean }) => {
  const wheel = (cx: number) => {
    let spokes = ''
    for (let a = 0; a < 180; a += 20) {
      const r = (a * Math.PI) / 180
      const dx = Math.cos(r) * 13
      const dy = Math.sin(r) * 13
      spokes += `<line x1="${(cx - dx).toFixed(1)}" y1="${(-18 - dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(-18 + dy).toFixed(1)}" stroke="#7b8391" stroke-width="0.9"/>`
    }
    const spin = o.spin
      ? `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} -18" to="360 ${cx} -18" dur="0.6s" repeatCount="indefinite"/>`
      : ''

    return (
      `<circle cx="${cx}" cy="-18" r="18" fill="#e9e4d8" fill-opacity="0.35" stroke="${INK}" stroke-width="5.5"/>` +
      `<circle cx="${cx}" cy="-18" r="13.2" fill="none" stroke="#aeb6c2" stroke-width="1.8"/>` +
      `<g>${spin}${spokes}</g>` +
      `<circle cx="${cx}" cy="-18" r="7.5" fill="none" stroke="#6f7886" stroke-width="1.2"/>` +
      `<circle cx="${cx}" cy="-18" r="3.4" fill="#c4cad3" stroke="${INK}" stroke-width="1.2"/>`
    )
  }

  const rider = o.rider
    ? // legs, torso, arms, helmet
      `<path d="M24 -56 L50 -46 L52 -28" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M24 -56 L50 -46 L52 -28" fill="none" stroke="#3a4a6a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="47" y="-30" width="15" height="6" rx="2.5" fill="${INK}"/>` +
      `<path d="M22 -58 L42 -92" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>` +
      `<path d="M22 -58 L42 -92" fill="none" stroke="#c85a2b" stroke-width="12" stroke-linecap="round"/>` +
      `<path d="M30 -64 L38 -76" fill="none" stroke="#e07a45" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M44 -90 L90 -76" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M44 -90 L90 -76" fill="none" stroke="#c85a2b" stroke-width="6" stroke-linecap="round"/>` +
      `<circle cx="91" cy="-76" r="3.6" fill="${INK}"/>` +
      `<circle cx="50" cy="-104" r="10" fill="#2a9d8f" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M54 -108 Q62 -106 60 -98 L53 -98 Z" fill="${INK}"/>` +
      `<path d="M44 -100 Q26 -98 14 -88" fill="none" stroke="#e3563f" stroke-width="4" stroke-linecap="round">` +
      (o.spin
        ? `<animate attributeName="d" values="M44 -100 Q26 -98 14 -88;M44 -100 Q26 -106 12 -98;M44 -100 Q26 -98 14 -88" dur="0.7s" repeatCount="indefinite"/>`
        : '') +
      `</path>`
    : ''

  const stand = o.stand
    ? `<path d="M30 -30 L18 0" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="18" cy="0.5" rx="5" ry="1.4" fill="${INK}"/>`
    : ''

  return (
    // headlight beam
    `<path d="M100 -62 L200 -90 L200 -34 Z" fill="url(#beam)"/>` +
    // rear shock and swingarm
    `<line x1="2" y1="-18" x2="38" y2="-30" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
    `<line x1="2" y1="-18" x2="38" y2="-30" stroke="#59606d" stroke-width="3" stroke-linecap="round"/>` +
    `<line x1="14" y1="-50" x2="22" y2="-28" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
    `<line x1="14" y1="-50" x2="22" y2="-28" stroke="#e08a2e" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="2.2 1.4"/>` +
    wheel(0) +
    wheel(80) +
    // engine
    `<rect x="36" y="-40" width="30" height="24" rx="4" fill="#3b4150" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M40 -33 H62 M40 -28 H62 M40 -23 H62" stroke="#59606d" stroke-width="1.6"/>` +
    `<rect x="42" y="-52" width="18" height="13" rx="2.5" fill="#4b5262" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M45 -48 H57 M45 -44 H57" stroke="#6c7587" stroke-width="1.4"/>` +
    `<circle cx="48" cy="-24" r="7.5" fill="#5d6677" stroke="${INK}" stroke-width="1.8"/>` +
    `<circle cx="48" cy="-24" r="3" fill="#8b94a3"/>` +
    // frame tubes
    `<path d="M70 -66 L50 -40 M70 -66 L40 -56 M14 -50 L2 -18" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>` +
    // exhaust
    `<path d="M58 -20 Q64 -12 56 -10" fill="none" stroke="#9aa2ae" stroke-width="3.2" stroke-linecap="round"/>` +
    `<rect x="6" y="-16" width="52" height="8" rx="4" fill="#d3d8df" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M10 -13 H54" stroke="#fff" stroke-width="1.4" opacity="0.8" stroke-linecap="round"/>` +
    `<circle cx="7" cy="-12" r="3.6" fill="#2b303c" stroke="${INK}" stroke-width="1.4"/>` +
    // seat and tail
    `<path d="M4 -52 Q22 -60 46 -54 L46 -47 L4 -47 Z" fill="#1b1e26" stroke="${INK}" stroke-width="1.8"/>` +
    `<rect x="-14" y="-42" width="14" height="9" rx="2" fill="#f6f2e6" stroke="${INK}" stroke-width="1.4"/>` +
    `<circle cx="-6" cy="-52" r="3.4" fill="#d9372e" stroke="${INK}" stroke-width="1.2"/>` +
    `<circle cx="-5" cy="-46" r="2.6" fill="#ffb347" stroke="${INK}" stroke-width="1"/>` +
    // luggage on rack
    `<line x1="-12" y1="-52" x2="32" y2="-52" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<rect x="-16" y="-80" width="54" height="28" rx="10" fill="#26334a" stroke="${INK}" stroke-width="2.2"/>` +
    `<path d="M-8 -75 H30" stroke="#41547a" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M-1 -80 V-52 M25 -80 V-52" stroke="#a9743a" stroke-width="3.4"/>` +
    `<circle cx="-1" cy="-66" r="1.6" fill="${INK}"/><circle cx="25" cy="-66" r="1.6" fill="${INK}"/>` +
    // fork, front fender
    `<line x1="94" y1="-70" x2="80" y2="-18" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>` +
    `<line x1="94" y1="-70" x2="80" y2="-18" stroke="#c4cad3" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M66 -34 Q80 -42 96 -28" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M66 -34 Q80 -42 96 -28" fill="none" stroke="#2f4a7a" stroke-width="3.6" stroke-linecap="round"/>` +
    // tank
    `<path d="M36 -68 Q56 -82 80 -66 Q84 -54 74 -48 L42 -48 Q32 -56 36 -68 Z" fill="#2f4a7a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<path d="M42 -68 Q58 -77 74 -66" fill="none" stroke="#7da0d8" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M40 -52 H70" stroke="#1f3558" stroke-width="2" stroke-linecap="round"/>` +
    rider +
    // windscreen, mirror, bars, lamp
    `<path d="M91 -74 Q99 -90 90 -106 Q85 -108 83 -103 Q88 -90 85 -73 Z" fill="#dff4ff" fill-opacity="0.78" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="M88 -98 Q91 -90 89 -80" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>` +
    `<line x1="88" y1="-80" x2="99" y2="-84" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` +
    `<line x1="93" y1="-82" x2="78" y2="-94" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="74" cy="-97" r="6.4" fill="#aebdd0" stroke="${INK}" stroke-width="1.8"/>` +
    `<circle cx="72.5" cy="-98.5" r="2" fill="#fff" opacity="0.7"/>` +
    `<circle cx="102" cy="-64" r="9.5" fill="#3b4150" stroke="${INK}" stroke-width="2"/>` +
    `<circle cx="104" cy="-64" r="7" fill="#f6e58d" stroke="${INK}" stroke-width="1.4"/>` +
    `<circle cx="105.5" cy="-65.5" r="2.6" fill="#fffbe0"/>` +
    `<circle cx="96" cy="-54" r="3" fill="#ffb347" stroke="${INK}" stroke-width="1.2"/>` +
    // footpeg
    `<line x1="44" y1="-20" x2="58" y2="-20" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>` +
    stand
  )
}

const sky = (p: number) =>
  `<defs>` +
  `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a6f86"/><stop offset="0.62" stop-color="#8fbab0"/><stop offset="1" stop-color="#f6c88f"/></linearGradient>` +
  `<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe0e6"/><stop offset="1" stop-color="#1b86a3"/></linearGradient>` +
  `<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3a8" stop-opacity="0.45"/><stop offset="1" stop-color="#fff3a8" stop-opacity="0"/></linearGradient>` +
  `</defs>` +
  `<rect width="${W}" height="400" fill="url(#sky)"/>` +
  `<circle cx="600" cy="${(40 + p * 0.45).toFixed(1)}" r="16" fill="#ffe0a0" opacity="0.95"/>`

// Two lit ranges: a bright face on the left of each peak, a shaded face on the right.
const range = (
  peaks: [number, number, number][],
  base: number,
  lit: string,
  shade: string,
  snow: string | null,
) => {
  let out = ''
  for (const [x, y, hw] of peaks) {
    out += `<polygon points="${x},${y} ${x - hw},${base} ${x + hw * 0.1},${base}" fill="${lit}"/>`
    out += `<polygon points="${x},${y} ${x + hw * 0.1},${base} ${x + hw},${base}" fill="${shade}"/>`
    if (snow) {
      const s = Math.min(hw * 0.32, 22)
      out += `<polygon points="${x},${y} ${x - s * 0.8},${y + s * 1.1} ${x - s * 0.3},${y + s * 0.9} ${x},${y + s * 1.5} ${x + s * 0.4},${y + s * 0.9} ${x + s * 0.9},${y + s}" fill="${snow}"/>`
    }
  }

  return out
}

const mountains = (base: number) =>
  range(
    [[70, 58, 70], [160, 36, 80], [275, 52, 78], [395, 26, 92], [520, 48, 82], [640, 40, 84], [720, 62, 70]],
    base,
    '#f2b97c',
    '#b7788a',
    '#fff4de',
  ) +
  range(
    [[20, 92, 60], [120, 84, 70], [230, 96, 70], [340, 80, 76], [455, 94, 72], [575, 82, 78], [690, 94, 66]],
    base,
    '#d98f6c',
    '#8a5a72',
    null,
  )

const stupa = (x: number, y: number) =>
  `<g><rect x="${x - 9}" y="${y - 7}" width="18" height="7" rx="1" fill="#f3ece0" stroke="${INK}" stroke-width="0.7"/>` +
  `<path d="M${x - 7} ${y - 7} Q${x} ${y - 25} ${x + 7} ${y - 7} Z" fill="#f7f2e8" stroke="${INK}" stroke-width="0.7"/>` +
  `<rect x="${x - 0.8}" y="${y - 28}" width="1.6" height="9" fill="#d9b45a"/><circle cx="${x}" cy="${y - 29}" r="1.8" fill="#d9b45a"/></g>`

const label = (x: number, y: number, size: number, anchor: string, text: string, fill = '#f3e4c8') =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" text-anchor="${anchor}" fill="${fill}" font-family="system-ui, sans-serif">${text}</text>`

const scene = (percent: number) => {
  const p = clamp(percent)
  const bx = START_X + (p / 100) * (END_X - START_X)
  const by = roadY(bx)
  const angle = (Math.atan2(roadY(bx + 5) - roadY(bx - 5), 10) * 180) / Math.PI
  const dusk = (p / 100) * 0.3
  const stones = [25, 50, 75]
    .map(pc => {
      const x = START_X + (pc / 100) * (END_X - START_X)
      return `<rect x="${x - 8}" y="150" width="16" height="11" rx="3" fill="#d8c9ac"/><text x="${x}" y="158.5" font-size="7" text-anchor="middle" fill="#4a3a2c" font-family="system-ui, sans-serif">${pc}%</text>`
    })
    .join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="168" viewBox="0 0 ${W} 168">` +
    sky(p) +
    mountains(112) +
    `<path d="M0 118 Q60 100 130 110 T250 106 T380 110 T520 102 T650 108 T720 104 L720 130 L0 130 Z" fill="#b08660"/>` +
    `<ellipse cx="360" cy="124" rx="250" ry="9" fill="url(#lake)"/>` +
    `<path d="M170 122 h60 M300 125 h80 M430 121 h70" stroke="#e8fbff" stroke-width="1" opacity="0.6"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="3s" repeatCount="indefinite"/></path>` +
    `<text x="250" y="126" font-size="7" letter-spacing="2" text-anchor="middle" fill="#e8fbff" opacity="0.85" font-family="system-ui, sans-serif">PANGONG TSO</text>` +
    `<path d="M0 130 Q120 124 240 129 T480 128 T720 130 L720 168 L0 168 Z" fill="#6b5240"/>` +
    stupa(18, 128) +
    `<rect width="${W}" height="168" fill="#e0663a" opacity="${dusk.toFixed(2)}"/>` +
    `<path d="${roadPath(START_X - 24, END_X + 24)}" fill="none" stroke="#4a3a2c" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${roadPath(START_X - 24, END_X + 24)}" fill="none" stroke="#3a3a40" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${roadPath(START_X, END_X)}" fill="none" stroke="#f2d36b" stroke-width="1.4" stroke-dasharray="8 8"/>` +
    (p > 0
      ? `<path d="${roadPath(START_X, Math.max(START_X + 1, Math.round(bx)))}" fill="none" stroke="#ffcf6a" stroke-width="3" stroke-linecap="round" opacity="0.9"/>`
      : '') +
    stones +
    label(START_X, 165, 9, 'middle', 'LEH 3,500 m') +
    label(END_X + 30, 165, 9, 'end', 'KHARDUNG LA 5,359 m') +
    `<path d="M0 8 Q360 34 720 10" fill="none" stroke="#3b2f25" stroke-width="1"/>` +
    flags(17, 34) +
    `<g transform="translate(${(bx - 20).toFixed(1)} ${by.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(0.72)">` +
    `<ellipse cx="50" cy="1" rx="62" ry="4" fill="#000" opacity="0.25"/>` +
    bike({ spin: true, rider: true, stand: false }) +
    `</g>` +
    `</svg>`
  )
}

// The welcome view: the bike parked with its stand down at the start of the road.
const starter = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="260" viewBox="0 0 ${W} 260">` +
  sky(0) +
  mountains(172) +
  `<path d="M0 176 Q80 156 170 168 T330 164 T500 170 T720 160 L720 196 L0 196 Z" fill="#b08660"/>` +
  `<ellipse cx="470" cy="184" rx="210" ry="11" fill="url(#lake)"/>` +
  `<text x="470" y="187" font-size="8" letter-spacing="3" text-anchor="middle" fill="#e8fbff" opacity="0.85" font-family="system-ui, sans-serif">PANGONG TSO</text>` +
  `<path d="M0 196 Q160 186 330 194 T720 190 L720 260 L0 260 Z" fill="#6b5240"/>` +
  `<path d="M-10 236 Q200 214 420 226 T740 216" fill="none" stroke="#4a3a2c" stroke-width="34" stroke-linecap="round"/>` +
  `<path d="M-10 236 Q200 214 420 226 T740 216" fill="none" stroke="#3a3a40" stroke-width="28" stroke-linecap="round"/>` +
  `<path d="M-10 236 Q200 214 420 226 T740 216" fill="none" stroke="#f2d36b" stroke-width="2" stroke-dasharray="12 12"/>` +
  `<g transform="translate(640 196) scale(1.5) translate(-640 -196)">` + stupa(640, 196) + `</g>` +
  `<path d="M0 10 Q360 52 720 14" fill="none" stroke="#3b2f25" stroke-width="1.2"/>` +
  flags(20, 52) +
  `<g transform="translate(150 232) scale(1.25)">` +
  `<ellipse cx="50" cy="1" rx="70" ry="5" fill="#000" opacity="0.28"/>` +
  bike({ spin: false, rider: false, stand: true }) +
  `</g>` +
  label(36, 252, 11, 'start', 'LEH 3,500 m') +
  label(690, 252, 11, 'end', 'KHARDUNG LA 5,359 m') +
  `</svg>`


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
    const reading = toRide(e.context, e.rateLimits)
    await update($, ride, () => reading)

    const band = reading.percent >= 90 ? 2 : reading.percent >= 75 ? 1 : 0
    if (band > lastBand) {
      $.ui.toast(
        band === 2
          ? `Khardung La is in sight: context ${reading.percent}% full. A fresh chat or /compact clears the road.`
          : `Past Pangong: context ${reading.percent}% full.`,
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
    const isFresh = state === null || state.tokens === 0
    const percent = state?.percent ?? 0
    const altitude = LEH_M + (percent / 100) * (KHARDUNG_LA_M - LEH_M)
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui

    const caption = isFresh
      ? 'Parked at Leh. Send a message and the ride begins.'
      : `Leh to Khardung La: ${percent}% of context used (${fmtK(state.tokens)} of ${fmtK(state.window)} tokens), about ${fmtInt(altitude)} m up` +
        (state.fiveHour === null ? '' : `. 5-hour limit ${Math.round(state.fiveHour)}%`)

    const picture =
      'Svg' in ui ? (
        <ui.Svg
          key="scene"
          source={isFresh ? starter() : scene(percent)}
          alt={
            isFresh
              ? 'A motorcycle parked on a mountain road at Leh, ready to ride to Khardung La'
              : `A motorcycle riding from Leh to Khardung La, ${percent} percent of the way`
          }
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
