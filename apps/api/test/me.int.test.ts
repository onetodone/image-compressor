import type { NestExpressApplication } from '@nestjs/platform-express'
import { meResponseSchema } from '@onetodone/image-compressor-shared'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createApiApp } from '../src/api/api.module.js'
import { apiConfig } from './support/config.js'
import { clearFirestore, signInAnonymously, signUpWithEmail } from './support/emulators.js'

describe('GET /me', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    app = await createApiApp(apiConfig)
    await app.init()
  })

  afterAll(() => app.close())

  beforeEach(() => clearFirestore())

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/me').expect(401)
  })

  it('rejects a malformed token', async () => {
    await request(app.getHttpServer()).get('/me').set('Authorization', 'Bearer not-a-token').expect(401)
  })

  it('rejects a non-bearer authorization header', async () => {
    const { token } = await signInAnonymously()

    await request(app.getHttpServer()).get('/me').set('Authorization', `Basic ${token}`).expect(401)
  })

  it('returns the anonymous limit for an anonymous user', async () => {
    const { token, uid } = await signInAnonymously()

    const response = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`).expect(200)

    expect(meResponseSchema.parse(response.body)).toEqual({
      uid,
      isAnonymous: true,
      quota: { dayKey: expect.any(String), used: 0, limit: 5 },
    })
  })

  it('returns the signed-in limit for a non-anonymous user', async () => {
    const { token, uid } = await signUpWithEmail()

    const response = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`).expect(200)

    expect(response.body).toMatchObject({ uid, isAnonymous: false, quota: { used: 0, limit: 30 } })
  })

  it('keeps health checks public', async () => {
    await request(app.getHttpServer()).get('/health').expect(200)
  })
})
