'use client'

/**
 * In-app program registration — student select, safety check, consent checkboxes, pay if fee > 0.
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CheckoutConsent } from '@/components/checkout/checkout-consent'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import type { ConsentAck } from '@/lib/checkout-consent'
import type { Program } from '@/lib/api/programs'
import { formatProgramSchedule } from '@/lib/programs/schedule'

type Student = {
  id: string
  firstName: string
  lastName: string
  grade: string
  parentPhone?: string
  emergencyContact?: string
  emergencyPhone?: string
  pickupAuthorized?: string
}

interface Props {
  program: Program
  open: boolean
  onClose: () => void
  onRegistered?: () => void
}

export function ProgramRegisterModal({ program, open, onClose, onRegistered }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [consents, setConsents] = useState<ConsentAck[] | null>(null)
  const [consentComplete, setConsentComplete] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState(0)

  const onConsentChange = useCallback((acks: ConsentAck[] | null, complete: boolean) => {
    setConsents(acks)
    setConsentComplete(complete)
  }, [])

  useEffect(() => {
    if (!open) return
    setError('')
    setSuccess('')
    setPayOpen(false)
    setLoading(true)
    fetch('/api/students')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Could not load students')
        const list = (data.students ?? []) as Student[]
        setStudents(list)
        if (list.length === 1) setStudentId(list[0].id)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load students'))
      .finally(() => setLoading(false))
  }, [open])

  async function submit() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (!studentId) throw new Error('Select a student')
      if (!consentComplete || !consents) {
        throw new Error('Please review and accept the required terms')
      }

      const res = await fetch('/api/programs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: program._id,
          studentId,
          consents,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')

      if (data.requiresPayment) {
        setPayAmount(Number(data.fee) || program.fee || 0)
        setPayOpen(true)
        return
      }

      const waitlisted = String(data.status ?? '') === 'Waitlisted'
      const position = Number(data.waitlistPosition ?? 0)
      if (data.alreadyEnrolled && waitlisted) {
        setSuccess(
          position > 0
            ? `You are already on the waitlist (position #${position}).`
            : 'You are already on the waitlist for this program.',
        )
      } else if (data.alreadyEnrolled) {
        setSuccess('Already enrolled. You are all set.')
      } else if (waitlisted) {
        setSuccess(
          position > 0
            ? `This program is full. You are #${position} on the waitlist. We will email you if a seat opens.`
            : 'This program is full. You are on the waitlist. We will email you if a seat opens.',
        )
      } else {
        setSuccess(`Enrolled in ${data.programName || program.name}.`)
      }
      onRegistered?.()
      setTimeout(() => onClose(), waitlisted ? 2800 : 1400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const fee = Number(program.fee ?? 0)
  const scheduleLine = formatProgramSchedule(program)

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="program-register-title"
      >
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-[#E8E4DC] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p id="program-register-title" className="text-base font-bold text-[#1A1A1A]">
                Register — {program.name}
              </p>
              <p className="text-sm font-bold mt-1" style={{ color: '#085508' }}>
                {fee <= 0 ? 'Free' : `$${fee.toFixed(2)}`}
              </p>
              {scheduleLine ? (
                <p className="text-xs text-[#5A6070] mt-2 leading-relaxed">{scheduleLine}</p>
              ) : null}
            </div>
            <button type="button" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4 text-[#5A6070]" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[#5A6070]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-[#5A6070]">
              Add a student in the Member Portal first, including emergency contact and pick-up
              details.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#5A6070] mb-1">
                  Student
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E4DC] px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} (Grade {s.grade})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#5A6070] mt-1.5">
                  Registration needs parent phone, emergency contact, and authorized pick-up on the
                  student profile. Edit those in Member Portal → Edit student.
                </p>
              </div>

              <CheckoutConsent kind="program" onChange={onConsentChange} />

              {error ? <p className="text-xs text-red-600">{error}</p> : null}
              {success ? (
                <p className="text-xs font-semibold text-green-700">{success}</p>
              ) : null}

              <Button
                type="button"
                onClick={submit}
                disabled={busy || !studentId || !consentComplete}
                className="w-full text-white font-bold"
                style={{ backgroundColor: '#085508' }}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : fee > 0 ? (
                  `Continue to payment · $${fee.toFixed(2)}`
                ) : (
                  'Complete registration'
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <PortalCardCheckout
        open={payOpen}
        onClose={() => setPayOpen(false)}
        amount={payAmount}
        title={`Pay — ${program.name}`}
        subtitle="Enrichment program registration"
        payBody={{
          kind: 'program',
          programId: program._id,
          studentId,
          consents: consents ?? undefined,
        }}
        prefilledConsents={consents ?? undefined}
        onPaid={(result) => {
          setPayOpen(false)
          const waitlisted = String(result?.status ?? '') === 'Waitlisted'
          const position = Number(result?.waitlistPosition ?? 0)
          if (waitlisted) {
            setSuccess(
              position > 0
                ? `Payment received. You are #${position} on the waitlist. Staff will contact you if a seat opens (refund if needed).`
                : 'Payment received. You are on the waitlist. Staff will contact you if a seat opens.',
            )
          } else {
            setSuccess(`Enrolled and paid for ${program.name}.`)
          }
          onRegistered?.()
          setTimeout(() => onClose(), waitlisted ? 3200 : 1400)
        }}
        containerId="program-square-card"
      />
    </>
  )
}
