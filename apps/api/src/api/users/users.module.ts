import { Module } from '@nestjs/common'

import { MeController } from './me.controller.js'
import { QuotaService } from './quota.service.js'

/** `GET /me` and the daily job quota. */
@Module({ controllers: [MeController], providers: [QuotaService], exports: [QuotaService] })
export class UsersModule {}
