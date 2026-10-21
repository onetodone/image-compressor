import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common'
import {
  type CreateJobRequest,
  createJobRequestSchema,
  type CreateJobResponse,
  type ListJobsQuery,
  listJobsQuerySchema,
  type ListJobsResponse,
  type SubmitJobResponse,
} from '@onetodone/image-compressor-shared'

import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js'
import type { AuthUser } from '../auth/auth-user.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { JobsService } from './jobs.service.js'

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listJobsQuerySchema)) query: ListJobsQuery,
  ): Promise<ListJobsResponse> {
    return this.jobs.list(user, query)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createJobRequestSchema)) body: CreateJobRequest,
  ): Promise<CreateJobResponse> {
    return this.jobs.create(user, body)
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<SubmitJobResponse> {
    return this.jobs.submit(user, id)
  }
}
