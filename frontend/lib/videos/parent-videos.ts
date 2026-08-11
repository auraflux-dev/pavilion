export type ParentVideoId =
  | 'parent-tour'
  | 'portal-walkthrough'
  | 'membership-tiers'
  | 'board-recruit'

export interface ParentVideo {
  id: ParentVideoId
  title: string
  summary: string
  /** 720p MP4 hosted on Wix Media */
  src: string
  poster: string
  durationLabel: string
  /** Pages where this video should appear */
  placements: Array<'home' | 'membership' | 'cove' | 'board' | 'portal' | 'help'>
}

/** Parent-facing explainer videos (not staff training). */
export const PARENT_VIDEOS: ParentVideo[] = [
  {
    id: 'parent-tour',
    title: 'Website tour for parents',
    summary: 'Quick walkthrough of shmspto.org: pages, membership, and the Cove Digital Card.',
    src: 'https://video.wixstatic.com/video/1697ba_dbe3782d98144765bdad0b5b3b6956ae/720p/mp4/file.mp4',
    poster: 'https://static.wixstatic.com/media/1697ba_dbe3782d98144765bdad0b5b3b6956aef002.jpg',
    durationLabel: 'about 3 min',
    placements: ['home', 'portal', 'help'],
  },
  {
    id: 'portal-walkthrough',
    title: 'Member Portal walkthrough',
    summary: 'How free and paid parents use the Member Portal day to day.',
    src: 'https://video.wixstatic.com/video/1697ba_dac1aa0af5dd4ccb8d86d1d2ff34286f/720p/mp4/file.mp4',
    poster: 'https://static.wixstatic.com/media/1697ba_dac1aa0af5dd4ccb8d86d1d2ff34286ff002.jpg',
    durationLabel: 'about 3 min',
    placements: ['portal', 'help'],
  },
  {
    id: 'membership-tiers',
    title: 'Membership tiers explained',
    summary: 'Reef, Lagoon, and Tide: what each tier includes and how to join.',
    src: 'https://video.wixstatic.com/video/1697ba_b2d50aa4f11c4040b71005d5d42c983d/720p/mp4/file.mp4',
    poster: 'https://static.wixstatic.com/media/1697ba_b2d50aa4f11c4040b71005d5d42c983df002.jpg',
    durationLabel: 'about 3 min',
    placements: ['membership', 'portal', 'help'],
  },
  {
    id: 'board-recruit',
    title: 'Join the PTO Board',
    summary: 'Why parent volunteers serve on the board and how to get involved.',
    src: 'https://video.wixstatic.com/video/1697ba_75801295df0a494dbbfa822fed1f7229/720p/mp4/file.mp4',
    poster: 'https://static.wixstatic.com/media/1697ba_75801295df0a494dbbfa822fed1f7229f002.jpg',
    durationLabel: 'about 2 min',
    placements: ['board', 'portal', 'help'],
  },
]

export function parentVideosFor(
  placement: ParentVideo['placements'][number],
): ParentVideo[] {
  return PARENT_VIDEOS.filter((v) => v.placements.includes(placement))
}

export function getParentVideo(id: ParentVideoId): ParentVideo | undefined {
  return PARENT_VIDEOS.find((v) => v.id === id)
}
