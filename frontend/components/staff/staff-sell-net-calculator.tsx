'use client'

/**
 * Treasurer sell-net planner: parent collections vs vendor/COGS cost.
 * Works for EP cohort contracts, Cove items, event tickets, merch, etc.
 */
import { useMemo, useState } from 'react'
import {
  SELL_NET_PRESETS,
  sellNetLadder,
  type SellCostModel,
  type SellNetPresetId,
  type SellNetRow,
} from '@/lib/staff/sell-net-calculator'

const money = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })

const moneyExact = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

function parseNum(raw: string, fallback = 0): number {
  const n = Number(String(raw).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : fallback
}

export function StaffSellNetCalculator() {
  const [presetId, setPresetId] = useState<SellNetPresetId>('loudoun-robotics')
  const preset = SELL_NET_PRESETS.find((p) => p.id === presetId) ?? SELL_NET_PRESETS[0]!

  const [listPrice, setListPrice] = useState(String(preset.listPrice))
  const [discountPct, setDiscountPct] = useState(String(Math.round(preset.discountRate * 100)))
  const [from, setFrom] = useState(String(preset.from))
  const [to, setTo] = useState(String(preset.to))
  const [step, setStep] = useState(String(preset.step))

  // Unit model
  const [unitCost, setUnitCost] = useState(
    String(preset.cost.kind === 'unit' ? preset.cost.unitCost : 4.5),
  )

  // Cohort model
  const [baseFee, setBaseFee] = useState(
    String(preset.cost.kind === 'cohort' ? preset.cost.baseFee : 4500),
  )
  const [baseSeats, setBaseSeats] = useState(
    String(preset.cost.kind === 'cohort' ? preset.cost.baseSeats : 15),
  )
  const [addlPerUnit, setAddlPerUnit] = useState(
    String(preset.cost.kind === 'cohort' ? preset.cost.additionalPerUnit : 240),
  )
  const [underBase, setUnderBase] = useState<'full_base' | 'pro_rata' | 'cancel'>(
    preset.cost.kind === 'cohort' ? preset.cost.underBase : 'full_base',
  )

  function applyPreset(id: SellNetPresetId) {
    const next = SELL_NET_PRESETS.find((p) => p.id === id) ?? SELL_NET_PRESETS[0]!
    setPresetId(next.id)
    setListPrice(String(next.listPrice))
    setDiscountPct(String(Math.round(next.discountRate * 100)))
    setFrom(String(next.from))
    setTo(String(next.to))
    setStep(String(next.step))
    if (next.cost.kind === 'unit') {
      setUnitCost(String(next.cost.unitCost))
    } else {
      setBaseFee(String(next.cost.baseFee))
      setBaseSeats(String(next.cost.baseSeats))
      setAddlPerUnit(String(next.cost.additionalPerUnit))
      setUnderBase(next.cost.underBase)
    }
  }

  const costModel: SellCostModel = useMemo(() => {
    if (preset.cost.kind === 'unit') {
      return { kind: 'unit', unitCost: Math.max(0, parseNum(unitCost)) }
    }
    return {
      kind: 'cohort',
      baseFee: Math.max(0, parseNum(baseFee)),
      baseSeats: Math.max(1, Math.floor(parseNum(baseSeats, 1))),
      additionalPerUnit: Math.max(0, parseNum(addlPerUnit)),
      underBase,
    }
  }, [preset.cost.kind, unitCost, baseFee, baseSeats, addlPerUnit, underBase])

  const rows: SellNetRow[] = useMemo(() => {
    const lo = Math.max(0, Math.floor(parseNum(from)))
    const hi = Math.max(lo, Math.floor(parseNum(to, lo)))
    const st = Math.max(1, Math.floor(parseNum(step, 1)))
    return sellNetLadder({
      from: lo,
      to: hi,
      step: st,
      listPrice: Math.max(0, parseNum(listPrice)),
      discountRate: Math.max(0, parseNum(discountPct)) / 100,
      cost: costModel,
    })
  }, [from, to, step, listPrice, discountPct, costModel])

  const isCohort = costModel.kind === 'cohort'

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold text-[#1A1A1A]">Sell → net planner</p>
        <p className="text-xs text-[#5A6070]">
          Model parent or shopper collections against vendor / COGS cost. Use for enrichment
          contracts, Cove items, event tickets, or anything with a list price and a cost curve.
        </p>
      </div>

      <label className="block text-xs font-semibold text-[#5A6070] space-y-1">
        Starting point
        <select
          value={presetId}
          onChange={(e) => applyPreset(e.target.value as SellNetPresetId)}
          className="block w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
        >
          {SELL_NET_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="block font-normal text-[11px] text-[#5A6070]">{preset.hint}</span>
      </label>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="List price $" value={listPrice} onChange={setListPrice} />
        <Field
          label="Effective discount %"
          value={discountPct}
          onChange={setDiscountPct}
          hint="Blended member / promo rate on collections"
        />
        <Field label="From qty" value={from} onChange={setFrom} />
        <Field label="To qty" value={to} onChange={setTo} />
        <Field label="Step" value={step} onChange={setStep} />
        {isCohort ? (
          <>
            <Field label="Base fee $" value={baseFee} onChange={setBaseFee} />
            <Field label="Seats in base" value={baseSeats} onChange={setBaseSeats} />
            <Field label="Each extra $" value={addlPerUnit} onChange={setAddlPerUnit} />
            <label className="text-xs font-semibold text-[#5A6070] space-y-1 sm:col-span-2">
              Under base seats
              <select
                value={underBase}
                onChange={(e) =>
                  setUnderBase(e.target.value as 'full_base' | 'pro_rata' | 'cancel')
                }
                className="block w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              >
                <option value="full_base">Still pay full base (Loudoun)</option>
                <option value="pro_rata">Pro-rate base fee</option>
                <option value="cancel">$0 if under min</option>
              </select>
            </label>
          </>
        ) : (
          <Field label="Unit cost $" value={unitCost} onChange={setUnitCost} />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[#5A6070]">
              <th className="pb-2 pr-2 font-bold">Qty</th>
              <th className="pb-2 pr-2 font-bold">Gross</th>
              <th className="pb-2 pr-2 font-bold">Collections</th>
              <th className="pb-2 pr-2 font-bold">Cost</th>
              <th className="pb-2 pr-2 font-bold">PTO net</th>
              <th className="pb-2 font-bold">$/unit net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.units} className="border-t border-[var(--border)]">
                <td className="py-1.5 pr-2 tabular-nums">{row.units}</td>
                <td className="py-1.5 pr-2 tabular-nums text-[#5A6070]">{money(row.gross)}</td>
                <td className="py-1.5 pr-2 tabular-nums">{moneyExact(row.collections)}</td>
                <td className="py-1.5 pr-2 tabular-nums text-[#5A6070]">{moneyExact(row.cost)}</td>
                <td
                  className={`py-1.5 pr-2 tabular-nums font-semibold ${
                    row.margin < 0 ? 'text-rose-700' : 'text-[var(--brand-green)]'
                  }`}
                >
                  {moneyExact(row.margin)}
                </td>
                <td className="py-1.5 tabular-nums text-[#5A6070]">
                  {moneyExact(row.perUnitMargin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#5A6070]">
        Planning only — does not write budget lines. CMS / Staff Programs hold live program fees.
      </p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <label className="text-xs font-semibold text-[#5A6070] space-y-1">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="block w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
      />
      {hint ? <span className="block font-normal text-[11px]">{hint}</span> : null}
    </label>
  )
}
