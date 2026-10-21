/** An API request that failed; `message` is safe to show to the user. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Returns a user-facing message for a failed API response.
 * @param status HTTP status code
 * @param body parsed JSON body, if any
 */
export function apiErrorMessage(status: number, body: unknown): string {
  if (status === 429) return 'Daily limit reached. Try again tomorrow.'
  if (status === 401) return 'Your session expired. Reload the page.'
  const message = typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : undefined
  // The API only puts user-safe text into 4xx messages; 5xx details are never shown.
  if (status < 500 && typeof message === 'string') return message
  return 'Something went wrong. Try again.'
}
