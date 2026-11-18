import { getBodyFrame, normalizePoint } from './bodyAnchor'
import type { BodyFrame } from './bodyAnchor'
import type { Vec3 } from './types'

export class MotionTrace {
  readonly points: Vec3[] = []
  private body: BodyFrame | null = null
  private lastMove = 0

  reset() {
    this.points.length = 0
    this.lastMove = 0
  }

  sample(point: Vec3, now: number) {
    if (this.lastMove > 0 && now - this.lastMove > 750) {
      this.reset()
    }
    if (!this.points.length) {
      this.body = getBodyFrame()
    }
    const normalized = normalizePoint(point, this.body)
    const last = this.points.at(-1)
    if (!last || Math.hypot(normalized.x - last.x, normalized.y - last.y) > 0.006) {
      this.points.push(normalized)
      if (this.points.length > 32) {
        this.points.shift()
      }
      this.lastMove = now
    }
    return this.points.length >= 8 ? this.points : null
  }
}
