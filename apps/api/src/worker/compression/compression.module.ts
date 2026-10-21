import { Module } from '@nestjs/common'

import { CompressionService } from './compression.service.js'
import { TasksController } from './tasks.controller.js'

/** `POST /tasks/compress`: the handler Cloud Tasks delivers compression tasks to. */
@Module({ controllers: [TasksController], providers: [CompressionService] })
export class CompressionModule {}
