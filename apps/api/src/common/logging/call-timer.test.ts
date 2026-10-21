import { describe, expect, it, vi } from 'vitest'

import { CallTimer } from './call-timer.js'

function setup(thresholdMs: number) {
  const logger = { warn: vi.fn() }
  return { logger, timer: new CallTimer(thresholdMs, logger) }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('CallTimer', () => {
  it('returns the result of the call', async () => {
    const { timer } = setup(1000)

    await expect(timer.measure('firestore', 'users.get', () => Promise.resolve(42))).resolves.toBe(42)
  })

  it('does not log calls within the threshold', async () => {
    const { logger, timer } = setup(1000)

    await timer.measure('firestore', 'users.get', () => Promise.resolve())

    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('logs a warning with service, operation and duration for slow calls', async () => {
    const { logger, timer } = setup(5)

    await timer.measure('firestore', 'users.get', () => wait(20))

    expect(logger.warn).toHaveBeenCalledOnce()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ service: 'firestore', operation: 'users.get', durationMs: expect.any(Number) }),
      expect.stringContaining('users.get'),
    )
  })

  it('logs slow calls that fail and rethrows the error', async () => {
    const { logger, timer } = setup(5)
    const failing = () => wait(20).then(() => Promise.reject(new Error('unavailable')))

    await expect(timer.measure('firestore', 'users.get', failing)).rejects.toThrow('unavailable')
    expect(logger.warn).toHaveBeenCalledOnce()
  })
})
