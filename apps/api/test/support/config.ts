import type { ApiConfig, BaseConfig, R2Config, WorkerConfig } from '../../src/common/config/config.js'

export const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'demo-image-compressor-test'

const baseConfig: BaseConfig = {
  NODE_ENV: 'test',
  PORT: 0,
  GCP_PROJECT_ID: PROJECT_ID,
  SLOW_CALL_THRESHOLD_MS: 1000,
}

const r2Config: R2Config = {
  R2_ACCOUNT_ID: 'test-account',
  R2_ACCESS_KEY_ID: 'test-key',
  R2_SECRET_ACCESS_KEY: 'test-secret',
  R2_BUCKET: 'test-bucket',
}

export const workerConfig: WorkerConfig = {
  ...baseConfig,
  ...r2Config,
  TASKS_MAX_ATTEMPTS: 3,
}

export const apiConfig: ApiConfig = {
  ...baseConfig,
  ...r2Config,
  CORS_ORIGINS: ['http://localhost:3000'],
  TASKS_MODE: 'direct',
  WORKER_URL: 'http://127.0.0.1:9',
}
