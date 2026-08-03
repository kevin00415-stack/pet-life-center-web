import { useEffect, useState } from 'react'

export type GuardianTheme = 'warm' | 'tech' | 'medical' | 'nature' | 'game'

export const guardianThemes: ReadonlyArray<{ code: GuardianTheme; zh: string; en: string }> = [
  { code: 'warm', zh: '暖光陪伴', en: 'Warm' },
  { code: 'tech', zh: '科技清晰', en: 'Tech' },
  { code: 'medical', zh: '醫療信任', en: 'Medical' },
  { code: 'nature', zh: '自然療癒', en: 'Nature' },
  { code: 'game', zh: '探索遊戲', en: 'Game' },
]

const isTheme = (value: string | null): value is GuardianTheme => guardianThemes.some((theme) => theme.code === value)
let currentTheme: GuardianTheme = 'warm'
try {
  const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem('guardian-theme')
  if (isTheme(stored)) currentTheme = stored
} catch { /* local storage is optional */ }

const listeners = new Set<(theme: GuardianTheme) => void>()

export function getTheme() { return currentTheme }
export function setTheme(theme: GuardianTheme) {
  currentTheme = theme
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme
  try { localStorage.setItem('guardian-theme', theme) } catch { /* local storage is optional */ }
  listeners.forEach((listener) => listener(theme))
}

export function initializeTheme() { setTheme(currentTheme) }

export function useTheme() {
  const [theme, update] = useState(currentTheme)
  useEffect(() => { listeners.add(update); return () => { listeners.delete(update) } }, [])
  return { theme, changeTheme: setTheme }
}
