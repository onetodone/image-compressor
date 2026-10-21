import { Logger } from '@nestjs/common'

import { type CompressTask, TaskQueue } from './task-queue.js'

/**
 * Local {@link TaskQueue} that posts tasks straight to the worker over HTTP, without OIDC.
 *
 * Like Cloud Tasks, it returns before the worker runs: the request is sent in the background and
 * failures are only logged. This relies on the CPU staying available after the response, which is
 * true locally but not on Cloud Run, so this mode is for development only.
 */
export class DirectTaskQueue extends TaskQueue {
  private readonly logger = new Logger(DirectTaskQueue.name)

  constructor(private readonly workerUrl: string) {
    super()
  }

  enqueueCompression(jobId: string): Promise<void> {
    const task: CompressTask = { jobId }
    const url = new URL('/tasks/compress', this.workerUrl)
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(task) })
      .then((response) => {
        if (!response.ok) this.logger.warn({ jobId, status: response.status }, `Worker answered ${response.status}`)
      })
      .catch((error: unknown) => this.logger.warn({ jobId, err: error }, 'Worker is unreachable'))
    return Promise.resolve()
  }
}
