import { MarketingAudienceStrip } from '@/components/pavilion-site/marketing/audience-strip'
import { MarketingBoardHandoff } from '@/components/pavilion-site/marketing/board-handoff'
import { MarketingCloseCta } from '@/components/pavilion-site/marketing/close-cta'
import { MarketingHero } from '@/components/pavilion-site/marketing/hero'
import { MarketingStory } from '@/components/pavilion-site/marketing/story'
import { MarketingSurfaceTour } from '@/components/pavilion-site/marketing/surface-tour'

export function PavilionBrandHome() {
  return (
    <>
      <MarketingHero />
      <MarketingStory />
      <MarketingAudienceStrip />
      <MarketingSurfaceTour />
      <MarketingBoardHandoff />
      <MarketingCloseCta />
    </>
  )
}
