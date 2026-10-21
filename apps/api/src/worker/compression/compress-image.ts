import type { InputType } from '@onetodone/image-compressor-shared'
import sharp, { type Sharp } from 'sharp'

import { PermanentJobError } from './permanent-job-error.js'

/**
 * Largest image the worker decodes, in pixels. A small file can decode to a huge bitmap, so this
 * bounds memory per task (about 160 MB as RGBA).
 */
export const MAX_INPUT_PIXELS = 40_000_000

const FORMATS: Record<string, InputType> = { jpeg: 'image/jpeg', png: 'image/png' }

/** Outcome of {@link compressImage}. */
export interface CompressedImage {
  /** Type detected from the file content. */
  type: InputType
  /** Bytes to store as the result: the compressed image, or the original if compression did not help. */
  data: Buffer
  /** Whether `data` is the original because the compressed image was not smaller. */
  keptOriginal: boolean
  width: number
  height: number
}

/**
 * Compresses a JPEG or PNG image: applies the EXIF orientation, strips metadata and re-encodes
 * with mozjpeg or palette quantization.
 *
 * @throws PermanentJobError when the input is not a decodable JPEG or PNG within the pixel limit
 */
export async function compressImage(input: Buffer): Promise<CompressedImage> {
  const metadata = await sharp(input)
    .metadata()
    .catch(() => {
      throw new PermanentJobError('The file is not a valid JPEG or PNG image')
    })
  const type = metadata.format ? FORMATS[metadata.format] : undefined
  if (!type) throw new PermanentJobError('Only JPEG and PNG images are supported')
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new PermanentJobError('The image has too many pixels to process')
  }

  const { data, info } = await encode(sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate(), type)
    .toBuffer({ resolveWithObject: true })
    .catch(() => {
      throw new PermanentJobError('The file is not a valid JPEG or PNG image')
    })

  const keptOriginal = data.length >= input.length
  return { type, data: keptOriginal ? input : data, keptOriginal, width: info.width, height: info.height }
}

function encode(image: Sharp, type: InputType): Sharp {
  // sharp drops all metadata on output unless asked to keep it.
  return type === 'image/jpeg'
    ? image.jpeg({ mozjpeg: true, quality: 78 })
    : image.png({ palette: true, quality: 80, compressionLevel: 9 })
}
