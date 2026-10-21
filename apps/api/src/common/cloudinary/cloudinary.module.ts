import { type DynamicModule, Logger, Module } from '@nestjs/common'

import type { CloudinaryConfig } from '../config/config.js'
import { CallTimer } from '../logging/call-timer.js'
import { CloudinaryImageCdn } from './cloudinary-image-cdn.js'
import { DisabledImageCdn, ImageCdn } from './image-cdn.js'

/** Creates the Cloudinary {@link ImageCdn} when `CLOUDINARY_URL` is set, otherwise one without previews. */
export function createImageCdn(config: CloudinaryConfig, timer: CallTimer): ImageCdn {
  if (config.CLOUDINARY_URL) return new CloudinaryImageCdn(config.CLOUDINARY_URL, config.CLOUDINARY_FOLDER, timer)
  new Logger('Cloudinary').log('CLOUDINARY_URL is not set: previews are disabled, results are served from R2')
  return new DisabledImageCdn()
}

/** Provides {@link ImageCdn} globally, see {@link createImageCdn}. */
@Module({})
export class CloudinaryModule {
  /** Connects to the Cloudinary account from the configuration, if there is one. */
  static register(config: CloudinaryConfig): DynamicModule {
    return {
      module: CloudinaryModule,
      global: true,
      providers: [
        { provide: ImageCdn, useFactory: (timer: CallTimer) => createImageCdn(config, timer), inject: [CallTimer] },
      ],
      exports: [ImageCdn],
    }
  }
}
