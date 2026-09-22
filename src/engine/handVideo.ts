import * as THREE from 'three'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { HandLandmarks, Vec3 } from './types'
import { indexRig, poseRig } from './retarget'
import { loadHandGLB, frameModel, toV } from './handGLB'

// Bakes looping demo videos once, replays them forever. One short WebGL
// session per sign, then pure <video> playback. Cached in IndexedDB.
const DB = 'signlens-clips'
const STORE = 'clips'
const CACHE_V = 'v1'

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getCached(key: string): Promise<Blob | null> {
  try {
    const d = await db()
    return await new Promise((resolve) => {
      const tx = d.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(CACHE_V + '|' + key)
      req.onsuccess = () => resolve((req.result as Blob) ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function putCached(key: string, blob: Blob): Promise<void> {
  try {
    const d = await db()
    await new Promise((resolve) => {
      const tx = d.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, CACHE_V + '|' + key)
      tx.oncomplete = () => resolve(null)
    })
  } catch { /* ignore */ }
}

function pickMime(): string {
  const cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  for (const c of cands) {
    try {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c
    } catch { /* ignore */ }
  }
  return ''
}

export async function getDemoClip(key: string, pose: HandLandmarks, path: Vec3[] | undefined, flip: boolean): Promise<Blob | null> {
  const hit = await getCached(key)
  if (hit) return hit
  const blob = await bakeClip(pose, path, flip)
  if (blob) await putCached(key, blob)
  return blob
}

async function bakeClip(pose: HandLandmarks, path: Vec3[] | undefined, flip: boolean): Promise<Blob | null> {
  try {
    const W = 320
    const H = 240
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100)
    camera.position.set(0, 0.05, 2.6)
    camera.lookAt(0, 0, 0)
    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x1a2530, 1.1))
    const kl = new THREE.DirectionalLight(0xffffff, 1.5)
    kl.position.set(1.5, 2, 2.5)
    scene.add(kl)
    const fl = new THREE.DirectionalLight(0xffe2c4, 0.5)
    fl.position.set(-1, -0.5, 2)
    scene.add(fl)

    const src = await loadHandGLB()
    const model = skeletonClone(src)
    frameModel(model)
    const holder = new THREE.Group()
    holder.add(model)
    scene.add(holder)
    const rig = indexRig(model)
    poseRig(rig, pose, flip)

    const hasPath = !!path && path.length >= 2
    const secs = hasPath ? 4 : 3
    const mime = pickMime()
    const stream = canvas.captureStream(30)
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 800_000 } : undefined)
    const chunks: BlobPart[] = []
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    const done = new Promise<Blob | null>((resolve) => {
      rec.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: mime || 'video/webm' }) : null)
      rec.onerror = () => resolve(null)
    })
    rec.start(250)
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const frame = () => {
        const t = (performance.now() - t0) / 1000
        if (t >= secs) {
          resolve()
          return
        }
        const k = t / secs
        if (hasPath) {
          // Gesture ping-pong.
          const tri = (k * 2) % 2
          const ph = tri < 1 ? tri : 2 - tri
          const fi = ph * (path!.length - 1)
          const i0 = Math.floor(fi)
          const i1 = Math.min(path!.length - 1, i0 + 1)
          const fr = fi - i0
          holder.position.set(
            (path![i0].x + (path![i1].x - path![i0].x) * fr - path![0].x) * 2.2,
            -((path![i0].y + (path![i1].y - path![i0].y) * fr - path![0].y) * 2.2),
            0,
          )
          holder.rotation.set(0.12, 0, 0)
        } else {
          // Slow turntable so every angle reads.
          holder.rotation.set(0.12, k * Math.PI * 2, 0)
        }
        renderer.render(scene, camera)
        requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    rec.stop()
    const blob = await done
    renderer.dispose()
    return blob
  } catch (e) {
    console.warn('bake failed', e)
    return null
  }
}

export { toV }
