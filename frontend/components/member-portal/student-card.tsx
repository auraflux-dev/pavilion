'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, CreditCard, BookOpen, Pencil, Loader2 } from 'lucide-react'
import { EditStudentForm } from './edit-student-form'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

interface Enrollment {
  id: string
  programName: string
  programId?: string
  status: string
  registrationDate: string | null
  paymentAmount: number
  grade?: string
  waitlistPosition?: number | null
}

interface AttendanceMark {
  id: string
  programName: string
  sessionDate: string
  studentId: string
  studentName: string
  status: string
  checkedInAt: string | null
  checkedOutAt: string | null
  notes: string
}

interface Payment {
  id: string
  programName: string
  amount: number
  status: string
  paymentDate: string | null
  paymentMethod: string
  detail?: string
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
  parentPhone?: string
  emergencyContact?: string
  emergencyPhone?: string
  allergies?: string
  medicalConditions?: string
  medications?: string
  pickupAuthorized?: string
}

export type BoardPost = {
  id: string
  programId: string
  programName: string
  subject: string
  body: string
  fromName: string
  sentAt: string | null
}

interface Props {
  student: Student
  defaultOpen?: boolean
  grades?: string[]
  boardPosts?: BoardPost[]
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
  refundrequested: 'bg-amber-50 text-amber-800',
  refunded: 'bg-gray-100 text-gray-600',
  transferrequested: 'bg-blue-50 text-blue-700',
  present: 'bg-green-50 text-green-700',
  late: 'bg-amber-50 text-amber-800',
  absent: 'bg-red-50 text-red-600',
  checkedout: 'bg-gray-100 text-gray-600',
}

function statusClass(s: string) {
  const key = s?.toLowerCase()
  if (key === 'loaded') return 'bg-[var(--brand-soft)] text-[var(--brand-green)]'
  if (key === 'spent') return 'bg-amber-50 text-amber-800'
  return STATUS_COLORS[key] ?? 'bg-gray-100 text-gray-500'
}

function formatDate(d: string | null) {
  if (!d) return 'n/a'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(n: number) {
  return `$${Number(n).toFixed(2)}`
}

function safetySummary(student: Student): { complete: boolean; allergyLine: string } {
  const complete = Boolean(
    String(student.parentPhone ?? '').trim() &&
      String(student.emergencyContact ?? '').trim() &&
      String(student.emergencyPhone ?? '').trim() &&
      String(student.pickupAuthorized ?? '').trim(),
  )
  return { complete, allergyLine: String(student.allergies ?? '').trim() }
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
  grades = ['6', '7', '8'],
  boardPosts = [],
  onUpdated,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [history, setHistory] = useState<{
    enrollments: Enrollment[]
    pastEnrollments?: Enrollment[]
    payments: Payment[]
    transferOptions?: { id: string; name: string }[]
  } | null>(null)
  const [attendance, setAttendance] = useState<AttendanceMark[]>([])
  const [loading, setLoading] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [requestBusy, setRequestBusy] = useState(false)
  const [requestMsg, setRequestMsg] = useState('')
  const [giftCard, setGiftCard] = useState<GiftCardData | null>(null)
  const [giftCardLoading, setGiftCardLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Live gift card balance. Fetched on mount
  useEffect(() => {
    setGiftCardLoading(true)
    fetch(`/api/gift-card/balance?studentId=${student.id}`)
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!r.ok || !d || d.hasCard == null) {
          setGiftCard({ hasCard: false, balance: 0, activities: [] })
          return
        }
        setGiftCard({
          hasCard: Boolean(d.hasCard),
          gan: d.gan,
          balance: Number(d.balance) || 0,
          activities: Array.isArray(d.activities) ? d.activities : [],
        })
      })
      .catch(() => setGiftCard({ hasCard: false, balance: 0, activities: [] }))
      .finally(() => setGiftCardLoading(false))
  }, [student.id])

  useEffect(() => {
    if (open && !history) {
      setLoading(true)
      Promise.all([
        fetch(`/api/students/${student.id}/history`).then((r) => r.json()),
        fetch('/api/portal/programs/attendance').then((r) => r.json()).catch(() => ({ attendance: [] })),
      ])
        .then(([hist, att]) => {
          setHistory({
            enrollments: Array.isArray(hist?.enrollments) ? hist.enrollments : [],
            pastEnrollments: Array.isArray(hist?.pastEnrollments)
              ? hist.pastEnrollments
              : [],
            payments: Array.isArray(hist?.payments) ? hist.payments : [],
            transferOptions: Array.isArray(hist?.transferOptions)
              ? hist.transferOptions
              : [],
          })
          const marks = (att.attendance ?? []) as AttendanceMark[]
          setAttendance(marks.filter((m) => !m.studentId || m.studentId === student.id))
        })
        .catch(() => setHistory({ enrollments: [], payments: [] }))
        .finally(() => setLoading(false))
    }
  }, [open, student.id, history])

  async function requestEnrollmentChange(
    enrollmentId: string,
    action: 'refund' | 'transfer',
    currentProgramId?: string,
  ) {
    setRequestBusy(true)
    setRequestMsg('')
    try {
      let toProgramId = ''
      let note = ''
      if (action === 'transfer') {
        const progRes = await fetch('/api/portal/programs/enrollment-request')
        const progData = await progRes.json().catch(() => ({ programs: [] }))
        const choices = ((progData.programs ?? []) as { id: string; name: string }[]).filter(
          (p) => p.id && p.id !== currentProgramId,
        )
        if (!choices.length) {
          setRequestMsg('No other open programs available to transfer into.')
          setRequestBusy(false)
          return
        }
        const label = choices.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
        const pick = window.prompt(`Transfer to program number:\n${label}`)
        if (!pick) {
          setRequestBusy(false)
          return
        }
        const dest = choices[Number(pick) - 1]
        if (!dest) {
          setRequestMsg('Invalid program selection.')
          setRequestBusy(false)
          return
        }
        toProgramId = dest.id
        note = window.prompt('Optional note for staff')?.trim() || ''
      } else {
        note = window.prompt('Optional note for your refund request')?.trim() || ''
      }
      const r = await fetch('/api/portal/programs/enrollment-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, action, toProgramId: toProgramId || undefined, note }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Request failed')
      setRequestMsg(action === 'refund' ? 'Refund request sent to staff.' : 'Transfer request sent to staff.')
      setHistory(null)
    } catch (err) {
      setRequestMsg(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setRequestBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-[#1A1A1A]">{student.firstName} {student.lastName}</p>
            <p className="text-xs text-[#5A6070]">Grade {student.grade}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onUpdated ? (
            <button
              type="button"
              onClick={() => {
                setOpen(true)
                setEditOpen(true)
              }}
              className="text-xs font-semibold text-[var(--brand-green)] hover:underline inline-flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Edit student
            </button>
          ) : null}
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1 text-[#5A6070] hover:text-[var(--brand-green)] transition-colors"
            aria-label={open ? 'Collapse student' : 'Expand student'}
          >
            {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsed: Cove balance only. Membership tier lives on Account / Store benefits. */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-[#F0EDE8]">
        <CreditCard className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-green)' }} />
        <div>
          <p className="text-[10px] text-[#5A6070] uppercase tracking-wider font-semibold">{vanillaizeIfDemo('Cove balance')}</p>
          {giftCardLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mt-0.5" style={{ color: 'var(--brand-green)' }} />
          ) : (
            <p className="text-sm font-bold text-[#1A1A1A]">
              {giftCard?.hasCard ? formatMoney(giftCard.balance) : 'n/a'}
            </p>
          )}
        </div>
      </div>

      {/* Expanded: edit form, enrollments, attendance. Store owns Load + purchases. Auto Top-Off on Payment methods. */}
      {open && (
        <div className="border-t border-[#F0EDE8] px-5 py-5 space-y-6">
          {onUpdated ? (
            <EditStudentForm
              student={student}
              grades={grades}
              onUpdated={onUpdated}
              open={editOpen}
              onOpenChange={setEditOpen}
              hideTrigger
            />
          ) : null}
          {!giftCard?.hasCard ? (
            <p className="text-sm text-[#5A6070]">
              {vanillaizeIfDemo('No Cove balance yet. Load from Store & Cove below.')}
            </p>
          ) : null}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--brand-green)' }} />
            </div>
          )}

          {!loading && history && (
            <>
              {(() => {
                const safety = safetySummary(student)
                return (
                  <p className="text-xs text-[#5A6070] -mt-2">
                    {safety.complete ? (
                      <span className="font-semibold text-[var(--brand-green)]">Safety profile complete</span>
                    ) : (
                      <span className="font-semibold text-amber-800">Safety profile incomplete. Edit student details above</span>
                    )}
                    {safety.allergyLine ? ` · Allergy: ${safety.allergyLine}` : ' · No allergies listed'}
                  </p>
                )
              })()}

              {/* Enrollments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-green)' }} />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">Programs & Enrollments</h4>
                </div>
                {(history.enrollments?.length ?? 0) === 0 ? (
                  <p className="text-sm text-[#5A6070]">No current enrollments.</p>
                ) : (
                  <div className="space-y-2">
                    {history.enrollments.map(e => {
                      const canRequest =
                        ['Enrolled', 'Paid', 'Waitlisted'].includes(e.status) && Boolean(e.id)
                      const programPosts = boardPosts.filter((p) => {
                        const pid = String(e.programId ?? '').trim()
                        const pname = String(e.programName ?? '').trim().toLowerCase()
                        return (
                          (pid && p.programId === pid) ||
                          (pname && p.programName.trim().toLowerCase() === pname)
                        )
                      }).slice(0, 5)
                      return (
                      <div key={e.id} className="py-2.5 border-b border-[var(--brand-warm)] last:border-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1A1A1A] truncate">{e.programName}</p>
                            <p className="text-xs text-[#5A6070]">
                              {formatDate(e.registrationDate)}
                              {e.waitlistPosition ? ` · Waitlist #${e.waitlistPosition}` : ''}
                            </p>
                            {canRequest ? (
                              <div className="flex flex-wrap gap-2 mt-1">
                                <button
                                  type="button"
                                  disabled={requestBusy}
                                  className="text-[11px] font-semibold underline"
                                  style={{ color: 'var(--brand-green)' }}
                                  onClick={() => void requestEnrollmentChange(e.id, 'refund')}
                                >
                                  Request refund
                                </button>
                                <button
                                  type="button"
                                  disabled={requestBusy}
                                  className="text-[11px] font-semibold underline"
                                  style={{ color: 'var(--brand-green)' }}
                                  onClick={() => void requestEnrollmentChange(e.id, 'transfer', e.programId)}
                                >
                                  Request transfer
                                </button>
                              </div>
                            ) : null}
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
                        {programPosts.length > 0 ? (
                          <div className="rounded-lg px-2.5 py-2 space-y-1.5" style={{ backgroundColor: '#f3f7f3' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
                              Class board
                            </p>
                            {programPosts.map((p) => (
                              <div key={p.id} className="space-y-0.5">
                                <p className="text-[11px] text-[#5A6070]">
                                  {formatDate(p.sentAt)}
                                  {p.fromName ? ` · ${p.fromName}` : ''}
                                </p>
                                <p className="text-xs font-semibold text-[#1A1A1A]">{p.subject}</p>
                                <p className="text-[11px] text-[#5A6070] whitespace-pre-line line-clamp-2">
                                  {p.body}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      )
                    })}
                  </div>
                )}
                {(history.pastEnrollments?.length ?? 0) > 0 ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#5A6070] underline-offset-2 hover:underline"
                      onClick={() => setShowPast((v) => !v)}
                    >
                      {showPast ? 'Hide' : 'Show'} prior years / imported history (
                      {history.pastEnrollments!.length})
                    </button>
                    {showPast ? (
                      <div className="mt-2 space-y-2 rounded-lg border border-[var(--border)] bg-[#FAFAF8] px-3 py-2">
                        <p className="text-[11px] text-[#5A6070]">
                          Past Jumbula / prior-season records. not current programs.
                        </p>
                        {history.pastEnrollments!.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-start justify-between gap-3 py-2 border-b border-[#F0EDE8] last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-[#1A1A1A] truncate">{e.programName}</p>
                              <p className="text-xs text-[#5A6070]">{formatDate(e.registrationDate)}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(e.status)}`}>
                              {e.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {requestMsg ? <p className="text-xs text-[#5A6070] mt-2">{requestMsg}</p> : null}
              </div>

              {/* Attendance */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-green)' }} />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">Attendance</h4>
                </div>
                {(attendance?.length ?? 0) === 0 ? (
                  <p className="text-sm text-[#5A6070]">No check-in records yet.</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.slice(0, 12).map((m) => (
                      <div
                        key={m.id || `${m.sessionDate}-${m.programName}`}
                        className="flex items-start justify-between gap-3 py-2.5 border-b border-[var(--brand-warm)] last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A1A1A] truncate">{m.programName}</p>
                          <p className="text-xs text-[#5A6070]">
                            {m.sessionDate}
                            {m.checkedInAt ? ` · in ${new Date(m.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                            {m.checkedOutAt ? ` · out ${new Date(m.checkedOutAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(m.status)}`}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
