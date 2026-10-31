const DEFAULT_RETRY_DELAY_MS = 15_000
const MAX_RETRY_DELAY_MS = 60_000
const MAX_RETRIES = 2

export interface RetryClassification {
  isRateLimited: boolean
  retryDelayMs?: number
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const e = error as Record<string, unknown>
  if (typeof e.status === 'number') return e.status
  if (typeof e.statusCode === 'number') return e.statusCode
  return undefined
}

function getRetryAfterHeaderMs(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const headers = (error as { headers?: unknown }).headers
  if (!headers || typeof headers !== 'object') return undefined
  const value = (headers as Record<string, unknown>)['retry-after']
  if (typeof value !== 'string') return undefined
  const seconds = Number(value)
  return Number.isNaN(seconds) ? undefined : seconds * 1000
}

/** Parses the `retryDelay: "24s"` field Google's API puts in its RetryInfo error detail. */
function getGoogleRetryDelayMs(message: string): number | undefined {
  try {
    const parsed = JSON.parse(message) as { error?: { details?: unknown[] } }
    const details = parsed.error?.details
    if (!Array.isArray(details)) return undefined
    for (const detail of details) {
      const retryDelay = (detail as Record<string, unknown>)?.retryDelay
      if (typeof retryDelay === 'string') {
        const match = /^([\d.]+)s$/.exec(retryDelay)
        if (match) return Math.ceil(parseFloat(match[1]) * 1000)
      }
    }
  } catch {
    // message wasn't JSON in this shape; not Google's error format
  }
  return undefined
}

/**
 * Classifies whether an error from any of our AI providers (OpenAI, Gemini,
 * Claude, DeepSeek) represents a transient rate limit (HTTP 429 / Gemini's
 * RESOURCE_EXHAUSTED) worth retrying, and how long to wait first if the
 * provider told us.
 */
export function classifyRetryableError(error: unknown): RetryClassification {
  const status = getHttpStatus(error)
  const message = error instanceof Error ? error.message : undefined
  const isRateLimited = status === 429 || (typeof message === 'string' && message.includes('RESOURCE_EXHAUSTED'))
  if (!isRateLimited) return { isRateLimited: false }

  const retryDelayMs = getRetryAfterHeaderMs(error) ?? (message !== undefined ? getGoogleRetryDelayMs(message) : undefined)
  return { isRateLimited: true, retryDelayMs }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Runs `fn`, automatically retrying (up to MAX_RETRIES times) when the
 * failure looks like a transient rate limit, waiting the delay the provider
 * requested when it gave us one. Any other error is thrown immediately.
 */
export async function withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const { isRateLimited, retryDelayMs } = classifyRetryableError(error)
      if (!isRateLimited || attempt >= MAX_RETRIES) throw error
      const delay = Math.min(retryDelayMs ?? DEFAULT_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS)
      await sleep(delay)
    }
  }
}
