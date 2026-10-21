import { type DynamicModule, Module } from '@nestjs/common'

import type { R2Config } from '../config/config.js'
import { CallTimer } from '../logging/call-timer.js'
import { ObjectStorage } from './object-storage.js'
import { R2ObjectStorage } from './r2-object-storage.js'

/** Provides {@link ObjectStorage} backed by Cloudflare R2 globally. */
@Module({})
export class R2Module {
  /** Connects to the bucket from the configuration. */
  static register(config: R2Config): DynamicModule {
    return {
      module: R2Module,
      global: true,
      providers: [
        {
          provide: ObjectStorage,
          useFactory: (timer: CallTimer) => new R2ObjectStorage(config, timer),
          inject: [CallTimer],
        },
      ],
      exports: [ObjectStorage],
    }
  }
}
