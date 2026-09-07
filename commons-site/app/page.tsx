import { MarketingAudienceStrip } from '@/components/marketing/audience-strip'
import { MarketingBoardHandoff } from '@/components/marketing/board-handoff'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { MarketingHero } from '@/components/marketing/hero'
import { MarketingStory } from '@/components/marketing/story'
import { MarketingSurfaceTour } from '@/components/marketing/surface-tour'

export default function HomePage() {
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
