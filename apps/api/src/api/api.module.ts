import { type DynamicModule, Module } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { createApp } from '../common/bootstrap.js'
import type { ApiConfig } from '../common/config/config.js'
import { ConfigModule } from '../common/config/config.module.js'
import { HealthModule } from '../common/health/health.module.js'
import { LoggingModule } from '../common/logging/logging.module.js'

@Module({})
export class ApiModule {
  static register(config: ApiConfig): DynamicModule {
    return {
      module: ApiModule,
      imports: [ConfigModule.register(config), LoggingModule.register(config), HealthModule],
    }
  }
}

export async function createApiApp(config: ApiConfig): Promise<NestExpressApplication> {
  const app = await createApp(ApiModule.register(config))
  app.enableCors({ origin: config.CORS_ORIGINS })
  return app
}
