import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { fixture } from '../../../test/support/fixtures.js'
import { compressImage, MAX_INPUT_PIXELS } from './compress-image.js'
import { PermanentJobError } from './permanent-job-error.js'

describe('compressImage', () => {
  it('re-encodes a JPEG into a smaller JPEG without metadata', async () => {
    const input = fixture('photo.jpg')

    const result = await compressImage(input)

    expect(result).toMatchObject({ type: 'image/jpeg', keptOriginal: false, width: 160, height: 120 })
    expect(result.data.length).toBeLessThan(input.length)
    const metadata = await sharp(result.data).metadata()
    expect(metadata.format).toBe('jpeg')
    expect(metadata.exif).toBeUndefined()
  })

  it('quantizes a PNG into a smaller palette PNG', async () => {
    const input = fixture('graphic.png')

    const result = await compressImage(input)

    expect(result).toMatchObject({ type: 'image/png', keptOriginal: false, width: 160, height: 120 })
    expect(result.data.length).toBeLessThan(input.length)
    const metadata = await sharp(result.data).metadata()
    expect(metadata.format).toBe('png')
    expect(metadata.isPalette).toBe(true)
  })

  it('applies the EXIF orientation to the pixels', async () => {
    const rotated = await sharp(fixture('photo.jpg')).withMetadata({ orientation: 6 }).jpeg({ quality: 100 }).toBuffer()

    const result = await compressImage(rotated)

    expect(result).toMatchObject({ width: 120, height: 160 })
    expect((await sharp(result.data).metadata()).orientation).toBeUndefined()
  })

  it('keeps the original bytes when compression does not make the file smaller', async () => {
    const tiny = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#fff' } })
      .png({ palette: true, compressionLevel: 9 })
      .toBuffer()

    const result = await compressImage(tiny)

    expect(result.keptOriginal).toBe(true)
    expect(result.data).toBe(tiny)
  })

  it('rejects a corrupt file as a permanent failure', async () => {
    await expect(compressImage(fixture('corrupt.jpg'))).rejects.toBeInstanceOf(PermanentJobError)
  })

  it('rejects bytes that are not an image', async () => {
    await expect(compressImage(Buffer.from('not an image'))).rejects.toThrow('not a valid JPEG or PNG')
  })

  it('rejects image formats other than JPEG and PNG', async () => {
    const webp = await sharp(fixture('photo.jpg')).webp().toBuffer()

    await expect(compressImage(webp)).rejects.toThrow('Only JPEG and PNG')
  })

  it('rejects images above the pixel limit before decoding them', async () => {
    const side = Math.ceil(Math.sqrt(MAX_INPUT_PIXELS)) + 1
    const huge = await sharp({ create: { width: side, height: side, channels: 3, background: '#000' } })
      .png({ compressionLevel: 9 })
      .toBuffer()

    await expect(compressImage(huge)).rejects.toThrow('too many pixels')
  })
})
