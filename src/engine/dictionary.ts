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
  // Greetings & Survival (Course + FSL-105)
  'MAGANDANG UMAGA': { start: 'Make a thumbs-up at chest height.', motion: 'Open your hand outward into a spread five-finger hand at shoulder height.', cue: 'Smooth one-handed motion.' },
  'GOOD AFTERNOON': { start: 'Make a thumbs-up at chest height (GOOD).', motion: 'Bring your flat hand palm-down to your chin and angle it forward (AFTERNOON).', cue: 'Smooth one-handed motion.' },
  'GOOD EVENING': { start: 'Make a thumbs-up at chest height (GOOD).', motion: 'Curve your dominant hand downward over the back of your other hand (EVENING).', cue: 'Two-part greeting.' },
  HELLO: { start: 'Place a flat hand near your temple.', motion: 'Salute outward from your forehead.', cue: 'Keep fingers together.' },
  KAMUSTA: { start: 'Curl both hands knuckles-together at chest height.', motion: 'Roll both hands forward and open them outward.', cue: 'Keep both hands at chest level.' },
  'IM FINE': { start: 'Open all five fingers with your thumb on your chest.', motion: 'Tap or bounce your thumb gently against your chest.', cue: 'Keep fingers spread.' },
  'NICE TO MEET YOU': { start: 'Slide one flat palm across the other palm (NICE).', motion: 'Bring both upright index fingers together (MEET), then point forward (YOU).', cue: 'Three smooth steps.' },
  SALAMAT: { start: 'Hold both open hands near your upper chest.', motion: 'Move both hands forward and open with palms facing up.', cue: 'Use both hands together.' },
  'YOURE WELCOME': { start: 'Hold an open flat hand near your chin.', motion: 'Sweep your hand outward and down in a smooth arc palm-up.', cue: 'Smooth one-handed motion.' },
  'SEE YOU TOMORROW': { start: 'Point V-fingers from under your eye forward (SEE), then point forward (YOU).', motion: 'Arc a thumbs-up forward from your cheek (TOMORROW).', cue: 'Smooth three-part phrase.' },
  NAIINTINDIHAN: { start: 'Close fist beside your temple.', motion: 'Flick your index finger straight up.', cue: 'Stay near forehead height.' },
  'DON’T UNDERSTAND': { start: 'Close fist beside your forehead and flick index finger up.', motion: 'Wave or shake your hand away with a slight head shake.', cue: 'Show negation clearly.' },
  KNOW: { start: 'Hold a flat hand with fingers together.', motion: 'Tap your fingertips gently against the side of your forehead.', cue: 'Keep fingers together.' },
  'DON’T KNOW': { start: 'Touch your fingertips to your forehead.', motion: 'Swing your hand outward palm-down with a slight head shake.', cue: 'Smooth outward turn.' },
  HINDI: { start: 'Raise index, middle, and thumb.', motion: 'Snap index and middle fingers onto your thumb.', cue: 'One quick closing tap.' },
  OO: { start: 'Make a closed fist at chest height.', motion: 'Nod your wrist up and down.', cue: 'Keep your fist closed.' },
  MALI: { start: 'Extend your thumb and pinky finger.', motion: 'Tap your chin gently.', cue: 'Keep middle three fingers folded.' },
  TAMA: { start: 'Hold one index finger forward and raise the other higher.', motion: 'Strike the top index finger down onto the lower one.', cue: 'Use both index fingers.' },
  MABAGAL: { start: 'Hold one palm flat in front of chest.', motion: 'Slide your other palm slowly along its back.', cue: 'Slow, steady movement.' },
  FAST: { start: 'Pinch thumb and index fingers on both hands in front of chest.', motion: 'Pull both hands back quickly toward your body.', cue: 'Quick, crisp motion.' },

  // Numbers 1-10
  '1': { start: 'Raise your index finger straight up.', motion: 'Hold the handshape steady at chest or shoulder height.', cue: 'Keep other fingers curled.' },
  '2': { start: 'Raise your index and middle fingers in a V shape.', motion: 'Hold the handshape steady.', cue: 'Keep ring and pinky curled.' },
  '3': { start: 'Raise your thumb, index, and middle fingers.', motion: 'Hold the handshape steady.', cue: 'Keep ring and pinky curled.' },
  '4': { start: 'Raise all four fingers with your thumb tucked across your palm.', motion: 'Hold the handshape steady.', cue: 'Keep fingers slightly apart.' },
  '5': { start: 'Open all five fingers wide.', motion: 'Hold the handshape steady.', cue: 'Keep fingers clearly spread.' },
  '6': { start: 'Touch your thumb tip to your pinky tip.', motion: 'Keep index, middle, and ring fingers raised steady.', cue: 'Clear open three-finger shape.' },
  '7': { start: 'Touch your thumb tip to your ring fingertip.', motion: 'Keep index, middle, and pinky fingers raised steady.', cue: 'Clear thumb-to-ring contact.' },
  '8': { start: 'Touch your thumb tip to your middle fingertip.', motion: 'Keep index, ring, and pinky fingers raised steady.', cue: 'Clear thumb-to-middle contact.' },
  '9': { start: 'Touch your thumb tip to your index fingertip.', motion: 'Keep middle, ring, and pinky fingers raised steady.', cue: 'Clear F-like ring shape.' },
  '10': { start: 'Make a thumbs-up at shoulder height.', motion: 'Shake or twist your wrist slightly side to side.', cue: 'Keep other fingers closed.' },

  // Months
  JANUARY: { start: 'Hold one index finger upright as a base.', motion: 'Fingerspell J-A-N beside the upright finger.', cue: 'Keep the base finger steady.' },
  FEBRUARY: { start: 'Hold one index finger upright as a base.', motion: 'Fingerspell F-E-B beside the upright finger.', cue: 'Keep the base finger steady.' },
  MARCH: { start: 'Hold one index finger upright as a base.', motion: 'Form M (three fingers over thumb) and spell M-A-R beside it.', cue: 'Keep the base finger steady.' },
  APRIL: { start: 'Hold one index finger upright as a base.', motion: 'Form A (closed fist) and spell A-P-R beside it.', cue: 'Keep the base finger steady.' },
  MAY: { start: 'Hold one index finger upright as a base.', motion: 'Fingerspell M-A-Y beside the upright finger.', cue: 'Keep the base finger steady.' },
  JUNE: { start: 'Hold one index finger upright as a base.', motion: 'Trace J with your pinky and spell J-U-N beside it.', cue: 'Keep the base finger steady.' },
  JULY: { start: 'Hold one index finger upright as a base.', motion: 'Trace J and spell J-U-L-Y beside the upright finger.', cue: 'Keep the base finger steady.' },
  AUGUST: { start: 'Hold one index finger upright as a base.', motion: 'Fingerspell A-U-G beside the upright finger.', cue: 'Keep the base finger steady.' },
  SEPTEMBER: { start: 'Hold one index finger upright as a base.', motion: 'Form S (closed fist) and spell S-E-P beside it.', cue: 'Keep the base finger steady.' },
  OCTOBER: { start: 'Hold one index finger upright as a base.', motion: 'Form O and spell O-C-T beside the upright finger.', cue: 'Keep the base finger steady.' },
  NOVEMBER: { start: 'Hold one index finger upright as a base.', motion: 'Form N (two fingers over thumb) and spell N-O-V beside it.', cue: 'Keep the base finger steady.' },
  DECEMBER: { start: 'Hold one index finger upright as a base.', motion: 'Form D (index up) and spell D-E-C beside it.', cue: 'Keep the base finger steady.' },

  // Days & Time
  MONDAY: { start: 'Form an M handshape (thumb under three fingers).', motion: 'Move it in a small circle at shoulder height.', cue: 'Keep wrist relaxed.' },
  TUESDAY: { start: 'Form a T handshape (thumb between index and middle).', motion: 'Move it in a small circle at shoulder height.', cue: 'Keep wrist relaxed.' },
  WEDNESDAY: { start: 'Form a W handshape (three middle fingers up).', motion: 'Move it in a small circle at shoulder height.', cue: 'Keep wrist relaxed.' },
  THURSDAY: { start: 'Form an H handshape (index and middle extended).', motion: 'Move it in a small circle near your temple or shoulder.', cue: 'Keep fingers together.' },
  FRIDAY: { start: 'Form an F handshape (thumb and index touching, three up).', motion: 'Move it in a small circle at shoulder height.', cue: 'Keep wrist relaxed.' },
  SATURDAY: { start: 'Make S handshapes (closed fists) with both hands.', motion: 'Circle both fists gently in front of your chest.', cue: 'Keep both fists closed.' },
  SUNDAY: { start: 'Raise both open palms facing forward at shoulder height.', motion: 'Move both hands in small circles or downward gently.', cue: 'Keep both palms open.' },
  TODAY: { start: 'Hold both Y-handshapes (thumb and pinky out) palms-up.', motion: 'Bounce both hands downward together in front of chest.', cue: 'Use both hands together.' },
  TOMORROW: { start: 'Make a thumbs-up beside your cheek.', motion: 'Arc your hand forward away from your face.', cue: 'Smooth forward arc.' },
  YESTERDAY: { start: 'Make a thumbs-up at your cheek/chin.', motion: 'Arc your thumb backward toward your ear.', cue: 'Smooth backward arc.' },

  // Family & People
  TATAY: { start: 'Open all five fingers.', motion: 'Tap your thumb against your forehead.', cue: 'Keep fingers spread.' },
  NANAY: { start: 'Hold a flat hand with fingers together near your chin.', motion: 'Tap your thumb gently against your chin.', cue: 'Keep your fingers together pointing up.' },
  SON: { start: 'Salute an open hand from your forehead (MALE).', motion: 'Cradle both forearms together at your chest (BABY).', cue: 'Two-part sign.' },
  DAUGHTER: { start: 'Touch your thumb to your chin (FEMALE).', motion: 'Cradle both forearms together at your chest (BABY).', cue: 'Two-part sign.' },
  GRANDFATHER: { start: 'Open all five fingers with thumb at your forehead.', motion: 'Bounce your hand forward in two small arcs.', cue: 'Keep fingers spread.' },
  GRANDMOTHER: { start: 'Open all five fingers with thumb at your chin.', motion: 'Bounce your hand forward in two small arcs.', cue: 'Keep fingers spread.' },
  UNCLE: { start: 'Form a U handshape (index and middle together).', motion: 'Shake or circle it gently beside your temple.', cue: 'Keep ring and pinky curled.' },
  AUNTIE: { start: 'Form an A handshape (closed fist, thumb on side).', motion: 'Shake or circle it gently beside your cheek/chin.', cue: 'Keep fist relaxed.' },
  COUSIN: { start: 'Form a C handshape (curved hand).', motion: 'Shake or circle it gently beside your temple/cheek.', cue: 'Keep fingers curved together.' },
  MAGULANG: { start: 'Extend your index and middle fingers together near your temple.', motion: 'Touch your forehead first, then move down to your chin.', cue: 'Keep your other fingers curled.' },
  BOY: { start: 'Pinch fingers together at your forehead like a cap brim.', motion: 'Bring your flat hand palm-down at chest/waist height.', cue: 'Two-part sign.' },
  GIRL: { start: 'Trace your thumb downward along your jaw/chin.', motion: 'Hold your flat hand palm-down at chest/waist height.', cue: 'Two-part sign.' },
  MAN: { start: 'Touch your open five-finger thumb to your forehead.', motion: 'Bring your open palm down to touch your chest.', cue: 'Keep fingers spread.' },
  WOMAN: { start: 'Touch your open five-finger thumb to your chin.', motion: 'Bring your open palm down to touch your chest.', cue: 'Keep fingers spread.' },
  BINGI: { start: 'Point your index finger.', motion: 'Touch near your ear, then arc to your mouth.', cue: 'Keep other fingers curled.' },
  'HARD OF HEARING': { start: 'Form an H handshape (index and middle extended).', motion: 'Move it in a small arc forward in front of your chest.', cue: 'Keep ring and pinky curled.' },
  'WEELCHAIR PERSON': { start: 'Curve both hands like gripping wheels beside your hips.', motion: 'Roll both hands forward in circular motions.', cue: 'Use both hands symmetrically.' },
  BLIND: { start: 'Curve your index and middle fingers toward your eyes.', motion: 'Pull the curved fingers slightly forward.', cue: 'Keep ring and pinky curled.' },
  'DEAF BLIND': { start: 'Point your index finger near your ear (DEAF).', motion: 'Curve your index and middle fingers toward your eyes (BLIND).', cue: 'Two-part sign.' },
  MARRIED: { start: 'Hold both open hands in front of your chest.', motion: 'Clasp both hands together with one resting over the other.', cue: 'Use both hands.' },

  // Colors & Shades
  BLUE: { start: 'Form a B handshape (flat hand, thumb across palm).', motion: 'Twist or shake your wrist gently at shoulder height.', cue: 'Keep fingers together.' },
  GREEN: { start: 'Form a G handshape (index and thumb parallel).', motion: 'Twist or shake your wrist gently at shoulder height.', cue: 'Keep other fingers curled.' },
  RED: { start: 'Point your index finger near your lips.', motion: 'Brush your index finger downward across your chin.', cue: 'One smooth downward stroke.' },
  BROWN: { start: 'Form a B handshape (flat hand) against your cheek.', motion: 'Slide your flat hand downward along your jaw.', cue: 'Keep fingers together.' },
  BLACK: { start: 'Point your index finger across one side of your forehead.', motion: 'Draw your index finger horizontally across your brow.', cue: 'Keep finger straight.' },
  WHITE: { start: 'Place your open five-finger hand flat on your chest.', motion: 'Pull your hand forward while closing your fingertips together.', cue: 'Smooth outward pull.' },
  YELLOW: { start: 'Form a Y handshape (thumb and pinky extended).', motion: 'Twist or shake your wrist gently at shoulder height.', cue: 'Keep middle three fingers curled.' },
  ORANGE: { start: 'Hold a C/O handshape in front of your chin.', motion: 'Squeeze your hand closed into a fist repeatedly.', cue: 'Repeat the squeeze clearly.' },
  GRAY: { start: 'Hold both open five-finger hands in front of chest.', motion: 'Pass your fingers back and forth between each other.', cue: 'Use both hands.' },
  PINK: { start: 'Form a P handshape (middle finger pointing down).', motion: 'Brush your middle finger downward over your lips/chin.', cue: 'Smooth downward stroke.' },
  VIOLET: { start: 'Form a V handshape (index and middle fingers up).', motion: 'Twist or shake your wrist gently at shoulder height.', cue: 'Keep ring and pinky curled.' },
  LIGHT: { start: 'Hold both closed hands together in front of chest.', motion: 'Fling both five-finger hands open wide outward.', cue: 'Crisp opening motion.' },
  DARK: { start: 'Raise both open hands wide at shoulder height.', motion: 'Cross both flat palms downward in front of your face.', cue: 'Use both hands.' },

  // Food & Drinks
  TINAPAY: { start: 'Hold both hands near your mouth with index and middle fingers extended.', motion: 'Tap the extended fingers of both hands lightly together.', cue: 'Use both hands near chin level.' },
  EGG: { start: 'Extend index and middle fingers on both hands (H-shapes).', motion: 'Tap both pairs of fingers together, then pull apart downward.', cue: 'Like cracking an egg.' },
  FISH: { start: 'Hold your dominant flat hand upright.', motion: 'Wiggle your hand forward like a swimming fish.', cue: 'Keep fingers together.' },
  MEAT: { start: 'Hold one flat hand palm-down.', motion: 'Pinch the web between thumb and index finger with your other hand and shake.', cue: 'Use both hands.' },
  CHICKEN: { start: 'Pinch your thumb and index finger near your mouth like a beak.', motion: 'Open and close your fingers twice.', cue: 'Keep other fingers curled.' },
  SPAGHETTI: { start: 'Extend your pinky fingers (I-handshapes) on both hands.', motion: 'Spiral both hands outward in circles like twirling noodles.', cue: 'Use both hands.' },
  KANIN: { start: 'Hold one palm flat face-up like a plate.', motion: 'Scoop from that palm upward to your mouth with your other hand.', cue: 'Use both hands.' },
  LONGANISA: { start: 'Pinch thumb and index fingers on both hands together at chest.', motion: 'Pull your hands apart in short linked arcs like sausage links.', cue: 'Use both hands.' },
  SHRIMP: { start: 'Point your index finger near your cheek/mouth.', motion: 'Curl and uncurl your index finger while moving forward.', cue: 'Keep other fingers curled.' },
  CRAB: { start: 'Make pinchers with thumb and fingers on both hands.', motion: 'Snap both pinchers open and closed at chest height.', cue: 'Use both hands.' },
  HOT: { start: 'Cup your hand over your mouth.', motion: 'Turn your hand outward quickly as if blowing on hot food.', cue: 'Quick outward flick.' },
  COLD: { start: 'Make two closed fists at chest height.', motion: 'Shiver or shake both fists slightly inward.', cue: 'Use both hands.' },
  JUICE: { start: 'Form a J with your pinky near your mouth.', motion: 'Mime squeezing or pouring into your other hand.', cue: 'Smooth transition.' },
  GATAS: { start: 'Hold one hand at chest height.', motion: 'Squeeze your hand open and closed into a fist.', cue: 'Repeat the squeeze clearly.' },
  KAPE: { start: 'Stack two closed fists.', motion: 'Circle the top fist over the bottom fist.', cue: 'Keep both fists closed.' },
  TEA: { start: 'Form an O-shape cup with one hand.', motion: 'Pinch thumb and index (F-shape) and dip into the cup like a tea bag.', cue: 'Use both hands.' },
  BEER: { start: 'Form a B handshape beside your cheek/chin.', motion: 'Brush down or tilt your hand like tipping a glass.', cue: 'Keep fingers together.' },
  WINE: { start: 'Form a W handshape (three middle fingers up).', motion: 'Circle it gently beside your cheek.', cue: 'Keep pinky and thumb tucked.' },
  SUGAR: { start: 'Hold your curved fingertips against your chin.', motion: 'Brush your fingertips downward off your chin.', cue: 'Smooth downward brush.' },
  'NO SUGAR': { start: 'Shake your hand or sign NO first.', motion: 'Brush your curved fingertips downward off your chin (SUGAR).', cue: 'Two-part sign.' },
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
