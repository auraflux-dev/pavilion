import { getWixClient } from '@/lib/wix-client'

export type Committee = 'PTO' | 'SEAC' | 'MSAAC' | 'LEAF'

export interface MeetingMinute {
  _id: string
  committee: Committee
  meetingDate: string
  joinUrl?: string
  minutesContent?: string
  summary?: string
  takeaways?: string
  callToAction?: string
  isUpcoming: boolean
  published: boolean
}

/** Drop CMS placeholder Meet links so visitors never see a fake Join button. */
export function sanitizeMeetingJoinUrl(url: unknown): string | undefined {
  const u = String(url ?? '').trim()
  if (!u) return undefined
  if (/placeholder/i.test(u)) return undefined
  return u
}

function mapMeeting(item: Record<string, unknown>): MeetingMinute {
  const row = item as MeetingMinute
  return {
    ...row,
    joinUrl: sanitizeMeetingJoinUrl(row.joinUrl),
  }
}

export async function getMeetingsByCommittee(committee: Committee): Promise<MeetingMinute[]> {
  const client = getWixClient()
  const result = await client.items
    .query('MeetingMinutes')
    .eq('committee', committee)
    .eq('published', true)
    .descending('meetingDate')
    .find()
  return result.items.map((item: any) => mapMeeting(item))
}

export async function getAllPublishedMeetings(): Promise<MeetingMinute[]> {
  const client = getWixClient()
  const result = await client.items
    .query('MeetingMinutes')
    .eq('published', true)
    .descending('meetingDate')
    .find()
  return result.items.map((item: any) => mapMeeting(item))
}
