/**
 * Generic sell-net planner for Treasurer Budget.
 * Covers cohort contracts (min seats + add-on), simple unit COGS, and effective discounts.
 */
import {
  LOUDOUN_ROBOTICS_ADDITIONAL_STUDENT,
  LOUDOUN_ROBOTICS_COHORT_BASE,
  LOUDOUN_ROBOTICS_COHORT_BASE_SEATS,
  LOUDOUN_ROBOTICS_MAX_ENROLLMENT,
} from '@/lib/programs/loudoun-robotics-pricing'
import { FALL_2026_EP_FEES } from '@/lib/programs/ep-packet-fees'

export type SellCostModel =
  | {
      kind: 'unit'
      /** Cost of goods / vendor pay per unit sold */
      unitCost: number
    }
  | {
      kind: 'cohort'
      /** Flat fee charged once the class/cohort runs (covers baseSeats) */
      baseFee: number
      /** Units included in baseFee */
      baseSeats: number
      /** Extra vendor cost for each unit above baseSeats */
      additionalPerUnit: number
      /**
       * When units are below baseSeats:
       * - 'full_base' = still pay baseFee (Loudoun model)
       * - 'pro_rata' = baseFee * (units / baseSeats)
       * - 'cancel' = $0 cost under base (not offered)
       */
      underBase: 'full_base' | 'pro_rata' | 'cancel'
    }

export type SellNetInput = {
  units: number
  /** List / sticker price to the buyer */
  listPrice: number
  /** Effective discount on collections (0–1), e.g. blended member rate */
  discountRate: number
  cost: SellCostModel
  maxUnits?: number
}

export type SellNetRow = {
  units: number
  gross: number
  collections: number
  cost: number
  margin: number
  perUnitCollections: number
  perUnitCost: number
  perUnitMargin: number
}

function moneyRound(n: number): number {
  return Math.round(n * 100) / 100
}

export function clampDiscountRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0
  return Math.max(0, Math.min(1, rate))
}

export function vendorCostForUnits(units: number, cost: SellCostModel): number {
  const n = Math.max(0, Math.floor(units))
  if (n === 0) return 0
  if (cost.kind === 'unit') {
    return moneyRound(n * Math.max(0, cost.unitCost))
  }
  if (n < cost.baseSeats) {
    if (cost.underBase === 'cancel') return 0
    if (cost.underBase === 'pro_rata') {
      return moneyRound(cost.baseFee * (n / Math.max(1, cost.baseSeats)))
    }
    return moneyRound(cost.baseFee)
  }
  return moneyRound(
    cost.baseFee + (n - cost.baseSeats) * Math.max(0, cost.additionalPerUnit),
  )
}

export function computeSellNet(input: SellNetInput): SellNetRow {
  const max = input.maxUnits ?? Number.POSITIVE_INFINITY
  const units = Math.max(0, Math.min(Math.floor(input.units), max))
  const discount = clampDiscountRate(input.discountRate)
  const list = Math.max(0, input.listPrice)
  const gross = moneyRound(units * list)
  const collections = moneyRound(gross * (1 - discount))
  const cost = vendorCostForUnits(units, input.cost)
  const margin = moneyRound(collections - cost)
  const perUnitCollections = units > 0 ? moneyRound(collections / units) : 0
  const perUnitCost = units > 0 ? moneyRound(cost / units) : 0
  const perUnitMargin = units > 0 ? moneyRound(margin / units) : 0
  return {
    units,
    gross,
    collections,
    cost,
    margin,
    perUnitCollections,
    perUnitCost,
    perUnitMargin,
  }
}

export function sellNetLadder(opts: {
  from: number
  to: number
  step?: number
  listPrice: number
  discountRate: number
  cost: SellCostModel
}): SellNetRow[] {
  const step = Math.max(1, Math.floor(opts.step ?? 1))
  const from = Math.max(0, Math.floor(opts.from))
  const to = Math.max(from, Math.floor(opts.to))
  const rows: SellNetRow[] = []
  for (let u = from; u <= to; u += step) {
    rows.push(
      computeSellNet({
        units: u,
        listPrice: opts.listPrice,
        discountRate: opts.discountRate,
        cost: opts.cost,
        maxUnits: to,
      }),
    )
  }
  if (rows.length && rows[rows.length - 1]!.units !== to) {
    rows.push(
      computeSellNet({
        units: to,
        listPrice: opts.listPrice,
        discountRate: opts.discountRate,
        cost: opts.cost,
        maxUnits: to,
      }),
    )
  }
  return rows
}

export type SellNetPresetId =
  | 'loudoun-robotics'
  | 'unit-cogs'
  | 'cohort-contract'

export type SellNetPreset = {
  id: SellNetPresetId
  label: string
  hint: string
  listPrice: number
  discountRate: number
  from: number
  to: number
  step: number
  cost: SellCostModel
}

/** Built-in starting points for Treasurer planning. */
export const SELL_NET_PRESETS: SellNetPreset[] = [
  {
    id: 'loudoun-robotics',
    label: 'Loudoun Robotics (EP)',
    hint: `$${LOUDOUN_ROBOTICS_COHORT_BASE.toLocaleString()} covers ${LOUDOUN_ROBOTICS_COHORT_BASE_SEATS} students; +$${LOUDOUN_ROBOTICS_ADDITIONAL_STUDENT} each through ${LOUDOUN_ROBOTICS_MAX_ENROLLMENT}. List tuition $${FALL_2026_EP_FEES.robotics}.`,
    listPrice: FALL_2026_EP_FEES.robotics,
    discountRate: 0.15,
    from: 12,
    to: LOUDOUN_ROBOTICS_MAX_ENROLLMENT,
    step: 3,
    cost: {
      kind: 'cohort',
      baseFee: LOUDOUN_ROBOTICS_COHORT_BASE,
      baseSeats: LOUDOUN_ROBOTICS_COHORT_BASE_SEATS,
      additionalPerUnit: LOUDOUN_ROBOTICS_ADDITIONAL_STUDENT,
      underBase: 'full_base',
    },
  },
  {
    id: 'cohort-contract',
    label: 'Cohort / class contract',
    hint: 'Any vendor with a base fee for N seats, then per-seat add-ons.',
    listPrice: 375,
    discountRate: 0.15,
    from: 10,
    to: 30,
    step: 5,
    cost: {
      kind: 'cohort',
      baseFee: 3000,
      baseSeats: 12,
      additionalPerUnit: 200,
      underBase: 'full_base',
    },
  },
  {
    id: 'unit-cogs',
    label: 'Unit sale (Cove / event / merch)',
    hint: 'Sell price minus unit cost × quantity. Optional blended discount.',
    listPrice: 12,
    discountRate: 0,
    from: 10,
    to: 100,
    step: 10,
    cost: {
      kind: 'unit',
      unitCost: 4.5,
    },
  },
]
