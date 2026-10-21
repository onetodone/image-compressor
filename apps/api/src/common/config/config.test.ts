import { describe, expect, it } from 'vitest'

import { apiConfigSchema, parseConfig, workerConfigSchema } from './config.js'

const apiEnv = {
  GCP_PROJECT_ID: 'demo-image-compressor',
  CORS_ORIGINS: 'http://localhost:3000, https://example.web.app',
}

describe('parseConfig', () => {
  it('applies defaults for optional variables', () => {
    const config = parseConfig(workerConfigSchema, { GCP_PROJECT_ID: 'demo' })

    expect(config).toEqual({
      NODE_ENV: 'development',
      PORT: 8080,
      GCP_PROJECT_ID: 'demo',
      SLOW_CALL_THRESHOLD_MS: 1000,
    })
  })

  it('coerces numeric variables', () => {
    const config = parseConfig(workerConfigSchema, {
      GCP_PROJECT_ID: 'demo',
      PORT: '3002',
      SLOW_CALL_THRESHOLD_MS: '250',
    })

    expect(config.PORT).toBe(3002)
    expect(config.SLOW_CALL_THRESHOLD_MS).toBe(250)
  })

  it('splits CORS origins into a trimmed list', () => {
    expect(parseConfig(apiConfigSchema, apiEnv).CORS_ORIGINS).toEqual([
      'http://localhost:3000',
      'https://example.web.app',
    ])
  })

  it('lists every missing or invalid variable in one error', () => {
    expect(() => parseConfig(apiConfigSchema, { PORT: 'abc', CORS_ORIGINS: 'not a url' })).toThrow(
      /PORT[\s\S]*GCP_PROJECT_ID[\s\S]*CORS_ORIGINS/,
    )
  })

  it('rejects an empty required variable', () => {
    expect(() => parseConfig(apiConfigSchema, { ...apiEnv, GCP_PROJECT_ID: '' })).toThrow(/GCP_PROJECT_ID/)
  })

  it('rejects an empty CORS origin list', () => {
    expect(() => parseConfig(apiConfigSchema, { ...apiEnv, CORS_ORIGINS: ' , ' })).toThrow(/CORS_ORIGINS/)
  })
})
