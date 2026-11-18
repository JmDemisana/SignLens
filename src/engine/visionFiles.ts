import { FilesetResolver } from '@mediapipe/tasks-vision'
import simdLoader from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import simdBinary from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'
import basicLoader from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.js?url'
import basicBinary from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.wasm?url'

export async function visionFiles() {
  return await FilesetResolver.isSimdSupported()
    ? { wasmLoaderPath: simdLoader, wasmBinaryPath: simdBinary }
    : { wasmLoaderPath: basicLoader, wasmBinaryPath: basicBinary }
}
