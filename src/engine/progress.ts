// Real progress store. Everything persisted locally, nothing hardcoded.
// Mastery comes only from live scored attempts.
export interface AttemptRec {
  best: number
  tries: number
  passed: boolean
}

const KEY = 'signlens_progress_v1'

function load(): Record<string, AttemptRec> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, AttemptRec>
  } catch {
    return {}
  }
}

function save(rec: Record<string, AttemptRec>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rec))
  } catch { /* private mode */ }
}

export function recordAttempt(id: string, score: number): Record<string, AttemptRec> {
  const rec = load()
  const prev = rec[id] ?? { best: 0, tries: 0, passed: false }
  rec[id] = {
    best: Math.max(prev.best, Math.round(score)),
    tries: prev.tries + 1,
    passed: prev.passed || score >= 80,
  }
  save(rec)
  return rec
}

export function getProgress(): Record<string, AttemptRec> {
  return load()
}

export function masteryFor(id: string, rec: Record<string, AttemptRec>): { pct: number; status: 'mastered' | 'learning' | 'review' | 'new' } {
  const r = rec[id]
  if (!r) return { pct: 0, status: 'new' }
  if (r.best >= 85) return { pct: r.best, status: 'mastered' }
  if (r.best >= 60) return { pct: r.best, status: 'learning' }
  return { pct: r.best, status: 'review' }
}

export function totalXP(rec: Record<string, AttemptRec>): number {
  return Object.values(rec).filter((r) => r.passed).length * 10
}

// Streak: count consecutive days (including today) with at least one attempt.
const DAY_KEY = 'signlens_days_v1'

function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function touchToday(): number {
  try {
    const raw = localStorage.getItem(DAY_KEY)
    const days: string[] = raw ? JSON.parse(raw) : []
    const today = dayStr(new Date())
    if (!days.includes(today)) {
      days.push(today)
      localStorage.setItem(DAY_KEY, JSON.stringify(days.slice(-60)))
    }
    // Count back consecutive days.
    let streak = 0
    const set = new Set(days)
    const cursor = new Date()
    // If today has no attempt yet it was just added, so it counts.
    while (set.has(dayStr(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  } catch {
    return 1
  }
}
