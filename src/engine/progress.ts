import type { ScoreDetail } from './types'

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
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function save(rec: Record<string, AttemptRec>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rec))
  } catch { /* private mode */ }
}

export function recordAttempt(
  { id, score, passed }: Pick<ScoreDetail, 'id' | 'score' | 'passed'>,
  rec = load(),
): Record<string, AttemptRec> {
  const prev = rec[id] ?? { best: 0, tries: 0, passed: false }
  const next = {
    ...rec,
    [id]: {
      best: Math.max(prev.best, Math.round(score)),
      tries: prev.tries + 1,
      passed: prev.passed || passed,
    },
  }
  save(next)
  return next
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

// v1 recorded opening the app as practice. Keep the score history and count
// practice days independently from actual scored attempts.
const DAY_KEY = 'signlens_scored_days_v2'
const QUEST_KEY = 'signlens_daily_quest_v1'

export interface DailyQuest {
  day: string
  attempts: number
  best: number
}

function dayStr(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function getDailyQuest(): DailyQuest {
  const day = dayStr(new Date())
  try {
    const saved: DailyQuest | null = JSON.parse(localStorage.getItem(QUEST_KEY) ?? 'null')
    if (saved?.day === day && Number.isFinite(saved.attempts) && Number.isFinite(saved.best)) return saved
  } catch { /* local storage unavailable */ }
  return { day, attempts: 0, best: 0 }
}

export function recordDailyQuest(previous: DailyQuest, score: number): DailyQuest {
  const day = dayStr(new Date())
  const next = {
    day,
    attempts: previous.day === day ? previous.attempts + 1 : 1,
    best: Math.max(previous.day === day ? previous.best : 0, Math.round(score)),
  }
  try { localStorage.setItem(QUEST_KEY, JSON.stringify(next)) } catch { /* local storage unavailable */ }
  return next
}

export function getPracticeDays(): string[] {
  try {
    const days: unknown = JSON.parse(localStorage.getItem(DAY_KEY) ?? '[]')
    return Array.isArray(days) ? days.filter((day) => typeof day === 'string') : []
  } catch {
    return []
  }
}

export function recordPracticeDay(days: string[], now = new Date()): string[] {
  const today = dayStr(now)
  if (days.includes(today)) return days
  const next = [...days, today]
  try {
    localStorage.setItem(DAY_KEY, JSON.stringify(next))
  } catch { /* local storage unavailable */ }
  return next
}

export function practiceStreak(days: string[], now = new Date()): number {
  const active = new Set(days)
  const cursor = new Date(now)
  if (!active.has(dayStr(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (active.has(dayStr(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function practiceWeek(days: string[], now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - 6 + index)
    const id = dayStr(date)
    return { id, date, active: days.includes(id), today: index === 6 }
  })
}
