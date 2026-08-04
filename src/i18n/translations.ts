import { useState, useEffect } from 'react'
import { zhTW } from './zh-TW'
import type { TranslationKeys } from './zh-TW'
import { en } from './en'

export type LocaleType = 'zh-TW' | 'en-US'
export type LocaleInput = LocaleType | 'en'

export const supportedLocales: ReadonlyArray<{ code: LocaleType; label: string; nativeLabel: string }> = [
  { code: 'zh-TW', label: 'Traditional Chinese', nativeLabel: '繁體中文' },
  { code: 'en-US', label: 'English', nativeLabel: 'English' },
]

export function detectLocale(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages) : LocaleType {
  for (const language of languages) {
    const normalized = language.toLowerCase()
    if (normalized.startsWith('en')) return 'en-US'
    if (normalized.startsWith('zh')) return 'zh-TW'
  }
  return 'zh-TW'
}

const normalizeLocale = (locale: LocaleInput): LocaleType => locale === 'en' ? 'en-US' : locale

export const alternateLocale = (locale: LocaleType): LocaleType =>
  ({ 'zh-TW': 'en-US', 'en-US': 'zh-TW' } as const)[locale]

export function translate(key: TranslationKeys, locale: LocaleType = currentLocale): string {
  const dict = locale === 'en-US' ? en : zhTW
  return dict[key] || zhTW[key] || (key as string)
}

// Singleton or global simple locale observer
let currentLocale: LocaleType = detectLocale()
try {
  const stored = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('maohai-app-locale') : null
  if (stored === 'zh-TW' || stored === 'en-US' || stored === 'en') {
    currentLocale = normalizeLocale(stored)
  }
} catch {
  // Safe fallback for SSR or test environments
}

const listeners = new Set<(locale: LocaleType) => void>()

export function getLocale(): LocaleType {
  return currentLocale
}

export function setLocale(input: LocaleInput) {
  const locale = normalizeLocale(input)
  if (locale !== currentLocale) {
    currentLocale = locale
    if (typeof document !== 'undefined') document.documentElement.lang = locale
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('maohai-app-locale', locale)
      }
    } catch {
      // Safe fallback
    }
    listeners.forEach((l) => l(locale))
  }
}

export function useTranslation() {
  const [locale, setLocaleState] = useState<LocaleType>(currentLocale)

  useEffect(() => {
    const handleLocaleChange = (nextLocale: LocaleType) => {
      setLocaleState(nextLocale)
    }
    listeners.add(handleLocaleChange)
    return () => {
      listeners.delete(handleLocaleChange)
    }
  }, [])

  const t = (key: TranslationKeys): string => translate(key, locale)

  return { t, locale, changeLocale: setLocale }
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([^}]+)\}/g, (match, key: string) => key in values ? String(values[key]) : match)
}
