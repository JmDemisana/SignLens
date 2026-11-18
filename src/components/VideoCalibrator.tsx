import { useRef, useState } from 'react'
import { fingerAngles, palmCenter } from '../engine/angles'
import { resamplePath } from '../engine/dtw'
import { detectBothHands, loadHandLandmarker } from '../engine/mediapipe'
import { fslVideoEntries } from '../engine/signVideos'
import { findTemplate } from '../engine/templates'
import type { Vec3 } from '../engine/types'

interface CalibratedRecord {
  angles: number[]
  angleKeyframes: number[][]
  path: Vec3[]
  twoHanded: boolean
  zone: 'forehead' | 'chin' | 'chest'
}

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = timeSec
  })
}

function loadVideoSrc(video: HTMLVideoElement, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error(`Failed to load ${src}`))
    }
    const cleanup = () => {
      video.removeEventListener('loadeddata', onLoaded)
      video.removeEventListener('error', onError)
    }
    video.addEventListener('loadeddata', onLoaded)
    video.addEventListener('error', onError)
    video.src = src
    video.load()
  })
}

export default function VideoCalibrator() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState('Ready to extract MediaPipe landmarks from all 105 FSL-105 videos.')
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [doneCount, setDoneCount] = useState<number | null>(null)

  const runCalibration = async () => {
    if (running || !videoRef.current) return
    setRunning(true)
    setDoneCount(null)
    setStatus('Loading MediaPipe HandLandmarker...')
    const landmarker = await loadHandLandmarker()
    if (!landmarker) {
      setStatus('Failed to load MediaPipe HandLandmarker.')
      setRunning(false)
      return
    }

    const video = videoRef.current
    const results: Record<string, CalibratedRecord> = {}
    let monoTime = performance.now() + 1000

    for (let i = 0; i < fslVideoEntries.length; i++) {
      const entry = fslVideoEntries[i]
      setProgress(i + 1)
      setStatus(`Extracting [${i + 1}/${fslVideoEntries.length}] ${entry.sign} (${entry.id}.mov)...`)
      try {
        await loadVideoSrc(video, `${import.meta.env.BASE_URL}sign-videos/fsl105/${entry.id}.mov`)
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 3.5
        const aspect = video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9
        const tpl = findTemplate(entry.sign)
        const lmIdx = tpl?.motionLandmark

        const rawPath: Vec3[] = []
        const angleFrames: number[][] = []
        let twoHandFrames = 0
        let minPalmY = 1

        const steps = 16
        for (let s = 0; s < steps; s++) {
          const tSec = dur * (0.12 + (0.76 * s) / (steps - 1))
          await seekVideo(video, tSec)
          monoTime += 40
          const hands = detectBothHands(video, monoTime)
          if (!hands.length) continue
          if (hands.length >= 2) twoHandFrames++

          // Pick the higher/more active hand for single-hand tracking
          const activeHand = hands.length >= 2 && palmCenter(hands[1]).y < palmCenter(hands[0]).y ? hands[1] : hands[0]
          const pt = lmIdx !== undefined ? activeHand[lmIdx] : palmCenter(activeHand)
          rawPath.push({ x: pt.x, y: pt.y, z: 0 })
          angleFrames.push(fingerAngles(activeHand, aspect).map((v) => Math.round(v)))
          for (const h of hands) {
            minPalmY = Math.min(minPalmY, palmCenter(h).y)
          }
        }

        if (angleFrames.length > 0 && rawPath.length >= 2) {
          const midIdx = Math.floor(angleFrames.length * 0.5)
          const peakIdx = Math.min(angleFrames.length - 1, Math.floor(angleFrames.length * 0.68))
          const lateIdx = Math.min(angleFrames.length - 1, Math.floor(angleFrames.length * 0.8))
          const keyframes = [angleFrames[midIdx], angleFrames[peakIdx], angleFrames[lateIdx]]
          const zone: 'forehead' | 'chin' | 'chest' =
            minPalmY < 0.36 ? 'forehead' : minPalmY < 0.56 ? 'chin' : 'chest'

          results[entry.sign] = {
            angles: angleFrames[peakIdx],
            angleKeyframes: keyframes,
            path: resamplePath(rawPath, 16).map((p) => ({
              x: Math.round(p.x * 1000) / 1000,
              y: Math.round(p.y * 1000) / 1000,
              z: 0,
            })),
            twoHanded: twoHandFrames >= 3,
            zone,
          }
        }
      } catch (err) {
        console.warn('Calibration skip', entry.sign, err)
      }
    }

    setStatus('Saving calibrated templates to src/engine/fsl105_calibrated.json...')
    const resp = await fetch('/__save-fsl-calibrated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results),
    })
    const saved = await resp.json()
    if (saved.ok) {
      setDoneCount(saved.count)
      setStatus(`Done! Saved ${saved.count} calibrated FSL-105 video templates to src/engine/fsl105_calibrated.json.`)
    } else {
      setStatus(`Save failed: ${saved.error}`)
    }
    setRunning(false)
  }

  return (
    <div style={{ maxWidth: 680, margin: '48px auto', padding: 24, background: '#182228', borderRadius: 14, color: '#f3f7fa', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>FSL-105 Video Landmark Calibrator</h2>
      <p style={{ color: '#9eb3c2', lineHeight: 1.5 }}>
        Extracts real MediaPipe 11-joint finger angles, 16-point trajectories, hand count, and height zones directly from all 105 bundled FSL-105 videos.
      </p>
      <video ref={videoRef} muted playsInline style={{ width: 320, height: 180, background: '#000', borderRadius: 8, display: 'block', marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button
          type="button"
          onClick={runCalibration}
          disabled={running}
          style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: running ? '#374854' : '#58cc02', color: '#0f171c', fontWeight: 700, cursor: running ? 'default' : 'pointer' }}
        >
          {running ? `Calibrating ${progress} / ${fslVideoEntries.length}...` : 'Extract All 105 Video Templates'}
        </button>
        <a href="/" style={{ color: '#7dd3fc', textDecoration: 'none', fontWeight: 600 }}>← Back to SignLens</a>
      </div>
      <div style={{ fontSize: 14, color: doneCount !== null ? '#86efac' : '#cbd5e1' }}>{status}</div>
    </div>
  )
}
