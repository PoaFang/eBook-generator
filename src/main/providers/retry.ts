const DEFAULT_RETRY_DELAY_MS = 15_000
const MAX_RETRY_DELAY_MS = 60_000
const MAX_RETRIES = 2

export interface RetryClassification {
  isRetryable: boolean
  retryDelayMs?: number
}

interface GoogleErrorBody {
  status?: string
  details?: unknown[]
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

/** Gemini's API wraps its error as `{ error: { status, details } }` JSON, surfaced as the thrown Error's message. */
function parseGoogleErrorBody(message: string): GoogleErrorBody | undefined {
  try {
    const parsed = JSON.parse(message) as { error?: GoogleErrorBody }
    return parsed.error
  } catch {
    return undefined
  }
}

/** Parses the `retryDelay: "24s"` field Google's API puts in its RetryInfo error detail, when present. */
function getGoogleRetryDelayMs(googleError: GoogleErrorBody | undefined): number | undefined {
  const details = googleError?.details
  if (!Array.isArray(details)) return undefined
  for (const detail of details) {
    const retryDelay = (detail as Record<string, unknown>)?.retryDelay
    if (typeof retryDelay === 'string') {
      const match = /^([\d.]+)s$/.exec(retryDelay)
      if (match) return Math.ceil(parseFloat(match[1]) * 1000)
    }
  }
  return undefined
}

// HTTP 429 = rate limited; 503 = temporarily overloaded/unavailable. Both are
// the provider's own way of saying "not your fault, try again shortly".
const RETRYABLE_HTTP_STATUSES = new Set([429, 503])
// Gemini reports both of the above as its own status strings instead of (or
// in addition to) a matching HTTP status, depending on SDK/transport.
const RETRYABLE_GOOGLE_STATUSES = new Set(['RESOURCE_EXHAUSTED', 'UNAVAILABLE'])

/**
 * Classifies whether an error from any of our AI providers (OpenAI, Gemini,
 * Claude, DeepSeek) represents a transient, worth-retrying failure - a rate
 * limit or a temporarily overloaded model - and how long to wait first if
 * the provider told us.
 */
export function classifyRetryableError(error: unknown): RetryClassification {
  const status = getHttpStatus(error)
  const message = error instanceof Error ? error.message : undefined
  const googleError = message !== undefined ? parseGoogleErrorBody(message) : undefined

  const isRetryable =
    (status !== undefined && RETRYABLE_HTTP_STATUSES.has(status)) ||
    (googleError?.status !== undefined && RETRYABLE_GOOGLE_STATUSES.has(googleError.status))

  if (!isRetryable) return { isRetryable: false }

  const retryDelayMs = getRetryAfterHeaderMs(error) ?? getGoogleRetryDelayMs(googleError)
  return { isRetryable: true, retryDelayMs }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Runs `fn`, automatically retrying (up to MAX_RETRIES times) when the
 * failure looks transient (see classifyRetryableError), waiting the delay
 * the provider requested when it gave us one, or a default otherwise. Any
 * other error is thrown immediately.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const { isRetryable, retryDelayMs } = classifyRetryableError(error)
      if (!isRetryable || attempt >= MAX_RETRIES) throw error
      const delay = Math.min(retryDelayMs ?? DEFAULT_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS)
      await sleep(delay)
    }
  }
}
