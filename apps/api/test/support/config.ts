import type { ApiConfig, WorkerConfig } from '../../src/common/config/config.js'

export const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'demo-image-compressor-test'

export const workerConfig: WorkerConfig = {
  NODE_ENV: 'test',
  PORT: 0,
  GCP_PROJECT_ID: PROJECT_ID,
  SLOW_CALL_THRESHOLD_MS: 1000,
}

export const apiConfig: ApiConfig = { ...workerConfig, CORS_ORIGINS: ['http://localhost:3000'] }
