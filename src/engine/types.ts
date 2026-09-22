export interface Vec3 {
  x: number
  y: number
  z: number
}

export type HandLandmarks = Vec3[] // 21 points, MediaPipe order

export type SignLang = 'ASL' | 'FSL'

export interface PoseTemplate {
  id: string // e.g. 'A', 'B', 'HELLO'
  kind: 'static' | 'dynamic'
  // Static: target joint angles in degrees.
  // Order: [thumbMCP, thumbIP, indexMCP, indexPIP, middleMCP, middlePIP, ringMCP, ringPIP, pinkyMCP, pinkyPIP, wristPitch]
  angles?: number[]
  // Dynamic: reference palm-center path, normalized 0..1
  path?: Vec3[]
  hint: string
  lang: SignLang | 'BOTH' // BOTH = shared manual alphabet and numbers
}

export interface ScoreDetail {
  id: string
  score: number // 0..100
  perJoint: number[] // absolute offset per angle
  passed: boolean
}

export interface LessonItem {
  id: string
  label: string
}

export interface LessonState {
  queue: LessonItem[]
  n: number // 1-based current question
  t: number // total count including appended retries
  attempts: Record<string, { tries: number; passed: boolean; lastScore: number }>
}
