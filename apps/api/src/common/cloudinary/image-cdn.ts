/**
 * CDN that serves preview images of compressed results. Injected by this class, so tests can replace
 * the Cloudinary implementation with an in-memory one.
 */
export abstract class ImageCdn {
  /**
   * Stores the compressed image of a job, replacing an earlier upload for the same job.
   * @returns delivery URL of a preview resized for the browser, or `null` when previews are disabled
   */
  abstract upload(jobId: string, data: Buffer): Promise<string | null>

  /** Removes the image of a job. Does nothing if there is none. */
  abstract delete(jobId: string): Promise<void>
}

/** {@link ImageCdn} used when no CDN is configured: no previews, the browser loads results from R2. */
export class DisabledImageCdn extends ImageCdn {
  upload(): Promise<null> {
    return Promise.resolve(null)
  }

  delete(): Promise<void> {
    return Promise.resolve()
  }
}
