import { useEffect, useMemo, useRef, useState } from 'react'
import { detectBothHands, loadHandLandmarker } from '../engine/mediapipe'
import { fingerAngles, palmCenter, scoreStatic } from '../engine/angles'
import { scoreDynamicBoth } from '../engine/dtw'
import { MotionTrace } from '../engine/motion'
import { findTemplate } from '../engine/templates'
import { getPersonalAngles } from '../engine/personal'
import { supportsPersonalComparison } from '../engine/personalPilot'
import type { HandLandmarks, ScoreDetail, SignLang } from '../engine/types'

export interface TelemetryRow {
  timestamp: string
  targetId: string
  kind: 'static' | 'dynamic'
  score: number
  meanErrorDeg: number
  passed: boolean
  latencyMs: number
}

const LOG_KEY = 'signlens_telemetry_csv_v1'

export function appendTelemetryRow(row: TelemetryRow) {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
    const list: TelemetryRow[] = Array.isArray(raw) ? raw : []
    list.push(row)
    if (list.length > 1000) list.splice(0, list.length - 1000)
    localStorage.setItem(LOG_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

export function getTelemetryRows(): TelemetryRow[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function clearTelemetryRows() {
  try { localStorage.removeItem(LOG_KEY) } catch { /* ignore */ }
}

export function exportTelemetryCsv(): void {
  const rows = getTelemetryRows()
  const header = 'timestamp,target_sign,kind,score_0_100,mean_angular_error_deg,passed,frame_latency_ms\n'
  const body = rows
    .map((r) => `${r.timestamp},"${r.targetId}",${r.kind},${r.score.toFixed(1)},${r.meanErrorDeg.toFixed(2)},${r.passed},${r.latencyMs.toFixed(2)}`)
    .join('\n')
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `signlens_fsl_telemetry_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Opts {
  targetId: string
  lang: SignLang
  active: boolean
  resetKey?: number
}

export function useSignCheck(videoRef: React.RefObject<HTMLVideoElement | null>, { targetId, lang, active, resetKey }: Opts) {
  const [landmarks, setLandmarks] = useState<HandLandmarks | null>(null)
  const [secondLandmarks, setSecondLandmarks] = useState<HandLandmarks | null>(null)
  const [detail, setDetail] = useState<ScoreDetail | null>(null)
  const [fps, setFps] = useState(0)
  const [latencyMs, setLatencyMs] = useState(0)
  const [angles, setAngles] = useState<number[]>([])
  const lastScoreAt = useRef(-Infinity)
  const token = useMemo(() => ({ active, targetId, lang, resetKey }), [active, targetId, lang, resetKey])
  const [engine, setEngine] = useState<{ token: typeof token; ready: boolean } | null>(null)

  useEffect(() => {
    const { active, targetId, lang } = token
    if (!active) return
    const template = findTemplate(targetId)
    let smoothed: number[] = []
    const motionA = new MotionTrace()
    const motionB = new MotionTrace()
    let raf = 0
    let alive = true
    let frameTime = -1
    let lastSample = -Infinity
    let intervalStart = performance.now()
    let frames = 0
    let tracking = false

    const clear = () => {
      lastScoreAt.current = -Infinity
      setDetail(null)
      setLandmarks(null)
      setSecondLandmarks(null)
      setAngles([])
      smoothed = []
      motionA.reset()
      motionB.reset()
      tracking = false
    }
    const onVisibilityChange = () => { if (document.hidden) clear() }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const loop = (t: number) => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      const video = videoRef.current
      if (!video || document.hidden || video.readyState < 2 || video.videoWidth === 0 || frameTime === video.currentTime) {
        if (tracking && (document.hidden || t - lastSample > 400)) clear()
        return
      }
      if (t - lastSample < 30) return
      frameTime = video.currentTime
      lastSample = t
      frames++
      if (t - intervalStart >= 500) {
        setFps(Math.round((frames * 1000) / (t - intervalStart)))
        frames = 0
        intervalStart = t
      }

      const tIn = performance.now()
      const hands = detectBothHands(video, t)
      const tOut = performance.now()
      setLatencyMs(Math.round((tOut - tIn) * 10) / 10)

      const lm = hands[0] ?? null
      const lm2 = hands[1] ?? null
      if (!lm) {
        if (tracking) clear()
        return
      }
      tracking = true
      setLandmarks(lm)
      setSecondLandmarks(lm2)
      const aspect = video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9
      const raw = fingerAngles(lm, aspect)
      const live = smoothed.length === raw.length ? raw.map((v, i) => smoothed[i] + 0.35 * (v - smoothed[i])) : raw
      smoothed = live
      setAngles(live)

      if (!template) {
        setDetail(null)
        return
      }

      if (template.kind === 'static') {
        const personal = supportsPersonalComparison(targetId, lang) ? getPersonalAngles(targetId) : null
        const targetAngles = personal && personal.length === 11 ? personal : template.angles
        if (!targetAngles || targetAngles.length !== 11) {
          setDetail(null)
          return
        }
        const s1 = scoreStatic(live, targetAngles)
        const s2 = lm2 ? scoreStatic(fingerAngles(lm2, aspect), targetAngles) : { score: -1, perJoint: [] }
        const best = s2.score > s1.score ? s2 : s1
        lastScoreAt.current = t
        setDetail({ id: targetId, score: best.score, perJoint: best.perJoint, passed: best.score >= 85 })
      } else if (template.kind === 'dynamic' && template.path) {
        // 1. Enforce exact hand count (2-handed vs 1-handed) matching the FSL-105 video
        if (template.twoHanded && !lm2) {
          lastScoreAt.current = t
          setDetail({ id: targetId, score: 45, perJoint: [], passed: false })
          return
        }
        if (template.twoHanded === false && lm2 && palmCenter(lm2).y < 0.78) {
          lastScoreAt.current = t
          setDetail({ id: targetId, score: 49, perJoint: [], passed: false })
          return
        }

        // 2. Enforce spatial height zone (forehead vs chin vs chest) calibrated to FSL-105 signer framing
        const palmY = palmCenter(lm).y
        if (template.zone === 'forehead' && palmY > 0.58) {
          lastScoreAt.current = t
          setDetail({ id: targetId, score: 52, perJoint: [], passed: false })
          return
        }
        if (template.zone === 'chin' && (palmY < 0.24 || palmY > 0.75)) {
          lastScoreAt.current = t
          setDetail({ id: targetId, score: 54, perJoint: [], passed: false })
          return
        }
        if (template.zone === 'chest' && (palmY < 0.34 || palmY > 0.88)) {
          lastScoreAt.current = t
          setDetail({ id: targetId, score: 55, perJoint: [], passed: false })
          return
        }

        // 3. Evaluate finger handshape strictly (must reach >= 78%, and for 2-handed signs both hands must match)
        let handshapeScore = 82
        let perJoint: number[] = []
        if (template.angles && template.angles.length === 11) {
          const st1 = scoreStatic(live, template.angles)
          const st2 = lm2 ? scoreStatic(fingerAngles(lm2, aspect), template.angles) : { score: -1, perJoint: [] }
          if (template.twoHanded && lm2) {
            handshapeScore = (st1.score + st2.score) / 2
            perJoint = st1.score <= st2.score ? st1.perJoint : st2.perJoint
            if (Math.min(st1.score, st2.score) < 70 || handshapeScore < 78) {
              lastScoreAt.current = t
              setDetail({ id: targetId, score: handshapeScore * 0.82, perJoint, passed: false })
              return
            }
          } else {
            const bestSt = st2.score > st1.score ? st2 : st1
            handshapeScore = bestSt.score
            perJoint = bestSt.perJoint
            if (handshapeScore < 78) {
              lastScoreAt.current = t
              setDetail({ id: targetId, score: handshapeScore * 0.82, perJoint, passed: false })
              return
            }
          }
        }

        // 4. Evaluate FastDTW motion trajectory (requires >= 8 frames and >= 6.5% real movement span)
        const anchorA = template.motionLandmark !== undefined ? lm[template.motionLandmark] : palmCenter(lm)
        const traceA = motionA.sample(anchorA, t)
        const traceB = lm2 ? motionB.sample(template.motionLandmark !== undefined ? lm2[template.motionLandmark] : palmCenter(lm2), t) : null
        if (!traceA && !traceB) {
          lastScoreAt.current = t
          setDetail({ id: targetId, score: Math.min(68, handshapeScore * 0.72), perJoint, passed: false })
          return
        }
        const dtwA = traceA ? scoreDynamicBoth(traceA, template.path) : 0
        const dtwB = traceB ? scoreDynamicBoth(traceB, template.path) : 0
        const dtwScore = Math.max(dtwA, dtwB)
        const finalScore = Math.min(100, dtwScore * 0.6 + handshapeScore * 0.4)
        lastScoreAt.current = t
        setDetail({ id: targetId, score: finalScore, perJoint, passed: finalScore >= 82 && dtwScore >= 78 && handshapeScore >= 78 })
      }
    }

    void loadHandLandmarker().then((loaded) => {
      if (!alive) return
      setEngine({ token, ready: !!loaded })
      if (loaded) raf = requestAnimationFrame(loop)
    })
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      cancelAnimationFrame(raf)
      clear()
      setFps(0)
    }
  }, [token, videoRef])

  const hasFreshScore = () => active && !document.hidden && performance.now() - lastScoreAt.current < 400
  const loaded = engine?.token === token
  return { landmarks, secondLandmarks, detail, fps, latencyMs, ready: loaded && engine.ready, failed: loaded && !engine.ready, angles, hasFreshScore }
}
