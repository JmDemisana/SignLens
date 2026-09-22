import type { ScoreDetail } from './types'

// Offline rule-based coach. Reads numeric score sheet, writes plain advice.
// No cloud, no LLM needed for v1. Local model can replace this later.
const JOINT_NAMES = [
  'thumb base',
  'thumb tip',
  'index base',
  'index middle',
  'middle base',
  'middle middle',
  'ring base',
  'ring middle',
  'pinky base',
  'pinky middle',
  'wrist spread',
]

export function coachAdvice(detail: ScoreDetail, hint: string): string {
  if (detail.score >= 85) return `Clean ${detail.id}. ${hint}. Hold it steady.`
  const indexed = detail.perJoint.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
  const worst = indexed.slice(0, 2)
  const names = worst.map((w) => JOINT_NAMES[w.i] ?? `joint ${w.i}`).join(' and ')
  if (detail.score >= 65) return `Almost. Fix ${names} by about ${Math.round(worst[0].v)} deg. ${hint}.`
  return `Reset hand. Biggest gap is ${names}. ${hint}. Try again slowly.`
}

export function pickReviewDrills(history: ScoreDetail[]): string[] {
  return history
    .filter((h) => h.score < 80)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((h) => h.id)
}

export function summarizeSession(history: ScoreDetail[]): string {
  if (!history.length) return 'No attempts yet. Hold a sign steady in the mirror to start.'
  const avg = history.reduce((a, h) => a + h.score, 0) / history.length
  const weak = pickReviewDrills(history)
  const weakText = weak.length ? `Review next: ${weak.join(', ')}.` : 'All signs passed. Nice streak.'
  return `Avg ${Math.round(avg)}% over ${history.length} tries. ${weakText}`
}
