import * as THREE from 'three'
import type { HandLandmarks } from './types'

// Retargets MediaPipe-style 21 landmarks onto the bundled rigged hand
// ("Rigged Hand" by J-Toastie, CC-BY). Rotations only, so the artist's
// proportions survive and every letter bends real geometry.
const CHAINS: { bones: string[]; joints: number[][] }[] = [
  { bones: ['ThumbRoot', 'ThumbMiddle', 'ThumbTop'], joints: [[1, 2], [2, 3], [3, 4]] },
  { bones: ['IndexRoot', 'IndexF_lower', 'IndexF_middle', 'IndexF_tip'], joints: [[0, 5], [5, 6], [6, 7], [7, 8]] },
  { bones: ['MiddleRoot', 'MiddleF_lower', 'MiddleF_middle', 'MiddleF_tip'], joints: [[0, 9], [9, 10], [10, 11], [11, 12]] },
  { bones: ['RingRoot', 'RingF_lower', 'RingF_middle', 'RingF_tip'], joints: [[0, 13], [13, 14], [14, 15], [15, 16]] },
  { bones: ['PinkyRoot', 'PinkyF_lower', 'PinkyF_middle', 'PinkyF_tip'], joints: [[0, 17], [17, 18], [18, 19], [19, 20]] },
]

export interface Rig {
  bones: Map<string, THREE.Object3D>
  restDir: Map<string, THREE.Vector3>
  restQuat: Map<string, THREE.Quaternion>
}

export function indexRig(root: THREE.Object3D): Rig {
  root.updateMatrixWorld(true)
  const bones = new Map<string, THREE.Object3D>()
  root.traverse((o) => {
    if (o.name) bones.set(o.name, o)
  })
  const restDir = new Map<string, THREE.Vector3>()
  const restQuat = new Map<string, THREE.Quaternion>()
  const tmp = new THREE.Vector3()
  for (const chain of CHAINS) {
    for (const b of chain.bones) {
      const bone = bones.get(b)
      if (!bone) continue
      restQuat.set(b, bone.getWorldQuaternion(new THREE.Quaternion()))
      // Rest direction toward its child joint (next bone's origin).
      const idx = chain.bones.indexOf(b)
      const nextName = chain.bones[idx + 1]
      const next = bones.get(nextName ?? `${b}_end`)
      if (next) {
        next.getWorldPosition(tmp)
        const here = bone.getWorldPosition(new THREE.Vector3())
        restDir.set(b, tmp.sub(here).normalize())
      } else {
        // Tip bone: reuse its own axis from parent to tip.
        bone.getWorldPosition(tmp)
        const parent = bone.parent
        if (parent) {
          const phere = parent.getWorldPosition(new THREE.Vector3())
          restDir.set(b, tmp.sub(phere).normalize())
        } else {
          restDir.set(b, new THREE.Vector3(0, 1, 0))
        }
      }
    }
  }
  const palm = bones.get('HandMain')
  if (palm) restQuat.set(palm.name, palm.getWorldQuaternion(new THREE.Quaternion()))
  return { bones, restDir, restQuat }
}

const toModel = (x: number, y: number, z: number) =>
  new THREE.Vector3((x - 0.5) * 2.2, (0.5 - y) * 2.2, -(z || 0) * 3)

export function poseRig(rig: Rig, lm: HandLandmarks, flip: boolean): void {
  if (lm.length < 21) return
  const P = (i: number) => toModel(flip ? 1 - lm[i].x : lm[i].x, lm[i].y, lm[i].z || 0)
  const align = new THREE.Quaternion()
  const newWorld = new THREE.Quaternion()
  const invParent = new THREE.Quaternion()
  const target = new THREE.Vector3()
  const palm = rig.bones.get('HandMain')
  const palmRest = rig.restQuat.get('HandMain')
  const axis = P(9).sub(P(0))
  const roll = Math.atan2(-axis.x, axis.y) - Math.atan2(0.071, 0.562)
  const palmTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll)
  const unturn = palmTurn.clone().invert()
  if (palm?.parent && palmRest) {
    palm.parent.getWorldQuaternion(invParent).invert()
    palm.quaternion.copy(invParent).multiply(palmTurn).multiply(palmRest)
    palm.updateWorldMatrix(true, true)
  }
  // Depth order: roots, then deeper joints, so parents settle first.
  const maxDepth = Math.max(...CHAINS.map((c) => c.bones.length))
  for (let d = 0; d < maxDepth; d++) {
    for (const chain of CHAINS) {
      const name = chain.bones[d]
      if (!name) continue
      const bone = rig.bones.get(name)
      const rest = rig.restDir.get(name)
      const restQ = rig.restQuat.get(name)
      if (!bone || !rest || !restQ) continue
      const [a, b] = chain.joints[d]
      target.copy(P(b)).sub(P(a))
      if (target.lengthSq() < 1e-10) continue
      target.normalize().applyQuaternion(unturn)
      align.setFromUnitVectors(rest, target)
      newWorld.copy(palmTurn).multiply(align).multiply(restQ)
      bone.parent?.getWorldQuaternion(invParent).invert()
      bone.quaternion.copy(invParent).multiply(newWorld)
      bone.updateWorldMatrix(true, false)
    }
  }
}
