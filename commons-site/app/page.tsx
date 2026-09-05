import { MarketingAudienceStrip } from '@/components/marketing/audience-strip'
import { MarketingCloseCta } from '@/components/marketing/close-cta'
import { MarketingHero } from '@/components/marketing/hero'
import { MarketingPillars } from '@/components/marketing/pillars'
import { MarketingSurfaceFrames } from '@/components/marketing/surface-frames'

export default function HomePage() {
  return (
    <>
      <MarketingHero />
      <MarketingPillars />
      <MarketingSurfaceFrames linkToProduct />
      <MarketingAudienceStrip />
      <MarketingCloseCta />
    </>
  )
}
