import { useEffect, useRef, useState } from 'react'
import { detectLandmarks, loadHandLandmarker } from '../engine/mediapipe'
import { fingerAngles, palmCenter } from '../engine/angles'
import { scoreStatic } from '../engine/angles'
import { scoreDynamicBoth } from '../engine/dtw'
import { findTemplate } from '../engine/templates'
import { getPersonalAngles } from '../engine/personal'
import { normalizePoint } from '../engine/bodyAnchor'
import type { HandLandmarks, ScoreDetail, Vec3 } from '../engine/types'

interface Opts {
  targetId: string
  active: boolean
}

export function useSignCheck(videoRef: React.RefObject<HTMLVideoElement | null>, { targetId, active }: Opts) {
  const [landmarks, setLandmarks] = useState<HandLandmarks | null>(null)
  const [detail, setDetail] = useState<ScoreDetail | null>(null)
  const [fps, setFps] = useState(0)
  const [ready, setReady] = useState(false)
  const [angles, setAngles] = useState<number[]>([])
  const pathRef = useRef<Vec3[]>([])
  const smoothRef = useRef<number[]>([])
  const framesRef = useRef(0)
  const lastRef = useRef(0)

  useEffect(() => {
    if (!active) return
    let raf = 0
    let alive = true
    loadHandLandmarker().then(() => alive && setReady(true))
    const loop = (t: number) => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      const video = videoRef.current
      if (!video || video.readyState < 2 || video.videoWidth === 0) return
      framesRef.current += 1
      if (t - lastRef.current > 500) {
        setFps(Math.round((framesRef.current * 1000) / (t - lastRef.current)))
        framesRef.current = 0
        lastRef.current = t
      }
      const lm = detectLandmarks(video, t)
      setLandmarks(lm)
      const tpl = findTemplate(targetId)
      if (!tpl || !lm) return
      if (tpl.kind === 'static' && tpl.angles) {
        // Exponential moving average over frames: one shaky frame of
        // "fingers apart" no longer tanks the score when they touch.
        const raw = fingerAngles(lm)
        const prev = smoothRef.current
        const live =
          prev.length === raw.length
            ? raw.map((v, i) => prev[i] + 0.35 * (v - prev[i]))
            : raw
        smoothRef.current = live
        setAngles(live)
        // Personal calibration wins over the built-in guess when present.
        const target = getPersonalAngles(targetId) ?? tpl.angles
        const { score, perJoint } = scoreStatic(live, target)
        setDetail({ id: targetId, score, perJoint, passed: score >= 80 })
        pathRef.current = []
      } else if (tpl.kind === 'dynamic' && tpl.path) {
        // Body-anchored motion: nose + shoulder width normalize the path
        // so stepping closer to the lens does not fake a sign.
        const p = normalizePoint(palmCenter(lm))
        const last = pathRef.current[pathRef.current.length - 1]
        // Segment motion: only extend while the hand actually moves.
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.004) {
          pathRef.current.push(p)
        }
        if (pathRef.current.length > 60) pathRef.current.shift()
        // Need a full gesture window before scoring, not a 0.2s blip.
        // Both hand orientations are tried so left and right signers pass.
        if (pathRef.current.length >= 24) {
          const score = scoreDynamicBoth(pathRef.current, tpl.path)
          setDetail({ id: targetId, score, perJoint: [], passed: score >= 70 })
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [active, targetId, videoRef])

  return { landmarks, detail, fps, ready, angles }
}
