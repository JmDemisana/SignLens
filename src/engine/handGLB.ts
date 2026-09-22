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
    glbPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        '/models/hand-rigged.glb',
        (gltf) => resolve(gltf.scene),
        undefined,
        (e) => reject(e),
      )
    })
  }
  return glbPromise
}

const toV = (p: Vec3) => new THREE.Vector3((p.x - 0.5) * 2.2, (0.5 - p.y) * 2.2, -((p.z || 0) * 3))

function frameModel(model: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const s = 1.6 / Math.max(size.x, size.y, 0.001)
  model.scale.setScalar(s)
  model.position.sub(center.clone().multiplyScalar(s))
  model.position.y += 0.1
}

let snapRenderer: THREE.WebGLRenderer | null = null
let snapScene: THREE.Scene | null = null
let snapCamera: THREE.PerspectiveCamera | null = null

// Render one pose offscreen and return a PNG data URL. No visible canvas,
// no animation loop, no per-demo engine.
export async function snapshotHand(pose: HandLandmarks, flip: boolean, width = 300, height = 220): Promise<string> {
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
    snapCamera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    snapCamera.position.set(0, 0.05, 2.6)
    snapCamera.lookAt(0, 0, 0)
  }
  snapRenderer.setSize(width, height, false)
  snapCamera!.aspect = width / height
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
