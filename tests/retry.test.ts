import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { classifyRetryableError, withRateLimitRetry } from '../src/main/providers/retry'

const GEMINI_429_MESSAGE = JSON.stringify({
  error: {
    code: 429,
    message: 'You exceeded your current quota...',
    status: 'RESOURCE_EXHAUSTED',
    details: [
      { '@type': 'type.googleapis.com/google.rpc.Help', links: [] },
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [{ description: 'Generate content requests per minute limit exceeded', quotaValue: '5' }]
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '24.929668305s' }
    ]
  }
})

describe('classifyRetryableError', () => {
  it('does not treat a plain error as rate-limited', () => {
    expect(classifyRetryableError(new Error('something unrelated went wrong'))).toEqual({ isRateLimited: false })
  })

  it('does not treat a 401 (bad API key) as rate-limited', () => {
    const error = Object.assign(new Error('Incorrect API key provided'), { status: 401 })
    expect(classifyRetryableError(error).isRateLimited).toBe(false)
  })

  it('treats an HTTP 429 status as rate-limited even with no further hints', () => {
    const error = Object.assign(new Error('Too Many Requests'), { status: 429 })
    const result = classifyRetryableError(error)
    expect(result.isRateLimited).toBe(true)
    expect(result.retryDelayMs).toBeUndefined()
  })

  it('reads the retry-after header in seconds when present', () => {
    const error = Object.assign(new Error('Too Many Requests'), { status: 429, headers: { 'retry-after': '3' } })
    expect(classifyRetryableError(error).retryDelayMs).toBe(3000)
  })

  it('recognizes Gemini RESOURCE_EXHAUSTED by message alone (no .status field) and parses retryDelay', () => {
    const error = new Error(GEMINI_429_MESSAGE)
    const result = classifyRetryableError(error)
    expect(result.isRateLimited).toBe(true)
    expect(result.retryDelayMs).toBe(24930) // ceil(24.929668305 * 1000)
  })
})

describe('withRateLimitRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the result immediately when the function succeeds on the first try', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(withRateLimitRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not retry a non-rate-limit error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('invalid request'))
    await expect(withRateLimitRetry(fn)).rejects.toThrow('invalid request')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries after the provider-specified delay and then succeeds', async () => {
    const rateLimitError = Object.assign(new Error('Too Many Requests'), {
      status: 429,
      headers: { 'retry-after': '5' }
    })
    const fn = vi.fn().mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce('ok')

    const promise = withRateLimitRetry(fn)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('gives up after the maximum number of retries and throws the last error', async () => {
    const rateLimitError = Object.assign(new Error('Too Many Requests'), { status: 429 })
    const fn = vi.fn().mockRejectedValue(rateLimitError)

    const promise = withRateLimitRetry(fn)
    const assertion = expect(promise).rejects.toThrow('Too Many Requests')
    await vi.runAllTimersAsync()
    await assertion

    // 1 initial attempt + 2 retries = 3 calls total
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('caps an excessive provider-specified retry delay', async () => {
    const rateLimitError = Object.assign(new Error('Too Many Requests'), {
      status: 429,
      headers: { 'retry-after': '600' } // 10 minutes, should be capped
    })
    const fn = vi.fn().mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce('ok')

    const promise = withRateLimitRetry(fn)
    await vi.advanceTimersByTimeAsync(60_000) // the capped max

    await expect(promise).resolves.toBe('ok')
  })
})
