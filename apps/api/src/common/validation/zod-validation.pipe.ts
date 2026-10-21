import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { z } from 'zod'

/** Validates a request value with a zod schema and returns the parsed result; responds `400` otherwise. */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value)
    if (result.success) return result.data
    throw new BadRequestException({
      statusCode: 400,
      message: 'Invalid request',
      issues: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    })
  }
}
