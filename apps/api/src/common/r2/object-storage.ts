/** Size and type of an object in storage. */
export interface StoredObject {
  size: number
  contentType: string | undefined
}

/** Headers a presigned upload is bound to; the upload must send exactly these values. */
export interface UploadConstraints {
  contentType: string
  contentLength: number
}

/** A URL that lets a client upload one object without credentials. */
export interface PresignedUpload {
  url: string
  expiresAt: Date
}

/**
 * Object storage for originals and results. Injected by this class, so tests can replace the R2
 * implementation with an in-memory one.
 */
export abstract class ObjectStorage {
  /**
   * Creates a presigned `PUT` URL for `key`.
   * @param key object key, e.g. `originals/{uid}/{jobId}`
   * @param constraints headers signed into the URL
   * @param expiresInSeconds how long the URL stays valid
   */
  abstract presignUpload(
    key: string,
    constraints: UploadConstraints,
    expiresInSeconds: number,
  ): Promise<PresignedUpload>

  /** Returns the size and type of an object, or `null` if it does not exist. */
  abstract head(key: string): Promise<StoredObject | null>
}
