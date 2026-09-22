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
  const missed: LessonItem = { id, label: id }
  const attempts = {
    ...s.attempts,
    [id]: { tries: (s.attempts[id]?.tries ?? 0) + 1, passed: false, lastScore: score },
  }
  return { ...s, queue: [...s.queue, missed], t: s.t + 1, n: s.n + 1, attempts }
}

export function isFinished(s: LessonState): boolean {
  return s.n > s.t
}

export const CURRICULUM: { unit: string; items: LessonItem[] }[] = [
  {
    unit: 'Unit 1: Alphabet A-E + Hello',
    items: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }, { id: 'C', label: 'C' }, { id: 'D', label: 'D' }, { id: 'E', label: 'E' }, { id: 'HELLO', label: 'Hello' }],
  },
  {
    unit: 'Unit 2: Alphabet F-J + Thank You',
    items: [{ id: 'F', label: 'F' }, { id: 'G', label: 'G' }, { id: 'H', label: 'H' }, { id: 'I', label: 'I' }, { id: 'J', label: 'J' }, { id: 'THANK YOU', label: 'Thank You' }],
  },
  {
    unit: 'Unit 3: Yes / No + Numbers 0-5',
    items: [{ id: 'YES', label: 'Yes' }, { id: 'NO', label: 'No' }, { id: '0', label: '0' }, { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }, { id: '4', label: '4' }, { id: '5', label: '5' }],
  },
]

import { FSL_CURRICULUM } from './fsl'

export const ASL_CURRICULUM = CURRICULUM

export function curriculumForLang(lang: 'ASL' | 'FSL'): { unit: string; items: LessonItem[] }[] {
  return lang === 'FSL' ? FSL_CURRICULUM : ASL_CURRICULUM
}
