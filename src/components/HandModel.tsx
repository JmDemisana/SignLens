import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import * as THREE from 'three'
import type { HandLandmarks, Vec3 } from '../engine/types'
import { toV } from '../engine/handGLB'
import { hasSculptedPose, makeSculptedHand } from '../engine/sculptedHand'
import { HandDiagram } from './HandDiagram'

export default function HandModel({
  pose,
  path,
  animate = false,
  flip = false,
  height = 244,
  sign = 'the sign',
}: {
  pose: HandLandmarks
  path?: Vec3[]
  animate?: boolean
  flip?: boolean
  height?: number
  sign?: string
}) {
  const hasMotion = animate && !!path && path.length > 1
  const mountRef = useRef<HTMLDivElement>(null)
  const controls = useRef<{ turn: (direction: number) => void; play: (value: boolean) => void } | null>(null)
  const [view, setView] = useState<'loading' | 'ready' | 'diagram'>('loading')
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    if (!hasSculptedPose(sign)) {
      queueMicrotask(() => setView('diagram'))
      return
    }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch {
      queueMicrotask(() => setView('diagram'))
      return
    }

    let active = true
    let frame = 0
    let animateMotion = false
    let playbackStart = 0
    let fit = 1
    const scene = new THREE.Scene()
    const position = new THREE.Group()
    const orbit = new THREE.Group()
    const hand = new THREE.Group()
    scene.add(orbit)
    orbit.add(position)
    position.add(hand)
    hand.scale.x = flip ? -1 : 1
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20)
    camera.position.z = 7
    scene.add(new THREE.HemisphereLight(0xffede1, 0x889eb8, 2))
    const light = new THREE.DirectionalLight(0xfff2d9, 2.3)
    light.position.set(-2, 4, 5)
    scene.add(light)
    const edge = new THREE.DirectionalLight(0x6eded4, 1.3)
    edge.position.set(3, 0, -4)
    scene.add(edge)

    const material = new THREE.MeshStandardMaterial({ color: 0xd8a986, roughness: 0.83 })
    const move = new THREE.Vector3()
    const origin = path?.[0] ? toV(path[0]) : move
    const trace = hasMotion && path ? path.map((point) => {
      const p = toV(point).sub(origin)
      p.x *= flip ? -1 : 1
      return p
    }) : []
    let guide: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | undefined
    let yaw = (flip ? 1 : -1) * 0.25
    let tilt = -0.05
    let dragPoint: { x: number; y: number } | null = null
    const render = (time = performance.now()) => {
      if (!active || document.hidden) return
      orbit.rotation.set(tilt, yaw, 0)
      if (animateMotion && trace.length) {
        // Play in the signing direction, then pause briefly before restarting.
        const segment = Math.min(1, ((time - playbackStart) % 2650) / 1900) * (trace.length - 1)
        const index = Math.floor(segment)
        position.position.copy(move.copy(trace[index]).lerp(trace[Math.min(index + 1, trace.length - 1)], segment - index))
      }
      renderer.render(scene, camera)
    }
    const loop = (time: number) => {
      render(time)
      if (animateMotion) frame = requestAnimationFrame(loop)
    }
    const resize = () => {
      const width = Math.max(1, mount.clientWidth)
      const viewHeight = Math.max(1, mount.clientHeight)
      const aspect = width / viewHeight
      renderer.setSize(width, viewHeight, false)
      camera.top = fit / Math.min(1, aspect)
      camera.bottom = -camera.top
      camera.right = camera.top * aspect
      camera.left = -camera.right
      camera.updateProjectionMatrix()
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    controls.current = {
      turn(direction) {
        yaw = direction ? yaw + direction * Math.PI / 6 : (flip ? 1 : -1) * 0.25
        if (!direction) tilt = -0.05
        render()
      },
      play(value) {
        animateMotion = value
        cancelAnimationFrame(frame)
        if (value) {
          playbackStart = performance.now()
          frame = requestAnimationFrame(loop)
        }
      },
    }

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      dragPoint = { x: event.clientX, y: event.clientY }
      mount.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      if (!dragPoint) return
      yaw += (event.clientX - dragPoint.x) * 0.013
      tilt = THREE.MathUtils.clamp(tilt + (event.clientY - dragPoint.y) * 0.012, -1.1, 1.1)
      dragPoint = { x: event.clientX, y: event.clientY }
      render()
    }
    const onUp = () => { dragPoint = null }
    const onLoss = () => setView('diagram')
    mount.addEventListener('pointerdown', onDown)
    mount.addEventListener('pointermove', onMove)
    mount.addEventListener('lostpointercapture', onUp)
    renderer.domElement.addEventListener('webglcontextlost', onLoss)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.domElement.setAttribute('aria-hidden', 'true')
    mount.appendChild(renderer.domElement)

    void makeSculptedHand(sign, material).then((model) => {
      if (!active) return
      model.updateMatrixWorld(true)
      const bounds = new THREE.Box3().setFromObject(model, true)
      const size = bounds.getSize(new THREE.Vector3())
      model.position.sub(bounds.getCenter(new THREE.Vector3()))
      fit = Math.max(size.x, size.y, size.z) * 0.67 + (hasMotion ? 0.4 : 0.14)
      hand.add(model)

      if (trace.length > 1) {
        const anchor = path && /^[JZ]$/.test(sign) ? pose[sign === 'J' ? 20 : 8] : null
        const offset = anchor ? toV(anchor) : new THREE.Vector3(0, 0, 0.12)
        offset.x *= flip ? -1 : 1
        guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints(trace.map((point) => point.clone().add(offset))), new THREE.LineBasicMaterial({ color: 0x81eac0 }))
        orbit.add(guide)
      }
      resize()
      setView('ready')
      if (hasMotion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        controls.current?.play(true)
        setPlaying(true)
      }
    }).catch(() => { if (active) setView('diagram') })

    return () => {
      active = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.current = null
      mount.removeEventListener('pointerdown', onDown)
      mount.removeEventListener('pointermove', onMove)
      mount.removeEventListener('lostpointercapture', onUp)
      renderer.domElement.removeEventListener('webglcontextlost', onLoss)
      guide?.geometry.dispose()
      guide?.material.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [pose, flip, path, sign, hasMotion])

  return (
    <div className="sl-model">
      <div className="sl-model-viewport" style={{ height }}>
        <div ref={mountRef} className="sl-model-canvas" data-ready={view === 'ready'} role="img" aria-label={`3D hand reference for ${sign}`} aria-hidden={view !== 'ready'} />
        {view !== 'ready' && <HandDiagram pose={pose} sign={sign} flip={flip} />}
      </div>
      {view === 'ready' ? (
        <div className="sl-model-controls">
          <button type="button" onClick={() => controls.current?.turn(-1)} aria-label="Rotate hand left"><ChevronLeft size={17} /></button>
          <button type="button" onClick={() => controls.current?.turn(0)} aria-label="Reset viewing angle"><RotateCcw size={15} /></button>
          <button type="button" onClick={() => controls.current?.turn(1)} aria-label="Rotate hand right"><ChevronRight size={17} /></button>
          {hasMotion && <button className="sl-motion-button" type="button" onClick={() => {
            controls.current?.play(!playing)
            setPlaying(!playing)
          }}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : 'Play'}</button>}
        </div>
      ) : (
        <p className="sl-model-state" role="status">{view === 'loading' ? 'Loading 3D view…' : 'Showing the handshape diagram'}</p>
      )}
    </div>
  )
}
