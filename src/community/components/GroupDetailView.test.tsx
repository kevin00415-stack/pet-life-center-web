import { describe, test, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Setup Node-safe browser and storage mocks before loading components
const hashObj = { value: '' }
if (typeof window === 'undefined') {
  global.window = {
    location: {
      get hash() { return hashObj.value },
      set hash(v) { hashObj.value = v }
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  } as any
}

if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {}
  global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { for (const k in store) delete store[k] },
  } as any
}

import { GroupDetailView } from './GroupDetailView'
import CommunityHome from '../CommunityHome'
import { mockTopics } from '../community-data'

describe('GroupDetailView & Group Navigation Tests', () => {
  // Test opening every single group
  mockTopics.forEach((topic) => {
    test(`renders group detail page correctly for ${topic.id} (${topic.title})`, () => {
      const mockOnBack = vi.fn()
      const html = renderToStaticMarkup(
        createElement(GroupDetailView, {
          topic,
          onBack: mockOnBack,
        })
      )

      // 3. The detail page must show: group name, description, post list, create post button, back button
      expect(html).toContain(topic.title)
      expect(html).toContain(topic.description)
      expect(html).toContain('討論貼文')
      expect(html).toContain('發表新文章') // Create post button
      expect(html).toContain('aria-label="返回社群列表"') // Back button
    })
  })

  test('GroupDetailView renders initial mock posts based on the group ID', () => {
    // Topic-1 should contain its specific posts
    const topic1 = mockTopics.find((t) => t.id === 'topic-1')!
    const html1 = renderToStaticMarkup(
      createElement(GroupDetailView, {
        topic: topic1,
        onBack: () => {},
      })
    )
    expect(html1).toContain('老貓關節保健品推薦？')
    expect(html1).toContain('老狗居家防滑心得分享')

    // Topic-2 should contain its specific posts
    const topic2 = mockTopics.find((t) => t.id === 'topic-2')!
    const html2 = renderToStaticMarkup(
      createElement(GroupDetailView, {
        topic: topic2,
        onBack: () => {},
      })
    )
    expect(html2).toContain('皮下輸液安撫技巧請益')
    expect(html2).toContain('低磷鮮食食譜分享')
  })

  test('CommunityHome handles hash routing to open the correct group details page', () => {
    // Set window hash to topic-1
    window.location.hash = '#/community/group/topic-1'

    const html = renderToStaticMarkup(
      createElement(CommunityHome, {
        onBack: () => {},
      })
    )

    // Should render the GroupDetailView for topic-1
    expect(html).toContain('高齡犬貓照護')
    expect(html).toContain('老貓關節保健品推薦？')
    expect(html).not.toContain('腎臟病交流')
  })

  test('CommunityHome handles direct hash routing for other groups', () => {
    // Set window hash to topic-5 (心臟病關懷)
    window.location.hash = '#/community/group/topic-5'

    const html = renderToStaticMarkup(
      createElement(CommunityHome, {
        onBack: () => {},
      })
    )

    // Should render the GroupDetailView for topic-5
    expect(html).toContain('心臟病關懷')
    expect(html).toContain('心臟服藥時間間隔討論')
    expect(html).not.toContain('高齡犬貓照護')
  })
})
