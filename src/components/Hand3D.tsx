import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { HandLandmarks, Vec3 } from '../engine/types'

// Fingers as smooth clay tubes through the joints, one plump palm.
// This is the fingerspelling.xyz trick: no segment lumps, no knuckle balls,
// just continuous forms. Reference poses are static, so geometry builds once.
const CHAINS: number[][] = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16],
  [0, 17, 18, 19, 20],
]
const TUBE_R = [0.055, 0.052, 0.054, 0.05, 0.045]

export default function Hand3D({
  pose,
  path,
  animate = false,
  flip = false,
  color = '#58cc02',
  skin = '#d9a06f',
  height = 260,
}: {
  pose: HandLandmarks
  path?: Vec3[]
  animate?: boolean
  flip?: boolean
  color?: string
  skin?: string
  height?: number
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const poseKey = JSON.stringify({
    p: pose.map((v) => [Math.round(v.x * 500), Math.round(v.y * 500), Math.round((v.z || 0) * 500)]),
    path: (path ?? []).map((v) => [Math.round(v.x * 500), Math.round(v.y * 500)]),
    flip,
  })

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const w = mount.clientWidth || 300
    const h = height

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100)
    camera.position.set(0, 0.05, 2.5)
    camera.lookAt(0, -0.1, 0)

    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x1a2530, 1.15))
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(1.5, 2, 2.5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffe2c4, 0.55)
    fill.position.set(-1, -0.5, 2)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0x1cb0f6, 0.7)
    rim.position.set(-2, -1, -1.5)
    scene.add(rim)

    const root = new THREE.Group()
    scene.add(root)
    const hand = new THREE.Group()
    root.add(hand)

    const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skin), roughness: 0.62, metalness: 0.02 })
    // One hue per digit so curled fingers read separately in a fist.
    const fingerMats = [0xd98a5f, 0x58cc02, 0x1cb0f6, 0xce82ff, 0xffc800].map(
      (c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(skin).lerp(new THREE.Color(c), 0.45), roughness: 0.6, metalness: 0.02 }),
    )
    const tipMats = [0xd98a5f, 0x58cc02, 0x1cb0f6, 0xce82ff, 0xffc800].map(
      (c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(c), emissiveIntensity: 0.45 }),
    )

    const fx = flip ? -1 : 1
    const toV = (p: Vec3) => new THREE.Vector3(fx * (p.x - 0.5) * 2.2, (0.5 - p.y) * 2.2, -((p.z || 0) * 3))

    // Palm: flattened ellipsoid fitted to wrist + knuckles.
    const wrist = toV(pose[0])
    const mcps = [5, 9, 13, 17].map((i) => toV(pose[i]))
    const center = wrist.clone()
    for (const m of mcps) center.add(m)
    center.multiplyScalar(1 / 5)
    const span = Math.max(mcps[3].x - mcps[0].x, 0.2)
    const plen = Math.max(center.y - wrist.y, 0.2)
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), skinMat)
    palm.position.copy(center)
    palm.scale.set(Math.abs(span) * 0.72 + 0.06, plen * 0.7 + 0.04, 0.13)
    hand.add(palm)

    // Fingers: smooth tapered look from two nested tubes.
    // Thumb = chain 0, then index, middle, ring, pinky get their own hues.
    const chainMat = [fingerMats[0], fingerMats[1], fingerMats[2], fingerMats[3], fingerMats[4]]
    for (let f = 0; f < CHAINS.length; f++) {
      const pts = CHAINS[f].map((i) => toV(pose[i]))
      const curve = new THREE.CatmullRomCurve3(pts)
      const outer = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, TUBE_R[f], 12, false), chainMat[f])
      hand.add(outer)
      const tipCap = new THREE.Mesh(new THREE.SphereGeometry(TUBE_R[f] * 0.98, 14, 12), chainMat[f])
      tipCap.position.copy(pts[pts.length - 1])
      hand.add(tipCap)
    }
    // Glowing fingertips so learners see exactly where tips land.
    const tipIdx = [4, 8, 12, 16, 20]
    const tipGeo = new THREE.SphereGeometry(0.032, 14, 12)
    for (let k = 0; k < tipIdx.length; k++) {
      const m = new THREE.Mesh(tipGeo, tipMats[k])
      m.position.copy(toV(pose[tipIdx[k]]))
      hand.add(m)
    }

    // Motion trail for dynamic words.
    if (path && path.length >= 2) {
      const g = new THREE.BufferGeometry().setFromPoints(path.map(toV))
      hand.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(color) })))
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
    let alive = true
    const start = performance.now()
    const tmp = new THREE.Vector3()
    const loop = () => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      if (!dragging && Date.now() - lastMove > 5000) rotY += 0.002
      root.rotation.set(rotX, rotY, 0)
      // Gesture playback: whole hand rides along the motion path loop.
      if (animate && path && path.length >= 2) {
        const t = ((performance.now() - start) / 2600) % 2
        const tri = t < 1 ? t : 2 - t
        const fi = tri * (path.length - 1)
        const i0 = Math.floor(fi)
        const i1 = Math.min(path.length - 1, i0 + 1)
        const fr = fi - i0
        tmp.set(
          fx * (path[i0].x + (path[i1].x - path[i0].x) * fr - path[0].x) * 2.2,
          -((path[i0].y + (path[i1].y - path[i0].y) * fr - path[0].y) * 2.2),
          0,
        )
        hand.position.copy(tmp)
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
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
    // Rebuild when the demonstrated sign changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, poseKey])

  return (
    <div>
      <div ref={mountRef} style={{ width: '100%', height, cursor: 'grab', touchAction: 'none' }} />
      <div style={{ fontSize: '11px', color: '#afbac0', fontWeight: 700, textAlign: 'center', marginTop: '4px' }}>
        3D hand • drag to rotate •{' '}
        {[
          ['Thumb', '#d98a5f'],
          ['Index', '#58cc02'],
          ['Middle', '#1cb0f6'],
          ['Ring', '#ce82ff'],
          ['Pinky', '#ffc800'],
        ].map(([n, c], i, a) => (
          <span key={n}>
            <span style={{ color: c }}>●</span> {n}
            {i < a.length - 1 ? '  ' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
