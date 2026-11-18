import { Hand } from 'lucide-react'
import { referencePose } from '../engine/referenceHands'
import { signImageFor } from '../engine/signVideos'
import { HandDiagram } from './HandDiagram'

export default function PracticeGuide({ sign, flip, active }: { sign: string; flip: boolean; active: boolean }) {
  const image = signImageFor(sign)
  return (
    <div className={`sl-practice-guide${active ? ' on-video' : ''}`}>
      <div className="sl-guide-frame">
        {image ? (
          <img
            src={image}
            alt={`Target guide for ${sign}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#ffffff',
              padding: 6,
              borderRadius: 8,
              transform: flip ? 'scaleX(-1)' : undefined,
            }}
          />
        ) : (
          <HandDiagram pose={referencePose(sign)} sign={sign} flip={flip} />
        )}
      </div>
      <span><Hand size={14} /> {active ? 'Show your signing hand' : `Target guide · ${sign}`}</span>
    </div>
  )
}
