import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Ride } from '../types'

const ride = atom({ plugin: 'ladakh-ride', key: 'ride' } as const, null)
const isHidden = atom({ plugin: 'ladakh-ride', key: 'isHidden' } as const, false)
const isHappy = atom({ plugin: 'ladakh-ride', key: 'isHappy' } as const, false)
const focusLeft = atom({ plugin: 'ladakh-ride', key: 'focusLeft' } as const, null)

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

type Mood = 'idle' | 'working' | 'happy'

const GREEN = '#2f6b45'
const GREEN_HI = '#5aa174'
const CHROME = '#d5dae2'
const SKIN = '#f1c9a0'

// A chibi rider on a classic green roadster, facing right, tyres on y=0. About 150 wide, 135 tall.
const rider = (mood: Mood, isRolling: boolean) => {
  const wheel = (cx: number) => {
    const cy = -24
    let spokes = ''
    for (let a = 0; a < 180; a += 20) {
      const t = (a * Math.PI) / 180
      spokes += `<line x1="${(cx - Math.cos(t) * 17).toFixed(1)}" y1="${(cy - Math.sin(t) * 17).toFixed(1)}" x2="${(cx + Math.cos(t) * 17).toFixed(1)}" y2="${(cy + Math.sin(t) * 17).toFixed(1)}" stroke="#8a93a2" stroke-width="1.2"/>`
    }
    const spin = isRolling
      ? `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="0.45s" repeatCount="indefinite"/>`
      : ''

    return (
      `<circle cx="${cx}" cy="${cy}" r="24" fill="#23262e" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="${cx}" cy="${cy}" r="18" fill="#f3f4f7" stroke="${CHROME}" stroke-width="2.4"/>` +
      `<g>${spin}${spokes}<circle cx="${cx + 14}" cy="${cy}" r="1.8" fill="${INK}"/></g>` +
      `<circle cx="${cx}" cy="${cy}" r="5" fill="${CHROME}" stroke="${INK}" stroke-width="1.6"/>`
    )
  }

  const eyes =
    mood === 'happy'
      ? `<path d="M30 -100 q3.6 -5 7.2 0 M42 -100 q3.6 -5 7.2 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
      : mood === 'working'
        ? `<ellipse cx="34" cy="-99" rx="3" ry="2.4" fill="${INK}"/><ellipse cx="46" cy="-99" rx="3" ry="2.4" fill="${INK}"/>` +
          `<path d="M29 -105 l9 2 M51 -105 l-9 2" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`
        : `<ellipse cx="34" cy="-99" rx="3.2" ry="4" fill="${INK}"><animate attributeName="ry" values="4;4;0.5;4;4" keyTimes="0;0.9;0.94;0.98;1" dur="4s" repeatCount="indefinite"/></ellipse>` +
          `<ellipse cx="46" cy="-99" rx="3.2" ry="4" fill="${INK}"><animate attributeName="ry" values="4;4;0.5;4;4" keyTimes="0;0.9;0.94;0.98;1" dur="4s" repeatCount="indefinite"/></ellipse>` +
          `<circle cx="35" cy="-100.6" r="1.2" fill="#fff"/><circle cx="47" cy="-100.6" r="1.2" fill="#fff"/>`

  const mouth =
    mood === 'happy'
      ? `<path d="M33 -90 q7 8 14 0 Z" fill="#a8384a" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`
      : `<path d="M35 -90 q5 3.4 10 0" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`

  const body =
    // exhaust, behind the wheels' front
    `<path d="M62 -20 Q70 -14 54 -12 L-6 -14" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
    `<rect x="-16" y="-24" width="52" height="11" rx="5.5" fill="${CHROME}" stroke="${INK}" stroke-width="2.4"/>` +
    `<path d="M-10 -21 H30" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` +
    // rear fender, tail light
    `<path d="M-24 -36 Q0 -62 20 -44" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M-24 -36 Q0 -62 20 -44" fill="none" stroke="${GREEN}" stroke-width="5" stroke-linecap="round"/>` +
    `<circle cx="-24" cy="-37" r="3.2" fill="#d9372e" stroke="${INK}" stroke-width="1.2"/>` +
    // engine
    `<rect x="36" y="-46" width="36" height="26" rx="6" fill="#4b5262" stroke="${INK}" stroke-width="2.4"/>` +
    `<path d="M41 -40 H67 M41 -34 H67 M41 -28 H67" stroke="#8b94a3" stroke-width="2"/>` +
    `<circle cx="54" cy="-30" r="9" fill="${CHROME}" stroke="${INK}" stroke-width="2.2"/><circle cx="54" cy="-30" r="3.4" fill="#8a93a2"/>` +
    // seat
    `<path d="M-6 -52 Q16 -60 40 -52 L40 -44 L-6 -44 Z" fill="#7a4a2a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` +
    // tank
    `<path d="M32 -62 Q60 -80 92 -64 Q96 -50 82 -46 L40 -46 Q28 -52 32 -62 Z" fill="${GREEN}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M40 -64 Q60 -74 84 -64" fill="none" stroke="${GREEN_HI}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M44 -56 Q62 -62 82 -55" fill="none" stroke="#f1e6c8" stroke-width="2" stroke-linecap="round"/>` +
    // fork and front fender
    `<line x1="96" y1="-66" x2="100" y2="-24" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>` +
    `<line x1="96" y1="-66" x2="100" y2="-24" stroke="${CHROME}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<path d="M80 -40 Q100 -56 122 -38" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M80 -40 Q100 -56 122 -38" fill="none" stroke="${GREEN}" stroke-width="5" stroke-linecap="round"/>` +
    // headlamp
    `<circle cx="110" cy="-62" r="10" fill="${CHROME}" stroke="${INK}" stroke-width="2.4"/>` +
    `<circle cx="112.5" cy="-62" r="7" fill="#fff3a8" stroke="${INK}" stroke-width="1.4"/>` +
    `<circle cx="102" cy="-52" r="3" fill="#ffb347" stroke="${INK}" stroke-width="1.2"/>` +
    wheel(0) +
    wheel(100)

  const person =
    // leg
    `<path d="M8 -52 L44 -44 L48 -24" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M8 -52 L44 -44 L48 -24" fill="none" stroke="#3f5f8f" stroke-width="10.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M40 -26 h20 q4 0 4 6 v6 h-24 Z" fill="#7a4a2a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
    // torso (jacket)
    `<path d="M8 -54 L26 -84" fill="none" stroke="${INK}" stroke-width="24" stroke-linecap="round"/>` +
    `<path d="M8 -54 L26 -84" fill="none" stroke="#5a3a26" stroke-width="20" stroke-linecap="round"/>` +
    `<path d="M14 -62 L22 -76" fill="none" stroke="#7d5538" stroke-width="3" stroke-linecap="round"/>` +
    // arm to the bars
    `<path d="M30 -80 L52 -76 L84 -72" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M30 -80 L52 -76 L84 -72" fill="none" stroke="#5a3a26" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="86" cy="-72" r="5.4" fill="#1b1d24" stroke="${INK}" stroke-width="1.6"/>` +
    // handlebar and mirror
    `<line x1="80" y1="-70" x2="96" y2="-70" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` +
    `<line x1="88" y1="-72" x2="82" y2="-92" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="81" cy="-96" r="5.6" fill="#aebdd0" stroke="${INK}" stroke-width="1.8"/>` +
    // helmet: glossy black, open visor showing the face
    `<circle cx="40" cy="-103" r="23" fill="#1b1d24" stroke="${INK}" stroke-width="2.6"/>` +
    `<path d="M56 -120 Q66 -106 58 -90" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity="0.5"/>` +
    `<ellipse cx="42" cy="-99" rx="17" ry="14" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M22 -108 Q40 -128 58 -108" fill="#1b1d24" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M40 -122 Q56 -118 61 -104" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.4"/>` +
    eyes +
    `<circle cx="29" cy="-93" r="2.6" fill="#f0a7a7" opacity="0.7"/><circle cx="51" cy="-93" r="2.6" fill="#f0a7a7" opacity="0.7"/>` +
    mouth

  return body + person
}

const sparkle = (x: number, y: number, delay: number) =>
  `<path d="M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y} L${x + 1.5} ${y + 1.5} L${x} ${y + 5} L${x - 1.5} ${y + 1.5} L${x - 5} ${y} L${x - 1.5} ${y - 1.5} Z" fill="#f2c230" stroke="${INK}" stroke-width="0.8">` +
  `<animate attributeName="opacity" values="0;1;0" dur="0.8s" begin="${delay}s" repeatCount="indefinite"/></path>`

const speedLines = () =>
  [0, 1, 2]
    .map(
      i =>
        `<line x1="-30" y1="${-28 - i * 22}" x2="${-60 - i * 6}" y2="${-28 - i * 22}" stroke="#e8e0cc" stroke-width="2.4" stroke-linecap="round" opacity="0">` +
        `<animate attributeName="opacity" values="0;0.8;0" dur="0.5s" begin="${i * 0.16}s" repeatCount="indefinite"/>` +
        `<animateTransform attributeName="transform" type="translate" values="0 0;-18 0" dur="0.5s" begin="${i * 0.16}s" repeatCount="indefinite"/></line>`,
    )
    .join('')

const bob = (amp: number, dur: number) =>
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${-amp};0 0;0 ${-amp / 2};0 0" dur="${dur}s" repeatCount="indefinite"/>`

const lowSky = (p: number) =>
  `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3350"/><stop offset="0.7" stop-color="#9a6a78"/><stop offset="1" stop-color="#f1b27f"/></linearGradient></defs>` +
  `<rect width="${W}" height="400" fill="url(#sky)"/>` +
  `<circle cx="610" cy="${(36 + p * 0.3).toFixed(1)}" r="14" fill="#ffe0a0" opacity="0.9"/>`

const ridge = (base: number, scale: number) => {
  const peaks: [number, number, number][] = [
    [70, 30, 70], [190, 12, 80], [320, 28, 76], [450, 8, 86], [585, 24, 78], [690, 16, 66],
  ]
  let out = ''
  for (const [x, y, hw] of peaks) {
    const yy = base - (base - y) * scale
    out += `<polygon points="${x},${yy} ${x - hw},${base} ${x + hw * 0.1},${base}" fill="#e3a679"/>`
    out += `<polygon points="${x},${yy} ${x + hw * 0.1},${base} ${x + hw},${base}" fill="#a96f86"/>`
    out += `<polygon points="${x},${yy} ${x - 9},${yy + 12} ${x - 2},${yy + 10} ${x + 3},${yy + 15} ${x + 9},${yy + 11}" fill="#fff4de"/>`
  }

  return out
}

const road = (y: number, w: number, dash: number, isMoving: boolean) =>
  `<rect x="-10" y="${y - w / 2 - 3}" width="${W + 20}" height="${w + 6}" fill="#4a3a2c"/>` +
  `<rect x="-10" y="${y - w / 2}" width="${W + 20}" height="${w}" fill="#3a3a40"/>` +
  `<line x1="-40" y1="${y}" x2="${W + 40}" y2="${y}" stroke="#f2d36b" stroke-width="${dash}" stroke-dasharray="16 14">` +
  (isMoving ? `<animate attributeName="stroke-dashoffset" from="0" to="30" dur="0.5s" repeatCount="indefinite"/>` : '') +
  `</line>`

const label = (x: number, y: number, size: number, anchor: string, text: string) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" text-anchor="${anchor}" fill="#f3e4c8" font-family="system-ui, sans-serif">${text}</text>`

// The band above the prompt box. The rider's place on the road is context used; mood follows what Claude is doing.
const scene = (percent: number, mood: Mood) => {
  const p = clamp(percent)
  const bx = 80 + (p / 100) * (END_X - 80 - 120)
  const isRolling = mood === 'working'

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="118" viewBox="0 0 ${W} 118">` +
    lowSky(p) +
    ridge(66, 0.55) +
    `<rect y="66" width="${W}" height="52" fill="#6b5240"/>` +
    road(98, 26, 2, isRolling) +
    label(START_X, 114, 8, 'middle', 'LEH') +
    label(END_X, 114, 8, 'end', 'KHARDUNG LA') +
    `<g transform="translate(${bx.toFixed(1)} 102) scale(0.58)">` +
    `<ellipse cx="50" cy="1" rx="76" ry="5" fill="#000" opacity="0.3"/>` +
    `<g>${mood === 'happy' ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -10;0 0" dur="0.5s" repeatCount="indefinite"/>` : isRolling ? bob(2, 0.4) : ''}` +
    rider(mood, isRolling) +
    (mood === 'happy' ? sparkle(-20, -120, 0) + sparkle(120, -110, 0.25) + sparkle(60, -150, 0.5) : '') +
    (isRolling ? speedLines() : '') +
    `</g></g>` +
    `</svg>`
  )
}

// Fresh chat: the rider rolls across the whole width on a loop.
const starter = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="190" viewBox="0 0 ${W} 190">` +
  lowSky(0) +
  ridge(112, 0.9) +
  `<rect y="112" width="${W}" height="78" fill="#6b5240"/>` +
  road(158, 40, 3, true) +
  label(14, 184, 10, 'start', 'LEH 3,500 m') +
  label(706, 184, 10, 'end', 'KHARDUNG LA 5,359 m') +
  `<g><animateTransform attributeName="transform" type="translate" from="-200 0" to="760 0" dur="9s" repeatCount="indefinite"/>` +
  `<g transform="translate(0 164) scale(0.85)">` +
  `<ellipse cx="50" cy="1" rx="76" ry="5" fill="#000" opacity="0.3"/>` +
  `<g>${bob(2.4, 0.4)}` + rider('working', true) + speedLines() + `</g></g></g>` +
  `</svg>`


export const register: Register = on => {
  let lastBand = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ride',
      description: 'Show or hide the Ladakh ride above the prompt',
    })
    await $.command.register({
      name: 'ridetimer',
      description: '/ridetimer 25 starts a focus timer shown in the ride band, /ridetimer stop cancels it',
    })

    try {
      const usage = await $.session.usage()
      await update($, ride, () => toRide(usage.context, usage.rateLimits))
    } catch {
      // No reading yet: the bike waits at Leh until the first response.
    }

    return next(e)
  })

  let tick: { cancel: () => void } | null = null
  let done: { cancel: () => void } | null = null
  const stopFocus = () => {
    tick?.cancel()
    done?.cancel()
    tick = null
    done = null
  }

  on('command.run', { command: 'ridetimer' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'stop') {
      stopFocus()
      await update($, focusLeft, () => null)

      return { text: 'Focus timer stopped.' }
    }

    const minutes = arg === '' ? 25 : Number(arg)
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      return { text: 'Use /ridetimer 25 (minutes, 1 to 240) or /ridetimer stop.' }
    }

    stopFocus()
    const endsAt = (await $.clock.now()) + minutes * 60_000
    const show = async () => {
      const left = Math.max(0, Math.ceil((endsAt - (await $.clock.now())) / 60_000))
      await update($, focusLeft, () => left)
    }
    await show()
    tick = $.clock.every(30_000, () => void show())
    done = $.clock.after(minutes * 60_000, () => {
      stopFocus()
      void update($, focusLeft, () => null)
      void $.ui.toast(`Focus block done (${minutes} min). Take a break.`, { timeoutMs: 15_000 })
    })

    return { text: `Focus timer set for ${minutes} min. It shows in the ride band.` }
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

  let happyTimer: { cancel: () => void } | null = null
  on('turn.complete', async ($, e, next) => {
    const out = await next(e)
    if (e.agentId === undefined && !e.isAborted) {
      happyTimer?.cancel()
      await update($, isHappy, () => true)
      happyTimer = $.clock.after(6_000, () => void update($, isHappy, () => false))
    }

    return out
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) {
      return next(e)
    }

    const state = await read($, ride)
    const focus = await read($, focusLeft)
    const happy = await read($, isHappy)
    const mood: Mood = e.props.isWorking ? 'working' : happy ? 'happy' : 'idle'
    const isFresh = state === null || state.tokens === 0
    const percent = state?.percent ?? 0
    const altitude = LEH_M + (percent / 100) * (KHARDUNG_LA_M - LEH_M)
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui

    const caption = isFresh
      ? 'Parked at Leh. Send a message and the ride begins.'
      : `Leh to Khardung La: ${percent}% of context used (${fmtK(state.tokens)} of ${fmtK(state.window)} tokens), about ${fmtInt(altitude)} m up` +
        (state.fiveHour === null ? '' : `. 5-hour limit ${Math.round(state.fiveHour)}%`)
    const line = focus === null ? caption : `${caption}. Focus: ${focus} min left`

    const picture =
      'Svg' in ui ? (
        <ui.Svg
          key="scene"
          source={isFresh ? starter() : scene(percent, mood)}
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
          <Text dimColor>{line} </Text>
          <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
        </Box>
      </Box>
    )
  })
}
