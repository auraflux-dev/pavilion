import { CheckCircle2, Star } from 'lucide-react'
import { getMembershipTiers, type MembershipTier } from '@/lib/api/membership'
import { MembershipJoinButton } from '@/components/membership/membership-join-button'

// Fallback tiers shown if CMS is unreachable
const FALLBACK_TIERS: MembershipTier[] = [
  {
    id: 'ruby-fallback',
    tierId: 'ruby',
    name: 'Ruby',
    price: 50,
    description: 'Full PTO membership with all core benefits for the school year.',
    perks: [
      'Digital membership card',
      'Priority enrichment program registration',
      'Access to member portal',
      'Voting rights at PTO meetings',
      'PTO newsletter & event updates',
      '$10 school store card credit',
    ],
    popular: false,
    sortOrder: 1,
    active: true,
    giftCardCredit: 10,
    productId: '',
    variantId: '',
  },
  {
    id: 'supreme-fallback',
    tierId: 'supreme',
    name: 'Supreme',
    price: 100,
    description: 'Our mid-tier membership with additional recognition and event perks.',
    perks: [
      'Everything in Ruby',
      'Two complimentary Dance Night tickets',
      'Prominent listing in PTO annual report',
      'Exclusive recognition at PTO events',
      '$25 school store card credit',
    ],
    popular: true,
    sortOrder: 2,
    active: true,
    giftCardCredit: 25,
    productId: '',
    variantId: '',
  },
  {
    id: 'pearl-fallback',
    tierId: 'pearl',
    name: 'Pearl',
    price: 150,
    description: 'Our highest membership with maximum store-card credit and recognition.',
    perks: [
      'Everything in Supreme',
      'Highest recognition in PTO annual report',
      '$50 school store card credit',
    ],
    popular: false,
    sortOrder: 3,
    active: true,
    giftCardCredit: 50,
    productId: '',
    variantId: '',
  },
]

function withGiftCardPerk(tier: MembershipTier): MembershipTier {
  if (tier.giftCardCredit <= 0) return tier
  const creditLine = `$${tier.giftCardCredit} school store card credit`
  if (tier.perks.some((p) => /store card credit/i.test(p))) return tier
  return { ...tier, perks: [...tier.perks, creditLine] }
}

export async function MembershipTiers() {
  const allTiers = await getMembershipTiers()
  // Paid / public cards only (faculty handled separately on the page)
  const tiers = allTiers.filter((t) => t.tierId !== 'faculty')
  const display = (tiers.length > 0 ? tiers : FALLBACK_TIERS).map(withGiftCardPerk)
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
              <p className="text-sm text-[#5A6070] mt-2 leading-relaxed">{tier.description}</p>
            </div>

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

            <MembershipJoinButton tierId={tier.tierId} tierName={tier.name} />
          </div>
        </article>
      ))}
    </div>
  )
}
