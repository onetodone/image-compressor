import { type UploadApiResponse, v2 as cloudinary } from 'cloudinary'

import type { CallTimer } from '../logging/call-timer.js'
import { ImageCdn } from './image-cdn.js'

interface Credentials {
  cloud_name: string
  api_key: string
  api_secret: string
}

/** Width, format and quality of previews, chosen by Cloudinary for each browser. Never upscales. */
const PREVIEW_TRANSFORMATION = { crop: 'limit', width: 800, fetch_format: 'auto', quality: 'auto' }

/** {@link ImageCdn} on Cloudinary. Assets are named `{CLOUDINARY_FOLDER}/{jobId}`. */
export class CloudinaryImageCdn extends ImageCdn {
  private readonly credentials: Credentials
  private readonly folder: string

  /**
   * @param cloudinaryUrl `cloudinary://<api_key>:<api_secret>@<cloud_name>`
   * @param folder folder the assets are stored in
   */
  constructor(
    cloudinaryUrl: string,
    folder: string,
    private readonly timer: CallTimer,
  ) {
    super()
    const url = new URL(cloudinaryUrl)
    // Credentials are passed with every call instead of through the SDK's process-wide configuration.
    this.credentials = {
      cloud_name: url.hostname,
      api_key: decodeURIComponent(url.username),
      api_secret: decodeURIComponent(url.password),
    }
    this.folder = folder
  }

  async upload(jobId: string, data: Buffer): Promise<string> {
    const publicId = this.publicId(jobId)
    const result = await this.timer.measure(
      'cloudinary',
      'upload',
      () =>
        new Promise<UploadApiResponse>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                ...this.credentials,
                public_id: publicId,
                // Places the asset in the folder on accounts with dynamic folders; the public id
                // already does on accounts with fixed folders.
                asset_folder: this.folder,
                resource_type: 'image',
                overwrite: true,
              },
              (error, response) => (response ? resolve(response) : reject(cloudinaryError('upload', error))),
            )
            .end(data)
        }),
    )
    return cloudinary.url(result.public_id, {
      cloud_name: this.credentials.cloud_name,
      secure: true,
      urlAnalytics: false,
      // The version changes on every upload, so a replaced image is never served from a stale cache.
      version: result.version,
      transformation: [PREVIEW_TRANSFORMATION],
    })
  }

  async delete(jobId: string): Promise<void> {
    const result = (await this.timer.measure('cloudinary', 'destroy', () =>
      cloudinary.uploader
        .destroy(this.publicId(jobId), { ...this.credentials, resource_type: 'image', invalidate: true })
        .catch((error: unknown) => Promise.reject(cloudinaryError('destroy', error))),
    )) as { result?: string }
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary destroy returned ${result.result ?? 'no result'}`)
    }
  }

  private publicId(jobId: string): string {
    return `${this.folder}/${jobId}`
  }
}

/** The SDK rejects with plain objects; turn them into errors that keep the status but no request details. */
function cloudinaryError(operation: string, error: unknown): Error {
  const details = (error ?? {}) as { http_code?: number; message?: string }
  return new Error(
    `Cloudinary ${operation} failed (${details.http_code ?? 'no status'}): ${details.message ?? 'unknown error'}`,
  )
}
