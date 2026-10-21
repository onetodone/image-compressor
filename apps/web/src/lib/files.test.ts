import { MAX_INPUT_BYTES } from '@onetodone/image-compressor-shared'
import { describe, expect, it } from 'vitest'

import { checkFile, formatBytes, savedPercent } from './files'

describe('checkFile', () => {
  it('accepts a JPEG or PNG within the size limit', () => {
    expect(checkFile({ name: 'photo.jpg', type: 'image/jpeg', size: 2048 })).toEqual({
      ok: true,
      request: { originalName: 'photo.jpg', contentType: 'image/jpeg', size: 2048 },
    })
    expect(checkFile({ name: 'graphic.png', type: 'image/png', size: MAX_INPUT_BYTES }).ok).toBe(true)
  })

  it('rejects other types, empty files and files over 10 MB', () => {
    expect(checkFile({ name: 'a.webp', type: 'image/webp', size: 10 })).toEqual({
      ok: false,
      reason: 'Only JPEG and PNG',
    })
    expect(checkFile({ name: 'a.png', type: 'image/png', size: 0 })).toEqual({ ok: false, reason: 'The file is empty' })
    expect(checkFile({ name: 'a.png', type: 'image/png', size: MAX_INPUT_BYTES + 1 })).toEqual({
      ok: false,
      reason: 'Larger than 10 MB',
    })
  })

  it('rejects a name the API would refuse', () => {
    expect(checkFile({ name: 'a'.repeat(300), type: 'image/png', size: 10 }).ok).toBe(false)
  })
})

describe('formatBytes', () => {
  it('uses the largest unit that keeps the value above 1', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(19_879)).toBe('19 KB')
    expect(formatBytes(3_313)).toBe('3.2 KB')
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB')
  })
})

describe('savedPercent', () => {
  it('returns the saved share of the original', () => {
    expect(savedPercent(19_879, 3_313)).toBe(83)
  })

  it('returns zero when nothing was saved', () => {
    expect(savedPercent(1000, 1000)).toBe(0)
    expect(savedPercent(0, 0)).toBe(0)
  })
})
