import {
  ObjectStorage,
  type PresignedUpload,
  type StoredObject,
  type UploadConstraints,
} from '../../src/common/r2/object-storage.js'
import { TaskQueue } from '../../src/common/tasks/task-queue.js'

/** An object held by {@link InMemoryObjectStorage}. */
export interface InMemoryObject extends StoredObject {
  data: Buffer
}

/** {@link ObjectStorage} kept in memory; {@link upload} plays the client's `PUT` to a presigned URL. */
export class InMemoryObjectStorage extends ObjectStorage {
  readonly objects = new Map<string, InMemoryObject>()
  readonly presigned = new Map<string, UploadConstraints & { expiresInSeconds: number }>()
  /** Operations that fail as if R2 was unavailable, until removed. */
  readonly unavailable = new Set<'get' | 'put'>()

  presignUpload(key: string, constraints: UploadConstraints, expiresInSeconds: number): Promise<PresignedUpload> {
    this.presigned.set(key, { ...constraints, expiresInSeconds })
    const url = `https://storage.test/${key}?X-Amz-Signature=test`
    return Promise.resolve({ url, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) })
  }

  head(key: string): Promise<StoredObject | null> {
    const object = this.objects.get(key)
    return Promise.resolve(object ? { size: object.size, contentType: object.contentType } : null)
  }

  get(key: string): Promise<Buffer | null> {
    if (this.unavailable.has('get')) return Promise.reject(new Error('R2 is unavailable'))
    return Promise.resolve(this.objects.get(key)?.data ?? null)
  }

  put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.unavailable.has('put')) return Promise.reject(new Error('R2 is unavailable'))
    this.objects.set(key, { data: body, size: body.length, contentType })
    return Promise.resolve()
  }

  /**
   * Stores an object as if it was uploaded through the presigned URL, with the signed type and size
   * by default. Without `data`, the content is zero bytes of the stored size.
   */
  upload(key: string, object?: Partial<InMemoryObject>): void {
    const signed = this.presigned.get(key)
    const size = object?.data?.length ?? object?.size ?? signed?.contentLength ?? 1
    this.objects.set(key, { contentType: signed?.contentType, data: Buffer.alloc(size), size, ...object })
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
