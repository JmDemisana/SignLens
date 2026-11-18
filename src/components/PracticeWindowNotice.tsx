import { useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { Maximize2 } from 'lucide-react'

export default function PracticeWindowNotice() {
  const [manual, setManual] = useState(false)
  const maximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().maximize()
    } catch { setManual(true) }
  }

  return <aside className="sl-window-notice" role="status">
    <Maximize2 size={19} aria-hidden="true" />
    <span>SignLens needs more space to show the camera and reference together. Resize the window, or maximize it for the best view.</span>
    {isTauri() && (manual
      ? <span>Use the maximize button in the title bar.</span>
      : <button className="sl-button sl-secondary" onClick={maximize}>Maximize window</button>)}
  </aside>
}
