import { useState, useEffect, useRef } from 'react'
import {
  Camera,
  Layers,
  BookOpen,
  Settings as SettingsIcon,
  Flame,
  Heart,
  CheckCircle2,
  XCircle,
  Sparkles,
  Volume2,
  Cpu,
  Search,
  ArrowRight,
  X,
  Trophy,
  Check,
  Lock,
  Star,
  RefreshCw
} from 'lucide-react'
import './App.css'
import pkg from '../package.json'
import { useSignCheck } from './hooks/useSignCheck'
import LandmarkOverlay from './components/LandmarkOverlay'
import { coachAdvice, summarizeSession } from './engine/coach'
import { answerCorrect, answerIncorrect, createLesson, currentItem, isFinished, CURRICULUM, curriculumForLang } from './engine/lesson'
import { findTemplate, templatesForLang } from './engine/templates'
import { FSL_DEFINITIONS } from './engine/fsl'
import { getProgress, recordAttempt, masteryFor, totalXP, touchToday } from './engine/progress'
import { getPersonalAngles, savePersonalAngles, clearPersonalAngles, isCalibrated } from './engine/personal'
import type { SignLang } from './engine/types'
import HandClip from './components/HandClip'
import LiveCoachPanel from './components/LiveCoachPanel'
import { definitionFor, speak, howToFor, relatedFor } from './engine/dictionary'
import { getPracticeList, addToPracticeList, practiceListItems } from './engine/practice'
import { referencePose } from './engine/referenceHands'
import type { ScoreDetail, Vec3, HandLandmarks } from './engine/types'

// Reusable live webcam stream renderer
function WebcamVideo({
  stream,
  isLive,
  isMirrored = true,
  videoRef,
}: {
  stream: MediaStream | null
  isLive: boolean
  isMirrored?: boolean
  videoRef?: React.RefObject<HTMLVideoElement | null>
}) {
  const innerRef = useRef<HTMLVideoElement | null>(null)
  const ref = videoRef ?? innerRef

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (stream) {
      el.srcObject = stream
      el.play().catch((err) => {
        console.warn('AutoPlay prevented:', err)
      })
    } else {
      el.srcObject = null
    }
  }, [stream, ref])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      style={{
        transform: isMirrored ? 'scaleX(-1)' : 'none',
      }}
      className={`duo-webcam-video ${isLive ? 'active' : 'inactive'}`}
    />
  )
}

export default function App() {
  const getInitialScreen = () => {
    try {
      if (!localStorage.getItem('signlens_onboarded')) return 'onboarding'
    } catch { /* private mode */ }
    const params = new URLSearchParams(window.location.search)
    const s = params.get('screen')
    if (s) return s
    const t = params.get('tab')
    if (t === 'alphabet') return 'alphabet_grid'
    if (t === 'dictionary') return 'dictionary'
    if (t === 'settings') return 'settings'
    return 'learn_path'
  }

  const [screen, setScreen] = useState(getInitialScreen())
  const [onboardStep, setOnboardStep] = useState(0)
  const [selectedLetter, setSelectedLetter] = useState('B')
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [practiceCount, setPracticeCount] = useState(() => getPracticeList().length)
  const [addedFlash, setAddedFlash] = useState<string | null>(null)

  const startPracticeList = () => {
    const items = practiceListItems()
    if (!items.length) return
    setUnitIdx(-1)
    setLesson(createLesson(items))
    setHistory([])
    setHearts(5)
    navigateTo('learn_mirror_prompt')
  }

  const finishOnboarding = () => {
    try {
      localStorage.setItem('signlens_onboarded', '1')
    } catch { /* ignore */ }
    navigateTo('learn_path')
  }

  // Live Webcam Hardware State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isCameraLive, setIsCameraLive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isMirrored, setIsMirrored] = useState(true)
  // Real working preferences, persisted locally.
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

  const isCameraNeeded =
    screen.startsWith('learn_mirror') || screen === 'alphabet_drill' || screen === 'dictionary' || screen === 'onboarding'

  // Real offline tracking. Runs on device via MediaPipe WASM, no cloud.
  const [lang, setLang] = useState<SignLang>(() => {
    try {
      return (localStorage.getItem('signlens_lang') as SignLang) || 'ASL'
    } catch {
      return 'ASL'
    }
  })
  const curriculum = curriculumForLang(lang)
  const [unitIdx, setUnitIdx] = useState(0)
  const [lesson, setLesson] = useState(() => createLesson(curriculumForLang('ASL')[0].items))
  const [history, setHistory] = useState<ScoreDetail[]>([])
  const [hearts, setHearts] = useState(5)
  // unitIdx -1 = personal practice list started from the Dictionary.
  const unitLabel = unitIdx >= 0 ? curriculum[unitIdx].unit : `My Practice List (${lesson.t} signs)`
  const lessonItem = currentItem(lesson)
  const learnTarget = lessonItem ? lessonItem.id : 'C'

  const switchLang = (l: SignLang) => {
    setLang(l)
    try {
      localStorage.setItem('signlens_lang', l)
    } catch { /* ignore */ }
    const cur = curriculumForLang(l)
    setUnitIdx(0)
    setLesson(createLesson(cur[0].items))
    setHistory([])
    setHearts(5)
  }

  const mirrorVideoRef = useRef<HTMLVideoElement | null>(null)
  const live = useSignCheck(mirrorVideoRef, {
    targetId: learnTarget,
    active: screen === 'learn_mirror_prompt' && isCameraLive,
  })

  // Alphabet drill tracks whichever letter is selected.
  const alphaVideoRef = useRef<HTMLVideoElement | null>(null)
  const alpha = useSignCheck(alphaVideoRef, {
    targetId: selectedLetter,
    active: screen === 'alphabet_drill' && isCameraLive,
  })
  const [holdMs, setHoldMs] = useState(0)
  const [holdSaved, setHoldSaved] = useState(false)
  useEffect(() => {
    if (screen !== 'alphabet_drill') {
      setHoldMs(0)
      setHoldSaved(false)
      return
    }
    if (alpha.detail && alpha.detail.passed) {
      const t = setTimeout(() => setHoldMs((h) => Math.min(2000, h + 200)), 200)
      return () => clearTimeout(t)
    }
    setHoldMs(0)
    setHoldSaved(false)
  }, [screen, alpha.detail])
  // Persist the drill result once the 2s hold completes.
  useEffect(() => {
    if (screen === 'alphabet_drill' && holdMs >= 2000 && !holdSaved && alpha.detail) {
      setHoldSaved(true)
      setProgressRec(recordAttempt(selectedLetter, alpha.detail.score))
      touchToday()
    }
  }, [screen, holdMs, holdSaved, alpha.detail, selectedLetter])

  // Dictionary optical lookup: static shapes every tick plus body-anchored
  // motion buffer for moving words, both against the active language pack.
  const dictVideoRef = useRef<HTMLVideoElement | null>(null)
  const dict = useSignCheck(dictVideoRef, { targetId: '__scan__', active: false })
  const [dictBest, setDictBest] = useState<{ id: string; score: number; hint: string } | null>(null)
  const [dictCands, setDictCands] = useState<{ id: string; score: number; hint: string }[]>([])
  const [dictLm, setDictLm] = useState<HandLandmarks | null>(null)
  const [dictLock, setDictLock] = useState<string | null>(null)
  // Locked candidate wins for the translation panel, live best keeps scanning.
  const dictShown = dictLock ? (dictCands.find((c) => c.id === dictLock) ?? dictBest) : dictBest
  const dictPathRef = useRef<Vec3[]>([])
  const langRef = useRef(lang)
  langRef.current = lang
  useEffect(() => {
    if (screen !== 'dictionary' || !isCameraLive) {
      dictPathRef.current = []
      return
    }
    let alive = true
    let timer = 0
    const tick = async () => {
      if (!alive) return
      const { lookupStatic, lookupTop3 } = await import('./engine/dictionary')
      const { detectLandmarks } = await import('./engine/mediapipe')
      const { normalizePoint } = await import('./engine/bodyAnchor')
      const { palmCenter } = await import('./engine/angles')
      const { scoreDynamicBoth } = await import('./engine/dtw')
      const { templatesForLang } = await import('./engine/templates')
      const v = dictVideoRef.current
      if (v && v.readyState >= 2 && v.videoWidth > 0) {
        const lm = detectLandmarks(v, performance.now())
        setDictLm(lm)
        const staticBest = lookupStatic(lm, langRef.current)
        setDictCands(lookupTop3(lm, langRef.current))
        let best = staticBest && staticBest.score > 55 ? staticBest : null
        // Motion buffer for dynamic words.
        if (lm) {
          const p = normalizePoint(palmCenter(lm))
          const buf = dictPathRef.current
          const last = buf[buf.length - 1]
          if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.004) buf.push(p)
          if (buf.length > 60) buf.shift()
          if (buf.length >= 24) {
            for (const t of templatesForLang(langRef.current)) {
              if (t.kind !== 'dynamic' || !t.path) continue
              const s = scoreDynamicBoth(buf, t.path)
              if (s >= 70 && (!best || s > best.score)) best = { id: t.id, score: s, hint: t.hint }
            }
          }
        } else if (dictPathRef.current.length > 0 && dictPathRef.current.length < 12) {
          dictPathRef.current = []
        }
        if (best) setDictBest(best)
      }
      timer = window.setTimeout(tick, 600)
    }
    timer = window.setTimeout(tick, 600)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [screen, isCameraLive])
  void dict

  // Body anchor sampler: slow pose pass (~10fps) over whichever mirror is
  // live, so hand paths grade relative to nose and shoulders, not the lens.
  const [bodyOk, setBodyOk] = useState(false)
  useEffect(() => {
    if (!isCameraLive) {
      setBodyOk(false)
      return
    }
    let alive = true
    const id = window.setInterval(async () => {
      if (!alive) return
      try {
        const { sampleBody } = await import('./engine/bodyAnchor')
        const refs = [mirrorVideoRef, alphaVideoRef, dictVideoRef]
        for (const r of refs) {
          const v = r.current
          if (v && v.readyState >= 2 && v.videoWidth > 0) {
            const f = await sampleBody(v)
            setBodyOk(!!f)
            return
          }
        }
        setBodyOk(false)
      } catch {
        setBodyOk(false)
      }
    }, 300)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [isCameraLive, screen])

  const liveAdvice =
    live.detail && findTemplate(learnTarget)
      ? coachAdvice(live.detail, findTemplate(learnTarget)!.hint)
      : 'Show your hand in frame to start live scoring.'
  const alphaAdvice =
    alpha.detail && findTemplate(selectedLetter)
      ? coachAdvice(alpha.detail, findTemplate(selectedLetter)!.hint)
      : 'Show your hand in frame to start live scoring.'

  const pickUnit = (i: number) => {
    setUnitIdx(i)
    setLesson(createLesson(curriculum[i].items))
    setHistory([])
    navigateTo('learn_mirror_prompt')
  }

  const submitLiveScore = () => {
    if (!live.detail) return
    const item = currentItem(lesson)
    if (!item) {
      navigateTo('learn_complete')
      return
    }
    setHistory((h) => [...h, live.detail!])
    setProgressRec(recordAttempt(item.id, live.detail!.score))
    touchToday()
    if (live.detail.passed) {
      const next = answerCorrect(lesson, item.id, live.detail!.score)
      setLesson(next)
      navigateTo(isFinished(next) ? 'learn_complete' : 'learn_mirror_correct')
    } else {
      setHearts((h) => Math.max(0, h - 1))
      const next = answerIncorrect(lesson, item.id, live.detail!.score)
      setLesson(next)
      navigateTo(isFinished(next) ? 'learn_complete' : 'learn_mirror_incorrect')
    }
  }
  const sessionSummary = summarizeSession(history)
  const progressPct = Math.min(100, Math.round(((lesson.n - 1) / Math.max(1, lesson.t)) * 100))

  // In-app updates via the JmDemisana/SignLens GitHub releases feed.
  // Only the version check touches the network. Everything else stays offline.
  const [updateStatus, setUpdateStatus] = useState('Up to date check not run yet.')
  const [updateBusy, setUpdateBusy] = useState(false)
  const checkForUpdates = async (auto = false) => {
    if (updateBusy) return
    setUpdateBusy(true)
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (!update) {
        setUpdateStatus(auto ? 'Running latest version.' : 'You are on the latest version.')
      } else {
        setUpdateStatus(`Downloading v${update.version}...`)
        await update.downloadAndInstall()
        setUpdateStatus(`v${update.version} installed. Restarting...`)
        const { relaunch } = await import('@tauri-apps/plugin-process')
        await relaunch()
      }
    } catch (e) {
      setUpdateStatus(`Update check failed (offline?). ${String(e).slice(0, 120)}`)
    } finally {
      setUpdateBusy(false)
    }
  }
  // Silent auto check once per launch. Failures stay quiet in the background.
  useEffect(() => {
    const t = window.setTimeout(() => {
      checkForUpdates(true).catch(() => {})
    }, 8000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hands-free auto-submit: hold a passing score steady ~1.5s.
  const submitRef = useRef(submitLiveScore)
  submitRef.current = submitLiveScore
  useEffect(() => {
    if (screen !== 'learn_mirror_prompt') return
    if (!live.detail || !live.detail.passed) return
    const t = window.setTimeout(() => {
      submitRef.current()
    }, 1500)
    return () => window.clearTimeout(t)
  }, [screen, live.detail])

  // Discover and enumerate connected webcams
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devs) => {
          const videoDevs = devs.filter((d) => d.kind === 'videoinput')
          setAvailableCameras(videoDevs)
          if (videoDevs.length > 0 && !selectedCameraId) {
            setSelectedCameraId(videoDevs[0].deviceId)
          }
        })
        .catch(() => {})
    }
  }, [selectedCameraId])

  // Camera stream lifecycle: connects when entering camera screen, stops tracks on exit
  useEffect(() => {
    if (!isCameraNeeded) {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
        setCameraStream(null)
        setIsCameraLive(false)
      }
      return
    }

    let isMounted = true
    let activeStream: MediaStream | null = null

    async function requestCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isMounted) {
            setCameraError('Webcam API is not supported in this browser')
            setIsCameraLive(false)
          }
          return
        }

        const constraints: MediaStreamConstraints = {
          video: selectedCameraId
            ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        activeStream = stream
        setCameraStream(stream)
        setIsCameraLive(true)
        setCameraError(null)
      } catch (err: any) {
        if (!isMounted) return
        console.warn('Camera access failed:', err)
        setIsCameraLive(false)
        setCameraError(
          err.name === 'NotAllowedError' ? 'Camera permission was denied' : 'Webcam hardware unavailable'
        )
      }
    }

    requestCamera()

    return () => {
      isMounted = false
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isCameraNeeded, selectedCameraId])

  const retryCamera = async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      setCameraStream(stream)
      setIsCameraLive(true)
    } catch (err: any) {
      setCameraError(
        err.name === 'NotAllowedError' ? 'Camera permission was denied' : 'Webcam hardware unavailable'
      )
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      setScreen(getInitialScreen())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateTo = (newScreen: string) => {
    setScreen(newScreen)
    const url = new URL(window.location.href)
    url.searchParams.set('screen', newScreen)
    window.history.pushState({}, '', url.toString())
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

  // Real mastery from the on-device progress store. Unpracticed = 0% new.
  const [progressRec, setProgressRec] = useState<Record<string, { best: number; tries: number; passed: boolean }>>(() => getProgress())
  const alphabetData = alphabetBase.map((b) => {
    const m = masteryFor(b.char, progressRec)
    return { ...b, pct: m.pct, status: m.status }
  })
  const masteredCount = alphabetData.filter((a) => a.status === 'mastered').length
  const learningCount = alphabetData.filter((a) => a.status === 'learning').length
  const reviewCount = alphabetData.filter((a) => a.status === 'review').length

  const filteredAlphabet = alphabetData.filter((item) => {
    if (filter === 'mastered') return item.status === 'mastered'
    if (filter === 'learning') return item.status === 'learning'
    if (filter === 'review') return item.status === 'review'
    return true
  })

  const currentLetter = alphabetData.find((l) => l.char === selectedLetter) || alphabetData[1]

  // Shared 21-point guide layer. Only shown when no live hand is tracked.
  // Label always matches the real target so guide never lies about another letter.
  const renderHandLandmarks = (mode: 'prompt' | 'correct' | 'incorrect' = 'correct', isLive = false, target = 'C') => {
    const isCorrect = mode === 'correct'
    const isPrompt = mode === 'prompt'
    const lineColor = isPrompt ? '#1cb0f6' : isCorrect ? '#58cc02' : '#ff4b4b'
    const haloColor = isPrompt
      ? 'rgba(28, 176, 246, 0.22)'
      : isCorrect
      ? 'rgba(88, 204, 2, 0.28)'
      : 'rgba(255, 75, 75, 0.25)'

    const badgeLabel = isPrompt
      ? `FORM '${target}' IN FRAME`
      : isCorrect
      ? 'MATCH CHECKED'
      : 'ADJUST HAND'

    // True reference shape for the target letter, not a generic hand.
    const pose = referencePose(target)
    const P = (i: number) => ({ x: pose[i].x * 800, y: pose[i].y * 500 })
    const BONES: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
    ]

    return (
      <svg className="landmarks-svg-layer" viewBox="0 0 800 500" preserveAspectRatio="none">
        <defs>
          <radialGradient id="camHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={haloColor} />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
        </defs>

        {/* User Silhouette in webcam (rendered as fallback when camera is inactive) */}
        {!isLive && (
          <path
            d="M 180 500 C 180 370, 260 330, 390 320 C 360 270, 360 170, 420 150 C 480 170, 480 270, 450 320 C 580 330, 660 370, 660 500 Z"
            fill="#18252d"
            opacity="0.8"
          />
        )}

        {/* Halo behind hand */}
        <circle cx="410" cy="270" r="140" fill="url(#camHalo)" />

        {/* Target Ghost Guide in translucent cyan dashes */}
        <path
          d="M 345 330 C 330 280, 320 210, 360 160 C 405 120, 460 130, 480 160 C 490 180, 470 200, 440 190 C 405 180, 385 210, 385 255 C 385 305, 420 325, 460 315 C 485 305, 490 330, 470 345 C 435 370, 365 365, 345 330 Z"
          stroke="#1cb0f6"
          strokeWidth="2.5"
          strokeDasharray="6,6"
          fill="none"
          opacity="0.6"
        />
        <text
          x="420"
          y="110"
          fill="#1cb0f6"
          fontSize="12"
          fontFamily="Nunito, sans-serif"
          fontWeight="800"
          textAnchor="middle"
        >
          GUIDE OUTLINE
        </text>

        {/* True reference bones for the target */}
        <g stroke={lineColor} strokeWidth="3" strokeLinecap="round">
          {BONES.map(([a, b], i) => (
            <line key={i} x1={P(a).x} y1={P(a).y} x2={P(b).x} y2={P(b).y} />
          ))}
          {/* Knuckle Arch */}
          <line x1={P(5).x} y1={P(5).y} x2={P(9).x} y2={P(9).y} stroke="#ffffff" strokeWidth="2" opacity="0.6" />
          <line x1={P(9).x} y1={P(9).y} x2={P(13).x} y2={P(13).y} stroke="#ffffff" strokeWidth="2" opacity="0.6" />
          <line x1={P(13).x} y1={P(13).y} x2={P(17).x} y2={P(17).y} stroke="#ffffff" strokeWidth="2" opacity="0.6" />
        </g>

        {/* 21 Reference Joints */}
        <g fill="#ffffff" stroke={lineColor} strokeWidth="2.5">
          {pose.map((p, i) => (
            <circle key={i} cx={p.x * 800} cy={p.y * 500} r={i === 0 ? 6.5 : i % 4 === 0 ? 6 : 5} fill={i === 0 ? '#1cb0f6' : i % 4 === 0 ? lineColor : '#ffffff'} />
          ))}
        </g>

        {/* Detection Box */}
        <rect
          x="320"
          y="150"
          width="210"
          height="230"
          rx="16"
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity="0.85"
        />
        <g transform="translate(320, 138)">
          <rect x="0" y="0" width="140" height="22" rx="6" fill={lineColor} />
          <text
            x="70"
            y="15"
            fill="#ffffff"
            fontSize="11"
            fontFamily="Nunito, sans-serif"
            fontWeight="900"
            textAnchor="middle"
          >
            {badgeLabel}
          </text>
        </g>
      </svg>
    )
  }

  return (
    <div className="duo-app-shell">
      {/* Standard Duolingo Header */}
      <header className="duo-header">
        <div className="duo-brand">
          <div className="duo-brand-icon">
            <Camera size={24} />
          </div>
          <span>signlens</span>
        </div>

        {/* Nav tabs */}
        <nav className="duo-nav-links">
          <button
            className={`duo-nav-item ${screen.startsWith('learn') ? 'active' : ''}`}
            onClick={() => navigateTo('learn_path')}
          >
            <BookOpen size={18} />
            Learn
          </button>
          <button
            className={`duo-nav-item ${screen.startsWith('alphabet') ? 'active' : ''}`}
            onClick={() => navigateTo('alphabet_grid')}
          >
            <Layers size={18} />
            Letters
          </button>
          <button
            className={`duo-nav-item ${screen === 'dictionary' ? 'active' : ''}`}
            onClick={() => navigateTo('dictionary')}
          >
            <Search size={18} />
            Dictionary
          </button>
          <button
            className={`duo-nav-item ${screen === 'settings' ? 'active' : ''}`}
            onClick={() => navigateTo('settings')}
          >
            <SettingsIcon size={18} />
            Settings
          </button>
        </nav>

        {/* Gamification Stats: all derived from the local progress store */}
        <div className="duo-stats">
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`duo-btn ${lang === 'ASL' ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => switchLang('ASL')}
            >
              ASL
            </button>
            <button
              className={`duo-btn ${lang === 'FSL' ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => switchLang('FSL')}
            >
              FSL
            </button>
          </div>
          <div className="duo-stat-item">
            <Flame size={22} color="#ff9600" />
            <span className="duo-streak-count">{touchToday()}</span>
          </div>
          <div className="duo-stat-item">
            <Star size={20} color="#1cb0f6" />
            <span className="duo-gem-count">{totalXP(progressRec)} XP</span>
          </div>
          <div className="duo-stat-item">
            <Heart size={22} color="#ff4b4b" fill="#ff4b4b" />
            <span className="duo-heart-count">{hearts}</span>
          </div>
        </div>
      </header>

      {/* Main Dynamic View */}
      <main className="duo-main-content">
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
                  SignLens watches your hands on device and scores real shapes. No gloves. No cloud. No video ever leaves this machine.
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
                    <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>Static + motion paths</span>
                  </div>
                  <div className="duo-result-card">
                    <div className="duo-result-lbl">Privacy</div>
                    <div className="duo-result-val" style={{ color: '#ffc800' }}>100%</div>
                    <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>Offline on device</span>
                  </div>
                </div>
              </div>
            )}

            {onboardStep === 1 && (
              <div>
                <div className="duo-celebration-title">How practice works</div>
                <div className="duo-celebration-subtitle">
                  Pick a unit, sign the target in the mirror, hold steady 1.5 seconds. Pass to advance. Misses queue again at the end until every sign passes.
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
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>1. Learn: guided lessons with retry queue</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>2. Letters: A to Z drills with 2s hold</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>3. Dictionary: sign at the lens to look up words</div>
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
                      <span>{cameraError}. Click Allow in the prompt up top.</span>
                      <button onClick={retryCamera} className="duo-camera-retry-btn">
                        Retry Camera
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {availableCameras.length > 0 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      style={{ background: '#131f24', color: '#fff', border: '2px solid var(--duo-border)', borderRadius: '12px', padding: '10px 14px', fontWeight: 800 }}
                    >
                      {availableCameras.map((c, i) => (
                        <option key={c.deviceId} value={c.deviceId}>
                          {c.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                  <button className="duo-btn duo-btn-secondary" style={{ padding: '10px 18px' }} onClick={() => setIsMirrored((m) => !m)}>
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
                  {isCameraLive
                    ? 'Camera is live. Start with Unit 1: A to E plus Hello.'
                    : 'You can start without a camera using guide outlines, but live scoring needs it. You can enable it later in Settings.'}
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
                  disabled={onboardStep === 2 && !isCameraLive && !!cameraError && availableCameras.length === 0}
                >
                  Continue <ArrowRight size={18} />
                </button>
              ) : (
                <button className="duo-btn duo-btn-green" style={{ flex: 2, padding: '14px' }} onClick={finishOnboarding}>
                  Start Practicing
                </button>
              )}
            </div>
            <button
              className="duo-btn duo-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '12px' }}
              onClick={finishOnboarding}
            >
              Skip intro
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 1 - SCREEN 1: PICK A LESSON (ROADMAP PATH) */}
        {/* ========================================================================= */}
        {screen === 'learn_path' && (
          <div className="duo-path-layout">
            <div>
              {/* Unit Banner: live from the active language curriculum */}
              <div className="duo-unit-banner">
                <div>
                  <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 800 }}>
                    {lang} • {unitLabel}
                  </div>
                  <div className="duo-unit-title">{unitIdx >= 0 ? curriculum[unitIdx].items.map((i) => i.label).join(' • ') : lesson.queue.map((i) => i.label).join(' • ')}</div>
                  <div className="duo-unit-desc">
                    {lesson.t - lesson.n + 1 > 0
                      ? `Question ${lesson.n} of ${lesson.t} in the queue. Misses loop back until all pass.`
                      : 'Queue complete. Pick a unit below to drill again.'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {curriculum.map((u, i) => (
                      <button
                        key={u.unit}
                        className={`duo-btn ${i === unitIdx ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: '12px', background: i === unitIdx ? undefined : '#ffffff', color: i === unitIdx ? undefined : '#1b873f', borderColor: '#ffffff' }}
                        onClick={() => pickUnit(i)}
                      >
                        Unit {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="duo-btn duo-btn-secondary"
                  style={{ background: '#ffffff', color: '#1b873f', borderColor: '#ffffff' }}
                  onClick={() => navigateTo('learn_mirror_prompt')}
                >
                  Guidebook
                </button>
              </div>

              {/* Personal practice list saved from the Dictionary */}
              <div
                style={{
                  background: 'var(--duo-card)',
                  border: '2px solid var(--duo-border)',
                  borderRadius: '20px',
                  padding: '18px 24px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff' }}>
                    My Practice List ({practiceCount})
                  </div>
                  <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                    {practiceCount > 0
                      ? getPracticeList().slice(0, 6).join(' • ') + (practiceCount > 6 ? ' • …' : '')
                      : 'Save signs from the Dictionary to drill them here.'}
                  </div>
                </div>
                <button
                  className="duo-btn duo-btn-green"
                  style={{ padding: '10px 22px' }}
                  disabled={practiceCount === 0}
                  onClick={startPracticeList}
                >
                  Drill My List
                </button>
              </div>

              {/* Stepping Stones Winding Path */}
              <div className="duo-path-column">
                {/* Node 1: Completed */}
                <div className="duo-node-wrapper" style={{ transform: 'translateX(0px)' }}>
                  <div className="duo-stone-node completed" onClick={() => navigateTo('learn_mirror_prompt')}>
                    <Check size={36} strokeWidth={3} />
                  </div>
                </div>

                {/* Node 2: Completed */}
                <div className="duo-node-wrapper" style={{ transform: 'translateX(55px)' }}>
                  <div className="duo-stone-node completed" onClick={() => navigateTo('learn_mirror_prompt')}>
                    <Check size={36} strokeWidth={3} />
                  </div>
                </div>

                {/* Node 3: Active Current Lesson */}
                <div className="duo-node-wrapper" style={{ transform: 'translateX(-45px)' }}>
                  <div className="duo-start-bubble">Start +10 XP</div>
                  <div className="duo-stone-node active" onClick={() => navigateTo('learn_mirror_prompt')}>
                    <Camera size={38} strokeWidth={2.5} />
                  </div>
                </div>

                {/* Node 4: Chest Reward */}
                <div className="duo-node-wrapper" style={{ transform: 'translateX(0px)' }}>
                  <div className="duo-stone-node chest">
                    <Trophy size={34} />
                  </div>
                </div>

                {/* Node 5: Locked */}
                <div className="duo-node-wrapper" style={{ transform: 'translateX(-60px)' }}>
                  <div className="duo-stone-node locked">
                    <Lock size={32} />
                  </div>
                </div>

                {/* Node 6: Unit Trophy Locked */}
                <div className="duo-node-wrapper" style={{ transform: 'translateX(40px)' }}>
                  <div className="duo-stone-node locked">
                    <Star size={34} />
                  </div>
                </div>
              </div>
            </div>

            {/* Path Right Sidebar */}
            <div>
              {/* Daily Quest Widget */}
              <div className="duo-side-widget">
                <div className="duo-widget-title">
                  <span>Daily Quests</span>
                  <Sparkles size={18} color="#ffc800" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>
                    <span>Practice 5 webcam signs</span>
                    <span style={{ color: '#58cc02' }}>3 / 5</span>
                  </div>
                  <div className="duo-progress-track" style={{ height: '12px' }}>
                    <div className="duo-progress-fill" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>
                    <span>Score 90%+ confidence</span>
                    <span style={{ color: '#ff9600' }}>1 / 1</span>
                  </div>
                  <div className="duo-progress-track" style={{ height: '12px' }}>
                    <div className="duo-progress-fill" style={{ width: '100%', background: '#ff9600' }}></div>
                  </div>
                </div>
              </div>

              {/* Streak Shield Widget */}
              <div className="duo-side-widget">
                <div className="duo-widget-title">
                  <span>Streak Protection</span>
                  <Flame size={20} color="#ff9600" />
                </div>
                <p style={{ fontSize: '14px', color: '#afbac0', lineHeight: 1.5, fontWeight: 700 }}>
                  You have a 7-day practice streak! Practice daily to keep your streak flame alive.
                </p>
                <button
                  className="duo-btn duo-btn-green"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={() => navigateTo('learn_mirror_prompt')}
                >
                  Continue Practice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 1 - SCREEN 2A: PRACTICE MIRROR (NODE A - PROMPT STATE) */}
        {/* ========================================================================= */}
        {screen === 'learn_mirror_prompt' && (
          <div className="duo-quiz-container">
            {/* Top Quiz Bar */}
            <div className="duo-quiz-top-bar">
              <button className="duo-close-btn" onClick={() => navigateTo('learn_path')}>
                <X size={28} />
              </button>
              <div className="duo-progress-track">
                <div className="duo-progress-fill" style={{ width: `${progressPct}%` }}></div>
              </div>
              <div className="duo-quiz-hearts">
                <Heart size={24} fill="#ff4b4b" color="#ff4b4b" />
                <span>5</span>
              </div>
            </div>

            <div className="duo-question-title">Sign {learnTarget} in the camera mirror (Q{lesson.n}/{lesson.t} • {unitLabel})</div>

            {/* Quiz Body */}
            <div className="duo-quiz-body">
              {/* Left: Camera Feed Viewfinder */}
              <div className="duo-camera-card">
                <WebcamVideo stream={cameraStream} isLive={isCameraLive} isMirrored={isMirrored} videoRef={mirrorVideoRef} />
                {showSkeleton && live.landmarks ? (
                  <LandmarkOverlay lm={live.landmarks} color={live.detail && live.detail.passed ? '#58cc02' : '#1cb0f6'} mirrored={isMirrored} />
                ) : null}
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
                  {live.landmarks
                    ? `LIVE SCORE ${Math.round(live.detail?.score ?? 0)}% ${live.fps}FPS`
                    : isCameraLive
                      ? 'LIVE WEBCAM MIRROR'
                      : 'PRACTICE MIRROR'}
                </div>
                {!live.ready && isCameraLive && (
                  <div className="duo-camera-error-banner">
                    <span>Loading on-device hand model...</span>
                  </div>
                )}
                {live.detail && (
                  <div className="duo-camera-error-banner">
                    <span>{liveAdvice}</span>
                    <button onClick={submitLiveScore} className="duo-camera-retry-btn">
                      Submit {Math.round(live.detail.score)}%
                    </button>
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700, padding: '0 12px 10px' }}>{sessionSummary}</div>
                {cameraError && (
                  <div className="duo-camera-error-banner">
                    <span>📷 {cameraError} (Silhouette Guide Active)</span>
                    <button onClick={retryCamera} className="duo-camera-retry-btn">
                      Enable Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Target Prompt & Helper */}
              <div className="duo-prompt-card">
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#afbac0' }}>
                    Target Sign
                  </div>
                  <div style={{ fontSize: '72px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{learnTarget}</div>
                  <p style={{ fontSize: '14px', color: '#afbac0', marginTop: '8px', fontWeight: 700 }}>
                    {findTemplate(learnTarget)?.hint ?? 'Match the guide and hold steady.'}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {CURRICULUM.map((u, i) => (
                      <button
                        key={u.unit}
                        className={`duo-btn ${i === unitIdx ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => pickUnit(i)}
                      >
                        Unit {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="duo-sign-glyph-box">
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#1cb0f6', textTransform: 'uppercase' }}>
                    3D Reference • drag to rotate
                  </span>
                  <HandClip
                    signId={learnTarget}
                    pose={referencePose(learnTarget)}
                    path={findTemplate(learnTarget)?.path}
                    flip={hand === 'Left'}
                    height={210}
                  />
                  <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                    {findTemplate(learnTarget)?.kind === 'dynamic' ? 'Watch the motion, then copy it' : 'ASL Standard'}
                  </span>
                </div>

                <LiveCoachPanel detail={live.detail} landmarks={live.landmarks} advice={liveAdvice} />

                <div
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#ffc800" />
                    <span>Hands-Free Detection</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700, marginTop: '4px', lineHeight: 1.4 }}>
                    No need to click! Just hold your sign steady for 1.5 seconds and the mirror will check automatically.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar: real auto-submit. Hold passing score 1.5s, no fake jump. */}
            <div className="duo-bottom-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="duo-btn duo-btn-secondary"
                onClick={() => {
                  const item = currentItem(lesson)
                  if (!item) {
                    navigateTo('learn_complete')
                    return
                  }
                  setHistory((h) => [...h, { id: item.id, score: 0, perJoint: [], passed: false }])
                  const next = answerIncorrect(lesson, item.id, 0)
                  setLesson(next)
                  navigateTo(isFinished(next) ? 'learn_complete' : 'learn_mirror_incorrect')
                }}
              >
                Skip Sign
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'rgba(28, 176, 246, 0.12)',
                  border: '2px solid #1cb0f6',
                  borderRadius: '18px',
                  padding: '12px 24px',
                  userSelect: 'none',
                }}
              >
                <div style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(28, 176, 246, 0.25)', position: 'absolute' }}></div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #1cb0f6', borderTopColor: 'transparent', position: 'absolute', transform: 'rotate(60deg)' }}></div>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: '#1cb0f6' }}>1.5s</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>
                      {live.landmarks
                        ? live.detail && live.detail.passed
                          ? `Holding ${Math.round(live.detail.score)}%... auto-submit soon`
                          : `Live ${Math.round(live.detail?.score ?? 0)}%... adjust to pass`
                        : cameraError
                          ? 'Camera blocked: click Allow up top'
                          : 'Waiting for hand...'}
                    </span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#58cc02', display: 'inline-block' }}></span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                    {live.detail ? liveAdvice : 'Allow camera, then hold your sign steady'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 1 - SCREEN 2B: PRACTICE MIRROR (CORRECT GREEN TOAST) */}
        {/* ========================================================================= */}
        {screen === 'learn_mirror_correct' && (
          <div className="duo-quiz-container">
            {/* Top Quiz Bar */}
            <div className="duo-quiz-top-bar">
              <button className="duo-close-btn" onClick={() => navigateTo('learn_path')}>
                <X size={28} />
              </button>
              <div className="duo-progress-track">
                <div className="duo-progress-fill" style={{ width: '40%' }}></div>
              </div>
              <div className="duo-quiz-hearts">
                <Heart size={24} fill="#ff4b4b" color="#ff4b4b" />
                <span>5</span>
              </div>
            </div>

            <div className="duo-question-title">Sign {learnTarget} in the camera mirror (Q{Math.min(lesson.n, lesson.t)}/{lesson.t})</div>

            {/* Quiz Body */}
            <div className="duo-quiz-body">
              <div className="duo-camera-card">
                <WebcamVideo stream={cameraStream} isLive={isCameraLive} isMirrored={isMirrored} />
                {renderHandLandmarks('correct', isCameraLive, learnTarget)}
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
                  {isCameraLive ? 'LIVE WEBCAM • MATCH CONFIRMED' : 'MATCH CONFIRMED'}
                </div>
              </div>
              <div className="duo-prompt-card">
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#afbac0' }}>
                    Target Sign
                  </div>
                  <div style={{ fontSize: '72px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{learnTarget}</div>
                  <div style={{ color: '#58cc02', fontWeight: 800, marginTop: '8px' }}>
                    {history.length ? `Matched at ${Math.round(history[history.length - 1].score)}%` : 'Matched!'}
                  </div>
                </div>

                <div className="duo-sign-glyph-box" style={{ borderColor: '#58cc02' }}>
                  <CheckCircle2 size={42} color="#58cc02" />
                  <span style={{ fontSize: '13px', color: '#58cc02', fontWeight: 800, marginTop: '6px' }}>
                    Sign Matched!
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#58cc02', fontWeight: 800 }}>
                  {sessionSummary}
                </div>
              </div>
            </div>

            {/* Bottom Feedback Sheet: Correct */}
            <div className="duo-feedback-sheet-correct">
              <div className="duo-feedback-info">
                <div className="duo-feedback-icon-wrap correct">
                  <Check size={36} strokeWidth={4} />
                </div>
                <div>
                  <div className="duo-feedback-headline correct">Nicely done!</div>
                  <div className="duo-feedback-subtext correct">Great hand form! • +10 XP earned</div>
                </div>
              </div>
              <button
                className="duo-btn duo-btn-green"
                style={{ minWidth: '180px' }}
                onClick={() => navigateTo(isFinished(lesson) ? 'learn_complete' : 'learn_mirror_prompt')}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 1 - SCREEN 2C: PRACTICE MIRROR (INCORRECT RED TOAST) */}
        {/* ========================================================================= */}
        {screen === 'learn_mirror_incorrect' && (
          <div className="duo-quiz-container">
            {/* Top Quiz Bar */}
            <div className="duo-quiz-top-bar">
              <button className="duo-close-btn" onClick={() => navigateTo('learn_path')}>
                <X size={28} />
              </button>
              <div className="duo-progress-track">
                <div className="duo-progress-fill" style={{ width: '30%' }}></div>
              </div>
              <div className="duo-quiz-hearts">
                <Heart size={24} fill="#ff4b4b" color="#ff4b4b" />
                <span>4</span>
              </div>
            </div>

            <div className="duo-question-title">Sign {learnTarget} in the camera mirror (Q{Math.min(lesson.n, lesson.t)}/{lesson.t})</div>

            {/* Quiz Body */}
            <div className="duo-quiz-body">
              <div className="duo-camera-card">
                <WebcamVideo stream={cameraStream} isLive={isCameraLive} isMirrored={isMirrored} />
                {renderHandLandmarks('incorrect', isCameraLive, learnTarget)}
                <div
                  className="duo-camera-badge"
                  style={{
                    color: '#ff4b4b',
                    borderColor: 'rgba(255, 75, 75, 0.4)',
                  }}
                >
                  <span
                    className={`duo-camera-dot ${isCameraLive ? 'live' : ''}`}
                    style={{ background: '#ff4b4b' }}
                  ></span>
                  {isCameraLive ? 'LIVE WEBCAM • ADJUST POSTURE' : 'ADJUST POSTURE'}
                </div>
              </div>
              <div className="duo-prompt-card">
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#afbac0' }}>
                    Target Sign
                  </div>
                  <div style={{ fontSize: '72px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{learnTarget}</div>
                  <div style={{ color: '#ff4b4b', fontWeight: 800, marginTop: '8px' }}>
                    {history.length ? `Last score ${Math.round(history[history.length - 1].score)}%. ${liveAdvice}` : 'Needs a quick adjustment'}
                  </div>
                </div>

                <div className="duo-sign-glyph-box" style={{ borderColor: '#ff4b4b' }}>
                  <XCircle size={42} color="#ff4b4b" />
                  <span style={{ fontSize: '13px', color: '#ff4b4b', fontWeight: 800, marginTop: '6px' }}>
                    Almost there!
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>
                  Queued again at the end. {sessionSummary}
                </div>
              </div>
            </div>

            {/* Bottom Feedback Sheet: Incorrect */}
            <div className="duo-feedback-sheet-incorrect">
              <div className="duo-feedback-info">
                <div className="duo-feedback-icon-wrap incorrect">
                  <X size={36} strokeWidth={4} />
                </div>
                <div>
                  <div className="duo-feedback-headline incorrect">Not quite right</div>
                  <div className="duo-feedback-subtext incorrect">
                    {history.length ? `Last: ${Math.round(history[history.length - 1].score)}%. ${liveAdvice}` : 'Try again slowly.'} • Queued for review!
                  </div>
                </div>
              </div>
              <button
                className="duo-btn duo-btn-red"
                style={{ minWidth: '180px' }}
                onClick={() => navigateTo('learn_mirror_prompt')}
              >
                Got It
              </button>
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
              <div className="duo-celebration-subtitle">
                {unitLabel} • {history.length} attempts • {sessionSummary}
              </div>
            </div>

            {/* 3 Result Cards */}
            <div className="duo-results-grid">
              <div className="duo-result-card">
                <div className="duo-result-lbl">Total XP</div>
                <div className="duo-result-val" style={{ color: '#ffc800' }}>
                  +{history.filter((h) => h.passed).length * 10}
                </div>
                <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                  {history.filter((h) => h.passed).length} passed
                </span>
              </div>

              <div className="duo-result-card">
                <div className="duo-result-lbl">Accuracy</div>
                <div className="duo-result-val" style={{ color: '#58cc02' }}>
                  {history.length ? `${Math.round(history.reduce((a, h) => a + h.score, 0) / history.length)}%` : '--'}
                </div>
                <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>Live scored</span>
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
                  {sessionSummary} {liveAdvice}
                </div>
              </div>
            </div>

            <button
              className="duo-btn duo-btn-green"
              style={{ width: '100%', padding: '16px', fontSize: '17px' }}
              onClick={() => navigateTo('learn_path')}
            >
              Continue Learning
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 2 - SCREEN 1: ALPHABET MATRIX (26-CARD GRID) */}
        {/* ========================================================================= */}
        {screen === 'alphabet_grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Top Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--duo-card)',
                border: '2px solid var(--duo-border)',
                borderRadius: '22px',
                padding: '20px 28px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff' }}>ASL Alphabet Characters</h2>
                <p style={{ color: '#afbac0', fontSize: '14px', fontWeight: 700 }}>
                  Tap any character to view hand formations or start a quick practice drill.
                </p>
              </div>

              {/* Filter Pills: live counts from the progress store */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`duo-btn ${filter === 'all' ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => setFilter('all')}
                >
                  All (26)
                </button>
                <button
                  className={`duo-btn ${filter === 'mastered' ? 'duo-btn-green' : 'duo-btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => setFilter('mastered')}
                >
                  Mastered ({masteredCount})
                </button>
                <button
                  className={`duo-btn ${filter === 'learning' ? 'duo-btn-blue' : 'duo-btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => setFilter('learning')}
                >
                  In Progress ({learningCount})
                </button>
                <button
                  className={`duo-btn ${filter === 'review' ? 'duo-btn-red' : 'duo-btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => setFilter('review')}
                >
                  Review ({reviewCount})
                </button>
              </div>
            </div>

            {/* Split layout: 26 cards + Inspector */}
            <div className="alpha-split">
              <div className="duo-alphabet-grid">
                {filteredAlphabet.map((item) => (
                  <div
                    key={item.char}
                    className={`duo-letter-card ${selectedLetter === item.char ? 'selected' : ''}`}
                    onClick={() => setSelectedLetter(item.char)}
                  >
                    <div className="duo-letter-char">{item.char}</div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#1cb0f6' }}>ASL</div>
                    <div className="duo-mastery-bar-wrap">
                      <div
                        className="duo-mastery-bar-fill"
                        style={{
                          width: `${item.pct}%`,
                          background: item.status === 'mastered' ? '#58cc02' : item.status === 'learning' ? '#1cb0f6' : '#ff4b4b',
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inspector Card on Right */}
              <div
                style={{
                  background: 'var(--duo-card)',
                  border: '2px solid var(--duo-border)',
                  borderRadius: '24px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#afbac0' }}>
                    Selected Character
                  </span>
                  <span
                    style={{
                      background: currentLetter.status === 'mastered' ? 'rgba(88, 204, 2, 0.2)' : 'rgba(28, 176, 246, 0.2)',
                      color: currentLetter.status === 'mastered' ? '#58cc02' : '#1cb0f6',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {currentLetter.pct}% Mastery{isCalibrated(currentLetter.char) ? ' • Personal' : ''}
                  </span>
                  {getPersonalAngles(currentLetter.char) && (
                    <span style={{ fontSize: '11px', color: '#58cc02', fontWeight: 800 }}>
                      Scoring against your saved hand
                    </span>
                  )}
                </div>

                <div
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '20px',
                    padding: '12px',
                  }}
                >
                  <div style={{ fontSize: '64px', fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1 }}>{currentLetter.char}</div>
                  {/* Rotatable 3D reference demo for the selected letter */}
                  <HandClip signId={currentLetter.char} pose={referencePose(currentLetter.char)} flip={hand === 'Left'} height={220} />
                </div>

                <div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', marginBottom: '6px' }}>
                    Form Description
                  </div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700, lineHeight: 1.5 }}>
                    {currentLetter.desc}
                  </div>
                </div>

                <button
                  className="duo-btn duo-btn-green"
                  style={{ width: '100%' }}
                  onClick={() => navigateTo('alphabet_drill')}
                >
                  Practice '{currentLetter.char}' in Camera
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
              <button className="duo-close-btn" onClick={() => navigateTo('alphabet_grid')}>
                <X size={28} />
              </button>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
                Fingerspelling Drill • Letter '{selectedLetter}'
              </div>
              <button className="duo-btn duo-btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                <RefreshCw size={14} /> Reset
              </button>
            </div>

            {/* Hold Timer Card */}
            <div className="duo-drill-timer-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={24} color="#58cc02" />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff' }}>
                    Hold Shape Steady: 1.8s / 2.0s
                  </div>
                  <div style={{ fontSize: '12px', color: '#a3e635', fontWeight: 700 }}>
                    Keep your hand steady inside the guide to complete
                  </div>
                </div>
              </div>
              <div style={{ width: '120px', height: '10px', background: '#37464f', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: '90%', height: '100%', background: '#58cc02' }}></div>
              </div>
            </div>

            {/* Drill Body */}
            <div className="duo-quiz-body">
              <div className="duo-camera-card">
                <WebcamVideo stream={cameraStream} isLive={isCameraLive} isMirrored={isMirrored} videoRef={alphaVideoRef} />
                {showSkeleton && alpha.landmarks ? (
                  <LandmarkOverlay lm={alpha.landmarks} color={alpha.detail && alpha.detail.passed ? '#58cc02' : '#1cb0f6'} mirrored={isMirrored} />
                ) : null}
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
                  {alpha.landmarks
                    ? `LIVE ${Math.round(alpha.detail?.score ?? 0)}% • HOLD ${Math.round(holdMs / 100) / 10}s/2s`
                    : isCameraLive
                      ? 'LIVE WEBCAM • STABILITY DRILL'
                      : 'STABILITY DRILL'}
                </div>
              </div>
              <div className="duo-prompt-card">
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#afbac0' }}>
                    Target Character
                  </div>
                  <div style={{ fontSize: '72px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{selectedLetter}</div>
                  <div style={{ color: alpha.detail && alpha.detail.passed ? '#58cc02' : '#afbac0', fontWeight: 800, marginTop: '8px' }}>
                    {!alpha.landmarks
                      ? 'Show your hand to start scoring.'
                      : alpha.detail && alpha.detail.passed
                        ? `Passing at ${Math.round(alpha.detail.score)}%. Keep holding...`
                        : `Live ${Math.round(alpha.detail?.score ?? 0)}%. Adjust shape to pass 80%.`}
                  </div>
                </div>

                <div className="duo-sign-glyph-box">
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#1cb0f6', textTransform: 'uppercase' }}>
                    Sign Quality
                  </span>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#58cc02', marginTop: '6px' }}>
                    {alpha.detail ? `${Math.round(alpha.detail.score)}%` : '--'}
                  </div>
                  <span style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                    {holdMs >= 2000 ? 'Hold complete! Nice muscle memory.' : 'Steady Hold'}
                  </span>
                </div>

                <LiveCoachPanel
                  detail={alpha.detail}
                  landmarks={alpha.landmarks}
                  advice={alphaAdvice}
                  holdLabel={
                    holdMs >= 2000
                      ? 'Hold complete! Nice muscle memory.'
                      : alpha.detail && alpha.detail.passed
                        ? `Holding... ${Math.round(holdMs / 100) / 10}s / 2s to lock mastery`
                        : 'Reach 80%+ to start the 2s mastery timer'
                  }
                />

                <button
                  className="duo-btn duo-btn-green"
                  style={{ width: '100%' }}
                  onClick={() => navigateTo('alphabet_grid')}
                >
                  Clear & Return to Grid
                </button>

                {/* Personal calibration: save YOUR steady hand as the reference */}
                {isCalibrated(selectedLetter) ? (
                  <button
                    className="duo-btn duo-btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => {
                      clearPersonalAngles(selectedLetter)
                      setProgressRec(getProgress())
                    }}
                  >
                    My shape saved ✓ • Reset to default
                  </button>
                ) : (
                  <button
                    className="duo-btn duo-btn-blue"
                    style={{ width: '100%' }}
                    disabled={!alpha.detail?.passed || alpha.angles.length === 0}
                    onClick={() => {
                      savePersonalAngles(selectedLetter, alpha.angles)
                      setProgressRec(getProgress())
                    }}
                  >
                    Save MY {selectedLetter} as reference
                  </button>
                )}
                <div style={{ fontSize: '11px', color: '#afbac0', fontWeight: 700, textAlign: 'center' }}>
                  {isCalibrated(selectedLetter)
                    ? 'Scoring against your captured hand.'
                    : 'Hold 80%+ then save. Detection adapts to your hand.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 3: OPTICAL DICTIONARY SEARCH */}
        {/* ========================================================================= */}
        {screen === 'dictionary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Search Bar */}
            <div className="duo-dict-search-bar">
              <Search size={24} color="#1cb0f6" />
              <input
                type="text"
                className="duo-dict-input"
                placeholder="Search 500+ ASL vocabulary signs, phrases, or fingerspelling..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="duo-btn duo-btn-blue" style={{ padding: '10px 22px' }}>
                Search
              </button>
            </div>

            {/* Split Screen: Camera Detector Feed vs Lexicon Definition */}
            <div className="dict-split">
              {/* Left: Camera Optical Recognition HUD */}
              <div
                style={{
                  background: 'var(--duo-card)',
                  border: '2px solid var(--duo-border)',
                  borderRadius: '24px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={20} color="#1cb0f6" />
                    Sign Camera Translator
                  </div>
                  <span
                    style={{
                      background: 'rgba(88, 204, 2, 0.15)',
                      color: '#58cc02',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    LIVE RECOGNITION
                  </span>
                </div>

                <div className="duo-camera-card" style={{ aspectRatio: '16/10' }}>
                  <WebcamVideo stream={cameraStream} isLive={isCameraLive} isMirrored={isMirrored} videoRef={dictVideoRef} />
                  {showSkeleton && dictLm && (
                    <LandmarkOverlay lm={dictLm} color={dictBest && dictBest.score >= 80 ? '#58cc02' : '#1cb0f6'} mirrored={isMirrored} />
                  )}
                  {dictLm && (() => {
                    const xs = dictLm.map((p) => (isMirrored ? 1 - p.x : p.x) * 800)
                    const ys = dictLm.map((p) => p.y * 500)
                    const x0 = Math.max(0, Math.min(...xs) - 24)
                    const y0 = Math.max(0, Math.min(...ys) - 24)
                    const x1 = Math.min(800, Math.max(...xs) + 24)
                    const y1 = Math.min(500, Math.max(...ys) + 24)
                    return (
                      <svg className="landmarks-svg-layer" viewBox="0 0 800 500" preserveAspectRatio="none">
                        <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="14" fill="none" stroke="#58cc02" strokeWidth="2" strokeDasharray="5,5" opacity="0.85" vectorEffect="non-scaling-stroke" />
                      </svg>
                    )
                  })()}

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
                    {dictBest ? `SEEN: ${dictBest.id} ${Math.round(dictBest.score)}%` : isCameraLive ? 'LIVE OPTICAL TRACKER' : 'RECOGNIZING SIGN...'}
                  </div>
                </div>

                {/* Nearest Match Banner */}
                <div
                  style={{
                    background: 'rgba(88, 204, 2, 0.12)',
                    border: '2px solid #58cc02',
                    borderRadius: '18px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#a3e635', textTransform: 'uppercase' }}>
                      Detected Sign
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff' }}>
                      "{dictBest ? dictBest.id : 'Show a sign'}"
                    </div>
                    {dictBest && (
                      <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>{dictBest.hint}</div>
                    )}
                  </div>
                  <div
                    style={{
                      background: '#58cc02',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '12px',
                      fontWeight: 900,
                      fontSize: '14px',
                    }}
                  >
                    {dictBest ? `${Math.round(dictBest.score)}%` : dictLm ? 'Low confidence…' : 'Scanning'}
                  </div>
                </div>

                {/* Top candidates: tap to lock the translation */}
                {dictCands.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {dictCands.map((c) => (
                      <button
                        key={c.id}
                        className={`duo-btn ${dictLock === c.id ? 'duo-btn-green' : 'duo-btn-secondary'}`}
                        style={{ padding: '8px 14px', fontSize: '13px' }}
                        onClick={() => setDictLock(dictLock === c.id ? null : c.id)}
                      >
                        {c.id} • {Math.round(c.score)}%
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Dictionary Entry & TTS Audio */}
              <div
                style={{
                  background: 'var(--duo-card)',
                  border: '2px solid var(--duo-border)',
                  borderRadius: '24px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#afbac0' }}>
                    Sign Translation ({lang})
                  </div>
                  <h3 style={{ fontSize: '32px', fontWeight: 900, color: '#ffffff' }}>
                    {dictShown ? (FSL_DEFINITIONS[dictShown.id]?.title ?? definitionFor(dictShown.id).title) : searchQuery || 'Thank You'}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#1cb0f6', fontWeight: 800 }}>
                    {dictShown ? (FSL_DEFINITIONS[dictShown.id]?.sub ?? definitionFor(dictShown.id).sub) : '/θæŋk juː/ • Conversational Courtesy'}
                  </div>
                  {dictShown && (
                    <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700, marginTop: '6px' }}>
                      {FSL_DEFINITIONS[dictShown.id]?.desc ?? definitionFor(dictShown.id).desc}
                      {dictLock && <div style={{ color: '#58cc02', fontWeight: 800 }}>Locked by you. Tap the chip again to resume live scan.</div>}
                    </div>
                  )}
                  {/* Reverse text lookup against the active language pack */}
                  {(() => {
                    const q = searchQuery.trim().toUpperCase()
                    const match = q ? templatesForLang(lang).find((t) => t.id.includes(q)) : undefined
                    if (!match) return null
                    return (
                      <div style={{ marginTop: '10px', background: '#131f24', border: '2px solid var(--duo-border)', borderRadius: '14px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#1cb0f6' }}>TEXT MATCH: {match.id}</div>
                        <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>{match.hint}</div>
                        <HandClip signId={match.id} pose={referencePose(match.id)} path={match.path} flip={hand === 'Left'} height={200} />
                      </div>
                    )
                  })()}
                  {/* 3D demo of the selected sign */}
                  {dictShown && findTemplate(dictShown.id) && (
                    <div style={{ marginTop: '10px' }}>
                      <HandClip signId={dictShown.id} pose={referencePose(dictShown.id)} path={findTemplate(dictShown.id)!.path} flip={hand === 'Left'} height={220} />
                    </div>
                  )}
                </div>

                {/* Audio TTS Pronounce Card */}
                <div
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                      className="duo-btn duo-btn-blue"
                      style={{ width: '42px', height: '42px', padding: 0, borderRadius: '50%' }}
                      onClick={() => soundOn && speak(dictShown ? (FSL_DEFINITIONS[dictShown.id]?.title ?? definitionFor(dictShown.id).title) : searchQuery || 'Thank you', ttsRate)}
                    >
                      <Volume2 size={20} />
                    </button>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>Audio Pronunciation</div>
                      <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>Synthesized Voice (US English)</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div style={{ width: '4px', height: '12px', background: '#1cb0f6', borderRadius: '2px' }}></div>
                    <div style={{ width: '4px', height: '22px', background: '#1cb0f6', borderRadius: '2px' }}></div>
                    <div style={{ width: '4px', height: '16px', background: '#1cb0f6', borderRadius: '2px' }}></div>
                    <div style={{ width: '4px', height: '26px', background: '#1cb0f6', borderRadius: '2px' }}></div>
                  </div>
                </div>

                {/* Motion Breakdown: real steps for the shown sign */}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', marginBottom: '8px' }}>
                    How to Form the Sign
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#afbac0', fontWeight: 700, lineHeight: 1.5 }}>
                    {(() => {
                      const steps = howToFor(dictShown ? dictShown.id : searchQuery.trim().toUpperCase() || 'THANK YOU')
                      return (
                        <>
                          <div>
                            <strong style={{ color: '#ffffff' }}>1. Start Position:</strong> {steps.start}
                          </div>
                          <div>
                            <strong style={{ color: '#ffffff' }}>2. {/^[A-Z0-9]$/.test(dictShown?.id ?? '') ? 'Hold Still:' : 'Motion:'}</strong> {steps.motion}
                          </div>
                          <div>
                            <strong style={{ color: '#ffffff' }}>3. {dictShown && /^[A-Z0-9]$/.test(dictShown.id) ? 'Form Cue:' : 'Facial Cue:'}</strong> {steps.cue}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Related Signs: same family, tap to look up */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#afbac0', marginBottom: '8px' }}>
                    Related Signs
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {relatedFor(dictShown ? dictShown.id : 'THANK YOU', lang, templatesForLang(lang)).map((tag) => (
                      <button
                        key={tag}
                        className="duo-btn duo-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => {
                          setDictLock(null)
                          setSearchQuery(tag)
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="duo-btn duo-btn-green"
                  style={{ width: '100%' }}
                  onClick={() => {
                    const id = dictShown ? dictShown.id : searchQuery.trim().toUpperCase()
                    if (!id) return
                    const list = addToPracticeList(id)
                    setPracticeCount(list.length)
                    setAddedFlash(id)
                    window.setTimeout(() => setAddedFlash(null), 2000)
                  }}
                >
                  {addedFlash ? `Added '${addedFlash}' ✓` : `Add '${dictShown ? dictShown.id : searchQuery.trim().toUpperCase() || 'sign'}' to Practice List`}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOWCHART COL 4: SETTINGS & PREFERENCES */}
        {/* ========================================================================= */}
        {screen === 'settings' && (
          <div className="duo-settings-panel">
            {/* Section 1: Camera & Tracking */}
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
                  {availableCameras.length > 0 ? (
                    availableCameras.map((cam, idx) => (
                      <option key={cam.deviceId || idx} value={cam.deviceId}>
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="">Default Integrated Camera</option>
                      <option value="c920">Logitech C920 HD Pro</option>
                    </>
                  )}
                </select>
              </div>

              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Mirror Video Horizontally</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>Flip video feed like a vanity mirror</div>
                </div>
                <div
                  onClick={() => setIsMirrored(!isMirrored)}
                  style={{
                    width: '48px',
                    height: '28px',
                    background: isMirrored ? '#58cc02' : '#37464f',
                    borderRadius: '999px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      background: '#ffffff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '3px',
                      left: isMirrored ? '23px' : '3px',
                      transition: 'left 0.2s ease',
                    }}
                  ></div>
                </div>
              </div>

              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Hand Skeleton Guide</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>Show glowing joint lines on camera mirror</div>
                </div>
                <div
                  onClick={() => togglePref('signlens_skeleton', setShowSkeleton, showSkeleton)}
                  style={{ width: '48px', height: '28px', background: showSkeleton ? '#58cc02' : '#37464f', borderRadius: '999px', position: 'relative', cursor: 'pointer' }}
                >
                  <div style={{ width: '22px', height: '22px', background: '#ffffff', borderRadius: '50%', position: 'absolute', top: '3px', left: showSkeleton ? '23px' : '3px', transition: 'left 0.2s ease' }}></div>
                </div>
              </div>

              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Hand Dominance</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>Flips the 3D demo. Scoring accepts both hands</div>
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

            {/* Section 2: Audio, Performance & Privacy */}
            <div className="duo-settings-card">
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={22} color="#58cc02" />
                Audio, Performance & Privacy
              </div>

              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Voice Feedback (TTS)</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>Speak dictionary pronunciations aloud</div>
                </div>
                <div
                  onClick={() => togglePref('signlens_sound', setSoundOn, soundOn)}
                  style={{ width: '48px', height: '28px', background: soundOn ? '#58cc02' : '#37464f', borderRadius: '999px', position: 'relative', cursor: 'pointer' }}
                >
                  <div style={{ width: '22px', height: '22px', background: '#ffffff', borderRadius: '50%', position: 'absolute', top: '3px', left: soundOn ? '23px' : '3px', transition: 'left 0.2s ease' }}></div>
                </div>
              </div>

              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Speech Speed ({ttsRate.toFixed(2)}x)</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>Text-to-speech playback rate</div>
                </div>
                <input
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#afbac0' }}>Vision Engine</span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#58cc02' }}>Active (On-Device)</span>
                </div>
                <div
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#afbac0' }}>Camera Speed</span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#58cc02' }}>Smooth (60 FPS)</span>
                </div>
                <div
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#afbac0' }}>Body Anchors</span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: bodyOk ? '#58cc02' : '#ff9600' }}>
                    {bodyOk ? 'Anchored (nose + shoulders)' : isCameraLive ? 'Locating body...' : 'Needs camera'}
                  </span>
                </div>
                <div
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#afbac0' }}>Camera Privacy</span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#1cb0f6' }}>100% Private (On-Device)</span>
                </div>
                <div
                  style={{
                    background: '#131f24',
                    border: '2px solid var(--duo-border)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#afbac0' }}>Offline Mode</span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#58cc02' }}>Ready (Zero Data Used)</span>
                </div>
              </div>
            </div>

            {/* Section 3: App Updates */}
            <div className="duo-settings-card">
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RefreshCw size={22} color="#1cb0f6" />
                App Updates
              </div>
              <div className="duo-settings-row">
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Version {pkg.version}</div>
                  <div style={{ fontSize: '13px', color: '#afbac0', fontWeight: 700 }}>{updateStatus}</div>
                </div>
                <button
                  className="duo-btn duo-btn-blue"
                  style={{ padding: '10px 22px' }}
                  onClick={() => checkForUpdates(false)}
                  disabled={updateBusy}
                >
                  {updateBusy ? 'Checking...' : 'Check for Updates'}
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                Pulled from github.com/JmDemisana/SignLens releases. Only this check uses the network.
              </div>
              <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
                3D hand model “Rigged Hand” by J-Toastie, CC-BY. MediaPipe hand and pose models by Google.
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Offline status footer */}
      <footer className="duo-status-footer">
        100% offline • Camera never leaves this device • {isCameraLive ? 'Camera live' : 'Camera off'}
      </footer>
    </div>
  )
}
