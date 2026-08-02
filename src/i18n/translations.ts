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
  let locale: LocaleType = currentLocale
  let setLocaleState: (next: LocaleType) => void = () => {}

  try {
    const [state, setState] = useState<LocaleType>(currentLocale)
    locale = state
    setLocaleState = setState
  } catch (e) {
    // Called outside React render context (e.g. raw function call in tests)
  }

  try {
    useEffect(() => {
      const handleLocaleChange = (nextLocale: LocaleType) => {
        try {
          setLocaleState(nextLocale)
        } catch (e) {}
      }
      listeners.add(handleLocaleChange)
      return () => {
        listeners.delete(handleLocaleChange)
      }
    }, [])
  } catch (e) {
    // Called outside React context
  }

  const t = (key: TranslationKeys): string => {
    const dict = locale === 'en' ? en : zhTW
    // Safe fallback to zh-TW dictionary first, then standard string key name
    return dict[key] || zhTW[key] || (key as string)
  }

  return { t, locale, changeLocale: setLocale }
}
