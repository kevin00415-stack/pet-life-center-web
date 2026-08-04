import { afterEach, describe, expect, test } from 'vitest'
import { getTheme, setTheme } from './theme'

describe('Guardian theme preference', () => {
  afterEach(() => setTheme('warm'))
  test('keeps Warm as the default and supports all launch themes', () => {
    expect(getTheme()).toBe('warm')
    for (const theme of ['tech','medical','nature','game'] as const) {
      setTheme(theme)
      expect(getTheme()).toBe(theme)
    }
  })
})
