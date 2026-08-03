import type { LocaleType } from './translations'

export type WeightUnit = 'kg' | 'lb'
export type TemperatureUnit = 'celsius' | 'fahrenheit'

const localeTag = (locale: LocaleType) => locale

export function formatNumber(value: number, locale: LocaleType, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(localeTag(locale), options).format(value)
}

export function formatDate(value: Date | string | number, locale: LocaleType, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }) {
  const date = value instanceof Date ? value : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
  return new Intl.DateTimeFormat(localeTag(locale), options).format(date)
}

export function formatTime(value: Date | string | number, locale: LocaleType, options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }) {
  return new Intl.DateTimeFormat(localeTag(locale), options).format(value instanceof Date ? value : new Date(value))
}

export function formatWeight(kilograms: number, locale: LocaleType, unit: WeightUnit = 'kg') {
  const value = unit === 'lb' ? kilograms * 2.2046226218 : kilograms
  return `${formatNumber(value, locale, { maximumFractionDigits: 1 })} ${unit}`
}

export function formatTemperature(celsius: number, locale: LocaleType, unit: TemperatureUnit = 'celsius') {
  const value = unit === 'fahrenheit' ? celsius * 9 / 5 + 32 : celsius
  return `${formatNumber(value, locale, { maximumFractionDigits: 1 })} °${unit === 'fahrenheit' ? 'F' : 'C'}`
}
