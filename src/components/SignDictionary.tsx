import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bookmark, Camera, Plus, Search, Trash2, Volume2 } from 'lucide-react'
import { palmCenter } from '../engine/angles'
import { definitionFor, howToFor, lookupTop3, relatedFor, speak } from '../engine/dictionary'
import type { DictResult } from '../engine/dictionary'
import { detectBothHands, loadHandLandmarker } from '../engine/mediapipe'
import { MotionTrace } from '../engine/motion'
import { templatesForLang } from '../engine/templates'
import type { HandLandmarks, SignLang } from '../engine/types'
import HandReference from './HandReference'
import { signVideoFor, fslVideoEntries, fslVideoInfo } from '../engine/signVideos'
import type { PoseTemplate } from '../engine/types'
import PracticeWindowNotice from './PracticeWindowNotice'
import WebcamVideo from './WebcamVideo'

interface Props {
  lang: SignLang
  selectedId: string | null
  saved: string[]
  stream: MediaStream | null
  cameraEnabled: boolean
  cameraError: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  mirrored: boolean
  skeleton: boolean
  flip: boolean
  sound: boolean
  rate: number
  onSelect: (id: string | null) => void
  onSave: (id: string) => void
  onPractice: (id: string) => void
  onPracticePhrase: (signs: string[], label: string) => void
  onToggleCamera: () => void
  onRetryCamera: () => void
  onSaved: () => void
}

type DictFilter = 'all' | 'course' | 'letters' | 'digits' | 'saved'

const PRESET_PHRASES: { label: string; signs: string[] }[] = [
  { label: 'Magandang umaga, Nanay', signs: ['MAGANDANG UMAGA', 'NANAY'] },
  { label: 'Hot coffee, no sugar', signs: ['HOT', 'KAPE', 'NO SUGAR'] },
  { label: 'See you tomorrow, Tatay', signs: ['SEE YOU TOMORROW', 'TATAY'] },
]

export default function SignDictionary(props: Props) {
  const { lang, selectedId, saved, stream, cameraEnabled, cameraError, videoRef, mirrored, skeleton, flip, sound, rate, onSelect, onSave, onPractice, onPracticePhrase, onToggleCamera, onRetryCamera, onSaved } = props
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DictFilter>('all')
  const [phraseQueue, setPhraseQueue] = useState<string[]>([])
  const [voiceUnavailable, setVoiceUnavailable] = useState(false)
  const [landmarks, setLandmarks] = useState<HandLandmarks | null>(null)
  const [secondLandmarks, setSecondLandmarks] = useState<HandLandmarks | null>(null)
  const [candidates, setCandidates] = useState<DictResult[]>([])
  const [model, setModel] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const courseIds = useMemo(() => new Set(templatesForLang('FSL').filter((t) => !/^[A-Z0-9]$/.test(t.id)).map((t) => t.id)), [])
  const entries = useMemo(() => {
    const existing = templatesForLang('FSL')
    const ids = fslVideoEntries.map((item) => item.sign)
    const existingIds = new Set(existing.map((item) => item.id))
    const examples: PoseTemplate[] = [...new Set(ids)].filter((id) => !existingIds.has(id)).map((id) => ({ id, kind: 'dynamic', lang: 'FSL', hint: '' }))
    return [...existing, ...examples]
  }, [])
  const q = query.trim().toUpperCase()
  const filteredEntries = entries.filter(({ id }) => {
    if (filter === 'course') return courseIds.has(id)
    if (filter === 'letters') return /^[A-Z]$/.test(id)
    if (filter === 'digits') return /^\d+$/.test(id)
    if (filter === 'saved') return saved.includes(id)
    return true
  })
  const matches = filteredEntries.filter(({ id }) => !q || id.includes(q) || definitionFor(id).title.toUpperCase().includes(q) || (fslVideoInfo(id)?.label.includes(q) ?? false))
    .sort((a, b) => Number(b.id === q) - Number(a.id === q) || Number(b.id.startsWith(q)) - Number(a.id.startsWith(q)))
  const entry = matches.find(({ id }) => id === (selectedId ?? (!q ? 'KAMUSTA' : null)))
    ?? matches[0]
  const detected = candidates[0]
  const info = entry && definitionFor(entry.id)
  const steps = entry && howToFor(entry.id)
  const videoOnly = !!entry && !templatesForLang('FSL').some((template) => template.id === entry.id)
  const hasVideo = !!entry && !!signVideoFor(entry.id, 'FSL')
  const entryTemplate = entry && templatesForLang('FSL').find((t) => t.id === entry.id)

  useEffect(() => {
    if (!stream) return
    let active = true
    let lastFrame = -1
    let timer = 0
    const motion = new MotionTrace()
    const tick = () => {
      const video = videoRef.current
      if (!video || document.hidden || video.readyState < 2 || video.currentTime === lastFrame) return
      lastFrame = video.currentTime
      const now = performance.now()
      const hands = detectBothHands(video, now)
      const lm = hands[0] ?? null
      setLandmarks(lm)
      setSecondLandmarks(hands[1] ?? null)
      if (!lm) {
        motion.reset()
        setCandidates([])
        return
      }
      const aspect = video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9
      const trace = motion.sample(palmCenter(lm), now)
      setCandidates(lookupTop3(lm, 'FSL', aspect, trace).filter(({ score }) => score >= 65))
    }

    void loadHandLandmarker().then((loaded) => {
      if (!active) return
      setModel(loaded ? 'ready' : 'unavailable')
      if (loaded) timer = window.setInterval(tick, 65)
    })
    return () => {
      active = false
      window.clearInterval(timer)
      setLandmarks(null)
      setSecondLandmarks(null)
      setCandidates([])
    }
  }, [stream, entries, lang, videoRef])

  const openSign = (id: string) => {
    setQuery('')
    setFilter('all')
    onSelect(id)
  }

  return (
    <div className="sl-platform">
      <div className="sl-page-heading">
        <div><h1>Dictionary</h1></div>
        <button className="sl-button sl-secondary" onClick={onSaved}><Bookmark size={17} /> Saved</button>
      </div>
      <div className="sl-dictionary-top">
        <form className="sl-search" onSubmit={(event) => {
          event.preventDefault()
          if (entry) onSelect(entry.id)
        }}>
          <Search size={20} aria-hidden="true" />
          <input type="search" aria-label="Search signs" placeholder="Search signs, letters, or numbers…" value={query} onChange={(event) => {
            setQuery(event.target.value)
            if (selectedId) onSelect(null)
          }} />
          <button className="duo-btn duo-btn-blue" type="submit" disabled={!entry}>Search</button>
        </form>
        <div className="sl-filter-pills" role="tablist" aria-label="Filter FSL entries">
          {([
            { id: 'all', label: `All (${entries.length})` },
            { id: 'course', label: 'Course' },
            { id: 'letters', label: 'Letters' },
            { id: 'digits', label: 'Numbers' },
            { id: 'saved', label: `Saved (${saved.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              className={`sl-filter-pill${filter === tab.id ? ' is-active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {matches.length ? (
          <div className="sl-dictionary-matches" aria-label="Matching FSL entries">
            {matches.map(({ id }) => <button key={id} aria-pressed={id === entry?.id} onClick={() => onSelect(id)}>{definitionFor(id).title}</button>)}
          </div>
        ) : (
          <p className="sl-dict-message" role="status">No signs match “{query.trim() || filter}”.</p>
        )}
      </div>
      {cameraEnabled && <PracticeWindowNotice />}
      <div className="sl-dict-layout">
        <section className="sl-card sl-scanner">
          <div className="sl-card-heading">
            <h2><Camera size={20} /> Search by Camera</h2>
            <span className={`sl-live-tag${stream ? ' is-live' : ''}`}>{stream ? 'Live' : 'Off'}</span>
          </div>
          <div className="duo-camera-card sl-scan-preview">
            <WebcamVideo stream={stream} isLive={!!stream} isMirrored={mirrored} videoRef={videoRef}
              landmarks={skeleton ? landmarks : null} secondLandmarks={skeleton ? secondLandmarks : null} landmarkColor="#77e4c0" />
            {!stream && <div className="sl-scan-placeholder">
              <Camera size={33} />
              <p role="status">{cameraError ?? (cameraEnabled ? 'Starting camera…' : 'Show a sign to find it in the dictionary.')}</p>
              <button className="duo-btn duo-btn-blue" onClick={() => {
                setModel('loading')
                if (cameraError) onRetryCamera()
                else onToggleCamera()
              }}>{cameraError ? 'Retry' : cameraEnabled ? 'Cancel' : 'Turn on camera'}</button>
            </div>}
            {stream && <button className="sl-camera-off" onClick={onToggleCamera}>Turn off</button>}
          </div>
          {cameraEnabled && (
            <>
              {detected ? (
                <button className="sl-detected-sign" onClick={() => openSign(detected.id)}>
                  <span><small>Best Match</small><strong>{definitionFor(detected.id).title}</strong></span>
                  <span>{Math.round(detected.score)}%</span>
                </button>
              ) : <p role="status">{stream ? model === 'loading' ? 'Loading camera…' : model === 'unavailable' ? 'Camera tracking unavailable.' : 'Show a sign in the camera.' : 'Top matches will appear here.'}</p>}
              {candidates.slice(1).map(({ id, score }, idx) => (
                <button key={id} className="sl-candidate" onClick={() => openSign(id)}><span>#{idx + 2} · {definitionFor(id).title}</span><strong>{Math.round(score)}%</strong></button>
              ))}
            </>
          )}
        </section>
        {entry && info && steps ? (
          <article className="sl-card sl-entry">
            <div className="sl-entry-heading">
              <div>
                <div className="sl-entry-badges">
                  {entryTemplate?.twoHanded && <span className="sl-badge is-purple">2 Hands</span>}
                </div>
                <span className="sl-eyebrow">{info.sub}</span>
                <h2>{info.title}</h2>
              </div>
              {sound && <button className="sl-icon-button" onClick={() => setVoiceUnavailable(!speak(info.title, rate))} aria-label={`Read ${info.title} aloud`}><Volume2 size={21} /></button>}
            </div>
            {sound && voiceUnavailable && <p role="status">An offline speech synthesis voice is unavailable on this device.</p>}
            {!videoOnly && !hasVideo && <p>{info.desc}</p>}
            <HandReference lang="FSL" sign={entry.id} flip={flip} height={245} />
            {!hasVideo && <div>
              <h3>How to form it</h3>
              <ol className="sl-steps">
                <li>{steps.start}</li>
                <li>{entry.id === 'J' || entry.id === 'Z' ? entry.hint : steps.motion}</li>
                <li>{steps.cue}</li>
              </ol>
            </div>}
            <div className="sl-related">
              <h3>Related FSL signs</h3>
              {relatedFor(entry.id, 'FSL', entries).map((id) => <button key={id} className="sl-button sl-secondary" onClick={() => openSign(id)}>{definitionFor(id).title}</button>)}
            </div>
            <div className="sl-actions">
              {!videoOnly && <button className="duo-btn duo-btn-green" onClick={() => onPractice(entry.id)}>Practice <ArrowRight size={17} /></button>}
              {hasVideo && (
                <button className="sl-button sl-secondary" onClick={() => setPhraseQueue((q) => [...q, entry.id].slice(-6))}>
                  <Plus size={16} /> Add to phrase
                </button>
              )}
              {!videoOnly && <button className="sl-button sl-secondary" aria-pressed={saved.includes(entry.id)} onClick={() => onSave(entry.id)}>
                <Bookmark size={17} fill={saved.includes(entry.id) ? 'currentColor' : 'none'} /> {saved.includes(entry.id) ? 'Saved' : 'Save'}
              </button>}
            </div>

            <div className="sl-phrase-builder">
              <div className="sl-ref-header">
                <h3>Phrase Stitcher</h3>
                {phraseQueue.length > 0 && (
                  <button className="sl-phrase-clear" onClick={() => setPhraseQueue([])}>
                    <Trash2 size={13} /> Clear
                  </button>
                )}
              </div>
              <div className="sl-phrase-presets">
                {PRESET_PHRASES.map((preset) => (
                  <button key={preset.label} type="button" className="sl-filter-pill" onClick={() => setPhraseQueue(preset.signs)}>
                    {preset.label}
                  </button>
                ))}
              </div>
              {phraseQueue.length === 1 && (
                <p className="sl-dict-message">
                  Added {definitionFor(phraseQueue[0]).title}. Add one more sign to stitch videos.
                </p>
              )}
              {phraseQueue.length >= 2 && (
                <>
                  <HandReference lang="FSL" sign={phraseQueue[0]} phraseSigns={phraseQueue} flip={flip} height={195} />
                  {phraseQueue.every((id) => templatesForLang('FSL').some((t) => t.id === id)) && (
                    <button
                      className="duo-btn duo-btn-green"
                      style={{ width: '100%', padding: '10px 14px', fontSize: '13px' }}
                      onClick={() => onPracticePhrase(phraseQueue, phraseQueue.map((id) => definitionFor(id).title.split(' (')[0]).join(' '))}
                    >
                      Practice Phrase <ArrowRight size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        ) : (
          <section className="sl-card sl-empty"><Search size={30} /><h2>No matching FSL signs</h2><button className="sl-button sl-secondary" onClick={() => setQuery('')}>Clear search</button></section>
        )}
      </div>
    </div>
  )
}
