import { useEffect, useRef, useState } from 'react'
import type { HandLandmarks } from '../engine/types'
import LandmarkOverlay from './LandmarkOverlay'

export default function WebcamVideo({
  stream,
  isLive,
  isMirrored = true,
  videoRef,
  landmarks,
  secondLandmarks,
  landmarkColor,
  perJoint,
}: {
  stream: MediaStream | null
  isLive: boolean
  isMirrored?: boolean
  videoRef?: React.RefObject<HTMLVideoElement | null>
  landmarks?: HandLandmarks | null
  secondLandmarks?: HandLandmarks | null
  landmarkColor?: string
  perJoint?: number[]
}) {
  const innerRef = useRef<HTMLVideoElement | null>(null)
  const ref = videoRef ?? innerRef
  const [aspect, setAspect] = useState(16 / 9)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.srcObject = stream
    if (stream) void video.play().catch(() => {})
    return () => { video.srcObject = null }
  }, [stream, ref])

  const updateAspect = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = event.currentTarget
    if (videoWidth && videoHeight) setAspect(videoWidth / videoHeight)
  }

  return <>
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      aria-label="Camera preview"
      onLoadedMetadata={updateAspect}
      onResize={updateAspect}
      style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
      className={`duo-webcam-video ${isLive ? 'active' : 'inactive'}`}
    />
    {landmarks && <LandmarkOverlay lm={landmarks} secondLm={secondLandmarks} mirrored={isMirrored} color={landmarkColor} aspect={aspect} perJoint={perJoint} />}
  </>
}
