import { type DynamicModule, Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

import type { BaseConfig } from '../config/config.js'
import { createLoggerParams } from './logger.options.js'

/** Structured pino logging with one entry per HTTP request and automatic masking of secrets. */
@Module({})
export class LoggingModule {
  /** Configures logging for the given environment. */
  static register(config: BaseConfig): DynamicModule {
    return {
      module: LoggingModule,
      imports: [LoggerModule.forRoot(createLoggerParams(config))],
      exports: [LoggerModule],
    }
  }
}
