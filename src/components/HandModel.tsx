import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { HandLandmarks, Vec3 } from '../engine/types'
import { indexRig, poseRig, type Rig } from '../engine/retarget'
import { loadHandGLB, frameModel, snapshotHand } from '../engine/handGLB'

// Prerendered snapshot first, live 3D only when the learner grabs it.
// Kills the multi-engine lag: zero WebGL contexts until touched.
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
  const liveRef = useRef(false)
  const [status, setStatus] = useState<'snap' | 'live' | 'error'>('snap')
  const [img, setImg] = useState<string | null>(null)
  const poseKey = JSON.stringify({
    p: pose.map((v) => [Math.round(v.x * 500), Math.round(v.y * 500), Math.round((v.z || 0) * 500)]),
    flip,
  })

  // Snapshot any time the demonstrated sign changes.
  useEffect(() => {
    let alive = true
    const w = mountRef.current?.clientWidth || 300
    snapshotHand(pose, flip, w, Math.round(height))
      .then((url) => alive && setImg(url))
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseKey, height])

  // Spin up the live scene on first grab.
  const goLive = () => {
    if (liveRef.current || status === 'error') return
    const mount = mountRef.current
    if (!mount) return
    liveRef.current = true
    let alive = true
    const w = mount.clientWidth || 300
    const h = height

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = `${h}px`
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

    loadHandGLB().then((src) => {
      if (!alive) return
      const model = skeletonClone(src)
      frameModel(model)
      holder.add(model)
      rigRef.current = indexRig(model)
      try {
        poseRig(rigRef.current, poseRef.current, flipRef.current)
      } catch (e) {
        console.warn('pose failed', e)
      }
      setStatus('live')
    })

    if (path && path.length >= 2) {
      const g = new THREE.BufferGeometry().setFromPoints(
        path.map((p) => new THREE.Vector3((p.x - 0.5) * 2.2, (0.5 - p.y) * 2.2, 0)),
      )
      holder.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x1cb0f6 })))
    }

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
    const start = performance.now()
    const loop = () => {
      if (!alive) return
      // Dead when the tab hides or the demo scrolls away.
      if (document.hidden) {
        raf = requestAnimationFrame(loop)
        return
      }
      const r = mount.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) {
        raf = requestAnimationFrame(loop)
        return
      }
      raf = requestAnimationFrame(loop)
      if (!dragging && Date.now() - lastMove > 5000) rotY += 0.002
      root.rotation.set(rotX, rotY, 0)
      if (animate && path && path.length >= 2) {
        const t = ((performance.now() - start) / 2600) % 2
        const tri = t < 1 ? t : 2 - t
        const fi = tri * (path.length - 1)
        const i0 = Math.floor(fi)
        const i1 = Math.min(path.length - 1, i0 + 1)
        const fr = fi - i0
        holder.position.set(
          (path[i0].x + (path[i1].x - path[i0].x) * fr - path[0].x) * 2.2,
          -((path[i0].y + (path[i1].y - path[i0].y) * fr - path[0].y) * 2.2),
          0,
        )
      }
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
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement)
    }
  }

  const poseRef = useRef(pose)
  poseRef.current = pose
  const flipRef = useRef(flip)
  flipRef.current = flip

  // Repose the live scene when the sign changes mid-view.
  useEffect(() => {
    if (rigRef.current && liveRef.current) {
      try {
        poseRig(rigRef.current, pose, flip)
      } catch (e) {
        console.warn('repose failed', e)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseKey])

  return (
    <div>
      <div
        ref={mountRef}
        style={{ width: '100%', height, cursor: 'grab', touchAction: 'none', position: 'relative', overflow: 'hidden' }}
        onPointerDown={goLive}
      >
        {status !== 'live' && img && (
          <img src={img} alt="3D hand reference" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} draggable={false} />
        )}
        {status !== 'live' && !img && (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#afbac0', fontWeight: 700 }}>
            {status === 'error' ? '3D preview unavailable' : 'Rendering hand...'}
          </div>
        )}
      </div>
      <div style={{ fontSize: '11px', color: '#afbac0', fontWeight: 700, textAlign: 'center', marginTop: '4px' }}>
        {status === 'live' ? '3D hand • drag to rotate' : 'Tap the hand for live 3D'}
      </div>
    </div>
  )
}
