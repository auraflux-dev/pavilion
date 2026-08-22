'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PortalCardCheckout, type PortalPayBody } from '@/components/checkout/portal-card-checkout'
import { MemberGate } from '@/components/member-gate'
import { useCart } from '@/lib/cart/store'
import type { CartLine } from '@/lib/cart/types'

type Student = { id: string; firstName: string; lastName: string; grade: string }

function lineNeedsStudent(line: CartLine) {
  return line.kind === 'program' || line.kind === 'event' || line.kind === 'membership'
}

function payBodyForLine(line: CartLine, studentId: string): PortalPayBody | null {
  if (line.kind === 'program' && line.programId) {
    const sid = line.studentId || studentId
    if (!sid) return null
    return {
      kind: 'program',
      programId: line.programId,
      studentId: sid,
      addonProgramIds: line.addonProgramIds,
    }
  }
  if (line.kind === 'product' && line.productId) {
    return {
      kind: 'product',
      productId: line.productId,
      variantId: line.variantId,
    }
  }
  if (line.kind === 'membership' && line.tier) {
    return {
      kind: 'membership',
      tier: line.tier,
      studentId: line.studentId || studentId || null,
      shirtSize: line.shirtSize,
      shirtDesign: line.shirtDesign,
      shirtProductId: line.shirtProductId,
      shirtVariantId: line.shirtVariantId,
      physicalPerk: line.physicalPerk,
    }
  }
  if (line.kind === 'event' && line.eventId) {
    return {
      kind: 'event',
      eventId: line.eventId,
      quantity: Math.max(1, Number(line.quantity ?? 1) || 1),
    }
  }
  if (line.kind === 'donation' && line.amountCents) {
    return {
      kind: 'donation',
      amountCents: line.amountCents,
    }
  }
  return null
}

export function CartDrawer() {
  const { lines, open, total, count, setOpen, remove, update } = useCart()
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [payLine, setPayLine] = useState<CartLine | null>(null)

  useEffect(() => {
    if (!open) return
    if (!lines.some((l) => lineNeedsStudent(l))) return
    setStudentsLoading(true)
    fetch('/api/students')
      .then(async (r) => {
        if (r.status === 401) return
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Could not load students')
        const list = (data.students ?? []) as Student[]
        setStudents(list)
        if (list.length === 1) setStudentId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setStudentsLoading(false))
  }, [open, lines])

  useEffect(() => {
    if (!open) setPayLine(null)
  }, [open])

  if (!open) return null

  const activePayBody = payLine ? payBodyForLine(payLine, studentId) : null
  const payAmount =
    payLine != null
      ? Number(payLine.amount || 0) * Math.max(1, Number(payLine.quantity ?? 1) || 1)
      : 0

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Cart">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close cart"
        onClick={() => setOpen(false)}
      />
      <aside className="relative w-full max-w-md bg-white shadow-xl border-l border-[var(--border)] h-full flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
          <div>
            <p className="text-base font-bold text-[#1A1A1A]">Cart</p>
            <p className="text-xs text-[#5A6070]">
              {count === 0
                ? 'Empty'
                : `${count} item${count === 1 ? '' : 's'} · $${total.toFixed(2)} list`}
            </p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close">
            <X className="w-4 h-4 text-[#5A6070]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {lines.length === 0 ? (
            <p className="text-sm text-[#5A6070] whitespace-pre-line">
              {`Nothing here yet.
Add a class, membership, or Cove item and it will stay until you check out.`}
            </p>
          ) : (
            lines.map((line) => (
              <div
                key={line.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--brand-warm)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1A1A1A] leading-snug">{line.title}</p>
                    <p className="text-xs text-[#5A6070] mt-0.5 capitalize">{line.kind}</p>
                    <p className="text-sm font-semibold mt-1" style={{ color: 'var(--brand-green)' }}>
                      ${Number(line.amount || 0).toFixed(2)}
                      {line.quantity && line.quantity > 1 ? ` × ${line.quantity}` : ''}
                    </p>
                    {line.href ? (
                      <Link
                        href={line.href}
                        className="text-xs font-semibold text-[var(--brand-green)] hover:underline mt-1 inline-block"
                        onClick={() => setOpen(false)}
                      >
                        View
                      </Link>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#5A6070] hover:text-[#1A1A1A]"
                    onClick={() => remove(line.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}

          {lines.length > 0 ? (
            <MemberGate label="Log in to check out">
              <div className="space-y-3 pt-1">
                {lines.some((l) => lineNeedsStudent(l)) ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#5A6070] mb-1">
                      Student for checkout
                    </label>
                    {studentsLoading ? (
                      <p className="text-xs text-[#5A6070] flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                      </p>
                    ) : students.length === 0 ? (
                      <p className="text-xs text-[#5A6070]">
                        Add a student in Member Portal first (emergency contact and pick-up required).
                      </p>
                    ) : (
                      <select
                        value={studentId}
                        onChange={(e) => {
                          const next = e.target.value
                          setStudentId(next)
                          lines.forEach((l) => {
                            if (lineNeedsStudent(l)) update(l.id, { studentId: next })
                          })
                        }}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      >
                        <option value="">Select…</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} (Grade {s.grade})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : null}

                <div className="space-y-2">
                  {lines.map((line) => (
                    <Button
                      key={line.id}
                      type="button"
                      className="w-full text-white font-bold"
                      style={{ backgroundColor: 'var(--brand-green)' }}
                      disabled={lineNeedsStudent(line) && !(line.studentId || studentId)}
                      onClick={() => setPayLine(line)}
                    >
                      Check out · {line.title.slice(0, 28)}
                      {line.title.length > 28 ? '…' : ''}
                    </Button>
                  ))}
                  <p className="text-[11px] text-[#5A6070] whitespace-pre-line">
                    {`Items stay in your cart until paid.
Check out one item at a time. Discounts apply at payment.`}
                  </p>
                </div>
              </div>
            </MemberGate>
          ) : null}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <Link
            href="/cart"
            className="text-sm font-semibold text-[var(--brand-green)] hover:underline"
            onClick={() => setOpen(false)}
          >
            Open full cart page
          </Link>
        </div>
      </aside>

      {payLine && activePayBody ? (
        <PortalCardCheckout
          open
          onClose={() => setPayLine(null)}
          amount={payAmount}
          title={payLine.title}
          subtitle="Cart checkout"
          payBody={activePayBody}
          containerId={`cart-square-${payLine.id}`}
          onPaid={() => {
            remove(payLine.id)
            setPayLine(null)
            if (lines.length <= 1) setOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
