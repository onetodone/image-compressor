import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createApiApp } from '../src/api/api.module.js'
import { createWorkerApp } from '../src/worker/worker.module.js'

const base = {
  NODE_ENV: 'test',
  PORT: 0,
  GCP_PROJECT_ID: 'demo-image-compressor',
  SLOW_CALL_THRESHOLD_MS: 1000,
} as const

describe('API service', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    app = await createApiApp({ ...base, CORS_ORIGINS: ['http://localhost:3000'] })
    await app.init()
  })

  afterAll(() => app.close())

  it('reports liveness on GET /health', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' })
  })

  it('allows CORS requests from configured origins only', async () => {
    const allowed = await request(app.getHttpServer()).get('/health').set('Origin', 'http://localhost:3000')
    const denied = await request(app.getHttpServer()).get('/health').set('Origin', 'https://evil.example')

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('does not reveal the server framework', async () => {
    const response = await request(app.getHttpServer()).get('/health')

    expect(response.headers['x-powered-by']).toBeUndefined()
  })
})

describe('worker service', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    app = await createWorkerApp(base)
    await app.init()
  })

  afterAll(() => app.close())

  it('reports liveness on GET /health', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' })
  })

  it('does not send CORS headers', async () => {
    const response = await request(app.getHttpServer()).get('/health').set('Origin', 'http://localhost:3000')

    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })
})
