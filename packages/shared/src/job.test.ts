import { describe, expect, it } from 'vitest'

import {
  createJobRequestSchema,
  inputTypeSchema,
  jobIdSchema,
  jobStatusSchema,
  listJobsQuerySchema,
  MAX_INPUT_BYTES,
  toJobSummary,
} from './job.js'

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

describe('toJobSummary', () => {
  const timestamp = (iso: string) => ({ toDate: () => new Date(iso) })
  const id = 'a1B2c3D4e5F6g7H8i9J0'

  it('maps a finished job and leaves storage details out', () => {
    const summary = toJobSummary(id, {
      ownerId: 'uid',
      status: 'done',
      originalName: 'photo.jpg',
      inputType: 'image/jpeg',
      inputKey: 'originals/uid/id',
      inputBytes: 2048,
      outputKey: 'results/uid/id.jpg',
      outputBytes: 512,
      width: 64,
      height: 48,
      previewUrl: null,
      error: null,
      createdAt: timestamp('2026-10-21T10:00:00.000Z'),
      finishedAt: timestamp('2026-10-21T10:00:05.000Z'),
    })

    expect(summary).toEqual({
      id,
      status: 'done',
      originalName: 'photo.jpg',
      inputType: 'image/jpeg',
      inputBytes: 2048,
      outputBytes: 512,
      width: 64,
      height: 48,
      previewUrl: null,
      error: null,
      createdAt: '2026-10-21T10:00:00.000Z',
      finishedAt: '2026-10-21T10:00:05.000Z',
    })
  })

  it('treats fields missing from older documents as empty', () => {
    const summary = toJobSummary(id, {
      status: 'queued',
      originalName: 'graphic.png',
      inputType: 'image/png',
      createdAt: timestamp('2026-10-21T10:00:00.000Z'),
    })

    expect(summary).toMatchObject({ inputBytes: null, outputBytes: null, previewUrl: null, finishedAt: null })
  })
})

describe('listJobsQuerySchema', () => {
  it('uses the default page size and coerces a limit from the query string', () => {
    expect(listJobsQuerySchema.parse({})).toEqual({ limit: 20 })
    expect(listJobsQuerySchema.parse({ limit: '5', cursor: 'abc' })).toEqual({ limit: 5, cursor: 'abc' })
  })

  it('rejects page sizes outside 1 to 50', () => {
    for (const limit of ['0', '51', 'ten']) {
      expect(listJobsQuerySchema.safeParse({ limit }).success).toBe(false)
    }
  })
})
