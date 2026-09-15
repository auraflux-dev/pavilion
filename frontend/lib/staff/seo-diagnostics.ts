import { commonsDbEnabled } from '@/lib/crm/db'
import { googleOAuthConfigured, googleOAuthBlockedReason, pagespeedApiKey } from '@/lib/staff/seo/crypto'
import { lastSeoRows } from '@/lib/staff/seo/store'
import { countBrandKits } from '@/lib/staff/brand-strategy/store'
import { BrandAiService } from '@/lib/staff/brand-strategy/ai'

export async function collectStaffDiagnostics() {
  const oauth = googleOAuthConfigured()
  const seoRows = await lastSeoRows()
  const kits = await countBrandKits()
  return {
    generatedAt: new Date().toISOString(),
    env: {
      database: commonsDbEnabled(),
      googleOAuth: oauth,
      googleOAuthBlocked: oauth ? null : googleOAuthBlockedReason(),
      openai: BrandAiService.isConfigured(),
      pagespeed: Boolean(pagespeedApiKey()),
      cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
      composio: false,
      dataForSeo: false,
    },
    rows: {
      seo: seoRows,
      brandKits: kits,
    },
    notes: [
      'Direct Google OAuth only. Composio is not used.',
      'DataForSEO is omitted in this Pavilion port.',
      'GSC connect needs SEO_GOOGLE_CLIENT_ID + SEO_GOOGLE_CLIENT_SECRET (or GOOGLE_CLIENT_*).',
      'Brand generate needs OPENAI_API_KEY. Placeholder kits still save without it.',
    ],
  }
}
