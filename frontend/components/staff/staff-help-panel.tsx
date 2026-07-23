'use client'

import { useMemo, useState } from 'react'

type HelpDoc = {
  num: string
  title: string
  docId: string
  adminOnly?: boolean
  need?: 'message' | 'membership' | 'discounts' | 'site' | 'marketing'
}

/**
 * Staff Help — guides open inside Staff (Google Doc preview).
 * PayPal / Square / MoneyMinder / Bank of America stay outside Staff on purpose.
 */
const DOCS: HelpDoc[] = [
  { num: '30', title: 'Staff Portal Quick Start', docId: '1JG55ELZLFhEd0WUCPbAnGwCk6jvzr18yjZQcCBtonxc' },
  { num: '26', title: 'Roles & @shmspto.org login', docId: '1FBt8FQIH_mt6L14leA1nU80Vfd3jPFkiE6JOteRymD8' },
  { num: '29', title: 'Year project board', docId: '1NKIWjbjc9oXd9d-99KIax5Ul_rn93Myt3kFi-nx2Z54' },
  {
    num: '31',
    title: 'Lookup, act-as, archive',
    docId: '1R3ALSjLvNI_rAz3rdL_VDckfrdfHA_XtrTr3_d0yBxM',
    adminOnly: true,
  },
  {
    num: '33',
    title: 'Inbox, Calendar & Docs (Connect Google)',
    docId: '1Qmk4-2yN15TPsZM5CqhKuUDs8Gd4t_YTs27bqIkkuTI',
  },
  {
    num: '37',
    title: 'Site capability audit & test plans',
    docId: '132rR0Y7OcN3fYLDUVCqfe2zOd7Aid8mTV4RGYeD-Ylk',
  },
  { num: '27', title: 'Helping a parent in the portal', docId: '1CdIxRuE_7qVK-daiukLwDDfjojQ5mHWozBOEAMUIGyM' },
  {
    num: '38',
    title: 'Parent portal checklist (free & paid)',
    docId: '1O8vm1V7hVt5j_C-i4QF3So6LpgzeEj_vjiynvMyW6cI',
  },
  { num: '41', title: 'Purchase confirmations & Messages', docId: '1ppjnelCojck6mJ2GfUMGukCP60UWwkac30SmwVW88gI' },
  { num: '42', title: 'Staff Reports', docId: '1n2YMAYieMqdqLAVNe1i6HRWj-Ge-gyAJhSaQJNErjvI' },
  { num: '43', title: 'Event tickets', docId: '12dTszJRVrZAGtmo5ztwKlICV4HAUTBMszonZR31Ofb4' },
  { num: '44', title: 'Enrichment attendance & refunds', docId: '1xh3k_hnnzem0IhKPtAHCZmJ9vKyht2-zMwISRl_n3G4' },
  { num: '45', title: 'Staff activity notices & Google Connect', docId: '1UjjeaDoZvXdt_woXDdmIS-WBxke7OhggYlDMyD3VmaM' },
  { num: '02', title: 'Programs (schedule, roster, attendance)', docId: '1U9_8OpzVDft_gkPbEG9O4bs17vE7VyP3ARDvJjQBiKQ' },
  { num: '02c', title: 'Parent enrichment registration', docId: '19N2PDpukQifeD3LDRzNXeYOkZMiNf8ADeR8imaa9teM' },
  {
    num: '16',
    title: 'Parent inbox messages',
    docId: '1bVNp8LyuiTyt7VY1P-q7fjpMPBH9BafNn8P_K0oOi5s',
    need: 'message',
  },
  {
    num: '34',
    title: 'Memberships roster, email, WhatsApp',
    docId: '11d15OJVP3Hw_zUxXEEScV8BD5GYkJQZbmA540btMxoE',
    need: 'membership',
  },
  {
    num: '36',
    title: 'Discount codes & spirit coupons',
    docId: '1ylm0AU-8ndswX5Yjj11YJsys13vfVS0STr9BZyHiELA',
    need: 'discounts',
  },
  {
    num: '25',
    title: 'Facebook from Staff',
    docId: '13VkmF-lc3lV1d0ka0YD67wD4C0Jk_J-FwrAmKrZ8pTk',
    need: 'marketing',
  },
]

function previewUrl(docId: string) {
  return `https://docs.google.com/document/d/${docId}/preview`
}

export function StaffHelpPanel({
  isAdmin,
  canMessage,
  canMembership,
  canDiscounts,
  canSite,
  canMarketing,
}: {
  isAdmin: boolean
  canMessage: boolean
  canMembership: boolean
  canDiscounts: boolean
  canSite: boolean
  canMarketing: boolean
}) {
  const [activeId, setActiveId] = useState(DOCS[0]?.docId ?? '')

  const visible = useMemo(() => {
    return DOCS.filter((d) => {
      if (d.adminOnly && !isAdmin) return false
      if (d.need === 'message' && !canMessage) return false
      if (d.need === 'membership' && !canMembership) return false
      if (d.need === 'discounts' && !canDiscounts) return false
      if (d.need === 'site' && !canSite) return false
      if (d.need === 'marketing' && !canMarketing) return false
      return Boolean(d.docId)
    })
  }, [isAdmin, canMessage, canMembership, canDiscounts, canSite, canMarketing])

  const active = visible.find((d) => d.docId === activeId) || visible[0]

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Help</h1>
        <p className="text-xs text-[#5A6070] mt-1">
          Guides open here in Staff. Start with <span className="font-semibold">30 — Quick Start</span>.
          PayPal, Square, MoneyMinder, and Bank of America stay separate logins for Treasurer/President.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,15rem)_1fr]">
        <ul className="text-sm space-y-1 max-h-[70vh] overflow-y-auto pr-1">
          {visible.map((d) => {
            const selected = active?.docId === d.docId
            return (
              <li key={`${d.num}-${d.title}`}>
                <button
                  type="button"
                  onClick={() => setActiveId(d.docId)}
                  className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                    selected
                      ? 'bg-[#E8F3E8] text-[#085508] font-semibold'
                      : 'hover:bg-[#F7F5F0] text-[#1A1A1A]'
                  }`}
                >
                  <span className="font-semibold">{d.num}</span> — {d.title}
                </button>
              </li>
            )
          })}
          {canSite ? (
            <li className="px-2.5 py-2 text-xs text-[#5A6070]">
              Site settings / lists — edit in Staff workspaces (Announcement, board, nav, FAQs…) without
              opening Wix for day-to-day changes.
            </li>
          ) : null}
        </ul>

        <div className="rounded-lg border border-[#E8E4DC] overflow-hidden bg-[#FAF8F4] min-h-[28rem]">
          {active?.docId ? (
            <iframe
              title={`${active.num} — ${active.title}`}
              src={previewUrl(active.docId)}
              className="w-full h-[min(78vh,42rem)] bg-white"
            />
          ) : (
            <p className="p-4 text-sm text-[#5A6070]">Select a guide.</p>
          )}
        </div>
      </div>
    </section>
  )
}
