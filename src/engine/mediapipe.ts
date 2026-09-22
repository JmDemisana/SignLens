import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { HandLandmarks } from './types'

let landmarker: HandLandmarker | null = null
let loading: Promise<HandLandmarker | null> | null = null

// Local-first: /models/hand_landmarker.task is bundled in public/models.
// WASM files resolve from node_modules at dev time and dist at build time.
// No video ever leaves the device.
export function loadHandLandmarker(): Promise<HandLandmarker | null> {
  if (landmarker) return Promise.resolve(landmarker)
  if (loading) return loading
  loading = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks('/wasm')
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      return landmarker
    } catch (e) {
      console.warn('HandLandmarker unavailable, using guide mode:', e)
      return null
    }
  })()
  return loading
}

export function detectLandmarks(video: HTMLVideoElement, time: number): HandLandmarks | null {
  if (!landmarker) return null
  try {
    const res = landmarker.detectForVideo(video, time)
    const pts = res?.landmarks?.[0]
    if (!pts || pts.length < 21) return null
    return pts.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 }))
  } catch {
    return null
  }
}
