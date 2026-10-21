import type { NestExpressApplication } from '@nestjs/platform-express'
import { utcDayKey } from '@onetodone/image-compressor-shared'
import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore'
import sharp from 'sharp'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createTestWorkerApp } from './support/app.js'
import { workerConfig } from './support/config.js'
import { clearFirestore } from './support/emulators.js'
import type { InMemoryImageCdn, InMemoryObjectStorage } from './support/fakes.js'
import { fixture } from './support/fixtures.js'

const UID = 'user-1'
const JOB_ID = 'a1B2c3D4e5F6g7H8i9J0'
const INPUT_KEY = `originals/${UID}/${JOB_ID}`
const LAST_RETRY = String(workerConfig.TASKS_MAX_ATTEMPTS - 1)

describe('POST /tasks/compress', () => {
  let app: NestExpressApplication
  let storage: InMemoryObjectStorage
  let cdn: InMemoryImageCdn
  let firestore: Firestore
  const today = utcDayKey(new Date())

  beforeAll(async () => {
    ;({ app, storage, cdn } = await createTestWorkerApp())
    firestore = app.get(Firestore)
  })

  afterAll(() => app.close())

  beforeEach(async () => {
    await clearFirestore()
    storage.objects.clear()
    storage.unavailable.clear()
    cdn.reset()
  })

  const deliver = (body: object = { jobId: JOB_ID }, retryCount?: string) => {
    const call = request(app.getHttpServer()).post('/tasks/compress').send(body)
    return retryCount === undefined ? call : call.set('X-CloudTasks-TaskRetryCount', retryCount)
  }
  const job = async () => (await firestore.doc(`jobs/${JOB_ID}`).get()).data()
  const jobsToday = async () => (await firestore.doc(`users/${UID}`).get()).get('jobsToday') as number

  async function queueJob(file: Buffer, fields: Record<string, unknown> = {}): Promise<void> {
    storage.upload(INPUT_KEY, { data: file, contentType: 'image/jpeg' })
    const now = FieldValue.serverTimestamp()
    await firestore.doc(`users/${UID}`).set({ dayKey: today, jobsToday: 2, isAnonymous: true, createdAt: now })
    await firestore.doc(`jobs/${JOB_ID}`).set({
      ownerId: UID,
      status: 'queued',
      originalName: 'photo.jpg',
      inputType: 'image/jpeg',
      inputKey: INPUT_KEY,
      inputBytes: file.length,
      outputKey: null,
      outputBytes: null,
      width: null,
      height: null,
      previewUrl: null,
      error: null,
      attempts: 0,
      quotaDayKey: today,
      quotaRefunded: false,
      createdAt: now,
      updatedAt: now,
      finishedAt: null,
      ...fields,
    })
  }

  it('compresses a queued JPEG and stores the smaller result', async () => {
    const original = fixture('photo.jpg')
    await queueJob(original)

    await deliver().expect(200, { jobId: JOB_ID, outcome: 'done' })

    const outputKey = `results/${UID}/${JOB_ID}.jpg`
    const result = storage.objects.get(outputKey)
    expect(result?.contentType).toBe('image/jpeg')
    expect(result!.size).toBeLessThan(original.length)
    expect(await job()).toMatchObject({
      status: 'done',
      inputType: 'image/jpeg',
      inputBytes: original.length,
      outputKey,
      outputBytes: result!.size,
      width: 160,
      height: 120,
      previewUrl: `https://cdn.test/image/upload/c_limit,f_auto,q_auto,w_800/v1/test/${JOB_ID}`,
      error: null,
      attempts: 1,
      finishedAt: expect.any(Timestamp),
    })
    expect(cdn.assets.get(JOB_ID)).toEqual(result!.data)
    expect(await jobsToday()).toBe(2)
  })

  it('stores the type detected from the content, not the declared one', async () => {
    await queueJob(fixture('graphic.png'))

    await deliver().expect(200)

    expect(await job()).toMatchObject({
      status: 'done',
      inputType: 'image/png',
      outputKey: `results/${UID}/${JOB_ID}.png`,
    })
    expect((await sharp(storage.objects.get(`results/${UID}/${JOB_ID}.png`)!.data).metadata()).format).toBe('png')
  })

  it('takes over a job left in processing by a crashed attempt', async () => {
    await queueJob(fixture('photo.jpg'), { status: 'processing', attempts: 1 })

    await deliver({ jobId: JOB_ID }, '1').expect(200, { jobId: JOB_ID, outcome: 'done' })

    expect(await job()).toMatchObject({ status: 'done', attempts: 2 })
  })

  it('does nothing for a job that is already finished', async () => {
    for (const status of ['done', 'failed']) {
      await queueJob(fixture('photo.jpg'), { status })

      await deliver().expect(200, { jobId: JOB_ID, outcome: 'skipped' })

      expect(await job()).toMatchObject({ status, attempts: 0 })
      expect(storage.objects.size).toBe(1)
    }
  })

  it('ignores jobs that do not exist or were never submitted', async () => {
    await deliver().expect(200, { jobId: JOB_ID, outcome: 'skipped' })

    await queueJob(fixture('photo.jpg'), { status: 'awaiting_upload' })
    await deliver().expect(200, { jobId: JOB_ID, outcome: 'skipped' })
    expect(await job()).toMatchObject({ status: 'awaiting_upload' })
  })

  it('finishes a job once when the same task is delivered concurrently', async () => {
    await queueJob(fixture('photo.jpg'))

    const responses = await Promise.all([deliver(), deliver(), deliver()])

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200])
    expect(responses.filter((response) => response.body.outcome === 'done').length).toBeGreaterThanOrEqual(1)
    expect(await job()).toMatchObject({ status: 'done' })
    expect(await jobsToday()).toBe(2)
  })

  it('fails a corrupt image permanently and refunds the quota exactly once', async () => {
    await queueJob(fixture('corrupt.jpg'))

    await deliver().expect(200, { jobId: JOB_ID, outcome: 'failed' })
    await deliver().expect(200, { jobId: JOB_ID, outcome: 'skipped' })

    expect(await job()).toMatchObject({
      status: 'failed',
      error: 'The file is not a valid JPEG or PNG image',
      quotaRefunded: true,
      outputKey: null,
      finishedAt: expect.any(Timestamp),
    })
    expect(await jobsToday()).toBe(1)
  })

  it('fails a job whose original is missing', async () => {
    await queueJob(fixture('photo.jpg'))
    storage.objects.clear()

    await deliver().expect(200, { jobId: JOB_ID, outcome: 'failed' })

    expect(await job()).toMatchObject({ status: 'failed', error: 'The uploaded file is no longer available' })
  })

  it('does not refund a job whose quota was counted on an earlier day', async () => {
    await queueJob(fixture('corrupt.jpg'), { quotaDayKey: '2000-01-01' })

    await deliver().expect(200)

    expect(await job()).toMatchObject({ status: 'failed', quotaRefunded: false })
    expect(await jobsToday()).toBe(2)
  })

  it('refunds by the creation day for jobs stored without a quota day', async () => {
    await queueJob(fixture('corrupt.jpg'))
    await firestore.doc(`jobs/${JOB_ID}`).update({ quotaDayKey: FieldValue.delete() })

    await deliver().expect(200)

    expect(await job()).toMatchObject({ status: 'failed', quotaRefunded: true })
    expect(await jobsToday()).toBe(1)
  })

  it('asks for a retry on a transient storage error and keeps the job processing', async () => {
    await queueJob(fixture('photo.jpg'))
    storage.unavailable.add('put')

    const response = await deliver().expect(503)

    expect(JSON.stringify(response.body)).not.toContain('R2')
    expect(await job()).toMatchObject({ status: 'processing', attempts: 1, quotaRefunded: false })
    expect(await jobsToday()).toBe(2)

    storage.unavailable.clear()
    await deliver({ jobId: JOB_ID }, '1').expect(200, { jobId: JOB_ID, outcome: 'done' })
  })

  it('finishes without a preview when no CDN is configured', async () => {
    await queueJob(fixture('photo.jpg'))
    cdn.disabled = true

    await deliver().expect(200, { jobId: JOB_ID, outcome: 'done' })

    expect(await job()).toMatchObject({ status: 'done', previewUrl: null, outputKey: `results/${UID}/${JOB_ID}.jpg` })
    expect(cdn.assets.size).toBe(0)
  })

  it('asks for a retry when the CDN is unavailable and finishes on the next delivery', async () => {
    await queueJob(fixture('photo.jpg'))
    cdn.unavailable.add('upload')

    await deliver().expect(503)

    expect(await job()).toMatchObject({ status: 'processing', previewUrl: null })

    cdn.unavailable.clear()
    await deliver({ jobId: JOB_ID }, '1').expect(200, { jobId: JOB_ID, outcome: 'done' })
    expect(await job()).toMatchObject({ status: 'done', previewUrl: expect.stringContaining(JOB_ID) })
    expect(cdn.assets.size).toBe(1)
  })

  it('removes its own result when the job is deleted while it is being compressed', async () => {
    await queueJob(fixture('photo.jpg'))
    cdn.beforeUpload = async () => {
      await firestore.doc(`jobs/${JOB_ID}`).delete()
    }

    await deliver().expect(200, { jobId: JOB_ID, outcome: 'skipped' })

    expect(await job()).toBeUndefined()
    expect(storage.objects.has(`results/${UID}/${JOB_ID}.jpg`)).toBe(false)
    expect(cdn.assets.size).toBe(0)
  })

  it('fails the job and refunds the quota when the last attempt hits a transient error', async () => {
    await queueJob(fixture('photo.jpg'), { status: 'processing', attempts: workerConfig.TASKS_MAX_ATTEMPTS - 1 })
    storage.unavailable.add('get')

    await deliver({ jobId: JOB_ID }, LAST_RETRY).expect(200, { jobId: JOB_ID, outcome: 'failed' })

    expect(await job()).toMatchObject({
      status: 'failed',
      error: 'The image could not be processed. Please try again later.',
      attempts: workerConfig.TASKS_MAX_ATTEMPTS,
      quotaRefunded: true,
    })
    expect(await jobsToday()).toBe(1)
  })

  it('rejects a task without a valid job id', async () => {
    await deliver({}).expect(400)
    await deliver({ jobId: '../users/user-1' }).expect(400)
  })
})
