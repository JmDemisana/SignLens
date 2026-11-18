import type { LessonState, ScoreDetail, SignLang } from './types'
import { findCourseLesson, signsFor } from './course'
import { answerCorrect, answerIncorrect, currentItem } from './lesson'

export type PracticeSource = { kind: 'unit'; index: number } | { kind: 'course'; chapterId: string; lessonId: string } | { kind: 'saved' } | { kind: 'phrase' } | { kind: 'sign'; id: string }

export interface PracticeSession {
  source: PracticeSource
  lesson: LessonState
  history: ScoreDetail[]
  earnedXP: number
  step: number
  stepScores: (ScoreDetail | null)[]
}

function key(lang: SignLang) {
  return `signlens_session_v5_${lang}`
}

type CourseSource = Extract<PracticeSource, { kind: 'course' }>

function courseStorageKey(lang: SignLang, source: CourseSource) {
  return key(lang) + '/' + source.chapterId + '/' + source.lessonId
}

export function getSession(lang: SignLang, course?: CourseSource): PracticeSession | null {
  try {
    const raw = course ? localStorage.getItem(courseStorageKey(lang, course)) : null
    const saved = JSON.parse(raw ?? localStorage.getItem(key(lang)) ?? 'null') as PracticeSession | null
    if (!saved || !Array.isArray(saved.lesson?.queue) || !Array.isArray(saved.history)) return null
    const { source, lesson } = saved
    if (course && (source?.kind !== 'course' || source.chapterId !== course.chapterId || source.lessonId !== course.lessonId)) return null
    if (!source || !['unit', 'course', 'saved', 'phrase', 'sign'].includes(source.kind)) return null
    if (source.kind === 'course' && !findCourseLesson(lang, source.chapterId, source.lessonId)) return null
    if (!Number.isInteger(lesson.n) || lesson.n < 1 || lesson.n > lesson.queue.length) return null
    if (lesson.t !== lesson.queue.length || !lesson.attempts) return null
    if (!lesson.queue.every((item) => typeof item?.id === 'string' && typeof item.label === 'string'
      && (item.signs === undefined || Array.isArray(item.signs) && item.signs.length > 0 && item.signs.every((id) => typeof id === 'string')))) return null
    if (!saved.history.every((result) => typeof result?.id === 'string' && typeof result.passed === 'boolean' && Number.isFinite(result.score))) return null
    const step = saved.step ?? 0
    const stepScores = saved.stepScores ?? []
    if (!Number.isInteger(step) || step < 0 || step >= signsFor(lesson.queue[lesson.n - 1]).length) return null
    if (!Array.isArray(stepScores) || stepScores.length !== step || !stepScores.every((score, index) =>
      score === null || (score.id === signsFor(lesson.queue[lesson.n - 1])[index] && score.passed && Number.isFinite(score.score)))) return null
    // Alpha 2 stored dictionary phrases as a saved-sign drill.
    const legacyPhrase = source.kind === 'saved' && !!lesson.queue[0]?.signs?.length
    return { ...saved, source: legacyPhrase ? { kind: 'phrase' as const } : source, earnedXP: Number.isFinite(saved.earnedXP) ? saved.earnedXP : 0, step, stepScores }
  } catch {
    return null
  }
}

export function advancePrompt(session: PracticeSession, score: ScoreDetail | null, selfReviewed = false) {
  const item = currentItem(session.lesson)
  if (!item) return null
  const signs = signsFor(item)
  if (score && score.id !== signs[session.step]) return null
  const history = score ? [...session.history, score] : session.history
  if ((score?.passed || selfReviewed) && session.step + 1 < signs.length) {
    return {
      session: { ...session, history, step: session.step + 1, stepScores: [...session.stepScores, score] },
      exerciseScore: null,
    }
  }
  const scored = [...session.stepScores, score].filter((result): result is ScoreDetail => result !== null)
  const average = scored.length ? scored.reduce((sum, result) => sum + result.score, 0) / scored.length : 0
  const exerciseScore = signs.length > 1 && score
    ? { id: item.id, score: average, passed: score.passed, perJoint: [] }
    : null
  const lesson = score?.passed || selfReviewed
    ? answerCorrect(session.lesson, item.id, average)
    : answerIncorrect(session.lesson, item.id, average)
  return { session: { ...session, history, lesson, step: 0, stepScores: [] }, exerciseScore }
}

export function clearSessions(lang: SignLang) {
  try {
    const prefix = key(lang)
    for (const name of Object.keys(localStorage)) {
      if (name === prefix || name.startsWith(prefix + '/')) localStorage.removeItem(name)
    }
  } catch { /* local storage unavailable */ }
}

export function finishSession(lang: SignLang, source: PracticeSource) {
  try {
    if (source.kind === 'course') localStorage.removeItem(courseStorageKey(lang, source))
    const active = getSession(lang)
    if (active?.source.kind === 'course' && (source.kind !== 'course' || source.chapterId !== active.source.chapterId || source.lessonId !== active.source.lessonId)) return
    localStorage.removeItem(key(lang))
  } catch { /* local storage unavailable */ }
}

export function saveSession(lang: SignLang, session: PracticeSession) {
  try {
    // Preserve an alpha 2 course when a different session takes its active slot.
    const previous = getSession(lang)
    if (previous?.source.kind === 'course') {
      const previousKey = courseStorageKey(lang, previous.source)
      if (!localStorage.getItem(previousKey)) localStorage.setItem(previousKey, JSON.stringify(previous))
    }
    const json = JSON.stringify(session)
    if (session.source.kind === 'course') localStorage.setItem(courseStorageKey(lang, session.source), json)
    localStorage.setItem(key(lang), json)
  } catch { /* local storage unavailable */ }
}
