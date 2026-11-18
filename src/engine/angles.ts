import type { HandLandmarks, Vec3 } from './types'

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function norm(a: Vec3): number {
  return Math.sqrt(dot(a, a)) || 1e-6
}

export function angleBetween(a: Vec3, b: Vec3, c: Vec3): number {
  // Angle at b formed by a-b-c, in degrees 0..180.
  const v1 = sub(a, b)
  const v2 = sub(c, b)
  const cos = Math.max(-1, Math.min(1, dot(v1, v2) / (norm(v1) * norm(v2))))
  return (Math.acos(cos) * 180) / Math.PI
}

// MediaPipe hand indices:
// 0 wrist, 1-4 thumb, 5-8 index, 9-12 middle, 13-16 ring, 17-20 pinky
export function fingerAngles(lm: HandLandmarks, aspect = 1): number[] {
  if (!lm || lm.length < 21) return []
  // MediaPipe normalizes x and y against different frame dimensions.
  const points = lm.map(({ x, y, z }) => ({ x: x * aspect, y, z: z * aspect }))
  const A = (a: number, b: number, c: number) => angleBetween(points[a], points[b], points[c])
  return [
    A(0, 1, 2), // thumb MCP spread
    A(1, 2, 3), // thumb IP bend
    A(0, 5, 6), // index MCP
    A(5, 6, 7), // index PIP
    A(0, 9, 10), // middle MCP
    A(9, 10, 11), // middle PIP
    A(0, 13, 14), // ring MCP
    A(13, 14, 15), // ring PIP
    A(0, 17, 18), // pinky MCP
    A(17, 18, 19), // pinky PIP
    A(0, 5, 17), // wrist/palm spread
  ]
}

export function palmCenter(lm: HandLandmarks): Vec3 {
  const pts = [lm[0], lm[5], lm[9], lm[13], lm[17]]
  const s = pts.reduce(
    (acc, p) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length, z: acc.z + (p.z || 0) / pts.length }),
    { x: 0, y: 0, z: 0 },
  )
  return s
}

export function scoreStatic(live: number[], target: number[], tolerance = 32): { score: number; perJoint: number[] } {
  if (live.length !== 11 || target.length !== 11 || [...live, ...target].some((value) => !Number.isFinite(value))) {
    return { score: 0, perJoint: [] }
  }
  // 8-degree deadzone for monocular landmark jitter
  const perJoint = live.map((v, i) => Math.max(0, Math.abs(v - (target[i] ?? v)) - 8))
  const avg = perJoint.reduce((a, b) => a + b, 0) / Math.max(1, perJoint.length)
  const maxJointErr = Math.max(...perJoint, 0)
  // Penalize any individual finger joint that deviates beyond 24 deg so a wrong single finger cannot be hidden by the 11-joint average
  const effectiveErr = avg + Math.max(0, maxJointErr - 24) * 0.55
  void tolerance
  const score = Math.max(0, Math.min(100, 100 * Math.exp(-0.032 * effectiveErr)))
  return { score, perJoint }
}
