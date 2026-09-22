import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { HandLandmarks, Vec3 } from '../engine/types'

const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
]

// Segment thickness per bone (proximal to distal taper, pinky slimmer).
const RADII = [
  0.075, 0.06, 0.055, 0.05,
  0.075, 0.058, 0.05, 0.042,
  0.075, 0.06, 0.052, 0.044,
  0.075, 0.057, 0.049, 0.041,
  0.075, 0.052, 0.045, 0.038,
]

// Procedural mannequin hand. No external models, works fully offline.
// Drag to rotate. Dynamic words animate along their motion path.
export default function Hand3D({
  pose,
  path,
  animate = false,
  flip = false,
  color = '#58cc02',
  skin = '#e8b98a',
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
  const poseRef = useRef(pose)
  poseRef.current = pose
  const pathRef = useRef(path)
  pathRef.current = path
  const animRef = useRef(animate)
  animRef.current = animate
  const flipRef = useRef(flip)
  flipRef.current = flip

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
    camera.position.set(0, 0.1, 2.9)
    camera.lookAt(0, -0.1, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 1.0))
    const key = new THREE.DirectionalLight(0xffffff, 1.8)
    key.position.set(1.5, 2, 2.5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x1cb0f6, 0.9)
    rim.position.set(-2, -1, -1.5)
    scene.add(rim)

    const root = new THREE.Group()
    scene.add(root)
    const hand = new THREE.Group()
    root.add(hand)

    const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skin), roughness: 0.55, metalness: 0.05 })
    const accentMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(color), emissiveIntensity: 0.25 })

    const toV = (p: Vec3, fx: number) => new THREE.Vector3(fx * (p.x - 0.5) * 2.2, (0.5 - p.y) * 2.2, -((p.z || 0) * 3))

    // Palm: flattened ellipsoid fitted each frame to wrist + knuckles.
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), skinMat)
    hand.add(palm)

    // Finger segments: tapered capsules along each bone.
    const segs: THREE.Mesh[] = BONES.map((_, i) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(RADII[i], 1, 6, 12), skinMat)
      hand.add(m)
      return m
    })
    // Knuckle filler spheres for smooth joints.
    const knuckleGeo = new THREE.SphereGeometry(1, 14, 12)
    const knuckles: THREE.Mesh[] = poseRef.current.map(() => {
      const m = new THREE.Mesh(knuckleGeo, skinMat)
      hand.add(m)
      return m
    })
    // Glowing fingertips so learners see exactly where tips land.
    const tipGeo = new THREE.SphereGeometry(0.035, 14, 12)
    const tips: THREE.Mesh[] = [4, 8, 12, 16, 20].map(() => {
      const m = new THREE.Mesh(tipGeo, accentMat)
      hand.add(m)
      return m
    })
    const tipIdx = [4, 8, 12, 16, 20]

    // Motion trail for dynamic words.
    let trail: THREE.Line | null = null
    const rebuildTrail = () => {
      if (trail) {
        hand.remove(trail)
        trail.geometry.dispose()
        trail = null
      }
      const pts = pathRef.current
      if (pts && pts.length >= 2) {
        const fx = flipRef.current ? -1 : 1
        const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => toV(p, fx)))
        trail = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x1cb0f6 }))
        hand.add(trail)
      }
    }
    rebuildTrail()

    let rotX = 0.35
    let rotY = -0.5
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

    const yAxis = new THREE.Vector3(0, 1, 0)
    const tmpA = new THREE.Vector3()
    const tmpB = new THREE.Vector3()
    const tmpD = new THREE.Vector3()
    const tmpC = new THREE.Vector3()
    let raf = 0
    let alive = true
    const start = performance.now()
    const loop = () => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      if (!dragging && Date.now() - lastMove > 2500) rotY += 0.004
      root.rotation.set(rotX, rotY, 0)
      const lm = poseRef.current
      const fx = flipRef.current ? -1 : 1
      if (lm.length < 21) {
        renderer.render(scene, camera)
        return
      }
      const P = (i: number) => toV(lm[i], fx)

      // Gesture playback: whole hand rides along the motion path loop.
      const pts = pathRef.current
      if (animRef.current && pts && pts.length >= 2) {
        const t = ((performance.now() - start) / 2600) % 2
        const tri = t < 1 ? t : 2 - t
        const fi = tri * (pts.length - 1)
        const i0 = Math.floor(fi)
        const i1 = Math.min(pts.length - 1, i0 + 1)
        const fr = fi - i0
        tmpC.set(
          fx * (pts[i0].x + (pts[i1].x - pts[i0].x) * fr - pts[0].x) * 2.2,
          -((pts[i0].y + (pts[i1].y - pts[i0].y) * fr - pts[0].y) * 2.2),
          0,
        )
        hand.position.copy(tmpC)
      } else {
        hand.position.set(0, 0, 0)
      }

      // Fit palm ellipsoid to wrist + four knuckles.
      const wrist = P(0)
      const mcp = [P(5), P(9), P(13), P(17)]
      tmpC.copy(wrist)
      for (const m of mcp) tmpC.add(m)
      tmpC.multiplyScalar(1 / 5)
      palm.position.copy(tmpC)
      const span = Math.max(mcp[3].x - mcp[0].x, 0.2)
      const len = Math.max(tmpC.y - wrist.y, 0.2)
      palm.scale.set(span * 0.75, len * 0.72, 0.16)

      // Segments along bones.
      for (let i = 0; i < BONES.length; i++) {
        const [a, b] = BONES[i]
        tmpA.copy(P(a))
        tmpB.copy(P(b))
        tmpD.subVectors(tmpB, tmpA)
        const len2 = Math.max(tmpD.length(), 1e-4)
        const m = segs[i]
        m.position.copy(tmpA).addScaledVector(tmpD, 0.5)
        m.scale.set(RADII[i] / 0.06, len2, RADII[i] / 0.06)
        m.quaternion.setFromUnitVectors(yAxis, tmpD.normalize())
      }
      // Knuckles.
      const rByJoint = [0.085, 0.06, 0.055, 0.05, 0.045]
      for (let i = 0; i < knuckles.length && i < lm.length; i++) {
        knuckles[i].position.copy(P(i))
        const r = i === 0 ? 0.085 : rByJoint[i % 4 === 0 ? 4 : (i % 4)]
        knuckles[i].scale.setScalar(r / 1)
      }
      // Fingertips glow.
      for (let k = 0; k < tips.length; k++) {
        tips[k].position.copy(P(tipIdx[k]))
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
  }, [height])

  return (
    <div>
      <div ref={mountRef} style={{ width: '100%', height, cursor: 'grab', touchAction: 'none' }} />
      <div style={{ fontSize: '11px', color: '#afbac0', fontWeight: 700, textAlign: 'center', marginTop: '4px' }}>
        3D hand • drag to rotate
      </div>
    </div>
  )
}
