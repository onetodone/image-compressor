import { type DynamicModule, Module } from '@nestjs/common'

import type { TasksConfig } from '../config/config.js'
import { DirectTaskQueue } from './direct-task-queue.js'
import { TaskQueue } from './task-queue.js'

/** Provides the {@link TaskQueue} selected by `TASKS_MODE` globally. */
@Module({})
export class TasksModule {
  /** Creates the queue implementation for the configured mode. */
  static register(config: TasksConfig): DynamicModule {
    return {
      module: TasksModule,
      global: true,
      providers: [{ provide: TaskQueue, useValue: new DirectTaskQueue(config.WORKER_URL) }],
      exports: [TaskQueue],
    }
  }
}
