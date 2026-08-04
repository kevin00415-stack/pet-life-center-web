export interface VisualComparisonRecord {
  id: string
  petId: string
  createdAt: number
  category: 'gait' | 'spirit' | 'skin' | 'wound' | 'body' | 'eating' | 'seizure' | 'breathing' | 'other' | string
  leftAttachmentId: string
  rightAttachmentId: string
  note: string
  relatedEntityIds?: string[]
  mediaType?: 'photo' | 'video'
}

export const VISUAL_COMPARISON_CATEGORIES = [
  { key: 'gait', label: '步態', icon: '🐕' },
  { key: 'spirit', label: '精神狀態', icon: '✨' },
  { key: 'skin', label: '皮膚', icon: '🧼' },
  { key: 'wound', label: '傷口', icon: '🩹' },
  { key: 'body', label: '體態', icon: '📏' },
  { key: 'eating', label: '進食動作', icon: '🥣' },
  { key: 'seizure', label: '抽搐／發作', icon: '🧠' },
  { key: 'breathing', label: '呼吸狀態', icon: '🫁' },
  { key: 'other', label: '其他', icon: '⚠️' },
] as const

export function getVisualComparisons(petId: string): VisualComparisonRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  const key = `maohai-visual-comparisons-${petId}`
  const data = localStorage.getItem(key)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch (e) {
    console.error('Failed to parse visual comparisons', e)
    return []
  }
}

export function saveVisualComparison(petId: string, record: VisualComparisonRecord): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  const key = `maohai-visual-comparisons-${petId}`
  const existing = getVisualComparisons(petId)
  // Check if already exists to prevent duplication
  const filtered = existing.filter((item) => item.id !== record.id)
  const updated = [record, ...filtered]
  localStorage.setItem(key, JSON.stringify(updated))
}

export function deleteVisualComparison(petId: string, id: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  const key = `maohai-visual-comparisons-${petId}`
  const existing = getVisualComparisons(petId)
  const updated = existing.filter((item) => item.id !== id)
  localStorage.setItem(key, JSON.stringify(updated))
}
