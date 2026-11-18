import type { HandLandmarks } from '../engine/types'
import { palmChain } from '../engine/referenceHands'

// Distinct color per finger so learners can immediately distinguish tracked digits
const FINGER_GROUPS: { name: string; color: string; chain: number[]; errIdx: number[] }[] = [
  { name: 'Thumb', color: '#facc15', chain: [0, 1, 2, 3, 4], errIdx: [0, 1] },
  { name: 'Index', color: '#38bdf8', chain: [0, 5, 6, 7, 8], errIdx: [2, 3] },
  { name: 'Middle', color: '#4ade80', chain: [0, 9, 10, 11, 12], errIdx: [4, 5] },
  { name: 'Ring', color: '#c084fc', chain: [0, 13, 14, 15, 16], errIdx: [6, 7] },
  { name: 'Pinky', color: '#f472b6', chain: [0, 17, 18, 19, 20], errIdx: [8, 9] },
]

const PALM_BONES: [number, number][] = [
  [0, 5],
  [5, 9],
  [9, 13],
  [13, 17],
  [17, 0],
]

function pointFingerColor(idx: number): string {
  if (idx === 0) return '#e2e8f0'
  if (idx <= 4) return '#facc15'
  if (idx <= 8) return '#38bdf8'
  if (idx <= 12) return '#4ade80'
  if (idx <= 16) return '#c084fc'
  return '#f472b6'
}

export default function LandmarkOverlay({
  lm,
  secondLm,
  color = '#58cc02',
  mirrored = true,
  aspect = 16 / 9,
  perJoint,
  secondHand = false,
}: {
  lm: HandLandmarks | null
  secondLm?: HandLandmarks | null
  color?: string
  mirrored?: boolean
  aspect?: number
  perJoint?: number[]
  secondHand?: boolean
}) {
  if (!lm || lm.length < 21) return null
  const width = 500 * aspect
  const px = (v: number) => (mirrored ? 1 - v : v) * width
  const py = (v: number) => v * 500
  const hands = [lm, ...(secondLm && secondLm.length >= 21 ? [secondLm] : [])]

  // Map landmark index to whether its joint has an angular residual > 14 deg
  const hasJointError = (lmIdx: number): boolean => {
    if (!perJoint || perJoint.length < 10) return false
    const map: Record<number, number> = {
      1: 0, 2: 0, 3: 1, 4: 1,
      5: 2, 6: 3, 7: 3,
      9: 4, 10: 5, 11: 5,
      13: 6, 14: 7, 15: 7,
      17: 8, 18: 9, 19: 9,
    }
    const jIdx = map[lmIdx]
    return jIdx !== undefined && (perJoint[jIdx] ?? 0) > 14
  }

  return (
    <svg className="landmarks-svg-layer" viewBox={`0 0 ${width} 500`} aria-hidden="true">
      {hands.map((handPts, hIdx) => (
        <g key={`hand-${hIdx}`}>
          {/* Palm fill */}
          <polygon
            points={palmChain.map((i) => `${px(handPts[i].x)},${py(handPts[i].y)}`).join(' ')}
            fill={color}
            fillOpacity="0.16"
          />

          {/* Palm base connections */}
          <g strokeLinecap="round">
            {PALM_BONES.map(([a, b], i) => (
              <g key={`palm-${i}`}>
                <line x1={px(handPts[a].x)} y1={py(handPts[a].y)} x2={px(handPts[b].x)} y2={py(handPts[b].y)} stroke="#0b1218" strokeWidth="4.5" vectorEffect="non-scaling-stroke" />
                <line x1={px(handPts[a].x)} y1={py(handPts[a].y)} x2={px(handPts[b].x)} y2={py(handPts[b].y)} stroke="#94a3b8" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
              </g>
            ))}

            {/* Color-coded finger chains */}
            {FINGER_GROUPS.map((fg) => {
              const fingerBad = hIdx === Number(secondHand) && perJoint && fg.errIdx.some((idx) => (perJoint[idx] ?? 0) > 16)
              const strokeCol = fingerBad ? '#ff4b4b' : fg.color
              return fg.chain.slice(1).map((b, i) => {
                const a = fg.chain[i]
                return (
                  <g key={`${fg.name}-${i}`}>
                    <line x1={px(handPts[a].x)} y1={py(handPts[a].y)} x2={px(handPts[b].x)} y2={py(handPts[b].y)} stroke="#0b1218" strokeWidth="5.2" vectorEffect="non-scaling-stroke" />
                    <line x1={px(handPts[a].x)} y1={py(handPts[a].y)} x2={px(handPts[b].x)} y2={py(handPts[b].y)} stroke={strokeCol} strokeWidth="2.8" vectorEffect="non-scaling-stroke" />
                  </g>
                )
              })
            })}
          </g>

          {/* 21 Joint Keypoints */}
          <g>
            {handPts.map((p, i) => {
              const bad = hIdx === Number(secondHand) && hasJointError(i)
              const fCol = bad ? '#ff4b4b' : pointFingerColor(i)
              const isTipOrWrist = i === 0 || i % 4 === 0
              return (
                <g key={i}>
                  {bad && (
                    <circle
                      cx={px(p.x)}
                      cy={py(p.y)}
                      r={7.5}
                      fill="none"
                      stroke="#ff4b4b"
                      strokeOpacity="0.65"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  <circle
                    cx={px(p.x)}
                    cy={py(p.y)}
                    r={isTipOrWrist ? 4.6 : 3.2}
                    fill={bad ? '#ff4b4b' : '#0f172a'}
                    stroke={fCol}
                    strokeWidth="2.2"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )
            })}
          </g>
        </g>
      ))}

      {/* Finger color legend bar at bottom-right */}
      <g transform={`translate(${width - 275}, 466)`}>
        <rect x="0" y="0" width="265" height="24" rx="12" fill="#0b1218" fillOpacity="0.78" stroke="#334155" strokeWidth="1" />
        {FINGER_GROUPS.map((fg, idx) => (
          <g key={fg.name} transform={`translate(${12 + idx * 51}, 12)`}>
            <circle cx="0" cy="0" r="4.5" fill={fg.color} />
            <text x="8" y="4" fill="#f8fafc" fontSize="10" fontWeight="700" fontFamily="system-ui, sans-serif">
              {fg.name}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
