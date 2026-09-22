import type { HandLandmarks, ScoreDetail } from '../engine/types'

const FINGERS = [
  { name: 'Thumb', joints: [0, 1] },
  { name: 'Index', joints: [2, 3] },
  { name: 'Middle', joints: [4, 5] },
  { name: 'Ring', joints: [6, 7] },
  { name: 'Pinky', joints: [8, 9] },
]

const TOL = 15 // degrees: a finger counts as correct under this avg offset

// Plain-language live coach. Tells the learner exactly what the tracker
// sees: which fingers pass, what to fix, and how close to passing.
export default function LiveCoachPanel({
  detail,
  landmarks,
  advice,
  holdLabel,
}: {
  detail: ScoreDetail | null
  landmarks: HandLandmarks | null
  advice: string
  holdLabel?: string
}) {
  if (!landmarks) {
    return (
      <div
        style={{
          background: '#131f24',
          border: '2px dashed var(--duo-border)',
          borderRadius: '16px',
          padding: '14px 18px',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>Step 1: show your hand</div>
        <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700, marginTop: '4px', lineHeight: 1.5 }}>
          Hold one open hand fully inside the frame. The checklist below lights up the moment tracking locks on.
        </div>
      </div>
    )
  }

  const score = detail ? Math.round(detail.score) : 0
  const passed = !!detail?.passed
  const isMotion = !!detail && detail.perJoint.length === 0

  return (
    <div
      style={{
        background: '#131f24',
        border: `2px solid ${passed ? '#58cc02' : 'var(--duo-border)'}`,
        borderRadius: '16px',
        padding: '14px 18px',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
          {isMotion ? 'Step 3: perform the motion' : 'Step 2: match the shape'}
        </div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: 900,
            color: passed ? '#58cc02' : score >= 60 ? '#ffc800' : '#ff4b4b',
          }}
        >
          {score}%
        </div>
      </div>

      {!isMotion && detail && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {FINGERS.map((f) => {
            const avg = f.joints.reduce((a, j) => a + (detail.perJoint[j] ?? 0), 0) / f.joints.length
            const ok = avg < TOL
            return (
              <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800 }}>
                <span style={{ width: '18px', textAlign: 'center' }}>{ok ? '✅' : '❌'}</span>
                <span style={{ color: ok ? '#58cc02' : '#ffffff', width: '52px' }}>{f.name}</span>
                <div style={{ flex: 1, height: '6px', background: '#37464f', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, 100 - (avg / 45) * 100))}%`,
                      height: '100%',
                      background: ok ? '#58cc02' : '#ff9600',
                    }}
                  />
                </div>
                <span style={{ color: '#afbac0', width: '44px', textAlign: 'right' }}>{Math.round(avg)}°</span>
              </div>
            )
          })}
        </div>
      )}

      {isMotion && (
        <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700, lineHeight: 1.5 }}>
          {passed ? 'Motion matches. Keep holding still to auto-submit.' : 'Move smoothly through the full path shown on the 3D hand.'}
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#afbac0', fontWeight: 700, lineHeight: 1.5 }}>
        <span style={{ color: '#ffffff' }}>Coach: </span>
        {advice}
      </div>

      <div style={{ fontSize: '12px', fontWeight: 800, color: passed ? '#58cc02' : '#1cb0f6' }}>
        {holdLabel ?? (passed ? 'Step 3: hold steady 1.5s to pass (need 80%+)' : 'Reach 80%+ to start the pass timer')}
      </div>
    </div>
  )
}
