'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, CreditCard, BookOpen, Receipt, ArrowRight, Star, Tag, Loader2, Plus } from 'lucide-react'
import { GiftCardSettings } from './gift-card-settings'
import { EditStudentForm } from './edit-student-form'

interface Enrollment {
  id: string
  programName: string
  status: string
  registrationDate: string | null
  paymentAmount: number
  grade: string
}

interface Payment {
  id: string
  programName: string
  amount: number
  status: string
  paymentDate: string | null
  paymentMethod: string
  transactionId: string
}

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  membershipTier: string
  membershipStatus: string
  discountCode: string | null
  storeCardBalance: number
}

interface Props {
  student: Student
  defaultOpen?: boolean
  upgradeBody?: string
  grades?: string[]
  onUpdated?: (student: Student) => void
}

const STATUS_COLORS: Record<string, string> = {
  enrolled:   'bg-green-50 text-green-700',
  active:     'bg-green-50 text-green-700',
  historical: 'bg-gray-100 text-gray-500',
  waitlisted: 'bg-yellow-50 text-yellow-700',
  cancelled:  'bg-red-50 text-red-600',
  pending:    'bg-blue-50 text-blue-700',
  paid:       'bg-green-50 text-green-700',
  failed:     'bg-red-50 text-red-600',
}

function statusClass(s: string) {
  return STATUS_COLORS[s?.toLowerCase()] ?? 'bg-gray-100 text-gray-500'
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(n: number) {
  return `$${Number(n).toFixed(2)}`
}

interface GiftCardData {
  hasCard: boolean
  gan?: string
  balance: number
  activities: {
    id: string
    type: string
    createdAt: string
    balanceMoney: number | null
    loadMoney: number | null
    redeemMoney: number | null
  }[]
}

export function StudentCard({
  student,
  defaultOpen = false,
  upgradeBody = 'Paid members get a pre-loaded store card, free or discounted program registration, and free refreshments at school events.',
  grades = ['6', '7', '8'],
  onUpdated,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [history, setHistory] = useState<{ enrollments: Enrollment[]; payments: Payment[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [giftCard, setGiftCard] = useState<GiftCardData | null>(null)
  const [giftCardLoading, setGiftCardLoading] = useState(false)
  const isPaid = student.membershipTier && student.membershipTier !== 'free'
  const tierLabel = isPaid
    ? student.membershipTier.charAt(0).toUpperCase() + student.membershipTier.slice(1)
    : 'Free'

  // Live gift card balance — fetched on mount
  useEffect(() => {
    setGiftCardLoading(true)
    fetch(`/api/gift-card/balance?studentId=${student.id}`)
      .then(r => r.json())
      .then(d => setGiftCard(d))
      .catch(() => setGiftCard({ hasCard: false, balance: 0, activities: [] }))
      .finally(() => setGiftCardLoading(false))
  }, [student.id])

  useEffect(() => {
    if (open && !history) {
      setLoading(true)
      fetch(`/api/students/${student.id}/history`)
        .then(r => r.json())
        .then(data => setHistory(data))
        .catch(() => setHistory({ enrollments: [], payments: [] }))
        .finally(() => setLoading(false))
    }
  }, [open, student.id, history])

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
            style={{ backgroundColor: '#085508' }}
          >
            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-[#1A1A1A]">{student.firstName} {student.lastName}</p>
            <p className="text-xs text-[#5A6070]">Grade {student.grade}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tier badge */}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
            isPaid ? 'bg-[#EEF6EE] text-[#085508]' : 'bg-gray-100 text-gray-500'
          }`}>
            {isPaid && <Star className="w-3 h-3" />}
            {tierLabel}
          </span>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1 text-[#5A6070] hover:text-[#085508] transition-colors"
          >
            {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-2 divide-x divide-[#F0EDE8] border-t border-[#F0EDE8]">
        <div className="flex items-center gap-2 px-5 py-3">
          <CreditCard className="w-4 h-4 shrink-0" style={{ color: '#085508' }} />
          <div>
            <p className="text-[10px] text-[#5A6070] uppercase tracking-wider font-semibold">Store Card</p>
            {giftCardLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mt-0.5" style={{ color: '#085508' }} />
            ) : (
              <p className="text-sm font-bold text-[#1A1A1A]">
                {giftCard?.hasCard ? formatMoney(giftCard.balance) : '—'}
              </p>
            )}
          </div>
        </div>
        {isPaid && student.discountCode ? (
          <div className="flex items-center gap-2 px-5 py-3">
            <Tag className="w-4 h-4 shrink-0" style={{ color: '#085508' }} />
            <div>
              <p className="text-[10px] text-[#5A6070] uppercase tracking-wider font-semibold">Discount Code</p>
              <p className="text-sm font-bold font-mono text-[#085508]">{student.discountCode}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-5 py-3">
            <Star className="w-4 h-4 shrink-0 text-[#5A6070]" />
            <div>
              <p className="text-[10px] text-[#5A6070] uppercase tracking-wider font-semibold">Membership</p>
              <a
                href={`/membership?studentId=${student.id}`}
                className="text-sm font-bold flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: '#085508' }}
              >
                Upgrade <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Expanded history */}
      {open && (
        <div className="border-t border-[#F0EDE8] px-5 py-5 space-y-6">
          {onUpdated ? (
            <EditStudentForm
              student={student}
              grades={grades}
              onUpdated={onUpdated}
            />
          ) : null}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#085508' }} />
            </div>
          )}

          {!loading && history && (
            <>
              {/* Gift Card */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 shrink-0" style={{ color: '#085508' }} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">SHMS Store Card</h4>
                  </div>
                  {giftCard?.hasCard && (
                    <span className="text-lg font-bold text-[#1A1A1A]">{formatMoney(giftCard.balance)}</span>
                  )}
                </div>

                {!giftCard?.hasCard ? (
                  <div className="rounded-xl border-2 border-dashed border-[#E8E4DC] p-4 text-center">
                    <p className="text-sm text-[#5A6070] mb-3">No store card linked yet.</p>
                    <a
                      href="/store"
                      className="inline-flex items-center gap-1.5 text-sm font-bold"
                      style={{ color: '#085508' }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Get a card
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Recent activity */}
                    {giftCard.activities.length > 0 && (
                      <div className="space-y-1.5">
                        {giftCard.activities.slice(0, 5).map(a => (
                          <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b border-[#F5F0E8] last:border-0">
                            <div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${
                                a.type === 'LOAD' ? 'bg-green-50 text-green-700' :
                                a.type === 'REDEEM' ? 'bg-blue-50 text-blue-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>{a.type === 'LOAD' ? 'Loaded' : a.type === 'REDEEM' ? 'Used' : a.type}</span>
                              <span className="text-xs text-[#5A6070]">
                                {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                              </span>
                            </div>
                            <div className="text-right">
                              {a.loadMoney != null && <span className="font-bold text-green-700">+{formatMoney(a.loadMoney)}</span>}
                              {a.redeemMoney != null && <span className="font-bold text-[#1A1A1A]">−{formatMoney(a.redeemMoney)}</span>}
                              {a.balanceMoney != null && <span className="text-xs text-[#5A6070] ml-1">→ {formatMoney(a.balanceMoney)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Load more / top-off button */}
                    <a
                      href="/store"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-bold border-2 border-[#085508] text-[#085508] hover:bg-[#EEF6EE] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Load funds
                    </a>

                    {/* Auto top-off settings */}
                    <GiftCardSettings
                      studentId={student.id}
                      studentName={student.firstName}
                    />
                  </div>
                )}
              </div>

              {/* Enrollments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 shrink-0" style={{ color: '#085508' }} />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">Programs & Enrollments</h4>
                </div>
                {history.enrollments.length === 0 ? (
                  <p className="text-sm text-[#5A6070]">No enrollments yet.</p>
                ) : (
                  <div className="space-y-2">
                    {history.enrollments.map(e => (
                      <div key={e.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-[#F5F0E8] last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A1A1A] truncate">{e.programName}</p>
                          <p className="text-xs text-[#5A6070]">{formatDate(e.registrationDate)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {e.paymentAmount > 0 && (
                            <span className="text-sm font-bold text-[#1A1A1A]">{formatMoney(e.paymentAmount)}</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(e.status)}`}>
                            {e.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-4 h-4 shrink-0" style={{ color: '#085508' }} />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">Payment History</h4>
                </div>
                {history.payments.length === 0 ? (
                  <p className="text-sm text-[#5A6070]">No payments yet.</p>
                ) : (
                  <div className="space-y-2">
                    {history.payments.map(p => (
                      <div key={p.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-[#F5F0E8] last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A1A1A] truncate">{p.programName}</p>
                          <p className="text-xs text-[#5A6070]">{formatDate(p.paymentDate)} · {p.paymentMethod}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-[#1A1A1A]">{formatMoney(p.amount)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(p.status)}`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upgrade nudge for free members */}
              {!isPaid && (
                <div
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{ backgroundColor: '#EEF6EE' }}
                >
                  <Star className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#085508' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A1A1A] mb-1">Upgrade {student.firstName}'s membership</p>
                    <p className="text-xs text-[#5A6070] leading-relaxed mb-3">
                      {upgradeBody}
                    </p>
                    <a
                      href={`/membership?studentId=${student.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-80"
                      style={{ color: '#085508' }}
                    >
                      See membership options <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
