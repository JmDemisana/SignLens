import type { HandLandmarks, ScoreDetail } from '../engine/types'

export default function LiveCoachPanel({ detail, landmarks, advice, holdLabel, motion }: {
  detail: ScoreDetail | null
  landmarks: HandLandmarks | null
  advice: string
  holdLabel?: string
  motion?: boolean
}) {
  const score = detail ? Math.max(0, Math.min(100, Math.round(detail.score))) : 0
  const passThreshold = motion ? 82 : 85
  const tier = !detail
    ? 'idle'
    : score >= passThreshold && detail.passed
      ? 'pass'
      : score >= 65
        ? 'near'
        : 'low'

  return (
    <div className={`sl-tracking-status is-${tier}`} role="status" aria-live="polite">
      <div className="sl-coach-head">
        <strong>
          {landmarks ? 'Match' : 'Show your hand in the camera'}
        </strong>
        {landmarks && detail && (
          <span className={`sl-score-pill is-${tier}`}>{score}%</span>
        )}
      </div>

      {landmarks && (
        <div className="sl-coach-meter" aria-hidden="true">
          <div className={`sl-coach-meter-fill is-${tier}`} style={{ width: `${detail ? score : 8}%` }} />
          <span className="sl-coach-threshold" style={{ left: `${passThreshold}%` }} title={`Pass threshold: ${passThreshold}%`} />
        </div>
      )}

      {landmarks && (
        <>
          <p>{advice}</p>
          {holdLabel && (
            <div className="sl-coach-hold">
              <span>{holdLabel}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
