'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type DiscountRow = {
  id: string
  code: string
  name: string
  percent: number
  active: boolean
  issuedToEmail: string
  membershipTier: string
  usageLimit: number
  note: string
  createdAt: string
}

/**
 * Staff → Discounts (Digital & Retail Sales / VP digital sales).
 * Creates named Wix coupon codes (5–75%) and issues tier-based codes to members.
 */
export function StaffDiscountsPanel() {
  const [codes, setCodes] = useState<DiscountRow[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [percent, setPercent] = useState(10)
  const [usageLimit, setUsageLimit] = useState(0)
  const [note, setNote] = useState('')

  const [issueEmail, setIssueEmail] = useState('')
  const [issueBase, setIssueBase] = useState('PTO')
  const [issuePercent, setIssuePercent] = useState('')
  const [issueNote, setIssueNote] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/discounts')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setCodes(d.codes ?? [])
      setStatus('')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createNamed() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name: name || code,
          percent,
          usageLimit: usageLimit || 0,
          note,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Create failed')
      setStatus(`Created ${d.code?.code ?? code} (${percent}% off)`)
      setCode('')
      setName('')
      setNote('')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function issueToMember() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue',
          parentEmail: issueEmail,
          baseName: issueBase,
          percent: issuePercent === '' ? null : Number(issuePercent),
          note: issueNote,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Issue failed')
      setStatus(
        `Issued ${d.code?.code} at ${d.code?.percent}% to ${issueEmail}` +
          (d.code?.membershipTier ? ` (${d.code.membershipTier})` : '')
      )
      setIssueEmail('')
      setIssueNote('')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Issue failed')
    } finally {
      setBusy(false)
    }
  }

  async function setActive(id: string, active: boolean) {
    setBusy(true)
    try {
      const r = await fetch('/api/staff/discounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-3">
        <div>
          <h2 className="text-lg font-bold">Discount codes</h2>
          <p className="text-xs text-[#5A6070]">
            Create named percent-off codes (5–75%) for enrichment programs and retail checkout later.
            Codes never apply to membership or store card purchases. Issue personal codes for
            onboarding emails after membership purchase — percent follows their paid tier (
            <code className="text-[11px]">discountPercent</code> on Membership Tiers), or override
            here.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[#5A6070]">
            Code (checkout name)
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SPRING25"
              maxLength={20}
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-mono font-normal"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070]">
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring fundraiser"
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070]">
            Percent off (5–75)
            <input
              type="number"
              min={5}
              max={75}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070]">
            Usage limit (0 = unlimited)
            <input
              type="number"
              min={0}
              value={usageLimit}
              onChange={(e) => setUsageLimit(Number(e.target.value))}
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal"
            />
          </label>
        </div>
        <label className="block text-xs font-bold text-[#5A6070]">
          Note
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal"
          />
        </label>
        <Button
          disabled={busy || !code || percent < 5 || percent > 75}
          onClick={() => void createNamed()}
          className="text-white"
          style={{ backgroundColor: '#085508' }}
        >
          Create named code
        </Button>
      </div>

      <div className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-3">
        <div>
          <h3 className="text-base font-bold">Issue to member</h3>
          <p className="text-xs text-[#5A6070]">
            Generates a unique code for a parent email. Default % from their highest paid tier
            (Reef 5 / Lagoon 10 / Tide 15 unless CMS override). Leave override blank to use tier.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[#5A6070]">
            Parent email
            <input
              type="email"
              value={issueEmail}
              onChange={(e) => setIssueEmail(e.target.value)}
              placeholder="parent@example.com"
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070]">
            Code prefix
            <input
              value={issueBase}
              onChange={(e) => setIssueBase(e.target.value.toUpperCase())}
              placeholder="PTO"
              maxLength={12}
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-mono font-normal"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070]">
            Override % (optional)
            <input
              type="number"
              min={5}
              max={75}
              value={issuePercent}
              onChange={(e) => setIssuePercent(e.target.value)}
              placeholder="Tier default"
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070]">
            Note
            <input
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal"
            />
          </label>
        </div>
        <Button
          disabled={busy || !issueEmail.includes('@')}
          onClick={() => void issueToMember()}
          className="text-white"
          style={{ backgroundColor: '#085508' }}
        >
          Issue code
        </Button>
      </div>

      <div className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-3">
        <h3 className="text-base font-bold">Active codes</h3>
        {codes.length === 0 ? (
          <p className="text-xs text-[#5A6070]">No codes yet.</p>
        ) : (
          <ul className="divide-y divide-[#E8E4DC]">
            {codes.map((row) => (
              <li key={row.id} className="py-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono font-bold text-sm">{row.code}</p>
                  <p className="text-xs text-[#5A6070]">
                    {row.name} · {row.percent}%
                    {row.issuedToEmail ? ` · ${row.issuedToEmail}` : ''}
                    {row.membershipTier ? ` · ${row.membershipTier}` : ''}
                    {!row.active ? ' · inactive' : ''}
                  </p>
                  {row.note ? <p className="text-[11px] text-[#5A6070] mt-0.5">{row.note}</p> : null}
                </div>
                {row.active ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void setActive(row.id, false)}
                    className="text-xs"
                  >
                    Deactivate
                  </Button>
                ) : (
                  <span className="text-xs text-[#5A6070]">Inactive</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
