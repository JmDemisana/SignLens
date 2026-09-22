import type { PoseTemplate } from './types'
import { FSL_TEMPLATES } from './fsl'

// Angle order:
// [thumbMCP, thumbIP, indexMCP, indexPIP, middleMCP, middlePIP, ringMCP, ringPIP, pinkyMCP, pinkyPIP, wristSpread]
// Straight ~170, half ~115, bent ~55. Heuristic v1 templates, tunable on device.
const S = 170
const H = 115
const B = 55

function T(id: string, angles: number[], hint: string): PoseTemplate {
  return { id, kind: 'static', angles, hint, lang: 'BOTH' }
}

export const STATIC_TEMPLATES: PoseTemplate[] = [
  T('A', [140, 160, B, B, B, B, B, B, B, B, 55], 'Fist with thumb upright along side of index finger'),
  T('B', [70, 80, S, S, S, S, S, S, S, S, 70], 'Flat palm up, thumb tucked across palm'),
  T('C', [H, H, H, H, H, H, H, H, H, H, 65], 'Curve fingers and thumb into an open C'),
  T('D', [110, 120, S, S, B, B, B, B, B, B, 60], 'Index up, thumb touching middle fingertip'),
  T('E', [B, B, B, B, B, B, B, B, B, B, 50], 'All fingertips curled tightly over thumb'),
  T('F', [100, 110, 100, 110, S, S, S, S, S, S, 62], 'Thumb and index make OK circle, 3 fingers up'),
  T('G', [160, 165, S, S, B, B, B, B, B, B, 55], 'Thumb and index pointing sideways, parallel'),
  T('H', [70, 80, S, S, S, S, B, B, B, B, 58], 'Index and middle extended sideways together'),
  T('I', [B, B, B, B, B, B, B, B, S, S, 55], 'Pinky up, rest folded'),
  T('J', [B, B, B, B, B, B, B, B, S, S, 55], 'Pinky up then trace a J hook (static base is I)'),
  T('K', [120, 120, S, S, H, H, B, B, B, B, 60], 'Index up, middle forward 45deg, thumb between'),
  T('L', [165, 165, S, S, B, B, B, B, B, B, 70], 'Thumb and index form a crisp L'),
  T('M', [60, 60, B, B, B, B, B, B, B, B, 50], 'Thumb tucked under first three folded fingers'),
  T('N', [65, 65, B, B, B, B, B, B, B + 10, B + 10, 52], 'Thumb tucked under first two folded fingers'),
  T('O', [H, H, H, H, H, H, H, H, H, H, 60], 'All fingertips meeting thumb in a round O'),
  T('P', [120, 120, S, S, H, H, B, B, B, B, 60], 'K shape pointing downward'),
  T('Q', [160, 165, S, S, B, B, B, B, B, B, 55], 'G shape pointing downward'),
  T('R', [70, 80, S, S, S, S, B, B, B, B, 55], 'Index and middle crossed tightly'),
  T('S', [70, 75, B, B, B, B, B, B, B, B, 50], 'Closed fist, thumb wrapped across fingers'),
  T('T', [80, 85, B, B, B, B, B, B, B, B, 52], 'Thumb tucked between index and middle knuckles'),
  T('U', [70, 80, S, S, S, S, B, B, B, B, 58], 'Index and middle held upright together'),
  T('V', [70, 80, S, S, S, S, B, B, B, B, 75], 'Peace sign, index and middle spread in a V'),
  T('W', [70, 80, S, S, S, S, S, S, B, B, 72], 'Index, middle, ring spread upward'),
  T('X', [70, 80, H, H, B, B, B, B, B, B, 55], 'Index hooked like a curved key'),
  T('Y', [S, S, B, B, B, B, B, B, S, S, 70], 'Thumb and pinky out, middle folded'),
  T('Z', [110, 120, S, S, B, B, B, B, B, B, 60], 'Index traces a Z (static base is D-like)'),
  T('0', [H, H, H, H, H, H, H, H, H, H, 60], 'Fist rounded into O for zero'),
  T('1', [B, B, S, S, B, B, B, B, B, B, 55], 'Index up for one'),
  T('2', [B, B, S, S, S, S, B, B, B, B, 58], 'Index and middle up for two'),
  T('3', [B, B, S, S, S, S, S, S, B, B, 65], 'Three fingers up'),
  T('4', [B, B, S, S, S, S, S, S, S, S, 70], 'Four fingers up, thumb tucked'),
  T('5', [S, S, S, S, S, S, S, S, S, S, 72], 'Open palm for five'),
  T('6', [S, S, S, S, S, S, S, S, B, B, 68], 'Thumb plus three fingers for six'),
  T('7', [S, S, S, S, S, S, B, B, B, B, 62], 'Thumb plus two fingers for seven'),
  T('8', [S, S, S, S, B, B, B, B, B, B, 58], 'Thumb plus index for eight'),
  T('9', [B, B, B, B, B, B, B, B, S, S, 55], 'Pinky bent hook for nine, fist base'),
]

export const DYNAMIC_TEMPLATES: PoseTemplate[] = [
  {
    id: 'HELLO',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.5, y: 0.6, z: 0 },
      { x: 0.55, y: 0.5, z: 0 },
      { x: 0.62, y: 0.42, z: 0 },
    ],
    hint: 'Palm forward, move hand outward from forehead',
  },
  {
    id: 'THANK YOU',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.5, y: 0.4, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
      { x: 0.5, y: 0.6, z: 0 },
    ],
    hint: 'Fingertips at chin, move hand forward and down',
  },
  {
    id: 'YES',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.5, y: 0.55, z: 0 },
      { x: 0.5, y: 0.48, z: 0 },
      { x: 0.5, y: 0.55, z: 0 },
    ],
    hint: 'Fist nods up and down like a head nod',
  },
  {
    id: 'NO',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.42, y: 0.5, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
      { x: 0.58, y: 0.5, z: 0 },
    ],
    hint: 'Index and middle tap, move side to side',
  },
  {
    id: 'PLEASE',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.5, y: 0.55, z: 0 },
      { x: 0.56, y: 0.52, z: 0 },
      { x: 0.54, y: 0.58, z: 0 },
      { x: 0.48, y: 0.55, z: 0 },
    ],
    hint: 'Flat palm circles on chest, polite please',
  },
  {
    id: 'SORRY',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.52, y: 0.5, z: 0 },
      { x: 0.46, y: 0.53, z: 0 },
      { x: 0.48, y: 0.47, z: 0 },
      { x: 0.54, y: 0.5, z: 0 },
    ],
    hint: 'Fist circles on chest, sincere sorry',
  },
  {
    id: 'GOOD',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.5, y: 0.42, z: 0 },
      { x: 0.52, y: 0.5, z: 0 },
      { x: 0.56, y: 0.56, z: 0 },
    ],
    hint: 'Fingertips at chin, hand opens outward, good',
  },
  {
    id: 'MORNING',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.45, y: 0.6, z: 0 },
      { x: 0.47, y: 0.48, z: 0 },
      { x: 0.5, y: 0.4, z: 0 },
    ],
    hint: 'Hand rises off the opposite arm like sunrise, morning',
  },
  {
    id: 'FRIEND',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.42, y: 0.5, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
      { x: 0.58, y: 0.5, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
    ],
    hint: 'Index fingers hook then swap sides, friend',
  },
  {
    id: 'LOVE',
    kind: 'dynamic',
    lang: 'ASL',
    path: [
      { x: 0.45, y: 0.55, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
      { x: 0.55, y: 0.55, z: 0 },
    ],
    hint: 'Arms cross over heart, love',
  },
]

export const ALL_TEMPLATES: PoseTemplate[] = [...STATIC_TEMPLATES, ...DYNAMIC_TEMPLATES, ...FSL_TEMPLATES]

export function templatesForLang(lang: 'ASL' | 'FSL'): PoseTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.lang === 'BOTH' || t.lang === lang)
}

export function findTemplate(id: string): PoseTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id)
}
