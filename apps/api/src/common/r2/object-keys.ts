import type { InputType } from '@onetodone/image-compressor-shared'

/** R2 key of the original image uploaded for a job. */
export function originalKey(uid: string, jobId: string): string {
  return `originals/${uid}/${jobId}`
}

const RESULT_EXTENSIONS: Record<InputType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' }

/** R2 key of the compressed result of a job, with the extension of the image type. */
export function resultKey(uid: string, jobId: string, type: InputType): string {
  return `results/${uid}/${jobId}.${RESULT_EXTENSIONS[type]}`
}
