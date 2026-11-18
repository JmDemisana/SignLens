import { useState } from 'react'
import { ArrowRight, Bookmark, Camera, ChartNoAxesColumnIncreasing, Check, Crown, Flame, Play, RotateCcw, Sparkles, Star, Trophy, X } from 'lucide-react'
import { definitionFor } from '../engine/dictionary'
import { courseForLang, findCourseLesson, lessonStars } from '../engine/course'
import type { CourseProgress } from '../engine/course'
import { practiceStreak, practiceWeek, totalXP } from '../engine/progress'
import type { AttemptRec, DailyQuest } from '../engine/progress'
import type { PracticeSession } from '../engine/session'
import { templatesForLang } from '../engine/templates'
import type { SignLang } from '../engine/types'

type HubPage = 'home' | 'learn_path' | 'saved' | 'progress'
type Destination = HubPage | 'alphabet_grid' | 'dictionary'

interface Props {
  page: HubPage
  lang: SignLang
  progress: Record<string, AttemptRec>
  days: string[]
  daily: DailyQuest
  saved: string[]
  session: PracticeSession | null
  onNavigate: (screen: Destination) => void
  courseProgress: CourseProgress
  onLesson: (chapterId: string, lessonId: string) => void
  onResume: () => void
  onPracticeSaved: () => void
  onOpenSign: (id: string) => void
  onRemoveSign: (id: string) => void
  onReset?: () => void
}

function Week({ days }: { days: string[] }) {
  return (
    <section className="sl-card sl-week">
      <div className="sl-card-heading">
        <h2>This week</h2>
        <span><Flame size={16} /> {practiceStreak(days)}-day streak</span>
      </div>
      <ol className="sl-week-grid">
        {practiceWeek(days).map(({ id, date, active, today }) => (
          <li key={id} aria-label={`${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${today ? ', today' : ''}, ${active ? 'practiced' : 'no practice'}`}>
            <span>{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
            <span className={`sl-day${active ? ' is-active' : ''}${today ? ' is-today' : ''}`}>
              {active ? <Check size={17} aria-hidden="true" /> : date.getDate()}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function LearningHub(props: Props) {
  const { page, progress, days, saved, session, courseProgress, onNavigate, onLesson, onResume, onPracticeSaved, onOpenSign, onRemoveSign, onReset } = props
  const [confirmReset, setConfirmReset] = useState(false)
  const curriculum = courseForLang('FSL')
  const all = templatesForLang('FSL')
  const trained = all.filter(({ id }) => progress[id])
  const passed = trained.filter(({ id }) => progress[id].passed)
  const xp = totalXP(progress)
  const streak = practiceStreak(days)
  const starsOf = (chapterId: string, id: string) => lessonStars(courseProgress, chapterId, id)
  const totalStars = curriculum.reduce(
    (sum, ch) => sum + ch.lessons.reduce((s, l) => s + starsOf(ch.id, l.id), 0),
    0,
  )
  const maxStars = curriculum.reduce((sum, ch) => sum + ch.lessons.length * 3, 0)
  const allLessons = curriculum.flatMap((chapter) => chapter.lessons.map((lesson) => ({ chapter, lesson })))
  const next = allLessons.find(({ chapter, lesson }) => starsOf(chapter.id, lesson.id) === 0)
    ?? allLessons.find(({ chapter, lesson }) => starsOf(chapter.id, lesson.id) < 3)
  const current = session?.source.kind === 'course' ? findCourseLesson('FSL', session.source.chapterId, session.source.lessonId) : null
  const STAGE_NAMES = ['Words', 'Phrases', 'Sentences']

  return (
    <div className="sl-platform">
      {(page === 'home' || page === 'learn_path') && (
        <div className="sl-roadmap">
          <section className="sl-roadmap-main" aria-label="FSL learning path">
            {session && !current && (
              <button className="sl-resume-strip" onClick={onResume}><Play size={17} /> Continue {session.source.kind === 'saved' ? 'saved signs' : session.source.kind === 'phrase' ? 'phrase practice' : session.source.kind === 'sign' ? definitionFor(session.source.id).title : 'lesson'} <ArrowRight size={17} /></button>
            )}
            {curriculum.map((chapter, chapterIndex) => {
              const unitStars = chapter.lessons.reduce((sum, item) => sum + starsOf(chapter.id, item.id), 0)
              const unitMax = chapter.lessons.length * 3
              const pct = Math.round((unitStars / Math.max(1, unitMax)) * 100)
              return (
                <section key={chapter.id} className="sl-course-chapter">
                  <div className="sl-chapter-heading">
                    <div className="sl-chapter-meta">
                      <div>
                        <span>Unit {chapterIndex + 1}</span>
                        <h2>{chapter.title}</h2>
                      </div>
                      <strong className="sl-unit-stars"><Star size={13} fill="currentColor" /> {unitStars}/{unitMax}</strong>
                    </div>
                    <div className="sl-chapter-bar" aria-label={`Unit ${chapterIndex + 1} progress: ${pct}%`}>
                      <div className="sl-chapter-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <ol className="sl-lesson-path">
                    {chapter.lessons.map((lesson, index) => {
                      const stars = starsOf(chapter.id, lesson.id)
                      const mastered = stars >= 3
                      const resume = session?.source.kind === 'course' && session.source.chapterId === chapter.id && session.source.lessonId === lesson.id
                      const active = resume || (!current && next?.chapter.id === chapter.id && next.lesson.id === lesson.id)
                      const Icon = active ? Camera : mastered ? Crown : stars > 0 ? Check : index === chapter.lessons.length - 1 ? Trophy : Star
                      const stageLabel = resume
                        ? `${session.lesson.n} of ${session.lesson.t}`
                        : mastered
                          ? '3/3 Stars · Mastered'
                          : stars > 0
                            ? `${stars}/3 Stars · Next: ${STAGE_NAMES[stars]}`
                            : '0/3 Stars · Words'
                      const stateClass = active ? 'is-current' : mastered ? 'is-done' : stars > 0 ? 'is-partial' : 'is-new'
                      return <li className={stateClass} key={lesson.id}>
                        <button className="sl-path-step" onClick={resume ? onResume : () => onLesson(chapter.id, lesson.id)} aria-current={active ? 'step' : undefined}>
                          <div className="sl-node-col">
                            <span className="sl-path-node"><Icon size={26} strokeWidth={2.7} /></span>
                            <span className="sl-node-stars" aria-label={`${stars} of 3 stars`}>
                              {[0, 1, 2].map((i) => (
                                <Star key={i} size={13} className={`sl-star${i < stars ? ' is-earned' : ''}`} fill={i < stars ? 'currentColor' : 'none'} />
                              ))}
                            </span>
                          </div>
                          <span className="sl-path-caption">
                            <strong>{lesson.title}</strong>
                            <span className="sl-path-count">{stageLabel}</span>
                          </span>
                        </button>
                      </li>
                    })}
                  </ol>
                </section>
              )
            })}
          </section>

          <aside className="sl-roadmap-aside">
            <section className="sl-card sl-aside-stats" aria-label="Stats">
              <div className="sl-card-heading"><h2>Stats</h2><Sparkles size={17} color="#7cdaff" /></div>
              <div className="sl-aside-stat-grid">
                <div><span>Stars</span><strong>{totalStars}/{maxStars}</strong></div>
                <div><span>XP</span><strong>{xp}</strong></div>
                <div><span>Streak</span><strong>{streak}d</strong></div>
              </div>
            </section>

            <Week days={days} />

            <div className="sl-roadmap-links">
              <button className="sl-button sl-secondary" onClick={() => onNavigate('saved')}><Bookmark size={16} /> Saved</button>
              <button className="sl-button sl-secondary" onClick={() => onNavigate('progress')}><ChartNoAxesColumnIncreasing size={17} /> Progress</button>
              {onReset && (
                <button
                  className="sl-button sl-secondary"
                  style={confirmReset ? { color: '#ff8a80', borderColor: '#ff4b4b' } : undefined}
                  onClick={() => {
                    if (!confirmReset) {
                      setConfirmReset(true)
                      return
                    }
                    setConfirmReset(false)
                    onReset()
                  }}
                  onBlur={() => setConfirmReset(false)}
                >
                  <RotateCcw size={16} /> {confirmReset ? 'Confirm Reset?' : 'Reset'}
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {page === 'saved' && (
        <>
          <div className="sl-page-heading">
            <div><h1>Saved signs</h1></div>
            {saved.length > 0 && <button className="sl-button sl-primary" onClick={onPracticeSaved}><Play size={17} /> Practice all</button>}
          </div>
          {saved.length === 0 ? (
            <section className="sl-card sl-empty">
              <Bookmark size={30} /><h2>No saved signs yet</h2>
              <button className="sl-button sl-primary" onClick={() => onNavigate('dictionary')}>Open dictionary <ArrowRight size={16} /></button>
            </section>
          ) : (
            <ul className="sl-card sl-list">
              {saved.map((id) => (
                <li key={id}>
                  <button className="sl-list-content" onClick={() => onOpenSign(id)}>
                    <strong>{definitionFor(id).title}</strong>
                    <span>{progress[id] ? `Best ${progress[id].best}%` : 'Not practiced'}</span>
                  </button>
                  <button className="sl-icon-button" onClick={() => onRemoveSign(id)} aria-label={`Remove ${id} from saved signs`}><X size={19} /></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {page === 'progress' && (
        <>
          <div className="sl-page-heading"><div><h1>Progress</h1></div></div>
          <div className="sl-metrics">
            <div className="sl-card"><span>Signs Passed</span><strong>{passed.length}<small> / {all.length}</small></strong></div>
            <div className="sl-card"><span>Attempts</span><strong>{trained.reduce((sum, { id }) => sum + progress[id].tries, 0)}</strong></div>
            <div className="sl-card"><span>Total XP</span><strong>{totalXP(progress)}</strong></div>
          </div>
          <div className="sl-progress-layout">
            {trained.length ? (
              <ul className="sl-card sl-list" aria-label="Practiced signs">
                {[...trained].sort((a, b) => Number(progress[a.id].passed) - Number(progress[b.id].passed) || progress[a.id].best - progress[b.id].best).map(({ id }) => (
                  <li key={id}>
                    <button className="sl-list-content" onClick={() => onOpenSign(id)}>
                      <strong>{definitionFor(id).title}</strong>
                      <span>{progress[id].passed ? 'Passed' : 'Needs review'} · {progress[id].tries} {progress[id].tries === 1 ? 'attempt' : 'attempts'}</span>
                    </button>
                    <strong>{progress[id].best}%</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <section className="sl-card sl-empty"><h2>No scored attempts yet</h2><button className="sl-button sl-primary" onClick={() => onNavigate('learn_path')}>Browse lessons <ArrowRight size={16} /></button></section>
            )}
            <Week days={days} />
          </div>
        </>
      )}
    </div>
  )
}
