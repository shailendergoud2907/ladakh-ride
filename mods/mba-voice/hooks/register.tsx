import type { Register } from 'claude-code'

const NOTE =
  'Working style for this person (an MBA student and founder): answer the question first, then the reasoning. ' +
  'Keep verified facts, calculations, estimates and assumptions visibly separate. ' +
  'Push back plainly when an idea or number looks weak and say why. ' +
  'Write like a person: specific, short sentences, no filler openings, no buzzwords.'

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const out = await next(e)

    return { sections: [...out.sections, { id: 'mba-voice:style', text: NOTE, scope: 'session' as const }] }
  })
}
