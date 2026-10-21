import { z } from 'zod'

/** Lifecycle states of a compression job, in the order a successful job passes through them. */
export const JOB_STATUSES = ['awaiting_upload', 'queued', 'processing', 'done', 'failed'] as const

/** Validates a job status value. */
export const jobStatusSchema = z.enum(JOB_STATUSES)

/** Lifecycle state of a compression job. */
export type JobStatus = z.infer<typeof jobStatusSchema>

/** Statuses after which a job never changes again. */
export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ['done', 'failed']

/** Image MIME types accepted for compression. */
export const INPUT_TYPES = ['image/jpeg', 'image/png'] as const

/** Validates an accepted image MIME type. */
export const inputTypeSchema = z.enum(INPUT_TYPES)

/** Image MIME type accepted for compression. */
export type InputType = z.infer<typeof inputTypeSchema>

/** Largest original image accepted, in bytes (10 MB). */
export const MAX_INPUT_BYTES = 10 * 1024 * 1024

/** How long a presigned upload URL stays valid, in seconds (10 minutes). */
export const UPLOAD_URL_TTL_SECONDS = 10 * 60

/** Validates a job id: a Firestore auto-generated document id. */
export const jobIdSchema = z.string().regex(/^[A-Za-z0-9]{20}$/)

/** Validates the body of `POST /jobs`, which describes the file the client is about to upload. */
export const createJobRequestSchema = z.object({
  /** File name shown to the user and used for downloads. */
  originalName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    // eslint-disable-next-line no-control-regex
    .regex(/^[^\u0000-\u001f\u007f/\\]+$/, 'Must not contain control characters or path separators'),
  /** MIME type the upload will be sent with. */
  contentType: inputTypeSchema,
  /** Exact size of the upload in bytes. */
  size: z.number().int().positive().max(MAX_INPUT_BYTES),
})

/** Body of `POST /jobs`. */
export type CreateJobRequest = z.infer<typeof createJobRequestSchema>

/** Validates the response of `POST /jobs`. */
export const createJobResponseSchema = z.object({
  jobId: jobIdSchema,
  /**
   * Presigned URL for a `PUT` of the file. The request must send the declared `Content-Type`,
   * and the body must be exactly the declared size.
   */
  uploadUrl: z.url(),
  /** ISO timestamp after which `uploadUrl` no longer works. */
  uploadExpiresAt: z.iso.datetime(),
})

/** Response of `POST /jobs`. */
export type CreateJobResponse = z.infer<typeof createJobResponseSchema>

/** Validates the response of `POST /jobs/:id/submit`. */
export const submitJobResponseSchema = z.object({
  jobId: jobIdSchema,
  status: jobStatusSchema,
})

/** Response of `POST /jobs/:id/submit`: the job and its status after the submit. */
export type SubmitJobResponse = z.infer<typeof submitJobResponseSchema>

/** Validates a job as shown to its owner. Storage keys and internal bookkeeping are left out. */
export const jobSummarySchema = z.object({
  id: jobIdSchema,
  status: jobStatusSchema,
  originalName: z.string(),
  /** Declared type until the worker detects the real one. */
  inputType: inputTypeSchema,
  inputBytes: z.number().int().nonnegative().nullable(),
  outputBytes: z.number().int().nonnegative().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  previewUrl: z.url().nullable(),
  /** User-safe reason of a failed job. */
  error: z.string().nullable(),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
})

/** A job as shown to its owner. */
export type JobSummary = z.infer<typeof jobSummarySchema>

/** A Firestore timestamp from either the Admin or the client SDK. */
export interface TimestampLike {
  toDate(): Date
}

/**
 * Builds the owner's view of a `jobs/{jobId}` document. Works with data from the Admin and the client
 * SDK, and treats fields missing from older documents as empty.
 * @param id document id
 * @param data document data
 */
export function toJobSummary(id: string, data: Record<string, unknown>): JobSummary {
  const iso = (value: unknown) => (isTimestamp(value) ? value.toDate().toISOString() : null)
  const orNull = (value: unknown) => value ?? null
  return jobSummarySchema.parse({
    id,
    status: data.status,
    originalName: data.originalName,
    inputType: data.inputType,
    inputBytes: orNull(data.inputBytes),
    outputBytes: orNull(data.outputBytes),
    width: orNull(data.width),
    height: orNull(data.height),
    previewUrl: orNull(data.previewUrl),
    error: orNull(data.error),
    createdAt: iso(data.createdAt),
    finishedAt: iso(data.finishedAt),
  })
}

function isTimestamp(value: unknown): value is TimestampLike {
  return typeof value === 'object' && value !== null && typeof (value as TimestampLike).toDate === 'function'
}

/** Default number of jobs per page of `GET /jobs`. */
export const JOBS_PAGE_SIZE = 20

/** Largest number of jobs per page of `GET /jobs`. */
export const MAX_JOBS_PAGE_SIZE = 50

/** Validates the query of `GET /jobs`. */
export const listJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_JOBS_PAGE_SIZE).default(JOBS_PAGE_SIZE),
  /** Opaque `nextCursor` of the previous page. */
  cursor: z.string().min(1).max(200).optional(),
})

/** Query of `GET /jobs`. */
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>

/** Validates the response of `GET /jobs`. */
export const listJobsResponseSchema = z.object({
  /** The user's jobs, newest first. */
  jobs: z.array(jobSummarySchema),
  /** Cursor of the next page, or `null` on the last page. */
  nextCursor: z.string().nullable(),
})

/** Response of `GET /jobs`: one page of the user's jobs. */
export type ListJobsResponse = z.infer<typeof listJobsResponseSchema>
