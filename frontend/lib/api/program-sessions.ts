/**
 * ProgramSessions. concrete meeting times for enrolled programs.
 * Wix CMS → Content Manager → Program Sessions
 *
 * Fields: programId, programName, title, startAt, endAt, location,
 * instructorName, grades, active
 */
import { getWixClient } from '@/lib/wix-client'

export type ProgramSession = {
  id: string
  programId: string
  programName: string
  title: string
  startAt: string | null
  endAt: string | null
  location: string
  instructorName: string
  grades: string
  active: boolean
}

export async function getUpcomingProgramSessions(limit = 40): Promise<ProgramSession[]> {
  const { isDemoInstance } = await import('@/lib/demo/instance')
  if (isDemoInstance()) return []
  try {
    const client = getWixClient()
    const now = new Date().toISOString()
    // Prefer sessions that haven't ended yet; fall back if query shape unsupported
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any
    try {
      result = await (client.items.query('ProgramSessions') as any)
        .eq('active', true)
        .ge('startAt', now)
        .ascending('startAt')
        .limit(limit)
        .find()
    } catch {
      result = await (client.items.query('ProgramSessions') as any)
        .eq('active', true)
        .ascending('startAt')
        .limit(limit)
        .find()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result.items ?? []).map((item: any) => ({
      id: item._id ?? '',
      programId: String(item.programId ?? ''),
      programName: String(item.programName ?? ''),
      title: String(item.title ?? item.programName ?? 'Session'),
      startAt: item.startAt ?? null,
      endAt: item.endAt ?? null,
      location: String(item.location ?? ''),
      instructorName: String(item.instructorName ?? ''),
      grades: String(item.grades ?? ''),
      active: item.active !== false,
    }))
  } catch {
    return []
  }
}
