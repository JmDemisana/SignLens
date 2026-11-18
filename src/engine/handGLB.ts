import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { HandLandmarks, Vec3 } from './types'
import { indexRig, poseRig } from './retarget'

// One shared loader + one hidden snapshot renderer for the whole app.
// Live WebGL scenes only spin up when the learner grabs a demo.
let glbPromise: Promise<THREE.Group> | null = null

function loadHandGLB(): Promise<THREE.Group> {
  if (!glbPromise) {
    glbPromise = new Promise<THREE.Group>((resolve, reject) => {
      new GLTFLoader().load(
        `${import.meta.env.BASE_URL}models/hand-rigged.glb`,
        (gltf) => resolve(gltf.scene),
        undefined,
        (e) => reject(e),
      )
    }).catch((error) => {
      glbPromise = null
      throw error
    })
  }
  return glbPromise
}

const toV = (p: Vec3) => new THREE.Vector3((p.x - 0.5) * 2.2, (0.5 - p.y) * 2.2, -((p.z || 0) * 3))

function frameModel(model: THREE.Object3D): void {
  model.updateMatrixWorld(true)
  const position = (name: string) => model.getObjectByName(name)?.getWorldPosition(new THREE.Vector3())
  const wrist = position('HandMain')
  const middle = position('MiddleF_lower')
  const index = position('IndexF_lower')
  const pinky = position('PinkyF_lower')
  if (wrist && middle && index && pinky) {
    const up = middle.sub(wrist).normalize()
    const right = pinky.sub(index)
    right.addScaledVector(up, -right.dot(up)).normalize()
    const front = right.clone().cross(up)
    model.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, front)).invert())
    model.updateMatrixWorld(true)
  }
  const box = new THREE.Box3().setFromObject(model, true)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const s = 1.65 / Math.max(size.x, size.y, size.z, 0.001)
  model.scale.setScalar(s)
  model.position.sub(center.clone().multiplyScalar(s))
  model.position.y -= 0.05
}

let snapRenderer: THREE.WebGLRenderer | null = null
let snapScene: THREE.Scene | null = null
let snapCamera: THREE.PerspectiveCamera | null = null

// Render one pose offscreen and return a PNG data URL. No visible canvas,
// no animation loop, no per-demo engine.
export async function snapshotHand(pose: HandLandmarks, flip: boolean, width = 300, height = 220): Promise<string> {
  const W = Math.max(width || 0, 300)
  const H = Math.max(height || 0, 220)
  const src = await loadHandGLB()
  const model = skeletonClone(src)
  frameModel(model)
  const rig = indexRig(model)
  poseRig(rig, pose, flip)

  if (!snapRenderer) {
    snapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    snapScene = new THREE.Scene()
    snapScene.add(new THREE.HemisphereLight(0xfff4e6, 0x1a2530, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 1.5)
    key.position.set(1.5, 2, 2.5)
    snapScene.add(key)
    const fill = new THREE.DirectionalLight(0xffe2c4, 0.5)
    fill.position.set(-1, -0.5, 2)
    snapScene.add(fill)
    snapCamera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100)
    snapCamera.position.set(0, 0, 2.9)
    snapCamera.lookAt(0, 0, 0)
  }
  snapRenderer.setSize(W, H, false)
  snapCamera!.aspect = W / H
  snapCamera!.updateProjectionMatrix()

  const holder = new THREE.Group()
  holder.add(model)
  // Front readable angle, matching the live view default.
  holder.rotation.set(0.12, 0, 0)
  snapScene!.add(holder)
  snapRenderer.render(snapScene!, snapCamera!)
  const url = snapRenderer.domElement.toDataURL('image/png')
  snapScene!.remove(holder)
  return url
}

export { loadHandGLB, frameModel, toV }
