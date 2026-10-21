import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  type CreateJobRequest,
  type CreateJobResponse,
  type JobStatus,
  jobIdSchema,
  MAX_INPUT_BYTES,
  type SubmitJobResponse,
  UPLOAD_URL_TTL_SECONDS,
} from '@onetodone/image-compressor-shared'
import { type DocumentReference, FieldValue, Firestore } from 'firebase-admin/firestore'

import { CallTimer } from '../../common/logging/call-timer.js'
import { originalKey } from '../../common/r2/object-keys.js'
import { ObjectStorage } from '../../common/r2/object-storage.js'
import { TaskQueue } from '../../common/tasks/task-queue.js'
import type { AuthUser } from '../auth/auth-user.js'
import { QuotaService } from '../users/quota.service.js'

const JOBS = 'jobs'

/** Creates jobs with presigned uploads and submits them for compression. */
@Injectable()
export class JobsService {
  constructor(
    private readonly firestore: Firestore,
    private readonly storage: ObjectStorage,
    private readonly tasks: TaskQueue,
    private readonly quota: QuotaService,
    private readonly timer: CallTimer,
  ) {}

  async create(user: AuthUser, request: CreateJobRequest): Promise<CreateJobResponse> {
    // Quota is consumed on submit; checking it here only saves an upload that could never be submitted.
    const quota = await this.quota.get(user)
    if (quota.used >= quota.limit) throw new HttpException('Daily job limit reached', HttpStatus.TOO_MANY_REQUESTS)

    const ref = this.firestore.collection(JOBS).doc()
    const inputKey = originalKey(user.uid, ref.id)
    const upload = await this.storage.presignUpload(
      inputKey,
      { contentType: request.contentType, contentLength: request.size },
      UPLOAD_URL_TTL_SECONDS,
    )

    const now = FieldValue.serverTimestamp()
    await this.timer.measure('firestore', 'jobs.create', () =>
      ref.create({
        ownerId: user.uid,
        status: 'awaiting_upload' satisfies JobStatus,
        originalName: request.originalName,
        // The declared type; the worker replaces it with the type detected from the file.
        inputType: request.contentType,
        inputKey,
        inputBytes: null,
        outputKey: null,
        outputBytes: null,
        width: null,
        height: null,
        previewUrl: null,
        error: null,
        attempts: 0,
        quotaRefunded: false,
        createdAt: now,
        updatedAt: now,
        finishedAt: null,
      }),
    )
    return { jobId: ref.id, uploadUrl: upload.url, uploadExpiresAt: upload.expiresAt.toISOString() }
  }

  /**
   * Confirms the upload, consumes quota and queues the job. Repeating the call is safe: a job that
   * is already queued is enqueued again without consuming more quota, which also recovers a job
   * whose first enqueue failed after the transaction committed.
   */
  async submit(user: AuthUser, jobId: string): Promise<SubmitJobResponse> {
    const ref = this.ref(jobId)
    const snapshot = await this.timer.measure('firestore', 'jobs.get', () => ref.get())
    if (!snapshot.exists || snapshot.get('ownerId') !== user.uid) throw new NotFoundException('Job not found')

    let status = snapshot.get('status') as JobStatus
    if (status === 'awaiting_upload') {
      const inputBytes = await this.verifyUpload(
        snapshot.get('inputKey') as string,
        snapshot.get('inputType') as string,
      )
      status = await this.timer.measure('firestore', 'jobs.submit', () =>
        this.firestore.runTransaction(async (tx) => {
          const current = (await tx.get(ref)).get('status') as JobStatus
          if (current !== 'awaiting_upload') return current
          await this.quota.consume(tx, user)
          tx.update(ref, { status: 'queued', inputBytes, updatedAt: FieldValue.serverTimestamp() })
          return 'queued'
        }),
      )
    }

    if (status === 'queued') await this.tasks.enqueueCompression(jobId)
    return { jobId, status }
  }

  /** Returns the size of the uploaded original after checking it against the job. */
  private async verifyUpload(key: string, declaredType: string): Promise<number> {
    const object = await this.storage.head(key)
    if (!object) throw new ConflictException('The file has not been uploaded')
    // The presigned URL binds type and size, so a mismatch means the object did not come from it.
    if (object.size === 0 || object.size > MAX_INPUT_BYTES) {
      throw new BadRequestException('The file must be between 1 byte and 10 MB')
    }
    if (object.contentType !== declaredType) throw new BadRequestException('The file type does not match the job')
    return object.size
  }

  private ref(jobId: string): DocumentReference {
    if (!jobIdSchema.safeParse(jobId).success) throw new NotFoundException('Job not found')
    return this.firestore.collection(JOBS).doc(jobId)
  }
}
