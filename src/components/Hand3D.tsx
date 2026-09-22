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

// Offline 3D skeletal hand. Drag to rotate. Depth comes from MediaPipe z
// or the procedural reference pose. No cloud, no external assets.
export default function Hand3D({
  pose,
  path,
  color = '#58cc02',
  height = 260,
}: {
  pose: HandLandmarks
  path?: Vec3[]
  color?: string
  height?: number
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const poseRef = useRef(pose)
  poseRef.current = pose
  const pathRef = useRef(path)
  pathRef.current = path
  const colorRef = useRef(color)
  colorRef.current = color

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
    camera.position.set(0, 0.1, 2.6)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(1.5, 2, 2)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x1cb0f6, 0.8)
    rim.position.set(-2, -1, -1.5)
    scene.add(rim)

    const root = new THREE.Group()
    scene.add(root)

    const toV = (p: Vec3) => new THREE.Vector3((p.x - 0.5) * 2.2, (0.5 - p.y) * 2.2, -((p.z || 0) * 3))
    const mat = () => new THREE.MeshStandardMaterial({ color: new THREE.Color(colorRef.current), roughness: 0.35, metalness: 0.15 })
    const jointGeo = new THREE.SphereGeometry(0.045, 16, 16)
    const joints: THREE.Mesh[] = poseRef.current.map(() => {
      const m = new THREE.Mesh(jointGeo, mat())
      root.add(m)
      return m
    })
    const boneGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 10)
    const bones: THREE.Mesh[] = BONES.map(() => {
      const m = new THREE.Mesh(boneGeo, mat())
      root.add(m)
      return m
    })
    // Motion trail for dynamic words (HELLO, SALAMAT, ...).
    let trail: THREE.Line | null = null
    const rebuildTrail = () => {
      if (trail) {
        root.remove(trail)
        trail.geometry.dispose()
        trail = null
      }
      const pts = pathRef.current
      if (pts && pts.length >= 2) {
        const g = new THREE.BufferGeometry().setFromPoints(pts.map(toV))
        trail = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x1cb0f6 }))
        root.add(trail)
      }
    }
    rebuildTrail()

    // Drag to orbit, scroll to zoom. Auto slow-spin when idle.
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
    const up = () => {
      dragging = false
    }
    mount.addEventListener('pointerdown', down)
    mount.addEventListener('pointermove', move)
    mount.addEventListener('pointerup', up)
    mount.addEventListener('pointercancel', up)

    const upAxis = new THREE.Vector3(0, 1, 0)
    const tmpA = new THREE.Vector3()
    const tmpB = new THREE.Vector3()
    const tmpD = new THREE.Vector3()
    let raf = 0
    let alive = true
    const loop = () => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      if (!dragging && Date.now() - lastMove > 2500) rotY += 0.004
      root.rotation.set(rotX, rotY, 0)
      const lm = poseRef.current
      const col = new THREE.Color(colorRef.current)
      for (let i = 0; i < joints.length && i < lm.length; i++) {
        joints[i].position.copy(toV(lm[i]))
        ;(joints[i].material as THREE.MeshStandardMaterial).color.copy(col)
      }
      for (let i = 0; i < BONES.length; i++) {
        const [a, b] = BONES[i]
        if (!lm[a] || !lm[b]) continue
        tmpA.copy(toV(lm[a]))
        tmpB.copy(toV(lm[b]))
        tmpD.subVectors(tmpB, tmpA)
        const len = Math.max(tmpD.length(), 1e-4)
        const m = bones[i]
        m.position.copy(tmpA).addScaledVector(tmpD, 0.5)
        m.scale.set(1, len, 1)
        m.quaternion.setFromUnitVectors(upAxis, tmpD.normalize())
        ;(m.material as THREE.MeshStandardMaterial).color.copy(col)
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
      mount.removeEventListener('pointerup', up)
      mount.removeEventListener('pointercancel', up)
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry && mesh.geometry !== jointGeo && mesh.geometry !== boneGeo) mesh.geometry.dispose()
      })
      jointGeo.dispose()
      boneGeo.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [height])

  return (
    <div>
      <div ref={mountRef} style={{ width: '100%', height, cursor: 'grab', touchAction: 'none' }} />
      <div style={{ fontSize: '11px', color: '#afbac0', fontWeight: 700, textAlign: 'center', marginTop: '4px' }}>
        3D demo • drag to rotate
      </div>
    </div>
  )
}
