import type { HandLandmarks, Vec3 } from './types'

export const fingerChains = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]]
export const palmChain = [0, 1, 5, 9, 13, 17, 0]

type Finger = 'index' | 'middle' | 'ring' | 'pinky'
type Thumb = 'up' | 'across' | 'out' | 'curve' | 'tucked' | 'between' | Finger
interface Shape {
  curl: [number, number, number, number]
  thumb: Thumb
  splay?: [number, number, number, number]
  roll?: number
}

const open: Shape = { curl: [0, 0, 0, 0], thumb: 'across' }
const fist: Shape = { curl: [1, 1, 1, 1], thumb: 'across' }
const single: Shape = { curl: [0, 1, 1, 1], thumb: 'tucked' }
const two: Shape = { curl: [0, 0, 1, 1], thumb: 'tucked', splay: [-3, 1, 4, 6] }
const curved: Shape = { curl: [0.48, 0.48, 0.48, 0.45], thumb: 'curve' }
const pinch: Shape = { curl: [0.49, 0, 0, 0], thumb: 'index' }
const key: Shape = { curl: [0, 0.26, 1, 1], thumb: 'between', splay: [-10, 13, 5, 9] }
const sideways: Shape = { curl: [0, 1, 1, 1], thumb: 'up', roll: -83 }
const pinky: Shape = { curl: [1, 1, 1, 0], thumb: 'across' }

const shapes: Record<string, Shape> = {
  A: { ...fist, thumb: 'up' },
  B: open,
  C: curved,
  D: { ...single, curl: [0, 0.78, 0.9, 0.91], thumb: 'middle' },
  E: { ...fist, curl: [0.82, 0.87, 0.92, 1], thumb: 'tucked' },
  F: pinch,
  G: sideways,
  H: { ...two, roll: -83 },
  I: pinky,
  J: pinky,
  K: key,
  L: { ...single, thumb: 'out' },
  M: { ...fist, thumb: 'tucked', curl: [1, 1, 0.91, 0.84] },
  N: { ...fist, thumb: 'between', curl: [1, 0.98, 0.83, 0.84] },
  O: { curl: [0.63, 0.65, 0.69, 0.73], thumb: 'middle', splay: [-1, -7, -13, -20] },
  P: { ...key, roll: -145 },
  Q: { ...sideways, roll: -152 },
  R: { ...two, splay: [19, -19, 5, 8], curl: [0, 0.09, 1, 1] },
  S: fist,
  T: { ...fist, thumb: 'between' },
  U: two,
  V: { ...two, splay: [-18, 14, 5, 8] },
  W: { curl: [0, 0, 0, 0.72], thumb: 'pinky', splay: [-19, 0, 19, 2] },
  X: { ...single, curl: [0.45, 1, 1, 1] },
  Y: { ...pinky, thumb: 'out', splay: [-6, -1, 4, 26] },
  Z: single,
  '0': { curl: [0.63, 0.65, 0.69, 0.73], thumb: 'middle', splay: [-1, -7, -13, -20] },
  '1': single,
  '2': { ...two, splay: [-16, 12, 5, 8] },
  '3': { ...two, thumb: 'out', splay: [-15, 9, 5, 8] },
  '4': { ...open, splay: [-18, -5, 10, 25] },
  '5': { ...open, thumb: 'out', splay: [-19, -4, 12, 28] },
  '6': { curl: [0, 0, 0, 0.73], thumb: 'pinky' },
  '7': { curl: [0, 0, 0.68, 0], thumb: 'ring', splay: [-10, -2, -14, 19] },
  '8': { curl: [0, 0.61, 0, 0], thumb: 'middle', splay: [-16, -15, 13, 21] },
  '9': pinch,
}

const startShapes: Record<string, Shape> = {
  KAMUSTA: { ...open, thumb: 'out', splay: [-14, -3, 8, 20] },
  'MAGANDANG UMAGA': { ...open, roll: -45 },
  SALAMAT: { ...open, thumb: 'across' },
  PAUMANHIN: { ...fist, thumb: 'across' },
  OO: { ...fist, thumb: 'between' },
  HINDI: { ...two, thumb: 'out', splay: [-12, 10, 4, 8] },
  MABUHAY: { ...open, thumb: 'out', splay: [-19, -4, 12, 28] },
  KAIBIGAN: { ...single, curl: [0.35, 1, 1, 1], thumb: 'tucked' },
  NANAY: { ...open, thumb: 'out', splay: [-19, -4, 12, 28], roll: -25 },
  TATAY: { ...open, thumb: 'out', splay: [-19, -4, 12, 28], roll: 15 },
  KAPATID: { ...single, thumb: 'up', roll: -35 },
  GURO: { curl: [0.63, 0.65, 0.69, 0.73], thumb: 'middle', splay: [-1, -7, -13, -20] },
  KAIN: { curl: [0.58, 0.6, 0.64, 0.68], thumb: 'index', splay: [-2, -5, -10, -15] },
  INOM: { ...curved, roll: -30 },
  TUBIG: { curl: [0, 0, 0, 0.72], thumb: 'pinky', splay: [-19, 0, 19, 2] },
  TULONG: { ...fist, thumb: 'up' },
  PAARALAN: { ...open, roll: -60 },
  BAHAY: { ...open, splay: [-6, -2, 2, 6], roll: -30 },
}

const bases: Vec3[] = [
  { x: -0.25, y: 0.025, z: 0 },
  { x: -0.071, y: 0.081, z: 0 },
  { x: 0.104, y: 0.048, z: -0.012 },
  { x: 0.258, y: -0.027, z: -0.025 },
]
const lengths = [[0.266, 0.167, 0.13], [0.295, 0.188, 0.138], [0.28, 0.171, 0.123], [0.207, 0.137, 0.103]]
const degrees = (angle: number) => angle * Math.PI / 180
const fingers: Finger[] = ['index', 'middle', 'ring', 'pinky']

function digit(i: number, curl: number, splay: number) {
  const points = [bases[i]]
  const angle = degrees(splay)
  for (let j = 0; j < 3; j++) {
    const prev = points[j]
    const flex = degrees([75, 161, 202][j] * curl + j * 3)
    const length = lengths[i][j]
    points.push({
      x: prev.x + length * Math.sin(angle) * Math.cos(flex),
      y: prev.y + length * Math.cos(angle) * Math.cos(flex),
      z: prev.z + length * Math.sin(flex),
    })
  }
  return points
}

const thumbBase = { x: -0.142, y: -0.303, z: 0.036 }
const thumbShapes: Record<Exclude<Thumb, Finger>, [Vec3, Vec3, Vec3]> = {
  up: [{ x: -0.36, y: -0.12, z: 0.04 }, { x: -0.361, y: 0.065, z: 0.104 }, { x: -0.352, y: 0.235, z: 0.115 }],
  out: [{ x: -0.35, y: -0.199, z: 0.041 }, { x: -0.528, y: -0.13, z: 0.052 }, { x: -0.698, y: -0.114, z: 0.06 }],
  across: [{ x: -0.287, y: -0.15, z: 0.14 }, { x: -0.108, y: -0.077, z: 0.29 }, { x: 0.065, y: -0.05, z: 0.32 }],
  tucked: [{ x: -0.285, y: -0.192, z: 0.11 }, { x: -0.12, y: -0.133, z: 0.186 }, { x: 0.043, y: -0.11, z: 0.19 }],
  between: [{ x: -0.29, y: -0.15, z: 0.11 }, { x: -0.19, y: -0.027, z: 0.136 }, { x: -0.142, y: 0.122, z: 0.188 }],
  curve: [{ x: -0.31, y: -0.18, z: 0.103 }, { x: -0.298, y: -0.022, z: 0.209 }, { x: -0.22, y: 0.074, z: 0.321 }],
}

const cache = new Map<string, HandLandmarks>()

// Reference landmarks follow the MediaPipe joint order. Depth is negative
// toward the camera. The training templates remain independent of this illustration.
export function referencePose(id: string): HandLandmarks {
  const old = cache.get(id)
  if (old) return old
  const shape = shapes[id] ?? startShapes[id] ?? open
  const digits = shape.curl.map((curl, i) => digit(i, curl, (shape.splay ?? [-5, 0, 4, 10])[i]))
  const contact = fingers.indexOf(shape.thumb as Finger)
  const tip = contact < 0 ? undefined : digits[contact][3]
  const thumb = tip ? [
    { x: -0.288, y: -0.16, z: 0.139 },
    { x: (tip.x - 0.288) / 2 - 0.044, y: (tip.y - 0.16) / 2 - 0.056, z: (tip.z + 0.139) / 2 + 0.036 },
    { x: tip.x - 0.011, y: tip.y - 0.01, z: tip.z - 0.006 },
  ] : thumbShapes[shape.thumb as keyof typeof thumbShapes]
  const cos = Math.cos(degrees(shape.roll ?? 0))
  const sin = Math.sin(degrees(shape.roll ?? 0))
  const result = [{ x: 0, y: -0.481, z: 0 }, thumbBase, ...thumb, ...digits.flat()].map(({ x, y, z }) => ({
    x: 0.5 + (x * cos - y * sin) / 2.2,
    y: 0.5 - (x * sin + y * cos) / 2.2,
    z: -z / 3,
  }))
  cache.set(id, result)
  return result
}

export function referenceAngle(id: string): number {
  return id === 'C' || id === 'O' || id === '0' ? -Math.PI / 3.5 : -0.24
}

export const partialReferences = new Set(['FRIEND', 'LOVE', 'MORNING', 'KAIBIGAN'])
