import { describe, expect, it } from 'vitest'
import { scaledPhotoSize } from './local-photo'

describe('local photo preparation', () => {
  it('keeps a small photo at its original size', () => {
    expect(scaledPhotoSize(1200, 900)).toEqual({ width: 1200, height: 900 })
  })

  it('limits a landscape photo to a 1600px longest edge', () => {
    expect(scaledPhotoSize(4032, 3024)).toEqual({ width: 1600, height: 1200 })
  })

  it('limits a portrait photo without changing its proportions', () => {
    expect(scaledPhotoSize(3024, 4032)).toEqual({ width: 1200, height: 1600 })
  })
})
