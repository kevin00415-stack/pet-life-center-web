import { describe, expect, it } from 'vitest'
import { movePhotoPosition, nudgePhotoPosition } from './photo-position'

describe('photo positioning', () => {
  it('moves the photo with the pointer while preserving the saved percentage model', () => {
    expect(movePhotoPosition({ x: 50, y: 50 }, 20, -10, 100, 100)).toEqual({ x: 30, y: 60 })
  })

  it('clamps dragged positions to the crop boundary', () => {
    expect(movePhotoPosition({ x: 50, y: 50 }, 500, -500, 100, 100)).toEqual({ x: 0, y: 100 })
  })

  it('supports keyboard fine tuning and ignores unrelated keys', () => {
    expect(nudgePhotoPosition({ x: 50, y: 50 }, 'ArrowLeft')).toEqual({ x: 52, y: 50 })
    expect(nudgePhotoPosition({ x: 50, y: 50 }, 'Enter')).toEqual({ x: 50, y: 50 })
  })
})
