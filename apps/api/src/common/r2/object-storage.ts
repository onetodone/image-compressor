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

/** A URL that lets a client upload or download one object without credentials. */
export interface PresignedUrl {
  url: string
  expiresAt: Date
}

/** Response headers a presigned download is served with. */
export interface DownloadOptions {
  contentType: string
  /** Full `Content-Disposition` header value. */
  contentDisposition: string
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
  abstract presignUpload(key: string, constraints: UploadConstraints, expiresInSeconds: number): Promise<PresignedUrl>

  /**
   * Creates a presigned `GET` URL for `key` that is served with the given headers.
   * @param expiresInSeconds how long the URL stays valid
   */
  abstract presignDownload(key: string, options: DownloadOptions, expiresInSeconds: number): Promise<PresignedUrl>

  /** Returns the size and type of an object, or `null` if it does not exist. */
  abstract head(key: string): Promise<StoredObject | null>

  /** Downloads the content of an object, or returns `null` if it does not exist. */
  abstract get(key: string): Promise<Buffer | null>

  /** Stores `body` under `key`, replacing any existing object. */
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>

  /** Deletes an object. Does nothing if it does not exist. */
  abstract delete(key: string): Promise<void>
}
