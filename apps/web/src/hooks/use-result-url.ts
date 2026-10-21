'use client'

import { useEffect, useState } from 'react'

import { api } from '@/lib/api'

/**
 * Short-lived URL that displays the compressed file of a finished job. The URL expires after a few
 * minutes, which is enough for the browser to load the image once.
 * @param jobId finished job, or `null` when there is nothing to show yet
 * @returns the URL, or `null` while it loads or when it could not be created
 */
export function useResultUrl(jobId: string | null): string | null {
  const [result, setResult] = useState<{ jobId: string; url: string } | null>(null)

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    api.downloadJob(jobId, 'inline').then(
      ({ url }) => {
        if (!cancelled) setResult({ jobId, url })
      },
      // Without the URL the image is simply not shown; the card still has its sizes and buttons.
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [jobId])

  return result && result.jobId === jobId ? result.url : null
}
