import { CheckCircle2, Star } from 'lucide-react'
import { getMembershipTiers, type MembershipTier } from '@/lib/api/membership'
import { MembershipJoinButton } from '@/components/membership/membership-join-button'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getStoreCardBonusPercent } from '@/lib/store-card-bonus'

const fmtDollars = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2))

/** Fallback only if CMS + Catalog are unreachable. */
const FALLBACK_TIERS: MembershipTier[] = [
  {
    id: 'reef-fallback',
    tierId: 'reef',
    name: 'Reef',
    price: 49,
    description: '',
    perks: [],
    popular: false,
    sortOrder: 1,
    active: true,
    giftCardCredit: 0,
    productId: '',
    variantId: '',
  },
  {
    id: 'lagoon-fallback',
    tierId: 'lagoon',
    name: 'Lagoon',
    price: 149,
    description: '',
    perks: [],
    popular: true,
    sortOrder: 2,
    active: true,
    giftCardCredit: 0,
    productId: '',
    variantId: '',
  },
  {
    id: 'tide-fallback',
    tierId: 'tide',
    name: 'Tide',
    price: 249,
    description: '',
    perks: [],
    popular: false,
    sortOrder: 3,
    active: true,
    giftCardCredit: 0,
    productId: '',
    variantId: '',
  },
]

export async function MembershipTiers() {
  const allTiers = await getMembershipTiers()
  const tiers = allTiers.filter((t) => t.tierId !== 'faculty')
  const display = tiers.length > 0 ? tiers : FALLBACK_TIERS
  const settings = await getSiteSettings()
  const bonusPercent = getStoreCardBonusPercent(settings.get('storeCardBonusPercent', '10'))
  const cols =
    display.length >= 3
      ? 'md:grid-cols-3 max-w-5xl'
      : 'md:grid-cols-2 max-w-3xl'

  return (
    <div className={`grid grid-cols-1 ${cols} gap-6 lg:gap-8 mx-auto`}>
      {display.map((tier) => (
        <article
          key={tier.id}
          className={`bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col relative ${
            tier.popular ? 'ring-2 ring-[#085508]' : 'border border-[#E8E4DC]'
          }`}
        >
          {tier.popular && (
            <div
              className="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: '#085508' }}
            >
              <Star className="w-3 h-3 fill-current" aria-hidden="true" />
              Most Popular
            </div>
          )}

          <div className="h-1.5 w-full" style={{ backgroundColor: '#085508' }} aria-hidden="true" />

          <div className="p-6 lg:p-8 flex flex-col flex-1">
            <div className="mb-6">
              <span
                className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
              >
                {tier.name}
              </span>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-bold text-[#1A1A1A]">${tier.price}</span>
                <span className="text-[#5A6070] text-sm mb-1">/ school year</span>
              </div>
            </div>

            {bonusPercent > 0 && tier.giftCardCredit > 0 ? (
              <div className="mb-6 rounded-lg border border-[#F0D9A0] bg-[#FFF7E6] px-3 py-2">
                <p className="text-xs font-bold text-[#8A6400]">
                  Limited-time bonus · first 30 days
                </p>
                <p className="text-xs text-[#8A6400]">
                  Get an extra {bonusPercent}% on your PTO card — $
                  {tier.giftCardCredit} becomes{' '}
                  <span className="font-bold">
                    ${fmtDollars(tier.giftCardCredit * (1 + bonusPercent / 100))}
                  </span>{' '}
                  loaded.
                </p>
              </div>
            ) : null}

            {tier.perks.length > 0 ? (
              <ul className="space-y-3 mb-8 flex-1" aria-label={`${tier.name} membership benefits`}>
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: '#085508' }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-[#1A1A1A]">{perk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex-1 mb-8" />
            )}

            <MembershipJoinButton tierId={tier.tierId} tierName={tier.name} price={tier.price} />
          </div>
        </article>
      ))}
    </div>
  )
}
