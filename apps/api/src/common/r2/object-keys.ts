/** R2 key of the original image uploaded for a job. */
export function originalKey(uid: string, jobId: string): string {
  return `originals/${uid}/${jobId}`
}
