import type { Register } from 'claude-code'

const BLOCKED: [RegExp, string][] = [
  [/\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)[a-z]*\s+(\/|~|\$HOME)(\s|\/?$)/i, 'rm -rf on / or your home folder'],
  [/\bgit\s+push\b[^\n;|&]*(--force\b|\s-f\b)(?![^\n;|&]*--force-with-lease)/i, 'a plain force-push (use --force-with-lease)'],
  [/\bgit\s+reset\s+--hard\b/i, 'git reset --hard'],
  [/\bmkfs(\.\w+)?\b|\bdd\s+[^\n]*of=\/dev\//i, 'a disk-wiping command'],
]

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    const hit = BLOCKED.find(([re]) => re.test(e.command))

    return hit
      ? { deny: `${$.plugin.name}: blocked ${hit[1]}. Run it yourself in a terminal if you really mean it.` }
      : next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: its guard failed, so the command was held.` }))
}
