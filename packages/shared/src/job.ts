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
