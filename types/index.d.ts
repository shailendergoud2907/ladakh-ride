export type Ride = {
  percent: number
  tokens: number
  window: number
  fiveHour: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'ladakh-ride': { ride: Ride | null; isHidden: boolean }
  }
}
