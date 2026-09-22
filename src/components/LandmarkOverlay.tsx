import type { HandLandmarks } from '../engine/types'

const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
]

export default function LandmarkOverlay({
  lm,
  color = '#58cc02',
  mirrored = true,
}: {
  lm: HandLandmarks | null
  color?: string
  mirrored?: boolean
}) {
  if (!lm || lm.length < 21) return null
  // Mirror X to match the mirrored video element (scaleX(-1)).
  const px = (v: number) => (mirrored ? 1 - v : v) * 800
  const py = (v: number) => v * 500
  return (
    <svg className="landmarks-svg-layer" viewBox="0 0 800 500" preserveAspectRatio="none">
      <g stroke={color} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ vectorEffect: 'non-scaling-stroke' }}>
        {BONES.map(([a, b], i) => (
          <line key={i} x1={px(lm[a].x)} y1={py(lm[a].y)} x2={px(lm[b].x)} y2={py(lm[b].y)} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g fill="#ffffff" stroke={color} strokeWidth="2.5" style={{ vectorEffect: 'non-scaling-stroke' }}>
        {lm.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={i === 0 ? 6.5 : 5} fill={i === 0 ? '#1cb0f6' : '#ffffff'} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  )
}
