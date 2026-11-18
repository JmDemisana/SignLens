import type { SignLang } from './types'

// Supports optional personal reference calibration on any static letter or digit in FSL.
// All signs already work out of the box using bundled reference templates.
export const pilotLetters = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
] as const

export function supportsPersonalComparison(id: string, lang: SignLang): boolean {
  void lang
  return (pilotLetters as readonly string[]).includes(id)
}
