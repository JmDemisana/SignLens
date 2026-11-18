import type { SignLang } from './types'
import fsl105 from './fsl105.json'

// Exact 1-to-1 mapping between FSL-105 dataset labels (Tupal & Cabatuan, 2023) and our FSL curriculum IDs
const fslAliases: Record<string, string> = {
  'HOW ARE YOU': 'KAMUSTA',
  'GOOD MORNING': 'MAGANDANG UMAGA',
  HELLO: 'HELLO',
  'THANK YOU': 'SALAMAT',
  YES: 'OO',
  NO: 'HINDI',
  CORRECT: 'TAMA',
  WRONG: 'MALI',
  UNDERSTAND: 'NAIINTINDIHAN',
  SLOW: 'MABAGAL',
  MOTHER: 'NANAY',
  FATHER: 'TATAY',
  PARENTS: 'MAGULANG',
  DEAF: 'BINGI',
  RICE: 'KANIN',
  BREAD: 'TINAPAY',
  COFFEE: 'KAPE',
  MILK: 'GATAS',
  ONE: '1',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  TEN: '10',
}

export const aslVideoOnlySigns: string[] = []
export const fslVideoEntries = fsl105.map((item) => ({ ...item, sign: fslAliases[item.label] ?? item.label }))

export function fslVideoInfo(sign: string) {
  return fslVideoEntries.find((item) => item.sign === sign || item.label === sign)
}

export function signVideoFor(sign: string, lang: SignLang): string | null {
  void lang
  const item = fslVideoInfo(sign)
  return item ? `${import.meta.env.BASE_URL}sign-videos/fsl105/${item.id}.mov` : null
}

export function signImageFor(sign: string): string | null {
  return /^[A-Z]$/.test(sign) ? `${import.meta.env.BASE_URL}sign-images/alphabet/${sign}.svg` : null
}
