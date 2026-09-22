import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { HandLandmarks, Vec3 } from '../engine/types'
import { indexRig, poseRig, type Rig } from '../engine/retarget'

// Real sculpted hand ("Rigged Hand" by J-Toastie, CC-BY), posed by our
// landmarks. Offline: model + loader ship inside the app bundle.
export default function HandModel({
  pose,
  path,
  animate = false,
  flip = false,
  height = 260,
}: {
  pose: HandLandmarks
  path?: Vec3[]
  animate?: boolean
  flip?: boolean
  height?: number
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rigRef = useRef<Rig | null>(null)
  const [status, setStatus] = useState('loading')
  const poseRef = useRef(pose)
  poseRef.current = pose
  const flipRef = useRef(flip)
  flipRef.current = flip

  // Scene mounts once.
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let alive = true
    const w = mount.clientWidth || 300
    const h = height

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100)
    camera.position.set(0, 0.05, 2.6)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x1a2530, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 1.5)
    key.position.set(1.5, 2, 2.5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffe2c4, 0.5)
    fill.position.set(-1, -0.5, 2)
    scene.add(fill)

    const root = new THREE.Group()
    scene.add(root)
    const holder = new THREE.Group()
    root.add(holder)

    new GLTFLoader().load(
      '/models/hand-rigged.glb',
      (gltf) => {
        if (!alive) return
        const model = gltf.scene
        // Normalize: fit hand to ~2 units tall, centered.
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const s = 2.0 / Math.max(size.y, 0.001)
        model.scale.setScalar(s)
        model.position.sub(center.clone().multiplyScalar(s))
        holder.add(model)
        rigRef.current = indexRig(model)
        try {
          poseRig(rigRef.current, poseRef.current, flipRef.current)
        } catch (e) {
          console.warn('pose failed', e)
        }
        setStatus('ready')
      },
      undefined,
      () => alive && setStatus('error'),
    )

    let rotX = 0.12
    let rotY = 0
    let dragging = false
    let px = 0
    let py = 0
    let lastMove = Date.now()
    const down = (e: PointerEvent) => {
      dragging = true
      px = e.clientX
      py = e.clientY
      mount.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      rotY += (e.clientX - px) * 0.01
      rotX += (e.clientY - py) * 0.01
      rotX = Math.max(-1.2, Math.min(1.2, rotX))
      px = e.clientX
      py = e.clientY
      lastMove = Date.now()
    }
    const end = () => {
      dragging = false
    }
    mount.addEventListener('pointerdown', down)
    mount.addEventListener('pointermove', move)
    mount.addEventListener('pointerup', end)
    mount.addEventListener('pointercancel', end)

    let raf = 0
    const loop = () => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      if (!dragging && Date.now() - lastMove > 5000) rotY += 0.002
      root.rotation.set(rotX, rotY, 0)
      renderer.render(scene, camera)
    }
    loop()

    const onResize = () => {
      const nw = mount.clientWidth || 300
      renderer.setSize(nw, h)
      camera.aspect = nw / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      mount.removeEventListener('pointerdown', down)
      mount.removeEventListener('pointermove', move)
      mount.removeEventListener('pointerup', end)
      mount.removeEventListener('pointercancel', end)
      rigRef.current = null
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [height])

  // Repose + trail whenever the demonstrated sign changes.
  const trailKey = JSON.stringify((path ?? []).map((v) => [Math.round(v.x * 500), Math.round(v.y * 500)]))
  const poseKey = JSON.stringify({
    p: pose.map((v) => [Math.round(v.x * 500), Math.round(v.y * 500), Math.round((v.z || 0) * 500)]),
    flip,
  })
  useEffect(() => {
    if (rigRef.current) {
      try {
        poseRig(rigRef.current, pose, flip)
      } catch (e) {
        console.warn('repose failed', e)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseKey])

  // Gesture playback offset for dynamic words.
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (!animate || !path || path.length < 2) return
    let raf = 0
    const start = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const t = ((performance.now() - start) / 2600) % 2
      setPhase(t < 1 ? t : 2 - t)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animate, path, trailKey])

  const off =
    animate && path && path.length >= 2
      ? (() => {
          const fi = phase * (path.length - 1)
          const i0 = Math.floor(fi)
          const i1 = Math.min(path.length - 1, i0 + 1)
          const fr = fi - i0
          return {
            x: (path[i0].x + (path[i1].x - path[i0].x) * fr - path[0].x) * 2.2,
            y: -((path[i0].y + (path[i1].y - path[i0].y) * fr - path[0].y) * 2.2),
          }
        })()
      : { x: 0, y: 0 }

  return (
    <div>
      <div ref={mountRef} style={{ width: '100%', height, cursor: 'grab', touchAction: 'none', transform: `translate(${off.x * 40}px, ${off.y * 40}px)` }} />
      <div style={{ fontSize: '11px', color: '#afbac0', fontWeight: 700, textAlign: 'center', marginTop: '4px' }}>
        {status === 'ready' ? '3D hand • drag to rotate' : status === 'error' ? '3D model failed to load' : 'Loading 3D hand...'}
      </div>
    </div>
  )
}
