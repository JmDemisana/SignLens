import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { ArrowRight, BookOpen, Camera, CheckCircle2, Cpu, Flame, Layers, RefreshCw, Search, Settings as SettingsIcon, Sparkles, Star, Trophy, X, XCircle } from 'lucide-react'
import './App.css'
import './platform.css'
import pkg from '../package.json'
import HandReference from './components/HandReference'
import PracticeWindowNotice from './components/PracticeWindowNotice'
import PracticeGuide from './components/PracticeGuide'
import LandmarkOverlay from './components/LandmarkOverlay'
import LearningHub from './components/LearningHub'
import LiveCoachPanel from './components/LiveCoachPanel'
import SignDictionary from './components/SignDictionary'
import VideoCalibrator from './components/VideoCalibrator'
import WebcamVideo from './components/WebcamVideo'
import { useCamera } from './hooks/useCamera'
import { appendTelemetryRow, clearTelemetryRows, exportTelemetryCsv, getTelemetryRows, useSignCheck } from './hooks/useSignCheck'
import { coachAdvice, summarizeSession } from './engine/coach'
import { definitionFor, howToFor } from './engine/dictionary'
import { signImageFor, signVideoFor } from './engine/signVideos'
import { createLesson, currentItem, isFinished } from './engine/lesson'
import { completeCourseLesson, findCourseLesson, getCourseProgress, itemsForLesson, lessonStars, resetCourseProgress, signsFor } from './engine/course'
import { clearPersonalAngles, isCalibrated, savePersonalAngles } from './engine/personal'
import { getPracticeList, savedForLanguage, toggleSavedSign } from './engine/practice'
import { getDailyQuest, getPracticeDays, getProgress, practiceStreak, recordAttempt, recordDailyQuest, recordPracticeDay, totalXP } from './engine/progress'
import { advancePrompt, clearSessions, finishSession, getSession, saveSession } from './engine/session'
import type { PracticeSource } from './engine/session'
import { findTemplate } from './engine/templates'
import { supportsPersonalComparison } from './engine/personalPilot'
import type { HandLandmarks, LessonItem, ScoreDetail, SignLang } from './engine/types'

const publicScreens = ['home', 'learn_path', 'alphabet_grid', 'dictionary', 'saved', 'progress', 'settings', 'onboarding'] as const
type PublicScreen = typeof publicScreens[number]
type Screen = PublicScreen | 'learn_mirror_prompt' | 'learn_mirror_correct' | 'learn_mirror_incorrect' | 'learn_complete' | 'alphabet_drill'

function readPreference(key: string) {
  try { return localStorage.getItem(key) }
  catch { return null }
}

function routedSession() {
  const params = new URLSearchParams(window.location.search)
  const chapterId = params.get('chapter')
  const lessonId = params.get('lesson')
  if (params.get('screen') === 'learn_mirror_prompt' && chapterId && lessonId) return getSession('FSL', { kind: 'course', chapterId, lessonId })
  const active = getSession('FSL')
  const practice = params.get('practice')
  if (params.get('screen') === 'learn_mirror_prompt' && practice && practice !== active?.lesson.queue[0]?.id + '/' + active?.source.kind) return null
  return active
}

function getRoute(): Screen {
  const params = new URLSearchParams(window.location.search)
  const screen = params.get('screen')
  const matched = publicScreens.find((route) => route === screen)
  if (matched) return matched
  if (screen === 'learn_mirror_prompt' && routedSession()) return 'learn_mirror_prompt'
  if (screen?.startsWith('learn_')) return 'learn_path'
  if (screen === 'alphabet_drill' || params.get('tab') === 'alphabet') return 'alphabet_grid'
  if (params.get('tab') === 'dictionary') return 'dictionary'
  if (params.get('tab') === 'settings') return 'settings'
  return 'learn_path'
}

function readDictionarySign() {
  return new URLSearchParams(window.location.search).get('sign')
}

export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('calibrate') === '1') {
    return <VideoCalibrator />
  }
  return <PracticeApp />
}

function PracticeApp() {
  const [screen, setScreen] = useState<Screen>(getRoute)
  const [onboardStep, setOnboardStep] = useState(0)
  const [drillReset, setDrillReset] = useState(0)
  const [holdMs, setHoldMs] = useState(0)
  const [drillScore, setDrillScore] = useState<number | null>(null)
  const [selectedLetter, setSelectedLetter] = useState('A')
  const [dictionarySign, setDictionarySign] = useState(readDictionarySign)
  const [dictionaryCamera, setDictionaryCamera] = useState(false)
  const [practiceCamera, setPracticeCamera] = useState(true)
  const [learnHoldMs, setLearnHoldMs] = useState(0)
  const [telemetryCount, setTelemetryCount] = useState(() => getTelemetryRows().length)
  const [confirmResetAll, setConfirmResetAll] = useState(false)
  const [pipExpanded, setPipExpanded] = useState(false)
  const [savedSigns, setSavedSigns] = useState(getPracticeList)
  const [progressRec, setProgressRec] = useState(getProgress)
  const [practiceDays, setPracticeDays] = useState(getPracticeDays)
  const [dailyQuest, setDailyQuest] = useState(getDailyQuest)
  const [isMirrored, setIsMirrored] = useState(() => readPreference('signlens_mirrored') !== '0')

  const isCameraNeeded = (screen === 'learn_mirror_prompt' && practiceCamera) || screen === 'alphabet_drill'
    || (screen === 'dictionary' && dictionaryCamera) || (screen === 'onboarding' && onboardStep === 2)
  const { stream: cameraStream, error: cameraError, devices: availableCameras, deviceId: selectedCameraId, setDeviceId: setSelectedCameraId, retry: retryCamera } = useCamera(isCameraNeeded)
  const isCameraLive = !!cameraStream

  // Real working preferences, persisted locally.
  const [showGhost, setShowGhost] = useState(() => readPreference('signlens_ghost') !== '0')
  const [showSkeleton, setShowSkeleton] = useState(() => {
    try {
      return localStorage.getItem('signlens_skeleton') !== '0'
    } catch {
      return true
    }
  })
  // Hand dominance: left and right hands trace mirror paths. Motion scoring
  // always tries both orientations, this flips the 3D demo to match the learner.
  const [hand, setHand] = useState<'Auto' | 'Right' | 'Left'>(() => {
    try {
      return (localStorage.getItem('signlens_hand') as 'Auto' | 'Right' | 'Left') || 'Auto'
    } catch {
      return 'Auto'
    }
  })
  const setHandPersist = (h: 'Auto' | 'Right' | 'Left') => {
    setHand(h)
    try {
      localStorage.setItem('signlens_hand', h)
    } catch { /* ignore */ }
  }
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem('signlens_sound') !== '0'
    } catch {
      return true
    }
  })
  const [ttsRate, setTtsRate] = useState(() => {
    try {
      return Number(localStorage.getItem('signlens_tts') || '0.95')
    } catch {
      return 0.95
    }
  })
  const togglePref = (key: string, setter: (v: boolean) => void, value: boolean) => {
    setter(!value)
    try {
      localStorage.setItem(key, !value ? '1' : '0')
    } catch { /* ignore */ }
  }

  const [lang] = useState<SignLang>('FSL')
  const [courseProgress, setCourseProgress] = useState(() => getCourseProgress('FSL'))
  const [session, setSession] = useState(routedSession)
  const [feedback, setFeedback] = useState<{ item: LessonItem; score: ScoreDetail | null; selfReviewed: boolean; xp: number; landmarks: HandLandmarks | null; aspect: number } | null>(null)
  const submitting = useRef(false)
  const lesson = session?.lesson ?? createLesson([])
  const history = session?.history ?? []
  const source = session?.source
  const courseLesson = source?.kind === 'course' ? findCourseLesson(lang, source.chapterId, source.lessonId) : null
  const unitLabel = courseLesson ? `${courseLesson.chapter.title} · ${courseLesson.lesson.title}` : source?.kind === 'unit' ? 'Previous lesson' : source?.kind === 'phrase' ? 'Phrase practice' : source?.kind === 'saved' ? 'Saved practice' : source?.kind === 'sign' ? definitionFor(source.id).title : 'Practice'
  const prompt = currentItem(lesson)
  const promptSigns = prompt ? signsFor(prompt) : []
  const learnTarget = promptSigns[session?.step ?? 0] ?? ''
  const learnTemplate = findTemplate(learnTarget)
  const saved = savedForLanguage(lang, savedSigns)
  const activeLesson = screen.startsWith('learn_mirror') || screen === 'learn_complete'
  const practiceExit = source?.kind === 'saved' ? 'saved' : source?.kind === 'sign' || source?.kind === 'phrase' ? 'dictionary' : 'learn_path'

  const navigateTo = (next: Screen, sign?: string, nextSource = source) => {
    if (next === 'learn_mirror_prompt') {
      submitting.current = false
      setLearnHoldMs(0)
    }
    if (next === 'alphabet_drill') {
      setDrillScore(null)
      setHoldMs(0)
      setDrillReset((value) => value + 1)
    }
    if (next === 'onboarding') setOnboardStep(0)
    if (next !== 'dictionary') setDictionaryCamera(false)
    if (next === 'dictionary') setDictionarySign(sign ?? null)
    setScreen(next)
    const url = new URL(window.location.href)
    url.searchParams.delete('tab')
    url.searchParams.delete('practice')
    if (next.startsWith('learn_mirror') && nextSource?.kind !== 'course') {
      const active = getSession(lang)
      if (active) url.searchParams.set('practice', active.lesson.queue[0].id + '/' + active.source.kind)
    }
    url.searchParams.delete('chapter')
    url.searchParams.delete('lesson')
    if (next.startsWith('learn_mirror') && nextSource?.kind === 'course') {
      url.searchParams.set('chapter', nextSource.chapterId)
      url.searchParams.set('lesson', nextSource.lessonId)
    }
    url.searchParams.set('screen', next.startsWith('learn_mirror') ? 'learn_mirror_prompt' : next === 'learn_complete' ? practiceExit : next)
    if (next === 'dictionary' && sign) url.searchParams.set('sign', sign)
    else url.searchParams.delete('sign')
    if (url.href !== window.location.href) {
      if (next === 'learn_complete' && activeLesson) window.history.replaceState(null, '', url)
      else window.history.pushState(null, '', url)
    }
    if (next !== screen) document.querySelector('main')?.scrollTo(0, 0)
  }

  const selectDictionarySign = (id: string | null) => {
    setDictionarySign(id)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('sign', id)
    else url.searchParams.delete('sign')
    window.history.replaceState(null, '', url)
  }

  useEffect(() => {
    const sync = () => {
      const nextScreen = getRoute()
      if (nextScreen === 'learn_mirror_prompt') {
        const restored = routedSession()
        if (restored) saveSession('FSL', restored)
        setSession(restored)
        submitting.current = false
        setLearnHoldMs(0)
      }
      setScreen(nextScreen)
      setDictionarySign(readDictionarySign())
      setDictionaryCamera(false)
    }
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const startPractice = (nextSource: PracticeSource, items: LessonItem[]) => {
    if (!items.length) return
    const next = { source: nextSource, lesson: createLesson(items), history: [], earnedXP: 0, step: 0, stepScores: [] }
    saveSession(lang, next)
    setSession(next)
    setFeedback(null)
    setPracticeCamera(true)
    navigateTo('learn_mirror_prompt', undefined, nextSource)
  }

  const pickLesson = (chapterId: string, lessonId: string) => {
    const selected = findCourseLesson(lang, chapterId, lessonId)
    if (!selected) return
    const course = { kind: 'course' as const, chapterId, lessonId }
    const paused = getSession(lang, course)
    if (paused) {
      saveSession(lang, paused)
      setSession(paused)
      navigateTo('learn_mirror_prompt', undefined, course)
      return
    }
    const stars = lessonStars(courseProgress, chapterId, lessonId)
    startPractice({ kind: 'course', chapterId, lessonId }, itemsForLesson(selected.lesson, stars))
  }
  const startSign = (id: string) => {
    if (session?.source.kind === 'sign' && session.source.id === id && !isFinished(session.lesson)) navigateTo('learn_mirror_prompt')
    else startPractice({ kind: 'sign', id }, [{ id, label: definitionFor(id).title }])
  }
  const startPracticePhrase = (signs: string[], label: string) => {
    if (!signs.length) return
    startPractice({ kind: 'phrase' }, [{ id: signs.join('_'), label, signs }])
  }
  const clearAllLocalProgress = () => {
    try {
      localStorage.removeItem('signlens_progress_v1')
      localStorage.removeItem('signlens_scored_days_v2')
      localStorage.removeItem('signlens_daily_quest_v1')
      localStorage.removeItem('signlens_practice_v1')
    } catch { /* ignore */ }
    clearTelemetryRows()
    setTelemetryCount(0)
    setCourseProgress(resetCourseProgress(lang))
    clearSessions(lang)
    setSession(null)
    setSavedSigns([])
    setProgressRec(getProgress())
    setPracticeDays(getPracticeDays())
    setDailyQuest(getDailyQuest())
  }
  const handleResetAllProgress = () => {
    clearAllLocalProgress()
  }

  const startPracticeList = () => {
    if (session?.source.kind === 'saved' && !isFinished(session.lesson)) navigateTo('learn_mirror_prompt')
    else startPractice({ kind: 'saved' }, saved.map((id) => ({ id, label: definitionFor(id).title })))
  }
  const toggleSaved = (id: string) => setSavedSigns(toggleSavedSign(id, savedSigns))
  const openSign = (id: string) => navigateTo('dictionary', id)
  const exitPractice = () => navigateTo(practiceExit, source?.kind === 'sign' ? source.id : undefined)
  const saveAttempt = (score: ScoreDetail) => {
    const next = recordAttempt(score, progressRec)
    setProgressRec(next)
    setPracticeDays(recordPracticeDay(practiceDays))
    setDailyQuest(recordDailyQuest(dailyQuest, score.score))
    return totalXP(next) - totalXP(progressRec)
  }

  const mirrorVideoRef = useRef<HTMLVideoElement | null>(null)
  const live = useSignCheck(mirrorVideoRef, {
    targetId: learnTarget,
    lang,
    active: screen === 'learn_mirror_prompt' && isCameraLive,
    resetKey: `${unitLabel}/${lesson.n}/${session?.step ?? 0}`,
  })

  // Alphabet drill tracks whichever letter is selected.
  const alphaVideoRef = useRef<HTMLVideoElement | null>(null)
  const alpha = useSignCheck(alphaVideoRef, {
    targetId: selectedLetter,
    lang,
    active: screen === 'alphabet_drill' && isCameraLive,
    resetKey: drillReset,
  })
  const alphaPassed = alpha.detail?.id === selectedLetter && alpha.detail.passed
  const alphaTemplate = findTemplate(selectedLetter)
  const alphaMotion = alphaTemplate?.kind === 'dynamic'
  const drillComplete = drillScore !== null
  const finishDrill = useEffectEvent(() => {
    const score = alpha.detail
    if (drillComplete || !score?.passed || score.id !== selectedLetter || !alpha.hasFreshScore()) return
    setDrillScore(score.score)
    setHoldMs(2000)
    saveAttempt(score)
    const meanErr = score.perJoint.length ? score.perJoint.reduce((a, b) => a + b, 0) / score.perJoint.length : 0
    appendTelemetryRow({
      timestamp: new Date().toISOString(),
      targetId: selectedLetter,
      kind: alphaMotion ? 'dynamic' : 'static',
      score: score.score,
      meanErrorDeg: meanErr,
      passed: true,
      latencyMs: alpha.latencyMs,
    })
    setTelemetryCount(getTelemetryRows().length)
  })
  useEffect(() => {
    if (screen !== 'alphabet_drill' || !alphaPassed || !isCameraLive || drillComplete) return
    if (alphaMotion) {
      const timer = window.setTimeout(() => finishDrill(), 0)
      return () => window.clearTimeout(timer)
    }
    const started = performance.now()
    const interval = window.setInterval(() => setHoldMs(Math.min(2000, performance.now() - started)), 50)
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval)
      finishDrill()
    }, 2000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
      setHoldMs(0)
    }
  }, [screen, selectedLetter, alphaPassed, alphaMotion, isCameraLive, drillReset, drillComplete])

  const dictVideoRef = useRef<HTMLVideoElement | null>(null)

  const liveAdvice = learnTemplate?.twoHanded && live.landmarks && !live.secondLandmarks
    ? `This FSL sign uses 2 hands in the video. Raise your second hand into the camera frame! (${learnTemplate.hint})`
    : learnTemplate?.twoHanded === false && live.landmarks && live.secondLandmarks
      ? `This FSL sign uses only 1 hand in the video. Lower your non-signing hand! (${learnTemplate.hint})`
      : live.detail && learnTemplate
        ? coachAdvice(live.detail, learnTemplate.hint)
        : learnTemplate?.kind === 'dynamic' && live.landmarks ? learnTemplate.hint : 'Show your hand(s) in frame to start live scoring.'
  const alphaAdvice = alpha.detail
    ? coachAdvice(alpha.detail, findTemplate(selectedLetter)?.hint ?? '')
    : alphaMotion && alpha.landmarks ? alphaTemplate.hint : 'Show your hand in frame to start live scoring.'

  const finishPrompt = (score: ScoreDetail | null, selfReviewed = false) => {
    const item = currentItem(lesson)
    if (!session || !item || submitting.current) return
    const outcome = advancePrompt(session, score, selfReviewed)
    if (!outcome) return
    submitting.current = true
    const xp = score ? saveAttempt(score) : 0
    if (score) {
      const meanErr = score.perJoint.length ? score.perJoint.reduce((a, b) => a + b, 0) / score.perJoint.length : 0
      appendTelemetryRow({
        timestamp: new Date().toISOString(),
        targetId: score.id,
        kind: learnTemplate?.kind ?? 'static',
        score: score.score,
        meanErrorDeg: meanErr,
        passed: score.passed,
        latencyMs: live.latencyMs,
      })
      setTelemetryCount(getTelemetryRows().length)
    }
    const next = {
      ...outcome.session,
      earnedXP: session.earnedXP + xp,
    }
    const completed = isFinished(next.lesson)
    const advancedStep = next.step > session.step && !completed
    if (completed && source?.kind === 'course') {
      const average = next.history.length ? next.history.reduce((sum, result) => sum + result.score, 0) / next.history.length : 0
      setCourseProgress(completeCourseLesson(lang, source.chapterId, source.lessonId, average, courseProgress))
    }
    if (completed) finishSession(lang, next.source)
    else saveSession(lang, next)
    setSession(next)
    if (advancedStep) {
      submitting.current = false
      setLearnHoldMs(0)
      return
    }
    const video = mirrorVideoRef.current
    const aspect = video?.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9
    setFeedback({ item: { id: learnTarget, label: definitionFor(learnTarget).title }, score, selfReviewed, xp, landmarks: score ? score.secondHand ? live.secondLandmarks : live.landmarks : null, aspect })
    navigateTo(completed ? 'learn_complete' : score?.passed || selfReviewed ? 'learn_mirror_correct' : 'learn_mirror_incorrect')
  }

  const learnPassed = live.detail?.id === learnTarget && live.detail.passed
  const learnMotion = learnTemplate?.kind === 'dynamic'
  const freshLessonScore = () => live.detail?.id === learnTarget && live.hasFreshScore() ? live.detail : null
  const autoSubmitLearn = useEffectEvent(() => {
    if (submitting.current || !live.detail?.passed || !live.hasFreshScore()) return
    finishPrompt(live.detail, false)
  })
  useEffect(() => {
    if (screen !== 'learn_mirror_prompt' || !learnPassed || !isCameraLive || submitting.current) return
    if (learnMotion) {
      const timer = window.setTimeout(() => autoSubmitLearn(), 0)
      return () => window.clearTimeout(timer)
    }
    const started = performance.now()
    const interval = window.setInterval(() => setLearnHoldMs(Math.min(1500, performance.now() - started)), 50)
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval)
      setLearnHoldMs(1500)
      autoSubmitLearn()
    }, 1500)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
      setLearnHoldMs(0)
    }
  }, [screen, learnTarget, learnPassed, learnMotion, isCameraLive, lesson.n, session?.step])
  const sessionSummary = summarizeSession(history)
  const progressPct = Math.min(100, Math.round(((lesson.n - 1) / Math.max(1, lesson.t)) * 100))

  const desktop = isTauri()
  const [updateStatus, setUpdateStatus] = useState('Check for a newer desktop release.')
  const [updateBusy, setUpdateBusy] = useState(false)
  const checkForUpdates = async () => {
    if (updateBusy || !desktop) return
    setUpdateBusy(true)
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (!update) {
        setUpdateStatus('You are on the latest version.')
      } else {
        setUpdateStatus(`Downloading v${update.version}...`)
        await update.downloadAndInstall()
        setUpdateStatus(`v${update.version} installed. Restarting...`)
        const { relaunch } = await import('@tauri-apps/plugin-process')
        await relaunch()
      }
    } catch (error) {
      setUpdateStatus(`Could not check for updates. ${String(error).slice(0, 120)}`)
    } finally {
      setUpdateBusy(false)
    }
  }

  const alphabetBase = [
    { char: 'A', desc: 'Fist with thumb upright along side of index finger' },
    { char: 'B', desc: 'Flat upright palm facing outward with thumb tucked across palm' },
    { char: 'C', desc: 'Curved fingers and thumb forming an open C silhouette' },
    { char: 'D', desc: 'Index finger pointing upright, thumb touching middle fingertip' },
    { char: 'E', desc: 'All fingertips curled tightly downward over thumb' },
    { char: 'F', desc: 'Index and thumb tips touching in an OK circle, other 3 fingers raised' },
    { char: 'G', desc: 'Index finger and thumb pointing parallel horizontally' },
    { char: 'H', desc: 'Index and middle fingers extended horizontally together' },
    { char: 'I', desc: 'Pinky finger extended upright, remaining fingers folded' },
    { char: 'J', desc: 'Trace a curved J hook in the air with extended pinky' },
    { char: 'K', desc: 'Index upright, middle forward at 45 deg, thumb between them' },
    { char: 'L', desc: 'Thumb and index finger perpendicular forming a crisp L' },
    { char: 'M', desc: 'Thumb tucked under first three folded fingers' },
    { char: 'N', desc: 'Thumb tucked under first two folded fingers' },
    { char: 'O', desc: 'All fingertips meeting thumb tip to form a round O' },
    { char: 'P', desc: 'K hand shape inverted and pointing downward' },
    { char: 'Q', desc: 'G hand shape pointing downward toward floor' },
    { char: 'R', desc: 'Index and middle fingers crossed tightly' },
    { char: 'S', desc: 'Closed fist with thumb wrapped securely across fingers' },
    { char: 'T', desc: 'Thumb tucked between index and middle finger knuckles' },
    { char: 'U', desc: 'Index and middle fingers held upright together' },
    { char: 'V', desc: 'Peace sign with index and middle spread in an open V' },
    { char: 'W', desc: 'Index, middle, and ring fingers spread upward' },
    { char: 'X', desc: 'Index finger hooked like a curved key' },
    { char: 'Y', desc: 'Thumb and pinky fully extended, middle fingers folded' },
    { char: 'Z', desc: 'Index finger traces a Z trajectory in the air' },
  ]

  const alphabetData = alphabetBase

  const currentLetter = alphabetData.find((l) => l.char === selectedLetter) || alphabetData[1]

  return (
    <div className="duo-app-shell">
      <header className="duo-header sl-header">
        <button className="duo-brand" onClick={() => navigateTo('learn_path')} aria-label="SignLens learning path">
          <span className="duo-brand-icon"><Camera size={22} /></span>
          <span>SignLens</span>
        </button>

        <nav className="duo-nav-links" aria-label="Main navigation">
          {([
            { label: 'Learn', route: 'learn_path', icon: BookOpen, active: screen === 'home' || screen.startsWith('learn') || screen === 'saved' || screen === 'progress' },
            { label: 'Letters', route: 'alphabet_grid', icon: Layers, active: screen.startsWith('alphabet') },
            { label: 'Dictionary', route: 'dictionary', icon: Search, active: screen === 'dictionary' },
            { label: 'Settings', route: 'settings', icon: SettingsIcon, active: screen === 'settings' },
          ] as const).map(({ label, route, icon: Icon, active }) => (
            <button key={route} className={`duo-nav-item ${active ? 'active' : ''}`} onClick={() => navigateTo(route)} aria-current={active ? 'page' : undefined}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>

        <div className="sl-header-controls">
          <button className="sl-streak" onClick={() => navigateTo('progress')} title="Practice streak">
            <Flame size={15} /> {practiceStreak(practiceDays)}d
          </button>
          <button className="sl-header-xp" onClick={() => navigateTo('progress')} title="Total XP earned">
            <Sparkles size={15} /> {totalXP(progressRec)} XP
          </button>
        </div>
      </header>

      <main className={`duo-main-content${['home', 'learn_path', 'saved', 'progress', 'dictionary'].includes(screen) ? ' sl-main' : ''}`}>
        {(screen === 'learn_mirror_prompt' || screen === 'alphabet_drill') && <PracticeWindowNotice />}
        {/* ========================================================================= */}
        {/* ONBOARDING: welcome, how it works, camera setup */}
        {/* ========================================================================= */}
        {screen === 'onboarding' && (
          <div className="duo-celebration-container" style={{ maxWidth: '720px' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '48px',
                    height: '8px',
                    borderRadius: '999px',
                    background: i <= onboardStep ? '#58cc02' : '#37464f',
                  }}
                />
              ))}
            </div>

            {onboardStep === 0 && (
              <div>
                <div className="duo-celebration-title">Meet your practice mirror</div>
                <div className="duo-celebration-subtitle">
                  Watch a reference and practice in a camera mirror. Hand tracking runs on your device. The website needs a connection to load.
                </div>
                <div className="duo-results-grid">
                  <div className="duo-result-card">
                    <div className="duo-result-lbl">Mirror</div>
                    <div className="duo-result-val" style={{ color: '#1cb0f6' }}>Live</div>
                    <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>21-point skeleton</span>
                  </div>
                  <div className="duo-result-card">
                    <div className="duo-result-lbl">Check</div>
                    <div className="duo-result-val" style={{ color: '#58cc02' }}>Angles</div>
                    <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>Personal pose comparison</span>
                  </div>
                  <div className="duo-result-card">
                    <div className="duo-result-lbl">Privacy</div>
                    <div className="duo-result-val" style={{ color: '#ffc800' }}>Local</div>
                    <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>Camera processing</span>
                  </div>
                </div>
              </div>
            )}

            {onboardStep === 1 && (
              <div>
                <div className="duo-celebration-title">How practice works</div>
                <div className="duo-celebration-subtitle">
                  Choose a lesson, watch the reference, and try the sign. Turn on the camera when you want to see hand tracking, then continue when ready.
                </div>
                <div
                  style={{
                    background: 'var(--duo-card)',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '20px',
                    padding: '18px 24px',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>1. Learn: watch and practice selected signs</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>2. Letters: explore the alphabet and use the mirror</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>3. Dictionary: search signer video examples</div>
                </div>
              </div>
            )}

            {onboardStep === 2 && (
              <div style={{ width: '100%' }}>
                <div className="duo-celebration-title">Camera setup</div>
                <div className="duo-celebration-subtitle">
                  Allow camera access when the browser asks. Pick your camera below and check the live preview.
                </div>
                <div className="duo-camera-card" style={{ aspectRatio: '16/9' }}>
                  <WebcamVideo stream={cameraStream} isLive={isCameraLive} isMirrored={isMirrored} />
                  <div
                    className="duo-camera-badge"
                    style={{
                      color: isCameraLive ? '#58cc02' : '#ff4b4b',
                      borderColor: isCameraLive ? 'rgba(88, 204, 2, 0.4)' : 'rgba(255, 75, 75, 0.4)',
                    }}
                  >
                    <span
                      className="duo-camera-dot"
                      style={{ background: isCameraLive ? '#58cc02' : '#ff4b4b' }}
                    />
                    {isCameraLive ? 'CAMERA LIVE' : cameraError ?? 'WAITING FOR PERMISSION...'}
                  </div>
                  {cameraError && (
                    <div className="duo-camera-error-banner">
                      <span>{cameraError}</span>
                      <button onClick={retryCamera} className="duo-camera-retry-btn">
                        Retry Camera
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {availableCameras.length > 0 && (
                    <select
                      aria-label="Camera device"
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      style={{ background: '#131f24', color: '#fff', border: '2px solid var(--duo-border)', borderRadius: '12px', padding: '10px 14px', fontWeight: 800 }}
                    >
                      <option value="">Default camera</option>
                      {availableCameras.map((c, i) => (
                        <option key={c.deviceId} value={c.deviceId}>
                          {c.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                  <button className="duo-btn duo-btn-secondary" style={{ padding: '10px 18px' }} onClick={() => togglePref('signlens_mirrored', setIsMirrored, isMirrored)}>
                    Mirror: {isMirrored ? 'On' : 'Off'}
                  </button>
                  <button className="duo-btn duo-btn-secondary" style={{ padding: '10px 18px' }} onClick={retryCamera}>
                    <RefreshCw size={14} /> Test Camera
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700, marginTop: '10px' }}>
                  Tip: face a window, plain background, one signer, hand fully in frame.
                </div>
              </div>
            )}

            {onboardStep === 3 && (
              <div>
                <div className="duo-celebration-title">Ready to sign</div>
                <div className="duo-celebration-subtitle">
                  You can browse lessons and signs, then open a practice mirror to start live scoring.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              {onboardStep > 0 && (
                <button className="duo-btn duo-btn-secondary" style={{ flex: 1, padding: '14px' }} onClick={() => setOnboardStep((s) => s - 1)}>
                  Back
                </button>
              )}
              {onboardStep < 3 ? (
                <button
                  className="duo-btn duo-btn-green"
                  style={{ flex: 2, padding: '14px' }}
                  onClick={() => setOnboardStep((s) => s + 1)}
                >
                  Continue <ArrowRight size={18} />
                </button>
              ) : (
                <button className="duo-btn duo-btn-green" style={{ flex: 2, padding: '14px' }} onClick={() => navigateTo('home')}>
                  Start Practicing
                </button>
              )}
            </div>
            <button
              className="duo-btn duo-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '12px' }}
              onClick={() => navigateTo('home')}
            >
              Skip intro
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 1 - SCREEN 1: PICK A LESSON (ROADMAP PATH) */}
        {/* ========================================================================= */}
        {(screen === 'home' || screen === 'learn_path' || screen === 'saved' || screen === 'progress') && (
          <LearningHub
            page={screen}
            lang={lang}
            days={practiceDays}
            daily={dailyQuest}
            progress={progressRec}
            saved={saved}
            session={session && !isFinished(session.lesson) ? session : null}
            onNavigate={navigateTo}
            courseProgress={courseProgress}
            onLesson={pickLesson}
            onResume={() => navigateTo('learn_mirror_prompt')}
            onPracticeSaved={startPracticeList}
            onOpenSign={openSign}
            onRemoveSign={toggleSaved}
            onReset={handleResetAllProgress}
          />
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 1 - SCREEN 2A: PRACTICE MIRROR (NODE A - PROMPT STATE) */}
        {/* ========================================================================= */}
        {screen === 'learn_mirror_prompt' && (
          <div className="duo-quiz-container">
            {/* Top Quiz Bar */}
            <div className="duo-quiz-top-bar">
              <button className="duo-close-btn" aria-label="Leave practice" onClick={exitPractice}>
                <X size={28} />
              </button>
              <progress className="sl-lesson-progress" value={progressPct} max={100} aria-label="Lesson progress" />
              <div className="sl-quiz-pills">
                <span className="sl-hud-pill">{lesson.n} / {lesson.t}</span>
                <span className={`sl-badge ${learnTemplate?.twoHanded ? 'is-purple' : 'is-blue'}`}>
                  {learnTemplate?.twoHanded ? '2 Hands' : '1 Hand'}
                </span>
              </div>
            </div>

            {/* Quiz Body */}
            <div className="duo-quiz-body">
              {/* Left: Camera Feed Viewfinder */}
              <div className="duo-camera-card">
                <WebcamVideo stream={cameraStream} isLive={isCameraLive} isMirrored={isMirrored} videoRef={mirrorVideoRef}
                  landmarks={showSkeleton ? live.landmarks : null} secondLandmarks={showSkeleton ? live.secondLandmarks : null} landmarkColor={live.detail?.passed ? '#9bfa5e' : '#75d9ff'} perJoint={live.detail?.perJoint} secondHand={live.detail?.secondHand} />
                {showGhost && !live.landmarks && <PracticeGuide sign={learnTarget} flip={hand === 'Left'} active={isCameraLive} />}
                <div
                  className="duo-camera-badge"
                  style={{
                    color: isCameraLive ? '#58cc02' : '#1cb0f6',
                    borderColor: isCameraLive ? 'rgba(88, 204, 2, 0.4)' : 'rgba(28, 176, 246, 0.4)',
                  }}
                >
                  <span
                    className={`duo-camera-dot ${isCameraLive ? 'live' : ''}`}
                    style={{ background: isCameraLive ? '#58cc02' : '#1cb0f6' }}
                  ></span>
                  {!isCameraLive
                    ? 'CAMERA OFF'
                    : live.failed
                      ? 'TRACKING UNAVAILABLE'
                      : !live.ready
                        ? 'STARTING...'
                        : live.secondLandmarks
                          ? '2 HANDS'
                          : live.landmarks
                            ? learnTemplate?.twoHanded
                              ? 'SHOW BOTH HANDS'
                              : '1 HAND'
                            : learnTemplate?.twoHanded
                              ? 'SHOW BOTH HANDS'
                              : 'SHOW HAND'}
                </div>
                {practiceCamera && !cameraError && <button className="sl-camera-off" onClick={() => setPracticeCamera(false)}>Turn off camera</button>}
                {(() => {
                  const pipVideo = signVideoFor(learnTarget, lang)
                  const pipImage = !pipVideo ? signImageFor(learnTarget) : null
                  if (!pipVideo && !pipImage) return null
                  return (
                    <button
                      type="button"
                      className={`sl-mobile-pip${pipExpanded ? ' is-expanded' : ''}`}
                      onClick={() => setPipExpanded((v) => !v)}
                      aria-label={pipExpanded ? 'Minimize instructor video' : 'Expand instructor video'}
                    >
                      {pipVideo ? (
                        <video
                          key={pipVideo}
                          src={pipVideo}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="auto"
                        />
                      ) : (
                        <img src={pipImage!} alt={`Reference for ${learnTarget}`} style={hand === 'Left' ? { transform: 'scaleX(-1)' } : undefined} />
                      )}
                      <span className="sl-mobile-pip-tag">{pipExpanded ? 'Tap to shrink' : 'Instructor'}</span>
                    </button>
                  )
                })()}
                {!practiceCamera && <div className="sl-scan-placeholder"><Camera size={30} /><button className="duo-btn duo-btn-blue" onClick={() => setPracticeCamera(true)}>Turn on camera</button></div>}
                {cameraError && (
                  <div className="duo-camera-error-banner">
                    <span>{cameraError}</span>
                    <button onClick={retryCamera} className="duo-camera-retry-btn">
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Target Prompt & Helper */}
              <div className="duo-prompt-card">
                <div>
                  <div className="sl-course-context">{unitLabel} · Prompt {lesson.n} of {lesson.t}</div>
                  {promptSigns.length > 1 ? (
                    <>
                      <div className="sl-phrase-title">{prompt?.label}</div>
                      <strong className="sl-target-sign">{definitionFor(learnTarget).title}</strong>
                    </>
                  ) : (
                    <strong className="sl-target-sign">{definitionFor(learnTarget).title}</strong>
                  )}
                </div>

                <HandReference
                  lang={lang}
                  id="practice-reference"
                  sign={learnTarget}
                  phraseSigns={promptSigns}
                  activeStep={session?.step ?? 0}
                  flip={hand === 'Left'}
                />

                <p className="sl-mobile-cue">
                  {howToFor(learnTarget).start} {howToFor(learnTarget).motion}
                </p>

                {isCameraLive && live.ready && <LiveCoachPanel detail={live.detail} landmarks={live.landmarks} advice={liveAdvice} motion={learnTemplate?.kind === 'dynamic'} holdLabel={!learnMotion && learnPassed ? `Hold ${(learnHoldMs / 1000).toFixed(1)}s` : undefined} />}
              </div>
            </div>

            <div className="duo-bottom-bar sl-practice-actions">
              <button className="duo-btn duo-btn-green" onClick={() => {
                const score = freshLessonScore()
                finishPrompt(score, !score)
              }}>
                {live.detail ? 'Submit attempt' : 'Finish self-review'} <ArrowRight size={17} />
              </button>
              <button className="duo-btn duo-btn-secondary" onClick={() => finishPrompt(null)}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 1 - SCREEN 2B: PRACTICE MIRROR (CORRECT GREEN TOAST) */}
        {/* ========================================================================= */}
        {(screen === 'learn_mirror_correct' || screen === 'learn_mirror_incorrect') && feedback && (
          <div className="duo-quiz-container">
            <div className="duo-quiz-top-bar">
              <button className="duo-close-btn" aria-label="Leave practice" onClick={exitPractice}><X size={28} /></button>
              <progress className="sl-lesson-progress" value={progressPct} max={100} aria-label="Lesson progress" />
            </div>
            <h1 className="duo-question-title">{feedback.selfReviewed ? 'Practice complete' : feedback.score ? 'Camera estimate' : 'Practice prompt skipped'}</h1>
            <div className="duo-quiz-body sl-feedback-body">
              <div className="duo-camera-card">
                {feedback.landmarks && showSkeleton
                  ? <LandmarkOverlay lm={feedback.landmarks} color={feedback.score?.passed ? '#9bfa5e' : '#ff7272'} mirrored={isMirrored} aspect={feedback.aspect} />
                  : showGhost && <PracticeGuide sign={feedback.item.id} flip={hand === 'Left'} active={false} />}
                <span className="duo-camera-badge">{feedback.landmarks && showSkeleton ? 'Your last attempt' : 'Target reference'}</span>
              </div>
              <div className="duo-prompt-card">
                <h2>{feedback.item.label}</h2>
                {feedback.score && <strong>{Math.round(feedback.score.score)}% match</strong>}
                <HandReference lang={lang} sign={feedback.item.id} flip={hand === 'Left'} height={155} />
              </div>
            </div>
            <div className={`sl-feedback-banner ${feedback.score?.passed || feedback.selfReviewed ? 'is-pass' : 'is-retry'}`}>
              {feedback.score?.passed || feedback.selfReviewed ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
              <div>
                <h2>{feedback.selfReviewed ? 'Nice!' : feedback.score?.passed ? 'Great job!' : 'Try again'}</h2>
                <p>{feedback.score
                  ? coachAdvice(feedback.score, findTemplate(feedback.item.id)?.hint ?? '')
                  : feedback.selfReviewed ? 'You reviewed this sign.' : 'This prompt will come back before you finish.'}</p>
                {feedback.xp > 0 && <span>+{feedback.xp} XP</span>}
              </div>
              <button className={`duo-btn ${feedback.score?.passed || feedback.selfReviewed ? 'duo-btn-green' : 'duo-btn-red'}`} onClick={() => navigateTo('learn_mirror_prompt')}>Continue <ArrowRight size={17} /></button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 1 - SCREEN 3: LESSON COMPLETE (CELEBRATION SCREEN) */}
        {/* ========================================================================= */}
        {screen === 'learn_complete' && (
          <div className="duo-celebration-container">
            <div className="duo-trophy-hero">
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffc800, #ff9600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 0 #e5a500, 0 0 30px rgba(255, 200, 0, 0.4)',
                }}
              >
                <Trophy size={64} color="#ffffff" />
              </div>
            </div>

            <div>
              <div className="duo-celebration-title">Lesson Complete!</div>
              {source?.kind === 'course' && (
                <div className="sl-celebration-stars" aria-label={`Star ${lessonStars(courseProgress, source.chapterId, source.lessonId)} of 3`}>
                  {[0, 1, 2].map((i) => {
                    const earned = lessonStars(courseProgress, source.chapterId, source.lessonId)
                    return <Star key={i} size={30} className={`sl-star${i < earned ? ' is-earned' : ''}`} fill={i < earned ? 'currentColor' : 'none'} />
                  })}
                  <span>{lessonStars(courseProgress, source.chapterId, source.lessonId)} / 3 stars{!history.length && ' · Self-review only'}</span>
                </div>
              )}
              <div className="duo-celebration-subtitle">
                {unitLabel} • {history.length} attempts • {sessionSummary}
              </div>
            </div>

            {/* 3 Result Cards */}
            <div className="duo-results-grid">
              <div className="duo-result-card">
                <div className="duo-result-lbl">Practice prompts</div>
                <div className="duo-result-val" style={{ color: '#ffc800' }}>
                  {lesson.n - 1}
                </div>
                <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                  Self-reviewed prompts are included
                </span>
              </div>

              <div className="duo-result-card">
                <div className="duo-result-lbl">Camera comparison</div>
                <div className="duo-result-val" style={{ color: '#58cc02' }}>
                  {history.length ? `${Math.round(history.reduce((a, h) => a + h.score, 0) / history.length)}%` : '--'}
                </div>
                <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>Recorded camera attempts</span>
              </div>

              <div className="duo-result-card">
                <div className="duo-result-lbl">Queue</div>
                <div className="duo-result-val" style={{ color: '#ff9600' }}>
                  {lesson.t} Q
                </div>
                <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>Retries included</span>
              </div>
            </div>

            {/* AI Coach Advice Box */}
            <div
              style={{
                background: 'var(--duo-card)',
                border: '2px solid var(--duo-border)',
                borderRadius: '20px',
                padding: '18px 24px',
                textAlign: 'left',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <Sparkles size={28} color="#1cb0f6" />
              <div>
                <div style={{ fontWeight: 900, color: '#ffffff', fontSize: '15px' }}>
                  Offline Coach Feedback
                </div>
                <div style={{ color: '#afbac0', fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                  {sessionSummary}
                </div>
              </div>
            </div>

            <button
              className="duo-btn duo-btn-green"
              style={{ width: '100%', padding: '16px', fontSize: '17px' }}
              onClick={exitPractice}
            >
              Continue Learning
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 2 - SCREEN 1: ALPHABET MATRIX (26-CARD GRID) */}
        {/* ========================================================================= */}
        {screen === 'alphabet_grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--duo-card)',
                border: '2px solid var(--duo-border)',
                borderRadius: '18px',
                padding: '14px 22px',
              }}
            >
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>Alphabet</h1>
              </div>
            </div>

            {/* Split layout: 26 cards + Inspector */}
            <div className="alpha-split">
              <div className="duo-alphabet-grid">
                {alphabetData.map((item) => {
                  const rec = progressRec[item.char]
                  return (
                    <button
                      key={item.char}
                      className={`duo-letter-card ${selectedLetter === item.char ? 'selected' : ''} ${rec?.passed ? 'is-mastered' : ''}`}
                      aria-pressed={selectedLetter === item.char}
                      aria-label={`Letter ${item.char}`}
                      onClick={() => setSelectedLetter(item.char)}
                    >
                      <span className="duo-letter-char">{item.char}</span>
                      <span className="duo-mastery-bar-wrap" aria-hidden="true">
                        <span className="duo-mastery-bar-fill" style={{ width: `${Math.min(100, Math.round(rec?.best ?? 0))}%` }} />
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Inspector Card on Right */}
              <div
                style={{
                  background: 'var(--duo-card)',
                  border: '2px solid var(--duo-border)',
                  borderRadius: '20px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff' }}>{currentLetter.char}</span>
                  {supportsPersonalComparison(currentLetter.char, lang) && isCalibrated(currentLetter.char) && (
                    <span
                      style={{
                        background: 'rgba(28, 176, 246, 0.2)',
                        color: '#1cb0f6',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                      }}
                    >
                      Custom
                    </span>
                  )}
                </div>

                <div
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '16px',
                    padding: '10px',
                  }}
                >
                  <HandReference lang={lang} sign={currentLetter.char} flip={hand === 'Left'} height={190} />
                </div>

                <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700, lineHeight: 1.45 }}>
                  {currentLetter.desc}
                </div>

                <button
                  className="duo-btn duo-btn-green"
                  style={{ width: '100%' }}
                  onClick={() => navigateTo('alphabet_drill')}
                >
                  Practice
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 2 - SCREEN 2: ALPHABET LETTER PRACTICE DRILL */}
        {/* ========================================================================= */}
        {screen === 'alphabet_drill' && (
          <div className="duo-quiz-container">
            {/* Top Quiz Bar */}
            <div className="duo-quiz-top-bar">
              <button className="duo-close-btn" aria-label="Return to alphabet" onClick={() => navigateTo('alphabet_grid')}>
                <X size={28} />
              </button>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
                Letter {selectedLetter}
              </div>
              <button className="duo-btn duo-btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => {
                setDrillScore(null)
                setHoldMs(0)
                setDrillReset((value) => value + 1)
              }}>
                <RefreshCw size={14} /> Reset
              </button>
            </div>

            {/* Hold Timer Card */}
            <div className="duo-drill-timer-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={22} color="#58cc02" />
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>
                  {drillComplete ? `Nice! (${Math.round(drillScore ?? 0)}%)` : alpha.detail ? `Hold steady · ${(holdMs / 1000).toFixed(1)}s` : alphaMotion ? 'Trace the letter' : 'Show letter handshape'}
                </div>
              </div>
              {(alpha.detail || drillComplete) && <progress className="sl-lesson-progress" style={{ flex: '0 1 120px' }} value={drillComplete ? 2000 : alphaPassed ? holdMs : 0} max={2000} aria-label="Time held" />}
            </div>

            {/* Drill Body */}
            <div className="duo-quiz-body">
              <div className="duo-camera-card">
                <WebcamVideo stream={cameraStream} isLive={isCameraLive} isMirrored={isMirrored} videoRef={alphaVideoRef}
                  landmarks={showSkeleton ? alpha.landmarks : null} secondLandmarks={showSkeleton ? alpha.secondLandmarks : null} landmarkColor={alpha.detail?.passed ? '#9bfa5e' : '#75d9ff'} perJoint={alpha.detail?.perJoint} secondHand={alpha.detail?.secondHand} />
                {showGhost && !alpha.landmarks && <PracticeGuide sign={selectedLetter} flip={hand === 'Left'} active={isCameraLive} />}
                <div
                  className="duo-camera-badge"
                  style={{
                    color: '#58cc02',
                    borderColor: 'rgba(88, 204, 2, 0.4)',
                  }}
                >
                  <span
                    className={`duo-camera-dot ${isCameraLive ? 'live' : ''}`}
                    style={{ background: '#58cc02' }}
                  ></span>
                  {alpha.failed ? 'TRACKING UNAVAILABLE' : alpha.landmarks ? 'HAND DETECTED' : isCameraLive ? 'LIVE CAMERA' : 'CAMERA OFF'}
                </div>
                {cameraError && (
                  <div className="duo-camera-error-banner">
                    <span>{cameraError}</span>
                    <button className="duo-camera-retry-btn" onClick={retryCamera}>Retry</button>
                  </div>
                )}
              </div>
              <div className="duo-prompt-card">
                <div style={{ fontSize: '44px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{selectedLetter}</div>

                <HandReference lang={lang} id="drill-reference" sign={selectedLetter} flip={hand === 'Left'} height={185} />

                {alpha.landmarks && <LiveCoachPanel
                  detail={alpha.detail}
                  landmarks={alpha.landmarks}
                  advice={alphaAdvice}
                  motion={alphaMotion}
                  holdLabel={drillComplete ? 'Matched!' : undefined}
                />}

                <button
                  className="duo-btn duo-btn-green"
                  style={{ width: '100%' }}
                  onClick={() => navigateTo('alphabet_grid')}
                >
                  Back
                </button>

                {supportsPersonalComparison(selectedLetter, lang) && (
                  <button
                    className="duo-btn duo-btn-secondary"
                    disabled={!isCalibrated(selectedLetter) && !alpha.angles.length}
                    onClick={() => {
                      if (isCalibrated(selectedLetter)) clearPersonalAngles(selectedLetter)
                      else savePersonalAngles(selectedLetter, alpha.angles)
                      setDrillScore(null)
                      setHoldMs(0)
                      setDrillReset((value) => value + 1)
                    }}
                  >
                    {isCalibrated(selectedLetter) ? 'Reset personal reference' : `Use my current handshape for ${selectedLetter}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 3: OPTICAL DICTIONARY SEARCH */}
        {/* ========================================================================= */}
        {screen === 'dictionary' && (
          <SignDictionary
            lang={lang}
            selectedId={dictionarySign}
            saved={saved}
            stream={cameraStream}
            cameraEnabled={dictionaryCamera}
            cameraError={cameraError}
            videoRef={dictVideoRef}
            mirrored={isMirrored}
            skeleton={showSkeleton}
            flip={hand === 'Left'}
            sound={soundOn}
            rate={ttsRate}
            onSelect={selectDictionarySign}
            onSave={toggleSaved}
            onPractice={startSign}
            onPracticePhrase={startPracticePhrase}
            onToggleCamera={() => setDictionaryCamera(!dictionaryCamera)}
            onRetryCamera={retryCamera}
            onSaved={() => navigateTo('saved')}
          />
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 4: SETTINGS & PREFERENCES */}
        {/* ========================================================================= */}
        {screen === 'settings' && (
          <div className="duo-settings-panel">
            <div className="sl-page-heading"><h1>Settings</h1></div>
            <div className="duo-settings-card">
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Camera size={22} color="#1cb0f6" />
                Camera & Mirror Preferences
              </div>

              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Webcam Device</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>
                    {availableCameras.length > 0 ? `${availableCameras.length} physical camera(s) detected` : 'Primary camera for hand recognition'}
                  </div>
                </div>
                <select
                  aria-label="Camera device"
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    color: '#ffffff',
                    fontFamily: 'Nunito, sans-serif',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    maxWidth: '260px'
                  }}
                >
                  <option value="">Default camera</option>
                  {availableCameras.map((camera, index) => (
                    <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `Camera ${index + 1}`}</option>
                  ))}
                </select>
              </div>

              <label className="duo-settings-row sl-setting-toggle">
                <span>Mirror video horizontally</span>
                <input type="checkbox" checked={isMirrored} onChange={() => togglePref('signlens_mirrored', setIsMirrored, isMirrored)} />
              </label>
              <label className="duo-settings-row sl-setting-toggle">
                <span>Live hand skeleton</span>
                <input type="checkbox" checked={showSkeleton} onChange={() => togglePref('signlens_skeleton', setShowSkeleton, showSkeleton)} />
              </label>
              <label className="duo-settings-row sl-setting-toggle">
                <span>Target hand guide</span>
                <input type="checkbox" checked={showGhost} onChange={() => togglePref('signlens_ghost', setShowGhost, showGhost)} />
              </label>

              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Hand Dominance</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>Mirrors the handshape diagram. Camera matching accepts either hand</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['Auto', 'Right', 'Left'] as const).map((h) => (
                    <button
                      key={h}
                      className={`duo-btn ${hand === h ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => setHandPersist(h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Audio & Privacy */}
            <div className="duo-settings-card">
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={22} color="#58cc02" />
                Audio & Privacy
              </div>

              <label className="duo-settings-row sl-setting-toggle">
                <span>Read dictionary words aloud</span>
                <input type="checkbox" checked={soundOn} onChange={() => togglePref('signlens_sound', setSoundOn, soundOn)} />
              </label>

              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Speech Speed ({ttsRate.toFixed(2)}x)</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>Text-to-speech playback rate</div>
                </div>
                <input
                  aria-label="Speech speed"
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={ttsRate}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setTtsRate(v)
                    try {
                      localStorage.setItem('signlens_tts', String(v))
                    } catch { /* ignore */ }
                  }}
                  style={{ width: '160px', accentColor: '#58cc02' }}
                />
              </div>

              <div className="sl-diagnostics">
                <div><span>Vision processing</span><strong>On device (MediaPipe)</strong></div>
                <div><span>Camera / FPS</span><strong>{isCameraLive ? `Live (${live.fps || alpha.fps || 30} fps)` : 'Off'}</strong></div>
                <div><span>Frame Latency</span><strong>{(live.latencyMs || alpha.latencyMs) ? `${live.latencyMs || alpha.latencyMs} ms` : '≤10 ms'}</strong></div>
                <div><span>Telemetry Rows</span><strong>{telemetryCount} logged</strong></div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                <button className="duo-btn duo-btn-green" style={{ padding: '10px 18px' }} onClick={exportTelemetryCsv}>
                  Export CSV Telemetry Log ({telemetryCount})
                </button>
                <button className="duo-btn duo-btn-secondary" style={{ padding: '10px 18px' }} onClick={() => { clearTelemetryRows(); setTelemetryCount(0) }}>
                  Clear Telemetry Log
                </button>
                <button
                  className="duo-btn duo-btn-secondary"
                  style={{ padding: '10px 18px', ...(confirmResetAll ? { color: '#ff8a80', borderColor: '#ff4b4b' } : {}) }}
                  onClick={() => {
                    if (!confirmResetAll) {
                      setConfirmResetAll(true)
                      return
                    }
                    setConfirmResetAll(false)
                    handleResetAllProgress()
                  }}
                  onBlur={() => setConfirmResetAll(false)}
                >
                  {confirmResetAll ? 'Confirm Reset All Progress?' : 'Reset All Progress & Stars'}
                </button>
              </div>
            </div>

            <div className="duo-settings-card">
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RefreshCw size={22} color="#1cb0f6" />
                About SignLens
              </div>
              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Version {pkg.version}</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>{desktop ? updateStatus : 'Web edition · Camera processing runs on this device.'}</div>
                </div>
                {desktop && <button
                  className="duo-btn duo-btn-blue"
                  style={{ padding: '10px 22px' }}
                  onClick={checkForUpdates}
                  disabled={updateBusy}
                >
                  {updateBusy ? 'Checking...' : 'Check for Updates'}
                </button>}
              </div>
              <button className="sl-button sl-secondary" onClick={() => {
                navigateTo('onboarding')
                setOnboardStep(2)
              }}>Test your camera</button>
              <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                SignLens estimates handshape and motion from up to two tracked hands.
              </div>
              <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                FSL-105 signer videos by Tupal and Cabatuan (CC BY 4.0). Hand tracking by MediaPipe.
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="duo-status-footer">
        {isCameraLive ? 'Camera on' : 'Camera off'}
      </footer>
    </div>
  )
}
