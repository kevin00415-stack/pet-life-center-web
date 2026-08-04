import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, test } from 'vitest'
import { setLocale } from '../i18n/translations'
import PublicWebsite from './PublicWebsite'

describe('PublicWebsite', () => {
  afterEach(() => setLocale('zh-TW'))

  test('renders truthful launch sections in Traditional Chinese', () => {
    setLocale('zh-TW')
    const html = renderToStaticMarkup(<PublicWebsite />)
    expect(html).toContain('Guardian Today')
    expect(html).toContain('Case Journey')
    expect(html).toContain('不提供診斷或治療建議')
    expect(html).not.toContain('cloud sync')
  })

  test('renders the English public beta foundation', () => {
    setLocale('en-US')
    const html = renderToStaticMarkup(<PublicWebsite />)
    expect(html).toContain('Turn everyday care into the story of a lifetime.')
    expect(html).toContain('does not diagnose or recommend treatment')
    expect(html).toContain('Privacy first')
  })
})
