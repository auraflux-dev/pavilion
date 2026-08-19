import { getAuth } from '@/lib/crm/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handle(req: Request): Promise<Response> {
  const auth = getAuth()
  if (!auth) return new Response('Not found', { status: 404 })
  return auth.handler(req)
}

export const { GET, POST } = toNextJsHandler(handle)
