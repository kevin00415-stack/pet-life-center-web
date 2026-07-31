import { describe, test, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BottomNav } from './BottomNav'

describe('BottomNav Component (Server-side Markup & Interaction Verification)', () => {
  test('renders all 5 expected navigation items and labels correctly', () => {
    const html = renderToStaticMarkup(
      createElement(BottomNav, { active: 'care', onChange: () => {} })
    )

    expect(html).toContain('今日')
    expect(html).toContain('紀錄')
    expect(html).toContain('社群')
    expect(html).toContain('健康')
    expect(html).toContain('提醒')
  })

  test('applies the active CSS class correctly on the active tab', () => {
    const htmlCare = renderToStaticMarkup(
      createElement(BottomNav, { active: 'care', onChange: () => {} })
    )
    expect(htmlCare).toContain('class="active"')

    const htmlCommunity = renderToStaticMarkup(
      createElement(BottomNav, { active: 'community', onChange: () => {} })
    )
    expect(htmlCommunity).toContain('class="active"')
  })

  test('invokes onChange with correct view type when mock click events are triggered', () => {
    const mockOnChange = vi.fn()
    const nav = BottomNav({ active: 'care', onChange: mockOnChange })

    // BottomNav returns a nav element with 5 button children
    expect(nav.props.children).toHaveLength(5)

    // Trigger simulate click callbacks
    const buttons = nav.props.children

    // Index 0: care ("今日")
    buttons[0].props.onClick()
    expect(mockOnChange).toHaveBeenLastCalledWith('care')

    // Index 1: memories ("紀錄")
    buttons[1].props.onClick()
    expect(mockOnChange).toHaveBeenLastCalledWith('memories')

    // Index 2: community ("社群")
    buttons[2].props.onClick()
    expect(mockOnChange).toHaveBeenLastCalledWith('community')

    // Index 3: health ("健康")
    buttons[3].props.onClick()
    expect(mockOnChange).toHaveBeenLastCalledWith('health')

    // Index 4: calendar/relax ("提醒")
    buttons[4].props.onClick()
    expect(mockOnChange).toHaveBeenLastCalledWith('calendar')
  })
})
