import type { NestExpressApplication } from '@nestjs/platform-express'
import {
  createJobResponseSchema,
  type CreateJobResponse,
  MAX_INPUT_BYTES,
  submitJobResponseSchema,
  UPLOAD_URL_TTL_SECONDS,
  utcDayKey,
} from '@onetodone/image-compressor-shared'
import { Firestore } from 'firebase-admin/firestore'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createTestApiApp } from './support/app.js'
import { clearFirestore, signInAnonymously } from './support/emulators.js'
import type { InMemoryObjectStorage, RecordingTaskQueue } from './support/fakes.js'

const photo = { originalName: 'photo.jpg', contentType: 'image/jpeg', size: 2048 }

describe('jobs', () => {
  let app: NestExpressApplication
  let storage: InMemoryObjectStorage
  let tasks: RecordingTaskQueue
  let firestore: Firestore
  let user: { token: string; uid: string }

  beforeAll(async () => {
    ;({ app, storage, tasks } = await createTestApiApp())
    firestore = app.get(Firestore)
  })

  afterAll(() => app.close())

  beforeEach(async () => {
    await clearFirestore()
    storage.objects.clear()
    storage.presigned.clear()
    tasks.enqueued.length = 0
    user = await signInAnonymously()
  })

  const http = () => request(app.getHttpServer())
  const auth = (token = user.token) => ({ Authorization: `Bearer ${token}` })

  async function createJob(body: object = photo, token = user.token): Promise<CreateJobResponse> {
    const response = await http().post('/jobs').set(auth(token)).send(body).expect(201)
    return createJobResponseSchema.parse(response.body)
  }

  const submit = (jobId: string, token = user.token) => http().post(`/jobs/${jobId}/submit`).set(auth(token))
  const job = async (jobId: string) => (await firestore.doc(`jobs/${jobId}`).get()).data()
  const jobsToday = async () => (await firestore.doc(`users/${user.uid}`).get()).get('jobsToday') as number | undefined
  const useWholeQuota = () =>
    firestore.doc(`users/${user.uid}`).set({ dayKey: utcDayKey(new Date()), jobsToday: 5, isAnonymous: true })

  describe('POST /jobs', () => {
    it('requires a token', async () => {
      await http().post('/jobs').send(photo).expect(401)
    })

    it('creates a job awaiting upload and returns a presigned upload URL', async () => {
      const before = Date.now()
      const { jobId, uploadUrl, uploadExpiresAt } = await createJob()

      const inputKey = `originals/${user.uid}/${jobId}`
      expect(uploadUrl).toContain(inputKey)
      expect(Date.parse(uploadExpiresAt)).toBeGreaterThanOrEqual(before + UPLOAD_URL_TTL_SECONDS * 1000)
      expect(storage.presigned.get(inputKey)).toEqual({
        contentType: 'image/jpeg',
        contentLength: 2048,
        expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
      })
      expect(await job(jobId)).toMatchObject({
        ownerId: user.uid,
        status: 'awaiting_upload',
        originalName: 'photo.jpg',
        inputType: 'image/jpeg',
        inputKey,
        inputBytes: null,
        outputKey: null,
        attempts: 0,
        quotaRefunded: false,
        createdAt: expect.anything(),
        finishedAt: null,
      })
    })

    it('does not consume quota', async () => {
      await createJob()

      expect(await jobsToday()).toBeUndefined()
    })

    it.each([
      ['an unsupported type', { ...photo, contentType: 'image/webp' }],
      ['a file over 10 MB', { ...photo, size: MAX_INPUT_BYTES + 1 }],
      ['a missing name', { contentType: 'image/png', size: 10 }],
      ['a name with a path', { ...photo, originalName: '../photo.jpg' }],
    ])('rejects %s', async (_case, body) => {
      const response = await http().post('/jobs').set(auth()).send(body).expect(400)

      expect(response.body.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: expect.any(String) })]),
      )
      expect(storage.presigned.size).toBe(0)
    })

    it('refuses to create a job when the daily quota is used up', async () => {
      await useWholeQuota()

      await http().post('/jobs').set(auth()).send(photo).expect(429)
    })
  })

  describe('POST /jobs/:id/submit', () => {
    it('consumes quota, queues the job and enqueues it', async () => {
      const { jobId } = await createJob()
      storage.upload(`originals/${user.uid}/${jobId}`)

      const response = await submit(jobId).expect(200)

      expect(submitJobResponseSchema.parse(response.body)).toEqual({ jobId, status: 'queued' })
      expect(await job(jobId)).toMatchObject({ status: 'queued', inputBytes: 2048 })
      expect(await jobsToday()).toBe(1)
      expect(tasks.enqueued).toEqual([jobId])
    })

    it('rejects a submit before the file is uploaded', async () => {
      const { jobId } = await createJob()

      await submit(jobId).expect(409)

      expect(await job(jobId)).toMatchObject({ status: 'awaiting_upload' })
      expect(await jobsToday()).toBeUndefined()
      expect(tasks.enqueued).toEqual([])
    })

    it('rejects an object whose type or size does not match the job', async () => {
      const { jobId } = await createJob()
      const key = `originals/${user.uid}/${jobId}`

      storage.upload(key, { contentType: 'image/png' })
      await submit(jobId).expect(400)
      storage.upload(key, { size: MAX_INPUT_BYTES + 1 })
      await submit(jobId).expect(400)

      expect(await job(jobId)).toMatchObject({ status: 'awaiting_upload' })
      expect(await jobsToday()).toBeUndefined()
    })

    it('leaves the job awaiting upload when the daily quota is used up', async () => {
      const { jobId } = await createJob()
      storage.upload(`originals/${user.uid}/${jobId}`)
      await useWholeQuota()

      await submit(jobId).expect(429)

      expect(await job(jobId)).toMatchObject({ status: 'awaiting_upload' })
      expect(tasks.enqueued).toEqual([])
    })

    it('consumes quota once when the same job is submitted again', async () => {
      const { jobId } = await createJob()
      storage.upload(`originals/${user.uid}/${jobId}`)

      await submit(jobId).expect(200)
      const response = await submit(jobId).expect(200)

      expect(response.body).toEqual({ jobId, status: 'queued' })
      expect(await jobsToday()).toBe(1)
      expect(tasks.enqueued).toEqual([jobId, jobId])
    })

    it('consumes quota once under concurrent submits of the same job', async () => {
      const { jobId } = await createJob()
      storage.upload(`originals/${user.uid}/${jobId}`)

      const responses = await Promise.all(Array.from({ length: 4 }, () => submit(jobId)))

      expect(responses.some((response) => response.status === 200)).toBe(true)
      expect(await jobsToday()).toBe(1)
      expect(await job(jobId)).toMatchObject({ status: 'queued' })
    })

    it('does not enqueue a job that already finished', async () => {
      const { jobId } = await createJob()
      await firestore.doc(`jobs/${jobId}`).update({ status: 'done' })

      const response = await submit(jobId).expect(200)

      expect(response.body).toEqual({ jobId, status: 'done' })
      expect(tasks.enqueued).toEqual([])
    })

    it("hides another user's job", async () => {
      const { jobId } = await createJob()
      storage.upload(`originals/${user.uid}/${jobId}`)
      const other = await signInAnonymously()

      await submit(jobId, other.token).expect(404)

      expect(await job(jobId)).toMatchObject({ status: 'awaiting_upload' })
    })

    it('answers 404 for unknown and malformed job ids', async () => {
      await submit('a1B2c3D4e5F6g7H8i9J0').expect(404)
      await submit('not-a-job-id').expect(404)
    })
  })
})
