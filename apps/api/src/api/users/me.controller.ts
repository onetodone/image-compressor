import { Controller, Get } from '@nestjs/common'
import type { MeResponse } from '@onetodone/image-compressor-shared'

import type { AuthUser } from '../auth/auth-user.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { QuotaService } from './quota.service.js'

@Controller('me')
export class MeController {
  constructor(private readonly quota: QuotaService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    return { uid: user.uid, isAnonymous: user.isAnonymous, quota: await this.quota.get(user) }
  }
}
