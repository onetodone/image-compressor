import 'reflect-metadata'

import type { DynamicModule } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Logger } from 'nestjs-pino'

/**
 * Creates a Nest application on Express with the pino logger, proxy-aware client IPs and
 * graceful shutdown on `SIGTERM`.
 */
export async function createApp(module: DynamicModule): Promise<NestExpressApplication> {
  return configureApp(await NestFactory.create<NestExpressApplication>(module, { bufferLogs: true }))
}

/** Applies the logger, proxy and shutdown settings of {@link createApp} to an existing application. */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  app.useLogger(app.get(Logger))
  app.disable('x-powered-by')
  // Cloud Run's front end appends the client address as the last X-Forwarded-For entry.
  app.set('trust proxy', 1)
  // Cloud Run sends SIGTERM and allows about 10 seconds before killing the instance.
  app.enableShutdownHooks()
  return app
}

/** Starts listening on all interfaces, as Cloud Run requires. */
export async function listen(app: NestExpressApplication, port: number): Promise<void> {
  await app.listen(port, '0.0.0.0')
  app.get(Logger).log(`Listening on port ${port}`, 'Bootstrap')
}
