import { HandLandmarker } from '@mediapipe/tasks-vision'
import { visionFiles } from './visionFiles'
import type { HandLandmarks } from './types'

let landmarker: HandLandmarker | null = null
let loading: Promise<HandLandmarker | null> | null = null

export function loadHandLandmarker(): Promise<HandLandmarker | null> {
  if (landmarker) {
    try {
      void landmarker.setOptions({
        numHands: 2,
        minHandDetectionConfidence: 0.2,
        minHandPresenceConfidence: 0.2,
        minTrackingConfidence: 0.2,
      })
    } catch { /* ignore */ }
    return Promise.resolve(landmarker)
  }
  if (loading) return loading
  loading = (async () => {
    try {
      const vision = await visionFiles()
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `${import.meta.env.BASE_URL}models/hand_landmarker.task`,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.2,
          minHandPresenceConfidence: 0.2,
          minTrackingConfidence: 0.2,
        })
      } catch (gpuErr) {
        console.warn('HandLandmarker GPU delegate failed, falling back to CPU:', gpuErr)
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `${import.meta.env.BASE_URL}models/hand_landmarker.task`,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.2,
          minHandPresenceConfidence: 0.2,
          minTrackingConfidence: 0.2,
        })
      }
      return landmarker
    } catch (e) {
      console.warn('HandLandmarker unavailable, using guide mode:', e)
      return null
    }
  })().finally(() => { loading = null })
  return loading
}

let lastTimestamp = -1

export function detectBothHands(video: HTMLVideoElement, time: number): HandLandmarks[] {
  if (!landmarker) {
    if (!loading) void loadHandLandmarker()
    return []
  }
  try {
    const now = Math.floor(Math.max(time, performance.now()))
    const ts = now > lastTimestamp ? now : lastTimestamp + 1
    lastTimestamp = ts
    const res = landmarker.detectForVideo(video, ts)
    const raw = res?.landmarks ?? []
    const valid = raw
      .filter((pts) => pts && pts.length >= 21)
      .map((pts) => pts.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 })))
    valid.sort((a, b) => a[0].x - b[0].x)
    return valid
  } catch (err) {
    console.warn('detectBothHands error:', err)
    return []
  }
}

export function detectLandmarks(video: HTMLVideoElement, time: number): HandLandmarks | null {
  const hands = detectBothHands(video, time)
  return hands[0] ?? null
}
