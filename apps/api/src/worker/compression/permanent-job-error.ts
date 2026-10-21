/**
 * A failure that repeating the task cannot fix, such as a corrupt or unsupported image. The message
 * is shown to the user.
 */
export class PermanentJobError extends Error {
  override readonly name = 'PermanentJobError'
}
