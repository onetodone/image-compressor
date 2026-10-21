import type { InputType } from '@onetodone/image-compressor-shared'

/** R2 key of the original image uploaded for a job. */
export function originalKey(uid: string, jobId: string): string {
  return `originals/${uid}/${jobId}`
}

const EXTENSIONS: Record<InputType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' }

/** File extension of an image type, without the dot. */
export function fileExtension(type: InputType): string {
  return EXTENSIONS[type]
}

/** R2 key of the compressed result of a job, with the extension of the image type. */
export function resultKey(uid: string, jobId: string, type: InputType): string {
  return `results/${uid}/${jobId}.${fileExtension(type)}`
}
