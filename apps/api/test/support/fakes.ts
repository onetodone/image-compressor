import {
  ObjectStorage,
  type PresignedUpload,
  type StoredObject,
  type UploadConstraints,
} from '../../src/common/r2/object-storage.js'
import { TaskQueue } from '../../src/common/tasks/task-queue.js'

/** {@link ObjectStorage} kept in memory; {@link upload} plays the client's `PUT` to a presigned URL. */
export class InMemoryObjectStorage extends ObjectStorage {
  readonly objects = new Map<string, StoredObject>()
  readonly presigned = new Map<string, UploadConstraints & { expiresInSeconds: number }>()

  presignUpload(key: string, constraints: UploadConstraints, expiresInSeconds: number): Promise<PresignedUpload> {
    this.presigned.set(key, { ...constraints, expiresInSeconds })
    const url = `https://storage.test/${key}?X-Amz-Signature=test`
    return Promise.resolve({ url, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) })
  }

  head(key: string): Promise<StoredObject | null> {
    return Promise.resolve(this.objects.get(key) ?? null)
  }

  /** Stores an object as if it was uploaded through the presigned URL, with the signed type and size by default. */
  upload(key: string, object?: Partial<StoredObject>): void {
    const signed = this.presigned.get(key)
    this.objects.set(key, { size: signed?.contentLength ?? 1, contentType: signed?.contentType, ...object })
  }
}

/** {@link TaskQueue} that only records the jobs it was asked to enqueue. */
export class RecordingTaskQueue extends TaskQueue {
  readonly enqueued: string[] = []

  enqueueCompression(jobId: string): Promise<void> {
    this.enqueued.push(jobId)
    return Promise.resolve()
  }
}
