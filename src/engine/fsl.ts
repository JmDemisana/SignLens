import type { LessonItem } from './types'
import type { PoseTemplate } from './types'

// Filipino Sign Language starter pack.
// Manual alphabet A-Z and numbers 0-9 are shared with ASL (lang BOTH),
// so this pack adds high-frequency FSL everyday words as dynamic paths.
// Paths are v1 heuristics, tunable on device during testing.
export const FSL_TEMPLATES: PoseTemplate[] = [
  {
    id: 'KAMUSTA',
    kind: 'dynamic',
    lang: 'FSL',
    path: [
      { x: 0.5, y: 0.55, z: 0 },
      { x: 0.56, y: 0.48, z: 0 },
      { x: 0.6, y: 0.42, z: 0 },
    ],
    hint: 'Kamusta: open palm at chest, move outward in greeting',
  },
  {
    id: 'SALAMAT',
    kind: 'dynamic',
    lang: 'FSL',
    path: [
      { x: 0.5, y: 0.42, z: 0 },
      { x: 0.5, y: 0.52, z: 0 },
      { x: 0.52, y: 0.6, z: 0 },
    ],
    hint: 'Salamat: fingertips at chin, bow hand forward and down',
  },
  {
    id: 'OO',
    kind: 'dynamic',
    lang: 'FSL',
    path: [
      { x: 0.5, y: 0.56, z: 0 },
      { x: 0.5, y: 0.47, z: 0 },
      { x: 0.5, y: 0.56, z: 0 },
    ],
    hint: 'Oo: fist nods down twice, firm yes',
  },
  {
    id: 'HINDI',
    kind: 'dynamic',
    lang: 'FSL',
    path: [
      { x: 0.4, y: 0.5, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
      { x: 0.6, y: 0.5, z: 0 },
    ],
    hint: 'Hindi: flat hand waves side to side, gentle no',
  },
  {
    id: 'MABUHAY',
    kind: 'dynamic',
    lang: 'FSL',
    path: [
      { x: 0.5, y: 0.6, z: 0 },
      { x: 0.52, y: 0.45, z: 0 },
      { x: 0.55, y: 0.35, z: 0 },
    ],
    hint: 'Mabuhay: open palm rises high in welcome',
  },
  {
    id: 'KAIBIGAN',
    kind: 'dynamic',
    lang: 'FSL',
    path: [
      { x: 0.42, y: 0.5, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
      { x: 0.58, y: 0.5, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
    ],
    hint: 'Kaibigan: index fingers meet then part, friend',
  },
]

export const FSL_CURRICULUM: { unit: string; items: LessonItem[] }[] = [
  {
    unit: 'Unit 1: Alpabeto A-E + Kamusta',
    items: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }, { id: 'C', label: 'C' }, { id: 'D', label: 'D' }, { id: 'E', label: 'E' }, { id: 'KAMUSTA', label: 'Kamusta' }],
  },
  {
    unit: 'Unit 2: Alpabeto F-J + Salamat',
    items: [{ id: 'F', label: 'F' }, { id: 'G', label: 'G' }, { id: 'H', label: 'H' }, { id: 'I', label: 'I' }, { id: 'J', label: 'J' }, { id: 'SALAMAT', label: 'Salamat' }],
  },
  {
    unit: 'Unit 3: Oo / Hindi + Mga Numero 0-5',
    items: [{ id: 'OO', label: 'Oo' }, { id: 'HINDI', label: 'Hindi' }, { id: '0', label: '0' }, { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }, { id: '4', label: '4' }, { id: '5', label: '5' }],
  },
]

export const FSL_DEFINITIONS: Record<string, { title: string; sub: string; desc: string }> = {
  KAMUSTA: { title: 'Kamusta', sub: 'Pagbati • Greeting', desc: 'Open palm at chest, move outward in greeting. FSL everyday hello.' },
  SALAMAT: { title: 'Salamat', sub: 'Pasasalamat • Courtesy', desc: 'Fingertips at chin, bow hand forward and down. FSL thank you.' },
  OO: { title: 'Oo', sub: 'Pagsang-ayon • Yes', desc: 'Fist nods down twice. Firm yes in FSL.' },
  HINDI: { title: 'Hindi', sub: 'Pagtanggi • No', desc: 'Flat hand waves side to side. Gentle no in FSL.' },
  MABUHAY: { title: 'Mabuhay', sub: 'Pagbati • Welcome', desc: 'Open palm rises high in welcome. Filipino greeting of life.' },
  KAIBIGAN: { title: 'Kaibigan', sub: 'Friend', desc: 'Index fingers meet then part. Friend in FSL.' },
}
