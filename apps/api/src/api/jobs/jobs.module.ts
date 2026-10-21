import { Module } from '@nestjs/common'

import { UsersModule } from '../users/users.module.js'
import { JobsController } from './jobs.controller.js'
import { JobsService } from './jobs.service.js'

/** Job creation with presigned uploads, submission, listing, downloads and deletion. */
@Module({ imports: [UsersModule], controllers: [JobsController], providers: [JobsService] })
export class JobsModule {}
