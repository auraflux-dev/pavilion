/**
 * Fetch helper for Wix APIs with short retries on transient socket errors.
 */
export function isTransientNetworkError(err: unknown): boolean {
  if (!err) return false
  const e = err as { message?: string; code?: string; cause?: { code?: string; message?: string } }
  const code = String(e.code || e.cause?.code || '')
  if (
    code === 'UND_ERR_SOCKET' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'UND_ERR_CONNECT_TIMEOUT'
  ) {
    return true
  }
  const msg = String(e.message || e.cause?.message || '')
  return msg === 'fetch failed' || /other side closed|socket disconnected|ETIMEDOUT/i.test(msg)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  const retries = opts.retries ?? 2
  const baseDelayMs = opts.baseDelayMs ?? 120
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(input, init)
    } catch (err) {
      lastErr = err
      if (!isTransientNetworkError(err) || attempt === retries) throw err
      await sleep(baseDelayMs * (attempt + 1))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('fetch failed')
}
