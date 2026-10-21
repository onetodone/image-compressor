import { type DynamicModule, Module } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { createApp } from '../common/bootstrap.js'
import type { WorkerConfig } from '../common/config/config.js'
import { ConfigModule } from '../common/config/config.module.js'
import { FirebaseModule } from '../common/firebase/firebase.module.js'
import { HealthModule } from '../common/health/health.module.js'
import { LoggingModule } from '../common/logging/logging.module.js'
import { R2Module } from '../common/r2/r2.module.js'
import { CompressionModule } from './compression/compression.module.js'

@Module({})
export class WorkerModule {
  static register(config: WorkerConfig): DynamicModule {
    return {
      module: WorkerModule,
      imports: [
        ConfigModule.register(config),
        LoggingModule.register(config),
        FirebaseModule,
        R2Module.register(config),
        HealthModule,
        CompressionModule,
      ],
    }
  }
}

export function createWorkerApp(config: WorkerConfig): Promise<NestExpressApplication> {
  return createApp(WorkerModule.register(config))
}
