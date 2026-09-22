import { fingerAngles, scoreStatic } from './angles'
import { STATIC_TEMPLATES } from './templates'
import { getPersonalAngles } from './personal'
import type { HandLandmarks, SignLang } from './types'

export interface DictResult {
  id: string
  score: number
  hint: string
}

export function lookupTop3(lm: HandLandmarks | null, lang: SignLang = 'ASL'): DictResult[] {
  if (!lm || lm.length < 21) return []
  const live = fingerAngles(lm)
  return STATIC_TEMPLATES.filter((t) => t.angles && (t.lang === 'BOTH' || t.lang === lang))
    .map((t) => {
      const target = getPersonalAngles(t.id) ?? t.angles!
      const { score } = scoreStatic(live, target)
      return { id: t.id, score, hint: t.hint }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export function lookupStatic(lm: HandLandmarks | null, lang: SignLang = 'ASL'): DictResult | null {
  const top = lookupTop3(lm, lang)
  return top[0] ?? null
}

export const DEFINITIONS: Record<string, { title: string; sub: string; desc: string }> = {
  HELLO: { title: 'Hello', sub: 'Greeting', desc: 'Palm forward, move hand outward from forehead.' },
  'THANK YOU': { title: 'Thank You', sub: '/θæŋk juː/ • Courtesy', desc: 'Fingertips at chin, move hand forward and down.' },
  YES: { title: 'Yes', sub: 'Affirmation', desc: 'Fist nods up and down like a head nod.' },
  NO: { title: 'No', sub: 'Negation', desc: 'Index and middle tap, move side to side.' },
  PLEASE: { title: 'Please', sub: 'Courtesy', desc: 'Flat palm circles on the chest.' },
  SORRY: { title: 'Sorry', sub: 'Apology', desc: 'Fist circles on the chest with a sincere face.' },
  GOOD: { title: 'Good', sub: 'Positive', desc: 'Fingertips at chin, hand opens outward.' },
  MORNING: { title: 'Morning', sub: 'Time of day', desc: 'Hand rises off the opposite arm like a sunrise.' },
  FRIEND: { title: 'Friend', sub: 'Person', desc: 'Index fingers hook then swap sides.' },
  LOVE: { title: 'Love', sub: 'Emotion', desc: 'Arms cross over the heart.' },
}

export function definitionFor(id: string): { title: string; sub: string; desc: string } {
  if (DEFINITIONS[id]) return DEFINITIONS[id]
  if (/^[A-Z]$/.test(id)) return { title: `Letter ${id}`, sub: 'ASL Alphabet', desc: 'Fingerspelling posture. Match the ghost guide and hold steady.' }
  if (/^[0-9]$/.test(id)) return { title: `Number ${id}`, sub: 'ASL Number', desc: 'Number hand shape. Keep wrist level and hold steady.' }
  return { title: id, sub: 'Sign', desc: 'Practice sign.' }
}

// Step-by-step formation guides for moving words. Static letters and
// numbers use the generic fingerspelling guide below.
export const HOW_TO: Record<string, { start: string; motion: string; cue: string }> = {
  HELLO: { start: 'Flat hand at your forehead, palm forward.', motion: 'Move the hand outward and away from the head.', cue: 'Smile, direct eye contact, friendly face.' },
  'THANK YOU': { start: 'Touch fingertips of a flat hand to your lips or chin.', motion: 'Move the hand gently downward and outward toward the listener.', cue: 'Maintain an appreciative smile and direct eye contact.' },
  YES: { start: 'Make a fist at chest height.', motion: 'Nod the fist up and down twice like a head nod.', cue: 'Firm small nods read as confident yes.' },
  NO: { start: 'Index and middle fingers together, thumb tapping them.', motion: 'Move the hand side to side in small taps.', cue: 'Keep the motion tight, not a big wave.' },
  PLEASE: { start: 'Flat palm centered on the chest.', motion: 'Circle the palm clockwise on the chest.', cue: 'Warm expression, slight head bow.' },
  SORRY: { start: 'Fist centered on the chest.', motion: 'Circle the fist slowly on the chest.', cue: 'Sincere regretful face sells the sign.' },
  GOOD: { start: 'Fingertips touching the chin, hand flat.', motion: 'Open the hand outward and away from the chin.', cue: 'Bright approving face.' },
  MORNING: { start: 'Non-dominant forearm horizontal, dominant hand tucked under it.', motion: 'Raise the dominant hand up past the arm like a sunrise.', cue: 'Eyes follow the rising hand.' },
  FRIEND: { start: 'Both index fingers up, facing each other.', motion: 'Hook the fingers then swap sides past each other.', cue: 'Two-handed sign, practice slowly first.' },
  LOVE: { start: 'Arms crossed over the heart.', motion: 'Squeeze gently inward over the heart.', cue: 'Soft sincere expression.' },
  KAMUSTA: { start: 'Open palm at the chest.', motion: 'Move the palm outward toward the person.', cue: 'Warm greeting face, eye contact.' },
  SALAMAT: { start: 'Fingertips at the chin.', motion: 'Bow the hand forward and down.', cue: 'Grateful expression with a slight nod.' },
  OO: { start: 'Fist at chest height.', motion: 'Nod the fist down twice, firmly.', cue: 'Short firm nods.' },
  HINDI: { start: 'Flat hand up at chest height.', motion: 'Wave the hand side to side gently.', cue: 'Calm neutral face.' },
  MABUHAY: { start: 'Open palm low at the chest.', motion: 'Raise the palm high overhead in welcome.', cue: 'Big celebratory welcome face.' },
  KAIBIGAN: { start: 'Index fingers facing each other.', motion: 'Meet the fingertips then part them sideways.', cue: 'Friendly smile.' },
}

export function howToFor(id: string): { start: string; motion: string; cue: string } {
  if (HOW_TO[id]) return HOW_TO[id]
  if (/^[A-Z0-9]$/.test(id)) {
    return {
      start: `Form the '${id}' handshape in front of your chest.`,
      motion: 'Hold the shape perfectly still for the 2 second timer.',
      cue: 'Keep the wrist straight and fingers crisp, no rushing.',
    }
  }
  return { start: 'Watch the 3D demo for the start posture.', motion: 'Copy the full motion shown on the demo.', cue: 'Mirror the demo speed, then build up.' }
}

export function relatedFor(id: string, lang: SignLang, all: { id: string }[]): string[] {
  const pool = all.map((t) => t.id).filter((x) => x !== id)
  const sameKind = (x: string) => (/^[A-Z0-9]$/.test(x) ? /^[A-Z0-9]$/.test(id) : !/^[A-Z0-9]$/.test(id))
  const same = pool.filter(sameKind)
  const rest = pool.filter((x) => !sameKind(x))
  void lang
  return [...same.slice(0, 3), ...rest.slice(0, 1)].slice(0, 4)
}

export function speak(text: string, rate = 1) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    window.speechSynthesis.speak(u)
  } catch {
    // offline TTS unavailable, stay silent
  }
}
