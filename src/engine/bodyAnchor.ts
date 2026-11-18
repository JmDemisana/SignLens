import { PoseLandmarker } from '@mediapipe/tasks-vision'
import { visionFiles } from './visionFiles'
import type { Vec3 } from './types'

export interface BodyFrame {
  nose: Vec3
  shoulderWidth: number // normalized units, > 0 when a body is visible
  at: number
}

let landmarker: PoseLandmarker | null = null
let loading: Promise<PoseLandmarker | null> | null = null
let latest: BodyFrame | null = null

export function getBodyFrame(): BodyFrame | null {
  // Stale after 1.5s without a sighting so signs never grade on old bodies.
  if (!latest) return null
  if (performance.now() - latest.at > 1500) return null
  return latest
}

function loadPose(): Promise<PoseLandmarker | null> {
  if (landmarker) return Promise.resolve(landmarker)
  if (loading) return loading
  loading = (async () => {
    try {
      const vision = await visionFiles()
      try {
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        })
      } catch (gpuErr) {
        console.warn('PoseLandmarker GPU delegate failed, falling back to CPU:', gpuErr)
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4,
        })
      }
      return landmarker
    } catch (e) {
      console.warn('PoseLandmarker unavailable, hand-only mode:', e)
      return null
    }
  })()
  return loading
}

// Throttled by the caller (~10fps). Updates the shared body frame.
export async function sampleBody(video: HTMLVideoElement): Promise<BodyFrame | null> {
  const lm = await loadPose()
  if (!lm) return getBodyFrame()
  try {
    if (video.readyState < 2 || video.videoWidth === 0) return getBodyFrame()
    const res = lm.detectForVideo(video, performance.now())
    const pts = res?.landmarks?.[0]
    if (!pts || pts.length < 25) return getBodyFrame()
    const nose = { x: pts[0].x, y: pts[0].y, z: pts[0].z ?? 0 }
    const ls = pts[11]
    const rs = pts[12]
    const w = Math.hypot(ls.x - rs.x, ls.y - rs.y)
    if (w < 0.05) return getBodyFrame()
    latest = { nose, shoulderWidth: w, at: performance.now() }
    return latest
  } catch {
    return getBodyFrame()
  }
}

// Express a hand point relative to the nose, scaled by shoulder width.
// Falls back to raw camera coords when no body is visible so static
// letters keep working with the camera alone.
export function normalizePoint(p: Vec3, b = getBodyFrame()): Vec3 {
  if (!b || b.shoulderWidth <= 0) return { x: p.x, y: p.y, z: p.z || 0 }
  return {
    x: (p.x - b.nose.x) / b.shoulderWidth,
    y: (p.y - b.nose.y) / b.shoulderWidth,
    z: (p.z || 0) / b.shoulderWidth,
  }
}
