import { type DynamicModule, Module } from '@nestjs/common'

import type { BaseConfig } from './config.js'

/** Injection token for the validated configuration object. */
export const CONFIG = Symbol('CONFIG')

/** Makes the configuration validated at startup injectable everywhere through {@link CONFIG}. */
@Module({})
export class ConfigModule {
  /** Registers an already validated configuration object as a global provider. */
  static register(config: BaseConfig): DynamicModule {
    return {
      module: ConfigModule,
      global: true,
      providers: [{ provide: CONFIG, useValue: config }],
      exports: [CONFIG],
    }
  }
}
