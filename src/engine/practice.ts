// Personal practice list: signs saved from the Dictionary for focused
// drilling in Learn. Local only.
import type { LessonItem } from './types'

const KEY = 'signlens_practice_v1'

export function getPracticeList(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as string[]
  } catch {
    return []
  }
}

export function addToPracticeList(id: string): string[] {
  const list = getPracticeList()
  if (!list.includes(id)) {
    list.push(id)
    try {
      localStorage.setItem(KEY, JSON.stringify(list))
    } catch { /* ignore */ }
  }
  return getPracticeList()
}

export function removeFromPracticeList(id: string): string[] {
  const list = getPracticeList().filter((x) => x !== id)
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch { /* ignore */ }
  return list
}

export function practiceListItems(): LessonItem[] {
  return getPracticeList().map((id) => ({ id, label: id }))
}
