import { type DynamicModule, Module } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { createApp } from '../common/bootstrap.js'
import type { WorkerConfig } from '../common/config/config.js'
import { ConfigModule } from '../common/config/config.module.js'
import { HealthModule } from '../common/health/health.module.js'
import { LoggingModule } from '../common/logging/logging.module.js'

@Module({})
export class WorkerModule {
  static register(config: WorkerConfig): DynamicModule {
    return {
      module: WorkerModule,
      imports: [ConfigModule.register(config), LoggingModule.register(config), HealthModule],
    }
  }
}

export function createWorkerApp(config: WorkerConfig): Promise<NestExpressApplication> {
  return createApp(WorkerModule.register(config))
}
