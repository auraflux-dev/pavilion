'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import { useCart } from '@/lib/cart/store'
import { cartLinesToPayBody } from '@/lib/cart/to-pay-body'
import { useAuth } from '@/lib/hooks/use-auth'

type Student = {
  id: string
  firstName: string
  lastName: string
  grade: string
}

function lineNeedsStudent(kind: string) {
  return kind === 'program'
}

export function CheckoutPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const express = searchParams.get('express') === '1'
  const { status } = useAuth()
  const { lines, count, total, remove, update, clear } = useCart()
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [portalHref, setPortalHref] = useState('/member-portal')

  useEffect(() => {
    if (status === 'visitor') {
      router.replace('/auth/join?mode=login&returnTo=/checkout')
    }
  }, [status, router])

  useEffect(() => {
    if (!lines.some((l) => lineNeedsStudent(l.kind))) return
    setStudentsLoading(true)
    fetch('/api/students')
      .then(async (r) => {
        if (r.status === 401) return
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Could not load students')
        setStudents((data.students ?? []) as Student[])
      })
      .catch(() => {})
      .finally(() => setStudentsLoading(false))
  }, [lines])

  useEffect(() => {
    if (students.length !== 1) return
    const onlyId = students[0].id
    for (const line of lines) {
      if (lineNeedsStudent(line.kind) && !String(line.studentId ?? '').trim()) {
        update(line.id, { studentId: onlyId })
      }
    }
  }, [students, lines, update])

  const payBody = useMemo(() => cartLinesToPayBody(lines), [lines])
  const missingStudent = lines.some(
    (l) => l.kind === 'program' && !String(l.studentId ?? '').trim(),
  )
  const canPay =
    !paid &&
    lines.length > 0 &&
    !missingStudent &&
    payBody != null &&
    payBody.cartLines.length > 0

  if (status === 'loading' || status === 'visitor') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex items-center justify-center gap-2 text-sm text-[#5A6070]">
        <Loader2 className="w-4 h-4 animate-spin" />
        {status === 'visitor' ? 'Redirecting to log in…' : 'Loading…'}
      </div>
    )
  }

  if (paid) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 space-y-4 text-center">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Thank you</h1>
        <p className="text-sm text-[#5A6070]">
          Your payment went through. A confirmation is on the way, and you can review next steps in
          the member portal.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button asChild className="text-white font-bold" style={{ backgroundColor: 'var(--brand-green)' }}>
            <Link href={portalHref}>Continue in portal</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/programs">Browse programs</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Checkout</h1>
          <p className="mt-2 text-sm text-[#5A6070]">Your bag is empty.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/programs">Programs</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/membership">Membership</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/cove">The Cove</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/cart">View bag</Link>
          </Button>
        </div>
      </div>
    )
  }

  const needsStudentUi = lines.some((l) => lineNeedsStudent(l.kind))
  /** Express Buy now: one pay column — bag is already a single intentional line. */
  const combinedExpress = express && !needsStudentUi

  return (
    <div
      className={
        combinedExpress
          ? 'max-w-2xl mx-auto px-4 py-8 md:py-10 space-y-5'
          : 'max-w-6xl mx-auto px-4 py-8 md:py-10 space-y-6'
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">
            {express ? 'Express checkout' : 'Checkout'}
          </h1>
          <p className="mt-2 text-sm text-[#5A6070]">
            {count} item{count === 1 ? '' : 's'} · ${total.toFixed(2)}.
            {express
              ? ' Pay now — or edit the bag if you need to change items.'
              : ' One payment for the whole bag.'}
          </p>
        </div>
        <Link href="/cart" className="text-sm font-semibold text-[var(--brand-green)] hover:underline">
          Edit bag
        </Link>
      </div>

      {combinedExpress ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5A6070]">
                In your bag
              </p>
              <p className="font-bold text-[#1A1A1A] truncate">{lines[0]?.title}</p>
              <p className="text-xs text-[#5A6070] capitalize">{lines[0]?.kind}</p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-[#5A6070] hover:text-[#1A1A1A] shrink-0"
              onClick={() => lines[0] && remove(lines[0].id)}
            >
              Remove
            </button>
          </div>
          {canPay && payBody ? (
            <PortalCardCheckout
              variant="page"
              open
              onClose={() => undefined}
              amount={total}
              title={lines[0]?.title || 'Bag'}
              subtitle="Express checkout · pay now"
              payBody={payBody}
              containerId="checkout-page-square"
              express={express}
              onPaid={(data) => {
                clear()
                setPaid(true)
                const conf = data.confirmation as { portalHref?: string } | undefined
                if (typeof conf?.portalHref === 'string' && conf.portalHref) {
                  setPortalHref(conf.portalHref)
                }
              }}
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <ul className="space-y-3">
            {lines.map((line) => (
              <li
                key={line.id}
                className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1A1A1A]">{line.title}</p>
                    <p className="text-xs text-[#5A6070] mt-0.5 capitalize">{line.kind}</p>
                    <p className="text-sm font-semibold mt-2" style={{ color: 'var(--brand-green)' }}>
                      ${Number(line.amount || 0).toFixed(2)}
                      {line.quantity && line.quantity > 1 ? ` × ${line.quantity}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#5A6070] hover:text-[#1A1A1A] shrink-0"
                    onClick={() => remove(line.id)}
                  >
                    Remove
                  </button>
                </div>

                {lineNeedsStudent(line.kind) ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5A6070] mb-1">
                      Student for this class
                    </label>
                    {studentsLoading ? (
                      <p className="text-xs text-[#5A6070] flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                      </p>
                    ) : students.length === 0 ? (
                      <p className="text-xs text-[#5A6070]">
                        Add a student in Member Portal first, then return to checkout.
                      </p>
                    ) : (
                      <select
                        value={line.studentId || ''}
                        onChange={(e) => update(line.id, { studentId: e.target.value || undefined })}
                        className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
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
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-24 space-y-3 min-w-0">
            {missingStudent ? (
              <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                Choose a student on each class line before paying.
              </p>
            ) : null}
            {canPay && payBody ? (
              <PortalCardCheckout
                variant="page"
                open
                onClose={() => undefined}
                amount={total}
                title={count === 1 ? lines[0]?.title || 'Bag' : `Bag · ${count} items`}
                subtitle={express ? 'Express checkout · pay now' : 'Pay once for everything in your bag'}
                payBody={payBody}
                containerId="checkout-page-square"
                express={express}
                onPaid={(data) => {
                  clear()
                  setPaid(true)
                  const conf = data.confirmation as { portalHref?: string } | undefined
                  if (typeof conf?.portalHref === 'string' && conf.portalHref) {
                    setPortalHref(conf.portalHref)
                  }
                }}
              />
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm text-[#5A6070]">
                Fix bag items above to continue to payment.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
