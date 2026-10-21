import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'

import { AuthGuard } from './auth.guard.js'

/** Registers {@link AuthGuard} for every route of the API. */
@Module({ providers: [{ provide: APP_GUARD, useClass: AuthGuard }] })
export class AuthModule {}
