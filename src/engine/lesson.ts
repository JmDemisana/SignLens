import type { LessonItem, LessonState } from './types'

// Matches thesis spec:
// queue starts with topic items, current n = 1, total t = len.
// Correct: green toast, n = n + 1.
// Incorrect: red alert, t = t + 1, append missed as Question t, n = n + 1.
// Session ends when n > t.
export function createLesson(items: LessonItem[]): LessonState {
  return { queue: [...items], n: 1, t: items.length, attempts: {} }
}

export function currentItem(s: LessonState): LessonItem | null {
  if (s.n > s.t) return null
  return s.queue[s.n - 1] ?? null
}

export function answerCorrect(s: LessonState, id: string, score: number): LessonState {
  const attempts = {
    ...s.attempts,
    [id]: { tries: (s.attempts[id]?.tries ?? 0) + 1, passed: true, lastScore: score },
  }
  return { ...s, n: s.n + 1, attempts }
}

export function answerIncorrect(s: LessonState, id: string, score: number): LessonState {
  const missed = currentItem(s) ?? { id, label: id }
  const attempts = {
    ...s.attempts,
    [id]: { tries: (s.attempts[id]?.tries ?? 0) + 1, passed: false, lastScore: score },
  }
  return { ...s, queue: [...s.queue, missed], t: s.t + 1, n: s.n + 1, attempts }
}

export function isFinished(s: LessonState): boolean {
  return s.n > s.t
}
