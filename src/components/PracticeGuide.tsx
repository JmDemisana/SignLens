import { Hand } from 'lucide-react'
import { referencePose } from '../engine/referenceHands'
import { HandDiagram } from './HandDiagram'

export default function PracticeGuide({ sign, flip, active }: { sign: string; flip: boolean; active: boolean }) {
  return (
    <div className={`sl-practice-guide${active ? ' on-video' : ''}`}>
      <div className="sl-guide-frame">
        <HandDiagram pose={referencePose(sign)} sign={sign} flip={flip} />
      </div>
      <span><Hand size={14} /> {active ? 'Show your signing hand' : `Target guide · ${sign}`}</span>
    </div>
  )
}
