import { jobIdSchema } from '@onetodone/image-compressor-shared'
import { z } from 'zod'

/** Validates the body of a compression task sent to the worker. */
export const compressTaskSchema = z.object({ jobId: jobIdSchema })

/** Body of a compression task sent to the worker. */
export type CompressTask = z.infer<typeof compressTaskSchema>

/**
 * Hands jobs to the worker. Injected by this class, so the delivery mechanism (`TASKS_MODE`) and
 * test doubles stay interchangeable.
 */
export abstract class TaskQueue {
  /**
   * Schedules compression of a queued job. Calling it again for the same job is safe: the worker
   * ignores jobs that are already processed.
   */
  abstract enqueueCompression(jobId: string): Promise<void>
}
