import { z } from 'zod'

const baseConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  GCP_PROJECT_ID: z.string().min(1),
  SLOW_CALL_THRESHOLD_MS: z.coerce.number().int().positive().default(1000),
})

const required = z.string().min(1)

const r2ConfigSchema = z.object({
  R2_ACCOUNT_ID: required,
  R2_ACCESS_KEY_ID: required,
  R2_SECRET_ACCESS_KEY: required,
  R2_BUCKET: required,
})

const tasksConfigSchema = z.object({
  TASKS_MODE: z.enum(['direct']),
  WORKER_URL: z.url(),
})

/** Environment variables required by the public API service. */
export const apiConfigSchema = baseConfigSchema.extend({
  ...r2ConfigSchema.shape,
  ...tasksConfigSchema.shape,
  CORS_ORIGINS: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
})

/** Environment variables required by the private worker service. */
export const workerConfigSchema = baseConfigSchema.extend({
  ...r2ConfigSchema.shape,
  // Must match the queue's max attempts, so the last delivery can fail the job instead of retrying.
  TASKS_MAX_ATTEMPTS: z.coerce.number().int().min(1),
})

/** Settings shared by the API and the worker. */
export type BaseConfig = z.infer<typeof baseConfigSchema>
/** Cloudflare R2 credentials and bucket. */
export type R2Config = z.infer<typeof r2ConfigSchema>
/** How compression tasks are delivered to the worker. */
export type TasksConfig = z.infer<typeof tasksConfigSchema>
/** Validated configuration of the API service. */
export type ApiConfig = z.infer<typeof apiConfigSchema>
/** Validated configuration of the worker service. */
export type WorkerConfig = z.infer<typeof workerConfigSchema>

/**
 * Validates environment variables against a schema.
 *
 * @throws Error listing every missing or invalid variable, so the service refuses to start.
 */
export function parseConfig<S extends z.ZodType>(schema: S, env: Record<string, string | undefined>): z.output<S> {
  const result = schema.safeParse(env)
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    throw new Error(`Invalid configuration:\n${issues.join('\n')}`)
  }
  return result.data
}
