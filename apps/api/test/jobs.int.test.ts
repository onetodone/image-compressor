import type { NestExpressApplication } from '@nestjs/platform-express'
import {
  createJobResponseSchema,
  type CreateJobResponse,
  listJobsResponseSchema,
  MAX_INPUT_BYTES,
  submitJobResponseSchema,
  UPLOAD_URL_TTL_SECONDS,
  utcDayKey,
} from '@onetodone/image-compressor-shared'
import { Firestore, Timestamp } from 'firebase-admin/firestore'
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
        quotaDayKey: null,
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
      expect(await job(jobId)).toMatchObject({ status: 'queued', inputBytes: 2048, quotaDayKey: utcDayKey(new Date()) })
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

  describe('GET /jobs', () => {
    const list = (query = '', token = user.token) => http().get(`/jobs${query}`).set(auth(token))

    /** Stores jobs created one second apart, oldest first, and returns their ids newest first. */
    async function seedJobs(count: number, ownerId = user.uid): Promise<string[]> {
      const ids: string[] = []
      for (let i = 0; i < count; i++) {
        const ref = firestore.collection('jobs').doc()
        await ref.set({
          ownerId,
          status: 'done',
          originalName: `photo-${i}.jpg`,
          inputType: 'image/jpeg',
          inputKey: `originals/${ownerId}/${ref.id}`,
          inputBytes: 2048,
          outputKey: `results/${ownerId}/${ref.id}.jpg`,
          outputBytes: 1024,
          width: 64,
          height: 48,
          previewUrl: null,
          error: null,
          createdAt: Timestamp.fromMillis(Date.UTC(2026, 9, 21, 10, 0, i)),
          finishedAt: Timestamp.fromMillis(Date.UTC(2026, 9, 21, 10, 0, i, 500)),
        })
        ids.unshift(ref.id)
      }
      return ids
    }

    it('requires a token', async () => {
      await http().get('/jobs').expect(401)
    })

    it("returns the user's jobs newest first without storage keys", async () => {
      const ids = await seedJobs(3)
      await seedJobs(2, 'someone-else')

      const response = await list().expect(200)

      const page = listJobsResponseSchema.parse(response.body)
      expect(page.jobs.map((job) => job.id)).toEqual(ids)
      expect(page.nextCursor).toBeNull()
      expect(page.jobs[0]).toEqual({
        id: ids[0],
        status: 'done',
        originalName: 'photo-2.jpg',
        inputType: 'image/jpeg',
        inputBytes: 2048,
        outputBytes: 1024,
        width: 64,
        height: 48,
        previewUrl: null,
        error: null,
        createdAt: '2026-10-21T10:00:02.000Z',
        finishedAt: '2026-10-21T10:00:02.500Z',
      })
      expect(response.body.jobs[0]).not.toHaveProperty('inputKey')
    })

    it('pages through all jobs with the cursor', async () => {
      const ids = await seedJobs(5)

      const first = listJobsResponseSchema.parse((await list('?limit=2').expect(200)).body)
      const second = listJobsResponseSchema.parse((await list(`?limit=2&cursor=${first.nextCursor}`).expect(200)).body)
      const third = listJobsResponseSchema.parse((await list(`?limit=2&cursor=${second.nextCursor}`).expect(200)).body)

      expect([...first.jobs, ...second.jobs, ...third.jobs].map((job) => job.id)).toEqual(ids)
      expect(third.nextCursor).toBeNull()
    })

    it('includes a job created through the API', async () => {
      const { jobId } = await createJob()

      const page = listJobsResponseSchema.parse((await list().expect(200)).body)

      expect(page.jobs).toEqual([expect.objectContaining({ id: jobId, status: 'awaiting_upload', inputBytes: null })])
    })

    it('returns an empty page for a user without jobs', async () => {
      expect((await list().expect(200)).body).toEqual({ jobs: [], nextCursor: null })
    })

    it('rejects an invalid cursor or page size', async () => {
      await list('?cursor=garbage').expect(400)
      await list('?limit=0').expect(400)
      await list('?limit=51').expect(400)
    })
  })
})
