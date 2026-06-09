'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, Star, ArrowRight } from 'lucide-react'

const TIERS = [
  {
    id: 'ruby',
    name: 'Ruby',
    price: 50,
    description: 'Full PTO membership with all core benefits for the 2025–26 school year.',
    accent: '#8B1A1A',
    bg: '#FDF0F0',
    popular: false,
    perks: [
      'Digital membership card',
      'Priority enrichment program registration',
      'Access to member portal',
      'Voting rights at PTO meetings',
      'PTO newsletter & event updates',
      'Name in PTO annual report',
    ],
  },
  {
    id: 'supreme',
    name: 'Supreme',
    price: 100,
    description: 'Our top-tier membership with additional recognition and event perks.',
    accent: '#1A3A5C',
    bg: '#EEF2FF',
    popular: true,
    perks: [
      'Everything in Ruby',
      'Two complimentary Dance Night tickets',
      'Prominent listing in PTO annual report',
      'Exclusive recognition at PTO events',
      'Access to member portal',
      'Voting rights at PTO meetings',
    ],
  },
]

export function MembershipTiers() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-3xl mx-auto">
      {TIERS.map((tier) => (
        <article
          key={tier.id}
          className={`bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col relative ${
            tier.popular ? 'ring-2' : 'border border-[#E8E4DC]'
          }`}
          style={tier.popular ? { '--tw-ring-color': tier.accent } as React.CSSProperties : {}}
        >
          {tier.popular && (
            <div
              className="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: tier.accent }}
            >
              <Star className="w-3 h-3 fill-current" aria-hidden="true" />
              Most Popular
            </div>
          )}

          {/* Top bar */}
          <div className="h-1.5 w-full" style={{ backgroundColor: tier.accent }} aria-hidden="true" />

          <div className="p-6 lg:p-8 flex flex-col flex-1">
            {/* Tier name + price */}
            <div className="mb-6">
              <span
                className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                style={{ backgroundColor: tier.bg, color: tier.accent }}
              >
                {tier.name}
              </span>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-bold text-[#1A1A1A]">${tier.price}</span>
                <span className="text-[#5A6070] text-sm mb-1">/ school year</span>
              </div>
              <p className="text-sm text-[#5A6070] mt-2 leading-relaxed">{tier.description}</p>
            </div>

            {/* Perks */}
            <ul className="space-y-3 mb-8 flex-1" aria-label={`${tier.name} membership benefits`}>
              {tier.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={{ color: tier.accent }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-[#1A1A1A]">{perk}</span>
                </li>
              ))}
            </ul>

            {/* CTA — will wire to Wix checkout */}
            <Button
              className="w-full font-bold text-white group"
              style={{ backgroundColor: tier.accent }}
              id={`join-${tier.id}`}
            >
              Join {tier.name}
              <ArrowRight
                className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}
