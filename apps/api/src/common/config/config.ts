import { z } from 'zod'

const baseConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  GCP_PROJECT_ID: z.string().min(1),
  SLOW_CALL_THRESHOLD_MS: z.coerce.number().int().positive().default(1000),
})

/** Environment variables required by the public API service. */
export const apiConfigSchema = baseConfigSchema.extend({
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
export const workerConfigSchema = baseConfigSchema

/** Settings shared by the API and the worker. */
export type BaseConfig = z.infer<typeof baseConfigSchema>
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
