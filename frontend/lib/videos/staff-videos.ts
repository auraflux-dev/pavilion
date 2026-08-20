import { vanillaizeIfDemo } from '@/lib/demo/brand'

export type StaffVideoId = 'newsletter-diane'

export interface StaffVideo {
  id: StaffVideoId
  title: string
  summary: string
  /** 720p MP4 — Wix Media or /public help asset */
  src: string
  poster: string
  durationLabel: string
  /** Staff Help article slugs that embed this video */
  helpArticles: string[]
}

/** Staff training explainers (Marketing / role onboarding). */
export const STAFF_VIDEOS: StaffVideo[] = [
  {
    id: 'newsletter-diane',
    title: 'Member newsletter walkthrough (for Diane)',
    summary:
      'Plain text + Canva PNG. Paid email, Weekly Scoop link, test sends, schedule, WhatsApp.',
    src: '/help/staff-newsletter/newsletter-diane.mp4',
    poster: '/help/staff-newsletter/newsletter-diane-poster.jpg',
    durationLabel: 'about 2 min',
    helpArticles: ['member-newsletter-diane'],
  },
]

function vanillaizeVideo(video: StaffVideo): StaffVideo {
  return {
    ...video,
    title: vanillaizeIfDemo(video.title),
    summary: vanillaizeIfDemo(video.summary),
  }
}

export function getStaffVideo(id: StaffVideoId): StaffVideo | undefined {
  const video = STAFF_VIDEOS.find((v) => v.id === id)
  return video ? vanillaizeVideo(video) : undefined
}

export function staffVideoForHelpArticle(slug: string): StaffVideo | undefined {
  const video = STAFF_VIDEOS.find((v) => v.helpArticles.includes(slug))
  return video ? vanillaizeVideo(video) : undefined
}
