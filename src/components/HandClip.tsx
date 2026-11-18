import { useEffect, useState } from 'react'
import type { HandLandmarks, Vec3 } from '../engine/types'
import { getDemoClip } from '../engine/handVideo'
import HandModel from './HandModel'

// Looping demo video. Baked once per sign on first view, replayed from
// IndexedDB forever after. Zero WebGL cost during practice.
// If video baking is pending or unsupported, falls back directly to the 3D model.
export default function HandClip({
  signId,
  pose,
  path,
  flip = false,
  height = 220,
}: {
  signId: string
  pose: HandLandmarks
  path?: Vec3[]
  flip?: boolean
  height?: number
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const key = `${signId}|${flip ? 'L' : 'R'}|${(path ?? []).length}`

  useEffect(() => {
    let alive = true
    let objUrl: string | null = null
    setUrl(null)
    setFailed(false)
    getDemoClip(key, pose, path, flip)
      .then((blob) => {
        if (!alive) return
        if (blob) {
          objUrl = URL.createObjectURL(blob)
          setUrl(objUrl)
        } else {
          setFailed(true)
        }
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
      if (objUrl) URL.revokeObjectURL(objUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (failed || !url) {
    return <HandModel sign={signId} pose={pose} path={path} flip={flip} height={height} animate />
  }

  return (
    <div>
      <div style={{ width: '100%', height, background: '#0b1418', borderRadius: '12px', overflow: 'hidden' }}>
        <video src={url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ fontSize: '11px', color: '#afbac0', fontWeight: 700, textAlign: 'center', marginTop: '4px' }}>
        Demo loops offline
      </div>
    </div>
  )
}
