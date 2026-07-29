/// <reference types="node" />

import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const musicFiles = [
  'PLC-001-Crystal-Forest-Drift.mp3',
  'PLC-002-Forest-Drift.mp3',
  'PLC-003-Ocean-Whisper.mp3',
]

describe('bundled relaxation music', () => {
  it.each(musicFiles)('includes %s as a non-empty MP3', (fileName) => {
    const filePath = resolve(process.cwd(), 'public', 'music', fileName)
    expect(existsSync(filePath)).toBe(true)
    expect(statSync(filePath).size).toBeGreaterThan(1_000_000)
  })

  it('pre-caches every bundled track for offline playback', () => {
    const serviceWorker = readFileSync(resolve(process.cwd(), 'public', 'sw.js'), 'utf8')
    for (const fileName of musicFiles) expect(serviceWorker).toContain(`/music/${fileName}`)
  })
})
