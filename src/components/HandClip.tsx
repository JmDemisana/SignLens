import { useEffect, useState } from 'react'
import type { HandLandmarks, Vec3 } from '../engine/types'
import { getDemoClip } from '../engine/handVideo'

// Looping demo video. Baked once per sign on first view, replayed from
// IndexedDB forever after. Zero WebGL cost during practice.
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
    getDemoClip(key, pose, path, flip).then((blob) => {
      if (!alive) return
      if (blob) {
        objUrl = URL.createObjectURL(blob)
        setUrl(objUrl)
      } else {
        setFailed(true)
      }
    })
    return () => {
      alive = false
      if (objUrl) URL.revokeObjectURL(objUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div>
      <div style={{ width: '100%', height, background: '#0b1418', borderRadius: '12px', overflow: 'hidden' }}>
        {url ? (
          <video src={url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
            {failed ? 'Demo unavailable' : 'Baking demo once...'}
          </div>
        )}
      </div>
      <div style={{ fontSize: '11px', color: '#afbac0', fontWeight: 700, textAlign: 'center', marginTop: '4px' }}>
        Demo loops offline
      </div>
    </div>
  )
}
