/**
 * POST /api/cron/audit-ep-square
 * Auth: Bearer $CRON_SECRET
 *
 * Aggregate-only reconcile: Staff ProgramEnrollments seats vs Square Enrichment
 * card payments. Never returns parent/student emails or names.
 */
import { NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareEnvironment } from 'square'
import { getWixClient } from '@/lib/wix-client'
import { ACTIVE_ENROLL_STATUSES } from '@/lib/programs/enrollments'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type ClassKey = 'ye' | 'essay' | 'math' | 'robotics'

const CLASS_RES: Array<{ key: ClassKey; re: RegExp }> = [
  { key: 'ye', re: /young\s*entrepreneurs|passion to pitch|stingray tank/i },
  { key: 'essay', re: /essay|analytical\s*&\s*high|academic composition/i },
  { key: 'math', re: /competitive\s*math|math prep|mathcounts/i },
  { key: 'robotics', re: /robotics/i },
]

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET?.trim()
  return Boolean(secret && auth === `Bearer ${secret}`)
}

function classify(text: string): ClassKey | 'other' {
  const t = String(text || '')
  for (const { key, re } of CLASS_RES) {
    if (re.test(t)) return key
  }
  return 'other'
}

/** One Enrichment note can name Fall + Spring (or two classes). Count each part. */
function classHitsInNote(note: string): ClassKey[] {
  const parts = String(note || '')
    .replace(/^Enrichment:\s*/i, '')
    .split(/\s*\+\s*/)
  const hits: ClassKey[] = []
  for (const part of parts) {
    const k = classify(part)
    if (k !== 'other') hits.push(k)
  }
  if (hits.length === 0) {
    const k = classify(note)
    if (k !== 'other') hits.push(k)
  }
  return hits
}

function seasonOfProgram(p: Record<string, unknown> | undefined, fallbackText = ''): string {
  const raw = String(p?.season ?? '').trim()
  if (raw === 'fall-2026' || raw === 'spring-2027') return raw
  const t = `${fallbackText} ${p?.name ?? ''} ${p?.title ?? ''}`.toLowerCase()
  if (/spring|2027/.test(t)) return 'spring-2027'
  if (/fall|2026/.test(t)) return 'fall-2026'
  return raw || 'unknown'
}

function money(p: { amountMoney?: { amount?: number | bigint | string | null } }) {
  return Number(p.amountMoney?.amount ?? 0) / 100
}

async function listSquareEnrichmentPayments(sinceIso: string) {
  const token = process.env.SQUARE_ACCESS_TOKEN
  if (!token) {
    return { error: 'SQUARE_ACCESS_TOKEN missing', payments: [] as Array<Record<string, unknown>> }
  }

  const client = new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'sandbox'
        ? SquareEnvironment.Sandbox
        : SquareEnvironment.Production,
  })

  const out: Array<Record<string, unknown>> = []
  const start = new Date(sinceIso)
  const endAll = new Date()
  endAll.setUTCDate(endAll.getUTCDate() + 1)

  for (let d = new Date(start); d < endAll; d = new Date(d.getTime() + 3 * 86400000)) {
    const beginTime = d.toISOString()
    const endTime = new Date(
      Math.min(d.getTime() + 3 * 86400000, endAll.getTime()),
    ).toISOString()
    let cursor: string | undefined
    for (let page = 0; page < 20; page++) {
      const res = (await (
        client.payments as { list: (q: Record<string, unknown>) => Promise<unknown> }
      ).list({
        beginTime,
        endTime,
        cursor,
        limit: 100,
        sortOrder: 'ASC',
        sortField: 'CREATED_AT',
      })) as { data?: unknown[]; payments?: unknown[]; cursor?: string }
      const pageItems = (res.data ?? res.payments ?? []) as Array<Record<string, unknown>>
      out.push(...pageItems)
      cursor = res.cursor
      if (!cursor) break
    }
  }

  return {
    payments: out.filter((p) => {
      const st = String(p.status || '').toUpperCase()
      if (st === 'CANCELED' || st === 'FAILED') return false
      return /^Enrichment:/i.test(String(p.note || ''))
    }),
  }
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { since?: string }
  const since = String(body.since || '2026-08-15T00:00:00Z')

  try {
    const client = getWixClient()
    const [programsRes, enrollRes] = await Promise.all([
      client.items.query('Programs').limit(100).find(),
      client.items.query('ProgramEnrollments').limit(100).find(),
    ])

    let enrollItems = [...(enrollRes.items ?? [])]
    let enr = enrollRes
    while (enr.hasNext?.()) {
      enr = await enr.next()
      enrollItems = enrollItems.concat(enr.items ?? [])
    }

    let progItems = [...(programsRes.items ?? [])]
    let pr = programsRes
    while (pr.hasNext?.()) {
      pr = await pr.next()
      progItems = progItems.concat(pr.items ?? [])
    }

    const progById = new Map(
      progItems.map((p) => [
        String((p as { _id?: string })._id || ''),
        p as Record<string, unknown>,
      ]),
    )

    const staff: Record<
      string,
      {
        paid: number
        enrolled: number
        waitlist: number
        other: number
        feeSum: number
        withTx: number
      }
    > = {}

    for (const raw of enrollItems) {
      const e = raw as Record<string, unknown>
      const p = progById.get(String(e.programId || ''))
      const name = String(e.programName || p?.name || p?.title || '')
      const season = seasonOfProgram(p, name)
      if (season !== 'fall-2026' && season !== 'spring-2027') continue
      const klass = classify(name)
      const key = `${season}|${klass}`
      if (!staff[key]) {
        staff[key] = {
          paid: 0,
          enrolled: 0,
          waitlist: 0,
          other: 0,
          feeSum: 0,
          withTx: 0,
        }
      }
      const status = String(e.status || '')
      const fee = Number(e.feePaid || 0)
      const tx = String(e.transactionId || e.paymentId || e.squarePaymentId || '')
      if (ACTIVE_ENROLL_STATUSES.has(status)) {
        if (status === 'Paid') {
          staff[key].paid++
          staff[key].feeSum += fee
        } else {
          staff[key].enrolled++
        }
        if (tx) staff[key].withTx++
      } else if (/wait/i.test(status)) {
        staff[key].waitlist++
      } else {
        staff[key].other++
      }
    }

    const sq = await listSquareEnrichmentPayments(since)
    const squareBuckets: Record<string, { payments: number; amount: number }> = {}
    const squareClassHits: Record<string, number> = {}
    const squareSamples: Array<{ amount: number; keys: string[]; noteShape: string }> = []

    for (const p of sq.payments) {
      const note = String(p.note || '')
      const hitKeys = classHitsInNote(note)
      const label = (hitKeys.length ? [...new Set(hitKeys)].sort() : ['unparsed']).join('+')
      if (!squareBuckets[label]) squareBuckets[label] = { payments: 0, amount: 0 }
      squareBuckets[label].payments++
      squareBuckets[label].amount += money(
        p as { amountMoney?: { amount?: number } },
      )

      for (const k of hitKeys) {
        squareClassHits[k] = (squareClassHits[k] || 0) + 1
      }

      if (squareSamples.length < 12) {
        squareSamples.push({
          amount: money(p as { amountMoney?: { amount?: number } }),
          keys: hitKeys,
          noteShape: note
            .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
            .replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, '[name]')
            .slice(0, 160),
        })
      }
    }

    const staffByClass: Record<string, number> = {}
    for (const [key, v] of Object.entries(staff)) {
      const klass = key.split('|')[1] || 'other'
      if (klass === 'other') continue
      staffByClass[klass] = (staffByClass[klass] || 0) + v.paid + v.enrolled
    }

    const compareByClass = [...new Set([...Object.keys(staffByClass), ...Object.keys(squareClassHits)])]
      .sort()
      .map((klass) => {
        const staffActive = staffByClass[klass] || 0
        const hits = squareClassHits[klass] || 0
        return {
          key: klass,
          staffActive,
          squareClassHits: hits,
          deltaStaffMinusSquareHits: staffActive - hits,
        }
      })

    return NextResponse.json({
      ok: true,
      since,
      note:
        'Staff seats = Paid+Enrolled. Square classHits expand multi-class Enrichment notes (one charge can cover Fall+Spring). Deltas mean roster ≠ Square card notes.',
      staffBySeasonClass: Object.fromEntries(
        Object.entries(staff)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [
            k,
            {
              paid: v.paid,
              enrolled: v.enrolled,
              active: v.paid + v.enrolled,
              waitlist: v.waitlist,
              feeSum: Math.round(v.feeSum * 100) / 100,
              withTx: v.withTx,
            },
          ]),
      ),
      square: {
        enrichmentPayments: sq.payments.length,
        enrichmentAmount:
          Math.round(
            sq.payments.reduce(
              (s, p) => s + money(p as { amountMoney?: { amount?: number } }),
              0,
            ) * 100,
          ) / 100,
        buckets: squareBuckets,
        classHits: squareClassHits,
        samples: squareSamples,
        error: 'error' in sq ? sq.error : undefined,
      },
      compareByClass,
    })
  } catch (err) {
    console.error('audit-ep-square', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'audit failed' },
      { status: 500 },
    )
  }
}
