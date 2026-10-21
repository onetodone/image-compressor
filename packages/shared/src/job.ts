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
