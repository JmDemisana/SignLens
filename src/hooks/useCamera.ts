import { useEffect, useMemo, useState } from 'react'

function errorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError') return 'Allow camera access in your app or browser settings, then try again.'
  if (name === 'NotReadableError') return 'The camera is busy or could not start. Close other camera apps and try again.'
  if (name === 'NotFoundError') return 'No camera was found. Connect a camera and try again.'
  if (name === 'OverconstrainedError') return 'The selected camera is unavailable. Choose another camera in Settings.'
  return 'Could not start the camera.'
}

export function useCamera(active: boolean) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [request, setRequest] = useState(0)
  const token = useMemo(() => ({ active, deviceId, request }), [active, deviceId, request])
  const [result, setResult] = useState<{ token: typeof token; stream?: MediaStream; error?: string } | null>(null)
  const currentResult = result?.token === token ? result : null
  const stream = currentResult?.stream ?? null
  const media = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices

  useEffect(() => {
    if (!media?.enumerateDevices) return
    let current = true
    const refresh = () => {
      void media.enumerateDevices().then((list) => {
        if (current) setDevices(list.filter((device) => device.kind === 'videoinput' && device.deviceId))
      }).catch(() => {})
    }
    refresh()
    media.addEventListener('devicechange', refresh)
    return () => {
      current = false
      media.removeEventListener('devicechange', refresh)
    }
  }, [media, stream])

  useEffect(() => {
    if (!token.active || !media?.getUserMedia) return

    let current = true
    let acquired: MediaStream | undefined
    const onEnded = () => {
      if (current) setResult({ token, error: 'The camera disconnected. Reconnect it and try again.' })
    }
    void media.getUserMedia({
      video: {
        ...(token.deviceId ? { deviceId: { exact: token.deviceId } } : { facingMode: { ideal: 'user' } }),
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    }).then((next) => {
      if (!current) {
        next.getTracks().forEach((track) => track.stop())
        return
      }
      acquired = next
      acquired.getVideoTracks().forEach((track) => track.addEventListener('ended', onEnded))
      setResult({ token, stream: next })
    }).catch((reason: unknown) => {
      if (current) setResult({ token, error: errorMessage(reason) })
    })

    return () => {
      current = false
      acquired?.getTracks().forEach((track) => {
        track.removeEventListener('ended', onEnded)
        track.stop()
      })
    }
  }, [media, token])

  return {
    stream,
    error: active && !media?.getUserMedia
      ? 'Camera access requires the desktop app, HTTPS, or localhost.'
      : currentResult?.error ?? null,
    devices,
    deviceId,
    setDeviceId,
    retry: () => setRequest((previous) => previous + 1),
  }
}
