// Personal calibration: the built-in templates are educated guesses.
// A learner-saved pose is only a personal comparison target; it is not
// independently validated as a correct sign. Stored locally.
const KEY = 'signlens_personal_v1'

function loadAll(): Record<string, number[]> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, number[]> : {}
  } catch {
    return {}
  }
}

export function getPersonalAngles(id: string): number[] | null {
  const value: unknown = loadAll()[id]
  return Array.isArray(value) && value.length === 11 && value.every((angle) => typeof angle === 'number' && Number.isFinite(angle)) ? value : null
}

export function savePersonalAngles(id: string, angles: number[]): void {
  if (angles.length !== 11 || angles.some((angle) => !Number.isFinite(angle))) return
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
