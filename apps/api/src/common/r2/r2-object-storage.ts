import {
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { R2Config } from '../config/config.js'
import type { CallTimer } from '../logging/call-timer.js'
import { ObjectStorage, type PresignedUpload, type StoredObject, type UploadConstraints } from './object-storage.js'

/** {@link ObjectStorage} on Cloudflare R2 through its S3-compatible API. */
export class R2ObjectStorage extends ObjectStorage {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(
    config: R2Config,
    private readonly timer: CallTimer,
  ) {
    super()
    this.bucket = config.R2_BUCKET
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.R2_ACCESS_KEY_ID, secretAccessKey: config.R2_SECRET_ACCESS_KEY },
      // By default the SDK adds checksum parameters that a presigned browser upload cannot satisfy.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }

  async presignUpload(key: string, constraints: UploadConstraints, expiresInSeconds: number): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: constraints.contentType,
      ContentLength: constraints.contentLength,
    })
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
    // The presigner leaves Content-Type unsigned by default; signing it and Content-Length makes R2
    // reject an upload whose type or size differs from what the job was created with.
    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
      signableHeaders: new Set(['content-type', 'content-length']),
    })
    return { url, expiresAt }
  }

  async head(key: string): Promise<StoredObject | null> {
    try {
      const output = await this.timer.measure('r2', 'headObject', () =>
        this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key })),
      )
      return { size: output.ContentLength ?? 0, contentType: output.ContentType }
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) return null
      throw error
    }
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await this.timer.measure('r2', 'getObject', async () => {
        const output = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
        if (!output.Body) throw new Error(`R2 returned no body for ${key}`)
        return Buffer.from(await output.Body.transformToByteArray())
      })
    } catch (error) {
      if (error instanceof NoSuchKey) return null
      throw error
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.timer.measure('r2', 'putObject', () =>
      this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType })),
    )
  }
}
