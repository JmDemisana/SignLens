// Lightweight DTW with Sakoe-Chiba window. Good enough for short sign paths.
import type { Vec3 } from './types'

function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = (a.z || 0) - (b.z || 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function dtwDistance(a: Vec3[], b: Vec3[], window = 8): number {
  const n = a.length
  const m = b.length
  if (!n || !m) return Infinity
  const w = Math.max(window, Math.abs(n - m))
  const prev = new Array(m + 1).fill(Infinity)
  const curr = new Array(m + 1).fill(Infinity)
  prev[0] = 0
  for (let i = 1; i <= n; i++) {
    curr.fill(Infinity)
    const jStart = Math.max(1, i - w)
    const jEnd = Math.min(m, i + w)
    for (let j = jStart; j <= jEnd; j++) {
      const cost = dist(a[i - 1], b[j - 1])
      curr[j] = cost + Math.min(prev[j], curr[j - 1], prev[j - 1])
    }
    for (let j = 0; j <= m; j++) prev[j] = curr[j]
  }
  return prev[m] / Math.max(n, m)
}

export function scoreDynamic(live: Vec3[], target: Vec3[]): number {
  const d = dtwDistance(live, target)
  // d is normalized mean distance. 0 = perfect, 0.25+ = poor.
  return Math.max(0, Math.min(100, 100 - (d / 0.25) * 100))
}

// Left and right hands trace mirror-image paths. Mirror the live path
// around its own centroid so both hands score fairly, camera or body frame.
export function mirrorPath(path: Vec3[]): Vec3[] {
  if (!path.length) return path
  const mean = path.reduce((a, p) => a + p.x, 0) / path.length
  return path.map((p) => ({ x: 2 * mean - p.x, y: p.y, z: p.z || 0 }))
}

// Orientation-invariant score: best of raw and mirrored. Static angle
// checks are already mirror-invariant, so only motion needs this.
export function scoreDynamicBoth(live: Vec3[], target: Vec3[]): number {
  return Math.max(scoreDynamic(live, target), scoreDynamic(mirrorPath(live), target))
}
