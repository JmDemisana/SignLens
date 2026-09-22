import type { HandLandmarks } from './types'

// Procedural reference hands so every letter guide actually looks like itself.
// Convention: palm faces viewer, wrist bottom center, fingers point up.
// Each finger gets a curl 0 (straight) to 1 (full fist) plus lateral spread.
// Coordinates are normalized 0..1 for an 800x500 viewBox.
interface CurlCfg {
  index: number
  middle: number
  ring: number
  pinky: number
  thumb: number // 0 straight, 1 fully folded
  thumbOut: number // 0 across palm, 1 out to the side/up
  spread: number // extra finger separation
}

const CFGS: Record<string, CurlCfg> = {
  A: { index: 1, middle: 1, ring: 1, pinky: 1, thumb: 0.15, thumbOut: 1, spread: 0 },
  B: { index: 0, middle: 0, ring: 0, pinky: 0, thumb: 0.8, thumbOut: 0.15, spread: 0.3 },
  C: { index: 0.5, middle: 0.5, ring: 0.5, pinky: 0.5, thumb: 0.5, thumbOut: 0.8, spread: 0.2 },
  D: { index: 0, middle: 1, ring: 1, pinky: 1, thumb: 0.5, thumbOut: 0.3, spread: 0 },
  E: { index: 0.95, middle: 0.95, ring: 0.95, pinky: 0.95, thumb: 0.9, thumbOut: 0.2, spread: 0 },
  F: { index: 0.55, middle: 0, ring: 0, pinky: 0, thumb: 0.55, thumbOut: 0.4, spread: 0.2 },
  G: { index: 0.05, middle: 1, ring: 1, pinky: 1, thumb: 0.05, thumbOut: 1, spread: 0 },
  H: { index: 0, middle: 0, ring: 1, pinky: 1, thumb: 0.8, thumbOut: 0.2, spread: 0.1 },
  I: { index: 1, middle: 1, ring: 1, pinky: 0, thumb: 0.9, thumbOut: 0.2, spread: 0 },
  J: { index: 1, middle: 1, ring: 1, pinky: 0, thumb: 0.9, thumbOut: 0.2, spread: 0 },
  K: { index: 0, middle: 0.4, ring: 1, pinky: 1, thumb: 0.4, thumbOut: 0.5, spread: 0.2 },
  L: { index: 0, middle: 1, ring: 1, pinky: 1, thumb: 0, thumbOut: 1, spread: 0.3 },
  M: { index: 1, middle: 1, ring: 1, pinky: 1, thumb: 1, thumbOut: 0, spread: 0 },
  N: { index: 1, middle: 1, ring: 1, pinky: 0.9, thumb: 1, thumbOut: 0, spread: 0 },
  O: { index: 0.55, middle: 0.55, ring: 0.55, pinky: 0.55, thumb: 0.55, thumbOut: 0.4, spread: 0.1 },
  P: { index: 0, middle: 0.4, ring: 1, pinky: 1, thumb: 0.4, thumbOut: 0.5, spread: 0.2 },
  Q: { index: 0.05, middle: 1, ring: 1, pinky: 1, thumb: 0.05, thumbOut: 1, spread: 0 },
  R: { index: 0, middle: 0, ring: 1, pinky: 1, thumb: 0.8, thumbOut: 0.2, spread: 0.05 },
  S: { index: 1, middle: 1, ring: 1, pinky: 1, thumb: 0.7, thumbOut: 0.1, spread: 0 },
  T: { index: 1, middle: 1, ring: 1, pinky: 1, thumb: 0.6, thumbOut: 0.25, spread: 0 },
  U: { index: 0, middle: 0, ring: 1, pinky: 1, thumb: 0.8, thumbOut: 0.2, spread: 0 },
  V: { index: 0, middle: 0, ring: 1, pinky: 1, thumb: 0.8, thumbOut: 0.2, spread: 0.8 },
  W: { index: 0, middle: 0, ring: 0, pinky: 1, thumb: 0.8, thumbOut: 0.2, spread: 0.6 },
  X: { index: 0.6, middle: 1, ring: 1, pinky: 1, thumb: 0.8, thumbOut: 0.2, spread: 0 },
  Y: { index: 1, middle: 1, ring: 1, pinky: 0, thumb: 0, thumbOut: 1, spread: 0.3 },
  Z: { index: 0, middle: 1, ring: 1, pinky: 1, thumb: 0.5, thumbOut: 0.3, spread: 0 },
  '0': { index: 0.55, middle: 0.55, ring: 0.55, pinky: 0.55, thumb: 0.55, thumbOut: 0.4, spread: 0.1 },
  '1': { index: 0, middle: 1, ring: 1, pinky: 1, thumb: 0.9, thumbOut: 0.2, spread: 0 },
  '2': { index: 0, middle: 0, ring: 1, pinky: 1, thumb: 0.9, thumbOut: 0.2, spread: 0.1 },
  '3': { index: 0, middle: 0, ring: 0, pinky: 1, thumb: 0.9, thumbOut: 0.2, spread: 0.4 },
  '4': { index: 0, middle: 0, ring: 0, pinky: 0, thumb: 0.8, thumbOut: 0.2, spread: 0.4 },
  '5': { index: 0, middle: 0, ring: 0, pinky: 0, thumb: 0, thumbOut: 1, spread: 0.5 },
  '6': { index: 0, middle: 0, ring: 0, pinky: 1, thumb: 0, thumbOut: 1, spread: 0.4 },
  '7': { index: 0, middle: 0, ring: 1, pinky: 1, thumb: 0, thumbOut: 1, spread: 0.3 },
  '8': { index: 0, middle: 1, ring: 1, pinky: 1, thumb: 0, thumbOut: 0.9, spread: 0.2 },
  '9': { index: 1, middle: 1, ring: 1, pinky: 0.5, thumb: 0.9, thumbOut: 0.2, spread: 0 },
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Finger chain: base -> pip -> dip -> tip, curling toward palm center.
function finger(baseX: number, baseY: number, straightTipX: number, straightTipY: number, bentTipX: number, bentTipY: number, curl: number): [number, number][] {
  const tx = lerp(straightTipX, bentTipX, curl)
  const ty = lerp(straightTipY, bentTipY, curl)
  return [
    [baseX, baseY],
    [lerp(baseX, tx, 0.38), lerp(baseY, ty, 0.38)],
    [lerp(baseX, tx, 0.7), lerp(baseY, ty, 0.7)],
    [tx, ty],
  ]
}

export function referencePose(id: string): HandLandmarks {
  const c = CFGS[id] ?? CFGS['C']
  const sp = c.spread * 14
  // Bases across the knuckle arch.
  const bI: [number, number] = [372 - sp, 300]
  const bM: [number, number] = [400, 295]
  const bR: [number, number] = [428 + sp, 300]
  const bP: [number, number] = [452 + sp, 308]
  // Straight tips (open hand).
  const sI: [number, number] = [368 - sp * 1.5, 178]
  const sM: [number, number] = [400, 168]
  const sR: [number, number] = [432 + sp * 1.5, 178]
  const sP: [number, number] = [462 + sp * 1.5, 198]
  // Bent tips (fist, tucked near palm).
  const fI: [number, number] = [390, 292]
  const fM: [number, number] = [400, 288]
  const fR: [number, number] = [410, 292]
  const fP: [number, number] = [420, 298]

  const idx = finger(bI[0], bI[1], sI[0], sI[1], fI[0], fI[1], c.index)
  const mid = finger(bM[0], bM[1], sM[0], sM[1], fM[0], fM[1], c.middle)
  const rng = finger(bR[0], bR[1], sR[0], sR[1], fR[0], fR[1], c.ring)
  const pky = finger(bP[0], bP[1], sP[0], sP[1], fP[0], fP[1], c.pinky)

  // Thumb: base at left of palm. Straight = up/out, bent = across palm.
  const tBase: [number, number] = [352, 332]
  const tStraight: [number, number] = [348 - c.thumbOut * 52, 252 - c.thumbOut * 22]
  const tBent: [number, number] = [392, 302]
  const th = finger(tBase[0], tBase[1], tStraight[0], tStraight[1], tBent[0], tBent[1], c.thumb)

  const wrist: [number, number] = [410, 372]
  const pts: [number, number][] = [
    wrist,
    tBase, th[1], th[2], th[3],
    bI, idx[1], idx[2], idx[3],
    bM, mid[1], mid[2], mid[3],
    bR, rng[1], rng[2], rng[3],
    bP, pky[1], pky[2], pky[3],
  ]
  return pts.map(([x, y]) => ({ x: x / 800, y: y / 500, z: 0 }))
}
