import {
  type CreateJobRequest,
  type CreateJobResponse,
  createJobResponseSchema,
  type ListJobsResponse,
  listJobsResponseSchema,
  type SubmitJobResponse,
  submitJobResponseSchema,
} from '@onetodone/image-compressor-shared'
import type { z } from 'zod'

import { ApiError, apiErrorMessage } from './api-error'
import { env } from './env'
import { getFirebase } from './firebase'

async function request<S extends z.ZodType>(path: string, schema: S, init: RequestInit = {}): Promise<z.output<S>> {
  const { auth } = getFirebase()
  await auth.authStateReady()
  const user = auth.currentUser
  if (!user) throw new ApiError(401, apiErrorMessage(401, undefined))

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`)
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.')
  }
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) throw new ApiError(response.status, apiErrorMessage(response.status, body))
  return schema.parse(body)
}

/** Calls of the public HTTP API, authenticated with the current user's Firebase ID token. */
export const api = {
  /** Creates a job and returns a presigned URL for uploading its file. */
  createJob(body: CreateJobRequest): Promise<CreateJobResponse> {
    return request('/jobs', createJobResponseSchema, { method: 'POST', body: JSON.stringify(body) })
  },

  /** Confirms the upload of a job and queues it for compression. */
  submitJob(jobId: string): Promise<SubmitJobResponse> {
    return request(`/jobs/${encodeURIComponent(jobId)}/submit`, submitJobResponseSchema, { method: 'POST' })
  },

  /** Returns a page of the user's jobs, newest first. */
  listJobs(cursor: string | null): Promise<ListJobsResponse> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    return request(`/jobs${query}`, listJobsResponseSchema)
  },
}
