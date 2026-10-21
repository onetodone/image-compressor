import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'

import { ApiModule, configureApiApp } from '../../src/api/api.module.js'
import { configureApp } from '../../src/common/bootstrap.js'
import { ObjectStorage } from '../../src/common/r2/object-storage.js'
import { TaskQueue } from '../../src/common/tasks/task-queue.js'
import { WorkerModule } from '../../src/worker/worker.module.js'
import { apiConfig, workerConfig } from './config.js'
import { InMemoryObjectStorage, RecordingTaskQueue } from './fakes.js'

/** An initialized API application whose R2 storage and task queue are in-memory fakes. */
export interface TestApiApp {
  app: NestExpressApplication
  storage: InMemoryObjectStorage
  tasks: RecordingTaskQueue
}

/** Creates the API against the emulators with in-memory replacements for R2 and the task queue. */
export async function createTestApiApp(): Promise<TestApiApp> {
  const storage = new InMemoryObjectStorage()
  const tasks = new RecordingTaskQueue()
  const moduleRef = await Test.createTestingModule({ imports: [ApiModule.register(apiConfig)] })
    .overrideProvider(ObjectStorage)
    .useValue(storage)
    .overrideProvider(TaskQueue)
    .useValue(tasks)
    .compile()
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true })
  configureApiApp(configureApp(app), apiConfig)
  await app.init()
  return { app, storage, tasks }
}

/** An initialized worker application whose R2 storage is an in-memory fake. */
export interface TestWorkerApp {
  app: NestExpressApplication
  storage: InMemoryObjectStorage
}

/** Creates the worker against the emulators with an in-memory replacement for R2. */
export async function createTestWorkerApp(): Promise<TestWorkerApp> {
  const storage = new InMemoryObjectStorage()
  const moduleRef = await Test.createTestingModule({ imports: [WorkerModule.register(workerConfig)] })
    .overrideProvider(ObjectStorage)
    .useValue(storage)
    .compile()
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true })
  configureApp(app)
  await app.init()
  return { app, storage }
}
