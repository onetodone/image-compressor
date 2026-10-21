import { describe, expect, it } from 'vitest'

import { inputTypeSchema, jobStatusSchema } from './job.js'

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
