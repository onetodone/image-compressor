import { describe, expect, it } from 'vitest'

import { createJobRequestSchema, inputTypeSchema, jobIdSchema, jobStatusSchema, MAX_INPUT_BYTES } from './job.js'

describe('jobStatusSchema', () => {
  it('accepts every known status', () => {
    for (const status of ['awaiting_upload', 'queued', 'processing', 'done', 'failed']) {
      expect(jobStatusSchema.parse(status)).toBe(status)
    }
  })

  it('rejects an unknown status', () => {
    expect(jobStatusSchema.safeParse('cancelled').success).toBe(false)
  })
})

describe('inputTypeSchema', () => {
  it('accepts JPEG and PNG', () => {
    expect(inputTypeSchema.parse('image/jpeg')).toBe('image/jpeg')
    expect(inputTypeSchema.parse('image/png')).toBe('image/png')
  })

  it('rejects other image types', () => {
    expect(inputTypeSchema.safeParse('image/webp').success).toBe(false)
    expect(inputTypeSchema.safeParse('image/gif').success).toBe(false)
  })
})

describe('createJobRequestSchema', () => {
  const valid = { originalName: 'photo.jpg', contentType: 'image/jpeg', size: 1024 }

  it('accepts a JPEG or PNG within the size limit', () => {
    expect(createJobRequestSchema.parse(valid)).toEqual(valid)
    expect(createJobRequestSchema.parse({ ...valid, contentType: 'image/png', size: MAX_INPUT_BYTES }).size).toBe(
      MAX_INPUT_BYTES,
    )
  })

  it('trims the file name', () => {
    expect(createJobRequestSchema.parse({ ...valid, originalName: '  photo.jpg ' }).originalName).toBe('photo.jpg')
  })

  it('rejects files over 10 MB and empty files', () => {
    expect(createJobRequestSchema.safeParse({ ...valid, size: MAX_INPUT_BYTES + 1 }).success).toBe(false)
    expect(createJobRequestSchema.safeParse({ ...valid, size: 0 }).success).toBe(false)
  })

  it('rejects unsupported content types', () => {
    expect(createJobRequestSchema.safeParse({ ...valid, contentType: 'image/webp' }).success).toBe(false)
  })

  it('rejects file names with path separators or control characters', () => {
    for (const originalName of ['', '   ', '../photo.jpg', 'dir\\photo.jpg', 'photo\n.jpg', 'a'.repeat(256)]) {
      expect(createJobRequestSchema.safeParse({ ...valid, originalName }).success).toBe(false)
    }
  })
})

describe('jobIdSchema', () => {
  it('accepts a Firestore auto id', () => {
    expect(jobIdSchema.safeParse('a1B2c3D4e5F6g7H8i9J0').success).toBe(true)
  })

  it('rejects ids that could address another document path', () => {
    for (const id of ['short', 'a1B2c3D4e5F6g7H8i9J/', '../users/a1B2c3D4e5F']) {
      expect(jobIdSchema.safeParse(id).success).toBe(false)
    }
  })
})
