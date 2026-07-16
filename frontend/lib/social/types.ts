import type { SocialPlatform } from './config'

export type FacebookFormat = 'POST' | 'REEL' | 'STORY'

export type CreativeKind = 'text' | 'image' | 'video' | 'link' | 'gallery'

export type SiteAssetType =
  | 'BLOG_POST'
  | 'EVENT'
  | 'STORES_PRODUCT'
  | 'BOOKINGS_SERVICE'
  | 'STORES_COUPON'
  | 'STORES_CATEGORY'

export interface SocialMediaItem {
  type: 'IMAGE' | 'VIDEO'
  url: string
  fileId?: string
}

export interface LinkMetadataInput {
  thumbnailUrl?: string
  title?: string
  description?: string
}

export interface SiteAssetInput {
  type: SiteAssetType
  id: string
  name?: string
}

export interface SocialCreativeInput {
  kind: CreativeKind
  imageUrl?: string
  videoUrl?: string
  linkUrl?: string
  media?: SocialMediaItem[]
  linkMetadata?: LinkMetadataInput
}

export interface SocialPostDraft {
  platform: SocialPlatform
  format: FacebookFormat
  message: string
  creative: SocialCreativeInput
  scheduledAt?: string
  siteAsset?: SiteAssetInput
}

export interface SocialPublishResult {
  ok: boolean
  platform: SocialPlatform
  externalId?: string
  status?: 'published' | 'scheduled' | 'draft' | 'failed'
  error?: string
}
