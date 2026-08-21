'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, BookOpen, Pencil, Loader2 } from 'lucide-react'
import { EditStudentForm } from './edit-student-form'

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
    payments: Payment[]
  } | null>(null)
  const [attendance, setAttendance] = useState<AttendanceMark[]>([])
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

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
            payments: Array.isArray(hist?.payments) ? hist.payments : [],
          })
          const marks = (att.attendance ?? []) as AttendanceMark[]
          setAttendance(marks.filter((m) => !m.studentId || m.studentId === student.id))
        })
        .catch(() => setHistory({ enrollments: [], payments: [] }))
        .finally(() => setLoading(false))
    }
  }, [open, student.id, history])

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

      {/* Expanded: edit, enrollments, attendance. Store owns Cove balance + Load. */}
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
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--brand-green)' }} />
            </div>
          )}

          {!loading && history && (
            <>
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
