// Personal practice list: signs saved from the Dictionary for focused
// drilling in Learn. Local only.
import { templatesForLang } from './templates'
import type { SignLang } from './types'

const KEY = 'signlens_practice_v1'

export function getPracticeList(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? [...new Set(list.filter((id) => typeof id === 'string'))] : []
  } catch {
    return []
  }
}

export function savedForLanguage(lang: SignLang, list: string[]): string[] {
  const supported = new Set(templatesForLang(lang).map(({ id }) => id))
  return list.filter((id) => supported.has(id))
}

export function toggleSavedSign(id: string, current: string[]): string[] {
  const list = current.includes(id) ? current.filter((sign) => sign !== id) : [...current, id]
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch { /* ignore */ }
  return list
}
