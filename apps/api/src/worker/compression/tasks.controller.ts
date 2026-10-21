import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common'

import { type CompressTask, compressTaskSchema } from '../../common/tasks/task-queue.js'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js'
import { CompressionService, type TaskOutcome } from './compression.service.js'

@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name)

  constructor(private readonly compression: CompressionService) {}

  // Cloud Tasks retries every response outside 2xx, so finished and permanently failed jobs answer 200.
  @Post('compress')
  @HttpCode(HttpStatus.OK)
  async compress(
    @Body(new ZodValidationPipe(compressTaskSchema)) task: CompressTask,
    @Headers('x-cloudtasks-taskretrycount') retryCount?: string,
  ): Promise<{ jobId: string; outcome: TaskOutcome }> {
    const { jobId } = task
    const attempt = (Number.parseInt(retryCount ?? '', 10) || 0) + 1
    const started = performance.now()
    const elapsed = () => Math.round(performance.now() - started)

    try {
      const outcome = await this.compression.process(jobId, attempt)
      this.logger.log({ jobId, attempt, outcome, durationMs: elapsed() }, `Compression task ${outcome}`)
      return { jobId, outcome }
    } catch (error) {
      this.logger.warn(
        { jobId, attempt, outcome: 'retry', durationMs: elapsed(), err: error },
        'Compression task will be retried',
      )
      throw new ServiceUnavailableException('Compression will be retried')
    }
  }
}
