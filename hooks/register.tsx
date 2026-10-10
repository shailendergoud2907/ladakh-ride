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
// About 160 wide and 125 tall with the rider.
const bike = (o: { spin: boolean; rider: boolean }) => {
  const wheel = (cx: number, r: number) => {
    const cy = -r
    let spokes = ''
    for (let a = 0; a < 180; a += 18) {
      const t = (a * Math.PI) / 180
      const dx = Math.cos(t) * (r - 5)
      const dy = Math.sin(t) * (r - 5)
      spokes += `<line x1="${(cx - dx).toFixed(1)}" y1="${(cy - dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy + dy).toFixed(1)}" stroke="#7b8391" stroke-width="0.9"/>`
    }
    const spin = o.spin
      ? `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="0.5s" repeatCount="indefinite"/>`
      : ''

    return (
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#e9e4d8" fill-opacity="0.35" stroke="${INK}" stroke-width="6"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="none" stroke="#b4bcc8" stroke-width="2"/>` +
      `<g>${spin}${spokes}<circle cx="${cx + r - 8}" cy="${cy}" r="1.6" fill="${INK}"/></g>` +
      `<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="#6f7886" stroke-width="1.4"/>` +
      `<circle cx="${cx}" cy="${cy}" r="3.6" fill="#c4cad3" stroke="${INK}" stroke-width="1.2"/>`
    )
  }

  const rider = o.rider
    ? `<path d="M22 -62 L56 -52 L58 -26" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M22 -62 L56 -52 L58 -26" fill="none" stroke="#3a4a6a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="53" y="-29" width="17" height="7" rx="3" fill="${INK}"/>` +
      `<path d="M22 -64 L50 -102" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>` +
      `<path d="M22 -64 L50 -102" fill="none" stroke="#c85a2b" stroke-width="14" stroke-linecap="round"/>` +
      `<path d="M31 -70 L40 -84" fill="none" stroke="#e07a45" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M52 -100 L100 -88 L109 -87" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M52 -100 L100 -88 L109 -87" fill="none" stroke="#c85a2b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="110" cy="-87" r="4" fill="${INK}"/>` +
      `<circle cx="57" cy="-116" r="11" fill="#2a9d8f" stroke="${INK}" stroke-width="2.2"/>` +
      `<path d="M61 -121 Q70 -119 68 -110 L60 -110 Z" fill="${INK}"/>` +
      `<path d="M50 -112 Q32 -110 18 -98" fill="none" stroke="#e3563f" stroke-width="4.4" stroke-linecap="round">` +
      (o.spin
        ? `<animate attributeName="d" values="M50 -112 Q32 -110 18 -98;M50 -112 Q32 -120 14 -110;M50 -112 Q32 -110 18 -98" dur="0.6s" repeatCount="indefinite"/>`
        : '') +
      `</path>`
    : ''

  return (
    // headlight beam
    `<path d="M118 -70 L215 -98 L215 -42 Z" fill="url(#beam)"/>` +
    // swingarm, rear shock
    `<line x1="0" y1="-18" x2="46" y2="-28" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
    `<line x1="0" y1="-18" x2="46" y2="-28" stroke="#59606d" stroke-width="3.4" stroke-linecap="round"/>` +
    `<line x1="12" y1="-56" x2="22" y2="-30" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
    `<line x1="12" y1="-56" x2="22" y2="-30" stroke="#e08a2e" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="2.4 1.5"/>` +
    wheel(0, 18) +
    wheel(88, 20) +
    // engine
    `<rect x="40" y="-48" width="34" height="27" rx="5" fill="#3b4150" stroke="${INK}" stroke-width="2.2"/>` +
    `<path d="M45 -40 H69 M45 -34 H69 M45 -28 H69" stroke="#59606d" stroke-width="1.8"/>` +
    `<rect x="46" y="-62" width="22" height="15" rx="3" fill="#4b5262" stroke="${INK}" stroke-width="2.2"/>` +
    `<path d="M49 -57 H65 M49 -52 H65" stroke="#6c7587" stroke-width="1.5"/>` +
    `<circle cx="54" cy="-28" r="8.5" fill="#5d6677" stroke="${INK}" stroke-width="2"/>` +
    `<circle cx="54" cy="-28" r="3.4" fill="#8b94a3"/>` +
    // frame tubes
    `<path d="M96 -72 L56 -48 M96 -72 L44 -62 M12 -56 L0 -18" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` +
    // crash guard
    `<path d="M44 -58 Q30 -40 44 -22 L74 -22" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M44 -58 Q30 -40 44 -22 L74 -22" fill="none" stroke="#cfd5de" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
    // exhaust
    `<path d="M66 -20 Q74 -12 62 -10" fill="none" stroke="#9aa2ae" stroke-width="3.6" stroke-linecap="round"/>` +
    `<rect x="4" y="-18" width="60" height="9" rx="4.5" fill="#d9dde4" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M10 -15 H58" stroke="#fff" stroke-width="1.5" opacity="0.85" stroke-linecap="round"/>` +
    `<path d="M40 -18 V-9 M46 -18 V-9" stroke="#8f98a6" stroke-width="1.4"/>` +
    `<circle cx="5" cy="-13.5" r="4" fill="#2b303c" stroke="${INK}" stroke-width="1.4"/>` +
    // seat, tail
    `<path d="M2 -62 Q28 -70 54 -62 L54 -54 L2 -54 Z" fill="#1b1e26" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="-16" y="-46" width="15" height="10" rx="2" fill="#f6f2e6" stroke="${INK}" stroke-width="1.5"/>` +
    `<circle cx="-8" cy="-58" r="3.6" fill="#d9372e" stroke="${INK}" stroke-width="1.3"/>` +
    `<circle cx="-7" cy="-51" r="2.8" fill="#ffb347" stroke="${INK}" stroke-width="1"/>` +
    // rack and duffel
    `<line x1="-14" y1="-58" x2="34" y2="-58" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>` +
    `<rect x="-18" y="-90" width="58" height="32" rx="11" fill="#26334a" stroke="${INK}" stroke-width="2.4"/>` +
    `<path d="M-9 -84 H32" stroke="#41547a" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M-2 -90 V-58 M26 -90 V-58" stroke="#a9743a" stroke-width="3.8"/>` +
    `<rect x="-5" y="-76" width="6" height="5" rx="1" fill="#d9b45a" stroke="${INK}" stroke-width="0.8"/>` +
    `<rect x="23" y="-76" width="6" height="5" rx="1" fill="#d9b45a" stroke="${INK}" stroke-width="0.8"/>` +
    // fork, beak fender
    `<line x1="98" y1="-78" x2="88" y2="-20" stroke="${INK}" stroke-width="7.4" stroke-linecap="round"/>` +
    `<line x1="98" y1="-78" x2="88" y2="-20" stroke="#c4cad3" stroke-width="4" stroke-linecap="round"/>` +
    `<line x1="92" y1="-50" x2="88" y2="-24" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>` +
    `<path d="M70 -38 Q88 -52 112 -34" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M70 -38 Q88 -52 112 -34" fill="none" stroke="#2f4a7a" stroke-width="4" stroke-linecap="round"/>` +
    // tank and side plates
    `<path d="M38 -82 Q64 -98 98 -78 Q102 -62 90 -56 L46 -56 Q32 -64 38 -82 Z" fill="#2f4a7a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<path d="M44 -82 Q62 -92 88 -80" fill="none" stroke="#7da0d8" stroke-width="2.8" stroke-linecap="round"/>` +
    `<path d="M46 -70 Q66 -78 92 -68 L88 -60 L50 -60 Z" fill="#c4cad3" stroke="${INK}" stroke-width="1.6"/>` +
    `<circle cx="64" cy="-90" r="3.4" fill="#59606d" stroke="${INK}" stroke-width="1.2"/>` +
    rider +
    // windscreen, mirror, bars, lamp
    `<path d="M104 -84 Q114 -102 104 -122 Q98 -124 96 -118 Q102 -102 98 -82 Z" fill="#dff4ff" fill-opacity="0.8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M101 -112 Q104 -102 102 -92" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>` +
    `<line x1="98" y1="-86" x2="111" y2="-90" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<line x1="104" y1="-88" x2="86" y2="-104" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<circle cx="82" cy="-108" r="7" fill="#aebdd0" stroke="${INK}" stroke-width="2"/>` +
    `<circle cx="80" cy="-110" r="2.2" fill="#fff" opacity="0.7"/>` +
    `<circle cx="116" cy="-72" r="11" fill="#3b4150" stroke="${INK}" stroke-width="2.2"/>` +
    `<circle cx="118.5" cy="-72" r="8" fill="#f6e58d" stroke="${INK}" stroke-width="1.5"/>` +
    `<circle cx="120.5" cy="-73.5" r="2.8" fill="#fffbe0"/>` +
    `<circle cx="110" cy="-60" r="3.2" fill="#ffb347" stroke="${INK}" stroke-width="1.2"/>` +
    // footpeg
    `<line x1="48" y1="-20" x2="64" y2="-20" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`
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

const bob = (amp: number, dur: number) =>
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${-amp};0 0;0 ${-amp / 2};0 0" dur="${dur}s" repeatCount="indefinite"/>`

const dust = (x: number) =>
  [0, 1, 2]
    .map(
      i =>
        `<circle cx="${x}" cy="-4" r="${3 + i}" fill="#e8d5b5" opacity="0">` +
        `<animate attributeName="cx" values="${x};${x - 36 - i * 8}" dur="0.9s" begin="${i * 0.3}s" repeatCount="indefinite"/>` +
        `<animate attributeName="cy" values="-4;${-12 - i * 4}" dur="0.9s" begin="${i * 0.3}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="0.7;0" dur="0.9s" begin="${i * 0.3}s" repeatCount="indefinite"/></circle>`,
    )
    .join('')

const road = (y: number, w: number, dashW: number) =>
  `<rect x="-10" y="${y - w / 2 - 3}" width="${W + 20}" height="${w + 6}" fill="#4a3a2c"/>` +
  `<rect x="-10" y="${y - w / 2}" width="${W + 20}" height="${w}" fill="#3a3a40"/>` +
  `<line x1="-40" y1="${y}" x2="${W + 40}" y2="${y}" stroke="#f2d36b" stroke-width="${dashW}" stroke-dasharray="18 14">` +
  `<animate attributeName="stroke-dashoffset" from="0" to="32" dur="0.5s" repeatCount="indefinite"/></line>`

// Compact band above the prompt box. The bike rides in place (road scrolls, wheels spin, body bobs)
// and its position along the road shows context used.
const scene = (percent: number) => {
  const p = clamp(percent)
  const bx = 70 + (p / 100) * (END_X - 70 - 90)
  const dusk = (p / 100) * 0.3

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="120" viewBox="0 0 ${W} 120">` +
    sky(p) +
    `<g transform="translate(0 3) scale(1 0.6)">` + mountains(112) + `</g>` +
    `<rect width="${W}" height="120" fill="#e0663a" opacity="${dusk.toFixed(2)}"/>` +
    `<rect y="68" width="${W}" height="52" fill="#6b5240"/>` +
    road(100, 26, 2) +
    `<path d="M0 20 Q360 42 720 22" fill="none" stroke="#3b2f25" stroke-width="1"/>` +
    flags(15, 40).replace(/translate\(([\d.]+) ([\d.]+)\)/g, (_m, x, y) => `translate(${x} ${(+y * 0.55 + 4).toFixed(1)})`) +
    label(START_X, 116, 8, 'middle', 'LEH') +
    label(END_X, 116, 8, 'end', 'KHARDUNG LA') +
    `<g transform="translate(${bx.toFixed(1)} 104) scale(0.62)">` +
    `<ellipse cx="50" cy="1" rx="66" ry="4" fill="#000" opacity="0.3"/>` +
    `<g>${bob(1.6, 0.4)}` + bike({ spin: true, rider: true }) + dust(-18) + `</g>` +
    `</g>` +
    `</svg>`
  )
}

// The welcome view: bigger, the bike rides across the whole width on a loop.
const starter = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="230" viewBox="0 0 ${W} 230">` +
  sky(0) +
  `<g transform="translate(0 6)">` + mountains(150) + `</g>` +
  `<path d="M0 156 Q80 138 170 148 T330 144 T500 150 T720 142 L720 230 L0 230 Z" fill="#b08660"/>` +
  `<rect y="170" width="${W}" height="60" fill="#6b5240"/>` +
  road(196, 44, 3) +
  `<g transform="translate(640 160) scale(1.4) translate(-640 -160)">` + stupa(640, 160) + `</g>` +
  `<path d="M0 10 Q360 52 720 14" fill="none" stroke="#3b2f25" stroke-width="1.2"/>` +
  flags(20, 52) +
  `<g><animateTransform attributeName="transform" type="translate" from="-230 0" to="760 0" dur="9s" repeatCount="indefinite"/>` +
  `<g transform="translate(0 206) scale(1.15)">` +
  `<ellipse cx="50" cy="1" rx="70" ry="5" fill="#000" opacity="0.3"/>` +
  `<g>${bob(2, 0.4)}` + bike({ spin: true, rider: true }) + dust(-18) + `</g>` +
  `</g></g>` +
  label(14, 224, 10, 'start', 'LEH 3,500 m') +
  label(706, 224, 10, 'end', 'KHARDUNG LA 5,359 m') +
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
