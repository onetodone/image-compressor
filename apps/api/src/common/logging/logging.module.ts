import { type DynamicModule, Logger, Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

import type { BaseConfig } from '../config/config.js'
import { CallTimer } from './call-timer.js'
import { createLoggerParams } from './logger.options.js'

/**
 * Structured pino logging with one entry per HTTP request and automatic masking of secrets.
 * Also provides {@link CallTimer} for slow external call warnings.
 */
@Module({})
export class LoggingModule {
  /** Configures logging for the given environment. */
  static register(config: BaseConfig): DynamicModule {
    return {
      module: LoggingModule,
      global: true,
      imports: [LoggerModule.forRoot(createLoggerParams(config))],
      providers: [
        { provide: CallTimer, useValue: new CallTimer(config.SLOW_CALL_THRESHOLD_MS, new Logger('ExternalCall')) },
      ],
      exports: [LoggerModule, CallTimer],
    }
  }
}
