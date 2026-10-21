import { Module } from '@nestjs/common'

import { UsersModule } from '../users/users.module.js'
import { JobsController } from './jobs.controller.js'
import { JobsService } from './jobs.service.js'

/** Job listing, job creation with presigned uploads and job submission. */
@Module({ imports: [UsersModule], controllers: [JobsController], providers: [JobsService] })
export class JobsModule {}
