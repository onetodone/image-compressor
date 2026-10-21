import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createApiApp } from '../src/api/api.module.js'
import { createWorkerApp } from '../src/worker/worker.module.js'
import { apiConfig, workerConfig } from './support/config.js'

describe('API service', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    app = await createApiApp(apiConfig)
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
    app = await createWorkerApp(workerConfig)
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
