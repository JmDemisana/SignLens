import { fingerAngles, scoreStatic } from './angles'
import { scoreDynamicBoth } from './dtw'
import { STATIC_TEMPLATES, templatesForLang } from './templates'
import { getPersonalAngles } from './personal'
import { FSL_DEFINITIONS } from './fsl'
import type { HandLandmarks, SignLang, Vec3 } from './types'

export interface DictResult {
  id: string
  score: number
  hint: string
}

// Bidirectional Sign-to-Word Optical Lookup (Objective 1f & Protocol 3).
// Evaluates both static joint-angle templates and dynamic FastDTW motion templates
// against the live hand landmarks and optional captured motion trace.
export function lookupTop3(
  lm: HandLandmarks | null,
  lang: SignLang = 'FSL',
  aspect = 1,
  motionTrace?: Vec3[] | null,
): DictResult[] {
  if (!lm || lm.length < 21) return []
  const live = fingerAngles(lm, aspect)
  const candidates: DictResult[] = []

  for (const t of templatesForLang(lang)) {
    if (t.kind === 'static' && t.angles) {
      const target = getPersonalAngles(t.id) ?? t.angles
      const { score } = scoreStatic(live, target)
      candidates.push({ id: t.id, score, hint: t.hint })
    } else if (t.kind === 'dynamic' && t.path && motionTrace && motionTrace.length >= 6) {
      const dtwScore = scoreDynamicBoth(motionTrace, t.path)
      const angleBonus = t.angles ? scoreStatic(live, t.angles).score * 0.35 + dtwScore * 0.65 : dtwScore
      candidates.push({ id: t.id, score: angleBonus, hint: t.hint })
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export function lookupStatic(lm: HandLandmarks | null, lang: SignLang = 'FSL'): DictResult | null {
  const top = lookupTop3(lm, lang)
  return top[0] ?? null
}

export const DEFINITIONS: Record<string, { title: string; sub: string; desc: string }> = {
  ...FSL_DEFINITIONS,
}

export function definitionFor(id: string): { title: string; sub: string; desc: string } {
  if (FSL_DEFINITIONS[id]) return FSL_DEFINITIONS[id]
  if (DEFINITIONS[id]) return DEFINITIONS[id]
  if (/^[A-Z]$/.test(id)) return { title: `Letter ${id}`, sub: 'FSL Manual Alphabet', desc: STATIC_TEMPLATES.find((template) => template.id === id)?.hint ?? 'Copy the motion shown in the reference.' }
  if (/^[0-9]$/.test(id)) return { title: `Digit ${id}`, sub: 'FSL Number', desc: STATIC_TEMPLATES.find((template) => template.id === id)?.hint ?? 'Hold the handshape steady.' }
  return { title: id, sub: 'FSL Sign', desc: 'Filipino Sign Language sign.' }
}

export const HOW_TO: Record<string, { start: string; motion: string; cue: string }> = {
  KAMUSTA: { start: 'Hold both hands at chest height.', motion: 'Roll both hands outward into thumbs-up.', cue: 'Keep both hands clearly visible.' },
  'MAGANDANG UMAGA': { start: 'Start with a thumbs-up at chest height.', motion: 'Open your hand outward into a spread hand.', cue: 'Smooth one-handed motion.' },
  HELLO: { start: 'Place a flat hand near your temple.', motion: 'Salute outward from your forehead.', cue: 'Keep fingers together.' },
  SALAMAT: { start: 'Hold both flat hands near your chin.', motion: 'Move both hands forward and downward.', cue: 'Use both hands together.' },
  OO: { start: 'Make a closed fist at chest height.', motion: 'Nod your wrist up and down.', cue: 'Keep your fist closed.' },
  HINDI: { start: 'Raise index, middle, and thumb.', motion: 'Snap index and middle fingers onto your thumb.', cue: 'One quick closing tap.' },
  TAMA: { start: 'Point both index fingers forward.', motion: 'Strike the top index finger down onto the lower one.', cue: 'Use both index fingers.' },
  MALI: { start: 'Extend your thumb and pinky finger.', motion: 'Tap your chin gently.', cue: 'Keep middle three fingers folded.' },
  NAIINTINDIHAN: { start: 'Close fist beside your temple.', motion: 'Flick your index finger straight up.', cue: 'Stay near forehead height.' },
  MABAGAL: { start: 'Hold one palm flat in front of chest.', motion: 'Slide your other palm slowly up its back.', cue: 'Slow, steady movement.' },
  NANAY: { start: 'Open all five fingers.', motion: 'Tap your thumb against your chin.', cue: 'Keep fingers spread.' },
  TATAY: { start: 'Open all five fingers.', motion: 'Tap your thumb against your forehead.', cue: 'Keep fingers spread.' },
  MAGULANG: { start: 'Open all five fingers.', motion: 'Touch forehead first, then move down to chin.', cue: 'One continuous downward tap.' },
  BINGI: { start: 'Point your index finger.', motion: 'Touch near your ear, then arc to your mouth.', cue: 'Keep other fingers curled.' },
  KANIN: { start: 'Cup one hand like a bowl.', motion: 'Scoop curved fingers upward to your mouth.', cue: 'Use both hands.' },
  TINAPAY: { start: 'Hold one hand vertically.', motion: 'Slice across the back of it with your other hand.', cue: 'Use both hands.' },
  KAPE: { start: 'Stack two closed fists.', motion: 'Circle the top fist over the bottom fist.', cue: 'Keep both fists closed.' },
  GATAS: { start: 'Hold one hand at chest height.', motion: 'Squeeze your hand open and closed into a fist.', cue: 'Repeat the squeeze clearly.' },
}

export function howToFor(id: string): { start: string; motion: string; cue: string } {
  if (HOW_TO[id]) return HOW_TO[id]
  if (/^[A-Z0-9]$/.test(id)) {
    return {
      start: `Form '${id}' in front of your chest.`,
      motion: 'Hold the handshape steady.',
      cue: 'Keep your fingers clearly visible.',
    }
  }
  return { start: 'Watch the video and follow the hand shape and motion.', motion: 'Move at a natural pace.', cue: 'Keep hands clearly visible.' }
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
    if (!('speechSynthesis' in window)) return false
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find((c) => c.localService && (c.lang.startsWith('fil') || c.lang.startsWith('tl') || c.lang.startsWith('en'))) ?? voices[0]
    if (!voice) return false
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.rate = rate
    window.speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}
