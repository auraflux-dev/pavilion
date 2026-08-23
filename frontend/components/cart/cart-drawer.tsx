'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PortalCardCheckout, type PortalPayBody } from '@/components/checkout/portal-card-checkout'
import { MemberGate } from '@/components/member-gate'
import { useCart } from '@/lib/cart/store'
import type { CartLine } from '@/lib/cart/types'
import { useDialogA11y } from '@/lib/hooks/use-dialog-a11y'

type Student = { id: string; firstName: string; lastName: string; grade: string }

function lineNeedsStudent(line: CartLine) {
  return line.kind === 'program' || line.kind === 'event' || line.kind === 'membership'
}

function studentLabel(students: Student[], id: string | undefined) {
  if (!id) return ''
  const s = students.find((x) => x.id === id)
  if (!s) return ''
  return `${s.firstName} ${s.lastName} (Grade ${s.grade})`
}

function payBodyForLine(line: CartLine): Exclude<PortalPayBody, { kind: 'cart' | 'store-card' }> | null {
  if (line.kind === 'program' && line.programId) {
    const sid = String(line.studentId ?? '').trim()
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
      studentId: line.studentId || null,
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
  const { lines, open, total, count, setOpen, remove, update, clear } = useCart()
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [bagError, setBagError] = useState('')

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
      })
      .catch(() => {})
      .finally(() => setStudentsLoading(false))
  }, [open, lines])

  // Only auto-assign when the account has one student and a line is still missing one.
  useEffect(() => {
    if (!open || students.length !== 1) return
    const onlyId = students[0].id
    for (const line of lines) {
      if (lineNeedsStudent(line) && !String(line.studentId ?? '').trim()) {
        update(line.id, { studentId: onlyId })
      }
    }
  }, [open, students, lines, update])

  useEffect(() => {
    if (!open) {
      setPayOpen(false)
      setBagError('')
    }
  }, [open])

  const cartLinesPay = useMemo(() => {
    const out: Exclude<PortalPayBody, { kind: 'cart' | 'store-card' }>[] = []
    for (const line of lines) {
      const body = payBodyForLine(line)
      if (!body) return null
      out.push(body)
    }
    return out
  }, [lines])

  const missingStudentLines = lines.filter(
    (l) => l.kind === 'program' && !String(l.studentId ?? '').trim(),
  )
  const studentReady = missingStudentLines.length === 0
  const canCheckout =
    lines.length > 0 && studentReady && cartLinesPay != null && cartLinesPay.length === lines.length

  const panelRef = useRef<HTMLElement>(null)
  useDialogA11y(open, () => setOpen(false), panelRef)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Bag">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close bag"
        onClick={() => setOpen(false)}
      />
      <aside
        ref={panelRef}
        className="relative w-full max-w-md bg-white shadow-xl border-l border-[var(--border)] h-full flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
          <div>
            <p className="text-base font-bold text-[#1A1A1A]">Bag</p>
            <p className="text-xs text-[#5A6070]">
              {count === 0
                ? 'Empty'
                : `${count} item${count === 1 ? '' : 's'} · $${total.toFixed(2)}`}
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
Add a class, membership, or Cove item.
Your bag keeps items until you check out.`}
            </p>
          ) : (
            lines.map((line) => (
              <div
                key={line.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--brand-warm)] px-3 py-3 space-y-2"
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

                {lineNeedsStudent(line) ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5A6070] mb-1">
                      {line.kind === 'membership' ? 'Student (optional)' : 'Student for this class'}
                    </label>
                    {studentsLoading ? (
                      <p className="text-xs text-[#5A6070] flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                      </p>
                    ) : students.length === 0 ? (
                      <p className="text-xs text-[#5A6070] whitespace-pre-line">
                        {`Add a student in Member Portal first.
Emergency contact and pick-up are required.`}
                      </p>
                    ) : (
                      <select
                        value={line.studentId || ''}
                        onChange={(e) => update(line.id, { studentId: e.target.value || undefined })}
                        className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                      >
                        <option value="">
                          {line.kind === 'membership' ? 'No student linked' : 'Select…'}
                        </option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} (Grade {s.grade})
                          </option>
                        ))}
                      </select>
                    )}
                    {line.studentId && studentLabel(students, line.studentId) ? (
                      <p className="text-[11px] text-[#5A6070] mt-1">
                        Enrolling: {studentLabel(students, line.studentId)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          )}

          {lines.length > 0 ? (
            <MemberGate label="Log in to check out">
              <div className="space-y-3 pt-1">
                {bagError ? <p className="text-xs text-red-600 whitespace-pre-line">{bagError}</p> : null}

                <div className="rounded-xl border border-[var(--border)] bg-white px-3 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-[#5A6070]">Bag total</span>
                    <span className="font-bold text-[#1A1A1A] tabular-nums">${total.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-[#5A6070] whitespace-pre-line">
                    {`One payment for everything in the bag.
Pick the student on each class line (twins can differ).
Member and board discounts apply at checkout.`}
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full text-white font-bold"
                  style={{ backgroundColor: 'var(--brand-green)' }}
                  disabled={!canCheckout}
                  onClick={() => {
                    setBagError('')
                    if (!canCheckout || !cartLinesPay) {
                      setBagError(
                        missingStudentLines.length
                          ? 'Choose a student on each class line before checkout.'
                          : 'Fix bag items before checkout.',
                      )
                      return
                    }
                    setPayOpen(true)
                  }}
                >
                  {`Check out · $${total.toFixed(2)}`}
                </Button>
              </div>
            </MemberGate>
          ) : null}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/cart"
            className="text-sm font-semibold text-[var(--brand-green)] hover:underline"
            onClick={() => setOpen(false)}
          >
            Full bag page
          </Link>
          {lines.length > 0 ? (
            <button
              type="button"
              className="text-xs font-semibold text-[#5A6070] hover:text-[#1A1A1A]"
              onClick={() => clear()}
            >
              Empty bag
            </button>
          ) : null}
        </div>
      </aside>

      {payOpen && cartLinesPay ? (
        <PortalCardCheckout
          open
          onClose={() => setPayOpen(false)}
          amount={total}
          title={count === 1 ? lines[0]?.title || 'Bag' : `Bag · ${count} items`}
          subtitle="Pay once for everything in your bag"
          payBody={{
            kind: 'cart',
            cartLines: cartLinesPay,
          }}
          containerId="cart-bag-square"
          onPaid={() => {
            clear()
            setPayOpen(false)
            setOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
