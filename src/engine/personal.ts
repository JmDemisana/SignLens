// Personal calibration: the built-in templates are educated guesses.
// Capturing the learner's own steady hand as the reference removes the
// biggest error source, differences between hands. Stored locally.
const KEY = 'signlens_personal_v1'

function loadAll(): Record<string, number[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, number[]>
  } catch {
    return {}
  }
}

export function getPersonalAngles(id: string): number[] | null {
  return loadAll()[id] ?? null
}

export function savePersonalAngles(id: string, angles: number[]): void {
  try {
    const all = loadAll()
    all[id] = angles.map((a) => Math.round(a * 10) / 10)
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* private mode */ }
}

export function clearPersonalAngles(id: string): void {
  try {
    const all = loadAll()
    delete all[id]
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

export function isCalibrated(id: string): boolean {
  return getPersonalAngles(id) !== null
}
