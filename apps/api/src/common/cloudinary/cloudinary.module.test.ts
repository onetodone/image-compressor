import { describe, expect, it } from 'vitest'

import { CallTimer } from '../logging/call-timer.js'
import { CloudinaryImageCdn } from './cloudinary-image-cdn.js'
import { createImageCdn } from './cloudinary.module.js'
import { DisabledImageCdn } from './image-cdn.js'

const timer = new CallTimer(1000, { warn: () => undefined })

describe('createImageCdn', () => {
  it('uses Cloudinary when a URL is configured', () => {
    const cdn = createImageCdn({ CLOUDINARY_URL: 'cloudinary://123:secret@cloud', CLOUDINARY_FOLDER: 'test' }, timer)

    expect(cdn).toBeInstanceOf(CloudinaryImageCdn)
  })

  it('disables previews without a URL', async () => {
    const cdn = createImageCdn({ CLOUDINARY_URL: undefined, CLOUDINARY_FOLDER: 'test' }, timer)

    expect(cdn).toBeInstanceOf(DisabledImageCdn)
    expect(await cdn.upload('job', Buffer.from('image'))).toBeNull()
  })
})
