import { Module } from '@nestjs/common'

import { HealthController } from './health.controller.js'

/** Liveness endpoint `GET /health`, mounted by both services. */
@Module({ controllers: [HealthController] })
export class HealthModule {}
