import { useState } from 'react'
import { Check, PlayCircle } from 'lucide-react'
import { definitionFor, howToFor } from '../engine/dictionary'
import { signImageFor, signVideoFor } from '../engine/signVideos'
import { findTemplate } from '../engine/templates'
import type { SignLang } from '../engine/types'
import { referencePose } from '../engine/referenceHands'
import { HandDiagram } from './HandDiagram'

const ZONE_LABEL: Record<string, string> = {
  forehead: 'Zone: Forehead',
  chin: 'Zone: Chin',
  chest: 'Zone: Chest',
}

function shortTitle(id: string): string {
  const title = definitionFor(id).title
  return title.split(' (')[0]
}

export default function HandReference({
  sign,
  lang,
  flip,
  height = 185,
  id,
  phraseSigns,
  activeStep = 0,
}: {
  sign: string
  lang: SignLang
  flip: boolean
  height?: number
  id?: string
  phraseSigns?: string[]
  activeStep?: number
}) {
  const phraseList = phraseSigns && phraseSigns.length > 1 ? phraseSigns : null
  const phraseKey = phraseList ? phraseList.join('|') : sign
  const [clipState, setClipState] = useState<{ key: string; idx: number }>({ key: phraseKey, idx: 0 })
  const activeClipIdx = phraseList
    ? (clipState.key === phraseKey ? clipState.idx % phraseList.length : 0)
    : 0
  const playingSign = phraseList ? phraseList[activeClipIdx] : sign

  const video = signVideoFor(playingSign, lang)
  const image = !video ? signImageFor(playingSign) : null
  const template = findTemplate(playingSign)
  const steps = howToFor(playingSign)
  const handCountLabel = template?.twoHanded ? '2 Hands' : template?.twoHanded === false ? '1 Hand' : null
  const zoneLabel = template?.zone ? ZONE_LABEL[template.zone] : null

  return (
    <section id={id} className="sl-hand-reference" aria-label={`Reference for ${sign}`}>
      <div className="sl-ref-header">
        <h3>
          <PlayCircle size={15} /> {phraseList ? `Playing: ${shortTitle(playingSign)}` : 'How to sign'}
        </h3>
        <div className="sl-ref-pills">
          {handCountLabel && <span className={`sl-badge ${template?.twoHanded ? 'is-purple' : 'is-blue'}`}>{handCountLabel}</span>}
          {zoneLabel && <span className="sl-badge is-gold">{zoneLabel}</span>}
        </div>
      </div>

      {phraseList && (
        <div className="sl-phrase-strip" aria-label="Stitched phrase sequence">
          {phraseList.map((item, idx) => {
            const done = idx < activeStep
            const target = idx === activeStep
            const playing = idx === activeClipIdx
            return (
              <button
                key={`${item}-${idx}`}
                type="button"
                className={`sl-phrase-chip${done ? ' is-done' : ''}${target ? ' is-target' : ''}${playing ? ' is-playing' : ''}`}
                onClick={() => setClipState({ key: phraseKey, idx })}
              >
                {done ? <Check size={12} /> : <span>{idx + 1}.</span>}
                <span>{shortTitle(item)}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="sl-model-viewport sl-ref-viewport" style={{ height }}>
        {video ? (
          <video
            key={`${activeClipIdx}-${video}`}
            className="sl-sign-video"
            style={{ maxHeight: height, height: '100%', width: '100%' }}
            src={video}
            controls
            autoPlay
            loop={!phraseList}
            muted
            playsInline
            preload="auto"
            onEnded={() => {
              if (!phraseList) return
              setClipState({ key: phraseKey, idx: (activeClipIdx + 1) % phraseList.length })
            }}
            aria-label={`FSL demonstration of ${playingSign}`}
          />
        ) : image ? (
          <img
            className="sl-sign-video"
            style={{
              maxHeight: height,
              height: '100%',
              width: '100%',
              objectFit: 'contain',
              background: '#ffffff',
              padding: 12,
              borderRadius: 10,
              transform: flip ? 'scaleX(-1)' : undefined,
            }}
            src={image}
            alt={`FSL fingerspelling reference for ${playingSign}`}
          />
        ) : (
          <HandDiagram pose={referencePose(playingSign)} sign={playingSign} flip={flip} />
        )}
      </div>

      <div className="sl-ref-cues">
        <div>{steps.start} {steps.motion}</div>
      </div>
    </section>
  )
}
