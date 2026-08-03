import { useState, useEffect } from 'react'
import { zhTW } from './zh-TW'
import type { TranslationKeys } from './zh-TW'
import { en } from './en'

export type LocaleType = 'zh-TW' | 'en'

// Singleton or global simple locale observer
let currentLocale: LocaleType = 'zh-TW'
try {
  const stored = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('maohai-app-locale') : null
  if (stored === 'zh-TW' || stored === 'en') {
    currentLocale = stored as LocaleType
  }
} catch (e) {
  // Safe fallback for SSR or test environments
}

const listeners = new Set<(locale: LocaleType) => void>()

export function getLocale(): LocaleType {
  return currentLocale
}

export function setLocale(locale: LocaleType) {
  if (locale !== currentLocale) {
    currentLocale = locale
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('maohai-app-locale', locale)
      }
    } catch (e) {
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

  const t = (key: TranslationKeys): string => {
    const dict = locale === 'en' ? en : zhTW
    // Safe fallback to zh-TW dictionary first, then standard string key name
    return dict[key] || zhTW[key] || (key as string)
  }

  return { t, locale, changeLocale: setLocale }
}
