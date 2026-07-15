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

export async function getMeetingsByCommittee(committee: Committee): Promise<MeetingMinute[]> {
  const client = getWixClient()
  const result = await client.items
    .query('MeetingMinutes')
    .eq('committee', committee)
    .eq('published', true)
    .descending('meetingDate')
    .find()
  return result.items.map((item: any) => item as MeetingMinute)
}

export async function getAllPublishedMeetings(): Promise<MeetingMinute[]> {
  const client = getWixClient()
  const result = await client.items
    .query('MeetingMinutes')
    .eq('published', true)
    .descending('meetingDate')
    .find()
  return result.items.map((item: any) => item as MeetingMinute)
}
