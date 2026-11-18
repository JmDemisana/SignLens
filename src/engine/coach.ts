import type { ScoreDetail } from './types'

// Deterministic Rule-Based Biomechanical Coaching Engine (Table 5 of BS ECE Thesis).
// Maps measured per-joint angular residuals and trajectory errors to verified English cues.
const JOINT_CUES: { name: string; flexCue: string; extendCue: string }[] = [
  { name: 'thumb base', flexCue: 'Tuck your thumb across your palm.', extendCue: 'Move your thumb away from your fingers.' },
  { name: 'thumb tip', flexCue: 'Bend your thumb knuckle slightly.', extendCue: 'Straighten your thumb tip.' },
  { name: 'index base', flexCue: 'Curl your index finger more.', extendCue: 'Straighten your index finger.' },
  { name: 'index middle', flexCue: 'Curl your index finger knuckle more.', extendCue: 'Extend your index finger straight up.' },
  { name: 'middle base', flexCue: 'Fold your middle finger down.', extendCue: 'Straighten your middle finger.' },
  { name: 'middle middle', flexCue: 'Curl your middle finger tighter.', extendCue: 'Extend your middle finger fully.' },
  { name: 'ring base', flexCue: 'Fold your ring finger toward your palm.', extendCue: 'Straighten your ring finger.' },
  { name: 'ring middle', flexCue: 'Curl your ring finger knuckle more.', extendCue: 'Extend your ring finger upward.' },
  { name: 'pinky base', flexCue: 'Fold your little finger down.', extendCue: 'Extend your little finger upright.' },
  { name: 'pinky middle', flexCue: 'Curl your little finger tighter.', extendCue: 'Straighten your little finger.' },
  { name: 'palm spread', flexCue: 'Bring your fingers closer together.', extendCue: 'Spread your fingers wider apart.' },
]

export function coachAdvice(detail: ScoreDetail, hint: string): string {
  if (!detail.perJoint.length) {
    if (detail.passed) return `Nice job! ${hint}`
    if (detail.score >= 55) return `Try a slightly bigger motion. ${hint}`
    return hint
  }
  if (detail.passed) return `Good match. ${hint}`
  if (!detail.correction) return hint
  const indexed = detail.perJoint.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
  const worst = indexed[0]
  const rule = JOINT_CUES[worst?.i ?? 0] ?? JOINT_CUES[0]
  if (detail.correction === 'extend') {
    return `${rule.extendCue} ${hint}`
  }
  return `${rule.flexCue} ${hint}`
}

export function pickReviewDrills(history: ScoreDetail[]): string[] {
  return history
    .filter((h) => !h.passed)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((h) => h.id)
}

export function summarizeSession(history: ScoreDetail[]): string {
  if (!history.length) return 'Practice complete.'
  const avg = history.reduce((a, h) => a + h.score, 0) / history.length
  const weak = [...new Set(pickReviewDrills(history))]
  const weakText = weak.length ? `Practice again: ${weak.join(', ')}.` : 'All signs passed.'
  return `Average ${Math.round(avg)}% across ${history.length} signs. ${weakText}`
}
