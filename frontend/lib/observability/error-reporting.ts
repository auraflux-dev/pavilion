/**
 * Env-gated error reporting (no Sentry).
 *
 * Signal: ERROR_REPORTING_ENABLED=true
 * Then errors persist to Wix CMS ErrorEvents (+ optional ERROR_WEBHOOK_URL).
 *
 * Always returns an eventId so parents/staff can paste it when reporting issues.
 */

export function isErrorReportingEnabled(): boolean {
  const v = (process.env.ERROR_REPORTING_ENABLED || '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export function newEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export type ReportErrorOptions = {
  route?: string
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  eventId?: string
  organizationId?: string
}

export async function reportError(
  err: unknown,
  options: ReportErrorOptions = {},
): Promise<string> {
  const eventId = options.eventId || newEventId()
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  const payload = {
    level: 'error' as const,
    eventId,
    route: options.route,
    message,
    stack,
    tags: options.tags,
    extra: options.extra,
    at: new Date().toISOString(),
    reportingEnabled: isErrorReportingEnabled(),
  }

  console.error(`[error ${eventId}]`, options.route || 'unknown', message, err)

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { persistCommonsErrorEvent } = await import(
        '@/lib/observability/commons-error-events'
      )
      await persistCommonsErrorEvent({
        eventId,
        organizationId: options.organizationId,
        route: options.route,
        message,
        stack,
        tags: options.tags,
        extra: options.extra,
      })
    } catch (pgErr) {
      console.warn(
        '[error-reporting] error_events insert skipped',
        pgErr instanceof Error ? pgErr.message : pgErr,
      )
    }
  }

  if (!isErrorReportingEnabled()) return eventId

  const webhook = process.env.ERROR_WEBHOOK_URL?.trim()
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (webhookErr) {
      console.error('[error-reporting] webhook failed', webhookErr)
    }
  }

  try {
    const { getWixClient } = await import('@/lib/wix-client')
    const client = getWixClient()
    await client.items.insert('ErrorEvents', {
      eventId,
      route: options.route || '',
      message: message.slice(0, 2000),
      stack: (stack || '').slice(0, 8000),
      tagsJson: JSON.stringify(options.tags || {}),
      extraJson: JSON.stringify(options.extra || {}).slice(0, 4000),
      createdAt: new Date().toISOString(),
    })
  } catch (cmsErr) {
    console.warn(
      '[error-reporting] ErrorEvents insert skipped',
      cmsErr instanceof Error ? cmsErr.message : cmsErr,
    )
  }

  return eventId
}

export function reportErrorSync(err: unknown, options: ReportErrorOptions = {}): string {
  const eventId = options.eventId || newEventId()
  void reportError(err, { ...options, eventId })
  return eventId
}
