import { fingerAngles, scoreStatic } from './angles'
import { STATIC_TEMPLATES } from './templates'
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
      const { score } = scoreStatic(live, t.angles!)
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
