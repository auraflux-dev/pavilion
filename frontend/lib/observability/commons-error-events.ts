import { commonsDbEnabled, sql } from '@/lib/crm/db'

export async function persistCommonsErrorEvent(opts: {
  eventId: string
  organizationId?: string
  route?: string
  message: string
  stack?: string
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}): Promise<void> {
  if (!commonsDbEnabled()) return
  await sql(
    `insert into error_events (
       event_id, organization_id, route, message, stack, tags_json, extra_json
     ) values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (event_id) do nothing`,
    [
      opts.eventId,
      opts.organizationId || null,
      opts.route || '',
      opts.message.slice(0, 2000),
      (opts.stack || '').slice(0, 8000),
      JSON.stringify(opts.tags || {}),
      JSON.stringify(opts.extra || {}).slice(0, 4000),
    ],
  )
}
