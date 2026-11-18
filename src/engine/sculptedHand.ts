import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

type Finger = 'index' | 'middle' | 'ring' | 'pinky'
type Pose = { index: number[]; middle: number[]; ring: number[]; pinky: number[]; thumb: number[]; spread: Record<string, number>; rotate: Record<string, number>; wrist: { turn: number; tilt: number; twist: number } }
const poses = import.meta.glob<Pose>('./eidos-poses/*.json', { eager: true, import: 'default' })
export const hasSculptedPose = (sign: string) => Boolean(poses[`./eidos-poses/${sign}.json`])
let source: Promise<THREE.Group> | undefined

// Adapted from Eidos (MIT), using the WebXR Input Profiles hand (Amazon, MIT).
// The WebXR joints are flat on import; attach them into finger chains before posing.
export async function makeSculptedHand(sign: string, material: THREE.Material): Promise<THREE.Group> {
  const pose = poses[`./eidos-poses/${sign}.json`]
  if (!pose) throw new Error('No sculpted pose for this sign')
  source ??= new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/webxr-hand-right.glb`).then((gltf) => gltf.scene).catch((error) => { source = undefined; throw error })
  const root = clone(await source)
  root.updateMatrixWorld(true)
  const bones = new Map<string, THREE.Bone>()
  root.traverse((object) => {
    if (object instanceof THREE.Bone) bones.set(object.name, object)
    if (object instanceof THREE.SkinnedMesh) { object.material = material; object.frustumCulled = false }
  })
  const get = (name: string) => { const bone = bones.get(name); if (!bone) throw new Error(`Missing hand joint ${name}`); return bone }
  const wrist = get('wrist')
  const chains = new Map<string, { bone: THREE.Bone; rest: THREE.Quaternion }[]>()
  for (const finger of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
    const parts = finger === 'thumb' ? ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'] : ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip']
    let parent = wrist
    chains.set(finger, parts.map((part) => {
      const bone = get(`${finger === 'thumb' ? 'thumb' : `${finger}-finger`}-${part}`)
      parent.attach(bone)
      parent = bone
      return { bone, rest: bone.quaternion.clone() }
    }))
  }
  root.updateMatrixWorld(true)
  const wristPosition = wrist.getWorldPosition(new THREE.Vector3())
  const knuckle = get('middle-finger-phalanx-proximal').getWorldPosition(new THREE.Vector3())
  const tip = get('middle-finger-tip').getWorldPosition(new THREE.Vector3())
  const up = knuckle.sub(wristPosition).normalize()
  const dorsal = new THREE.Vector3(0, 1, 0).applyQuaternion(wrist.getWorldQuaternion(new THREE.Quaternion()))
  dorsal.addScaledVector(up, -dorsal.dot(up)).normalize()
  const side = new THREE.Vector3().crossVectors(up, dorsal)
  const align = new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1)).multiply(new THREE.Matrix4().makeBasis(side, up, dorsal).transpose())
  root.quaternion.setFromRotationMatrix(align)
  const scale = 3.4 / tip.distanceTo(wristPosition)
  root.scale.setScalar(scale)
  root.position.set(0, -0.72, 0).sub(wristPosition.clone().applyMatrix4(align).multiplyScalar(scale))
  const x = new THREE.Vector3(1, 0, 0), y = new THREE.Vector3(0, 1, 0), z = new THREE.Vector3(0, 0, 1)
  const joint = (item: { bone: THREE.Bone; rest: THREE.Quaternion }, curl: number, spread = 0, roll = 0) => item.bone.quaternion.copy(item.rest).multiply(new THREE.Quaternion().setFromAxisAngle(y, spread)).multiply(new THREE.Quaternion().setFromAxisAngle(x, -curl)).multiply(new THREE.Quaternion().setFromAxisAngle(z, roll))
  const restSpread: Record<Finger, number> = { index: -0.1, middle: -0.03, ring: 0.04, pinky: 0.12 }
  for (const finger of ['index', 'middle', 'ring', 'pinky'] as Finger[]) {
    const chain = chains.get(finger)!
    joint(chain[1], pose[finger][0], -(pose.spread[finger] - restSpread[finger]), -(pose.rotate?.[finger] ?? 0))
    joint(chain[2], pose[finger][1]); joint(chain[3], pose[finger][2])
  }
  const thumb = chains.get('thumb')!, [bend, tipBend] = pose.thumb
  joint(thumb[0], bend * 0.35, -bend * 0.35 - (pose.spread.thumb ?? 0), -(pose.rotate?.thumb ?? 0))
  joint(thumb[1], bend * 0.6); joint(thumb[2], tipBend)
  const pivot = new THREE.Group()
  pivot.position.y = 0.9
  pivot.rotation.order = 'ZXY'
  pivot.rotation.set(pose.wrist?.tilt ?? 0, pose.wrist?.twist ?? 0, pose.wrist?.turn ?? 0)
  root.position.y -= 0.9
  pivot.add(root)
  return pivot
}
