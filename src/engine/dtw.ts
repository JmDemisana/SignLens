// Resampled FastDTW / Sakoe-Chiba trajectory matcher (Equations 12-14 of BS ECE Thesis).
import type { Vec3 } from './types'

function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

// Resample any polyline (even a 3-point template) into K equidistant points along its arc length
export function resamplePath(path: Vec3[], k = 16): Vec3[] {
  if (path.length === 0) return []
  if (path.length === 1) return Array.from({ length: k }, () => ({ ...path[0] }))
  const segLengths: number[] = []
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const d = dist(path[i - 1], path[i])
    segLengths.push(d)
    total += d
  }
  if (total < 1e-5) return Array.from({ length: k }, () => ({ ...path[0] }))

  const out: Vec3[] = [{ ...path[0] }]
  for (let s = 1; s < k - 1; s++) {
    const targetDist = (s / (k - 1)) * total
    let acc = 0
    let added = false
    for (let i = 0; i < segLengths.length; i++) {
      const seg = segLengths[i]
      if (acc + seg >= targetDist && seg > 0) {
        const t = (targetDist - acc) / seg
        const p0 = path[i]
        const p1 = path[i + 1]
        out.push({
          x: p0.x + t * (p1.x - p0.x),
          y: p0.y + t * (p1.y - p0.y),
          z: 0,
        })
        added = true
        break
      }
      acc += seg
    }
    if (!added) out.push({ ...path[path.length - 1] })
  }
  out.push({ ...path[path.length - 1] })
  return out
}

// Normalize a trajectory by its bounding-box / path scale and start origin, then resample to 16 points
export function normalizeTrace(path: Vec3[], k = 16, minSpan = 0.065): Vec3[] {
  if (path.length < 2) return []
  const xs = path.map((p) => p.x)
  const ys = path.map((p) => p.y)
  const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  if (diag < minSpan) return []

  const resampled = resamplePath(path, k)
  const origin = resampled[0]
  const rel = resampled.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y, z: 0 }))
  const maxRadius = Math.max(diag, ...rel.map(({ x, y }) => Math.hypot(x, y)))
  if (maxRadius < minSpan) return []
  return rel.map(({ x, y }) => ({ x: x / maxRadius, y: y / maxRadius, z: 0 }))
}

export function dtwDistance(a: Vec3[], b: Vec3[], window = 5): number {
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
  return prev[m] / (n + m)
}

export function scoreDynamic(live: Vec3[], target: Vec3[]): number {
  if (!live.length || !target.length) return 0
  const d = dtwDistance(live, target)
  if (!Number.isFinite(d)) return 0

  // Check overall directional alignment between first half and second half so opposite-direction movements fail
  const tEnd = target[target.length - 1]
  const lEnd = live[live.length - 1]
  const tEndNorm = Math.hypot(tEnd.x, tEnd.y)
  const lEndNorm = Math.hypot(lEnd.x, lEnd.y)
  let dirPenalty = 0
  if (tEndNorm > 0.35 && lEndNorm > 0.25) {
    const cos = (tEnd.x * lEnd.x + tEnd.y * lEnd.y) / (tEndNorm * lEndNorm)
    if (cos < 0.25) {
      dirPenalty = (0.25 - cos) * 0.45
    }
  }

  // Equation (14): S = 100 * exp(-alpha * D_n) with strict alpha = 2.25
  const score = 100 * Math.exp(-2.25 * (d + dirPenalty))
  return Math.max(0, Math.min(100, score))
}

export function mirrorPath(path: Vec3[]): Vec3[] {
  if (!path.length) return path
  const mean = path.reduce((a, p) => a + p.x, 0) / path.length
  return path.map((p) => ({ x: 2 * mean - p.x, y: p.y, z: p.z || 0 }))
}

export function scoreDynamicBoth(live: Vec3[], target: Vec3[]): number {
  // Template paths can have smaller synthetic coordinates, so normalize target with small minSpan, live with real movement minSpan
  const reference = normalizeTrace(target, 16, 0.01)
  if (!reference.length || live.length < 8) return 0
  const windows = [live, live.slice(-20), live.slice(-12)].filter((w) => w.length >= 8)
  let best = 0
  for (const win of windows) {
    const trace = normalizeTrace(win, 16, 0.065)
    if (!trace.length) continue
    const mirrored = trace.map(({ x, y, z }) => ({ x: -x, y, z }))
    best = Math.max(best, scoreDynamic(trace, reference), scoreDynamic(mirrored, reference))
  }
  return best
}
