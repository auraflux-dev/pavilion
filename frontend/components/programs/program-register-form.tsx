'use client'

/**
 * Program registration + Square pay. Used in the catalog modal and on class landing pages.
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CheckoutConsent } from '@/components/checkout/checkout-consent'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import { MemberGate } from '@/components/member-gate'
import type { ConsentAck } from '@/lib/checkout-consent'
import type { Program } from '@/lib/api/programs'
import { formatProgramSchedule } from '@/lib/programs/schedule'
import { displayProgramName } from '@/lib/programs/display-name'
import {
  formatMemberPriorityUntil,
  getRegistrationPhase,
} from '@/lib/programs/registration-access'
import { useAuth } from '@/lib/hooks/use-auth'
import { gaSurface, trackEvent } from '@/lib/ga'
import { SpringCompanionOffer } from '@/components/programs/spring-companion-offer'
import { resolveProgramSeason } from '@/lib/programs/season'
import { programPublicPath } from '@/lib/programs/public-path'
import { useCart } from '@/lib/cart/store'
import { useProgramUiCopy, ui } from '@/components/programs/program-ui-copy-context'
import { MEMBERSHIP_CHOOSE_PATH } from '@/lib/membership-links'

type Student = {
  id: string
  firstName: string
  lastName: string
  grade: string
}

interface FormProps {
  program: Program
  /** Matching Spring (or Fall) twin for add-to-cart. */
  companion?: Program | null
  onClose?: () => void
  onRegistered?: () => void
  /** Unique Square mount id when both modal and page can exist. */
  checkoutId: string
  heading?: string
}

export function ProgramRegisterForm({
  program,
  companion = null,
  onClose,
  onRegistered,
  checkoutId,
  heading,
}: FormProps) {
  const uiCopy = useProgramUiCopy()
  const { hasPaidMembership } = useAuth()
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
  const [couponCode, setCouponCode] = useState('')
  const [addCompanion, setAddCompanion] = useState(false)
  const [cartNote, setCartNote] = useState('')
  const cart = useCart()
  const phase = getRegistrationPhase(program)
  const priorityUntilLabel =
    phase === 'member_priority' ? formatMemberPriorityUntil(program.memberPriorityUntil) : ''
  const blockedByPriority = phase === 'member_priority' && !hasPaidMembership
  const fee = Number(program.fee ?? 0)
  const feeTbd = String(program.tags ?? '')
    .toLowerCase()
    .split(/[,|;]/)
    .map((t) => t.trim())
    .includes('fee-tbd')
  const scheduleLine = formatProgramSchedule(program)
  const springAddon =
    addCompanion && companion && resolveProgramSeason(companion) === 'spring-2027'
      ? companion
      : null
  const checkoutTotal = fee + (springAddon ? Number(springAddon.fee ?? 0) : 0)

  const onConsentChange = useCallback((acks: ConsentAck[] | null, complete: boolean) => {
    setConsents(acks)
    setConsentComplete(complete)
  }, [])

  useEffect(() => {
    if (!program.registrationOpen) {
      setLoading(false)
      return
    }
    setError('')
    setSuccess('')
    setPayOpen(false)
    setLoading(true)
    fetch('/api/students')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || ui(uiCopy, 'register.err.loadStudents'))
        const list = (data.students ?? []) as Student[]
        setStudents(list)
        if (list.length === 1) setStudentId(list[0].id)
      })
      .catch((err) => setError(err instanceof Error ? err.message : ui(uiCopy, 'register.err.loadStudents')))
      .finally(() => setLoading(false))
  }, [program.registrationOpen])

  async function submit() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (!studentId) throw new Error(ui(uiCopy, 'register.err.selectStudent'))
      if (!consentComplete || !consents) {
        throw new Error(ui(uiCopy, 'register.err.consent'))
      }

      const addonProgramIds = springAddon?._id ? [springAddon._id] : undefined
      const res = await fetch('/api/programs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: program._id,
          studentId,
          consents,
          couponCode: couponCode.trim() || undefined,
          addonProgramIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || ui(uiCopy, 'register.err.failed'))

      if (data.requiresPayment) {
        const amount = Number(data.fee) || program.fee || 0
        setPayAmount(amount)
        const pct = Number(data.memberDiscountPercent ?? 0)
        if (pct > 0) {
          setSuccess(
            ui(uiCopy, 'register.success.discount', {
              pct,
              list: `$${Number(data.listFee).toFixed(2)}`,
              amount: `$${amount.toFixed(2)}`,
            }),
          )
        }
        setPayOpen(true)
        return
      }

      const waitlisted = String(data.status ?? '') === 'Waitlisted'
      const position = Number(data.waitlistPosition ?? 0)
      if (data.alreadyEnrolled && waitlisted) {
        setSuccess(
          position > 0
            ? ui(uiCopy, 'register.success.waitlistExisting', {
                positionLine: ui(uiCopy, 'register.success.waitlistExistingPosition', { position }),
              })
            : ui(uiCopy, 'register.success.waitlistExisting', { positionLine: '' }),
        )
      } else if (data.alreadyEnrolled) {
        setSuccess(ui(uiCopy, 'register.success.enrolledExisting'))
      } else if (waitlisted) {
        setSuccess(
          position > 0
            ? ui(uiCopy, 'register.success.waitlistNew', {
                positionLine: ui(uiCopy, 'register.success.waitlistPosition', { position }),
              })
            : ui(uiCopy, 'register.success.waitlistNew', { positionLine: '' }),
        )
        trackEvent('program_enroll', {
          surface: gaSurface(),
          program_name: data.programName || program.name,
          status: 'waitlist',
        })
      } else {
        setSuccess(ui(uiCopy, 'register.success.enrolled', { name: data.programName || program.name }))
        trackEvent('program_enroll', {
          surface: gaSurface(),
          program_name: data.programName || program.name,
          status: 'enrolled',
        })
      }
      onRegistered?.()
      if (onClose) setTimeout(() => onClose(), waitlisted ? 2800 : 1400)
    } catch (err) {
      setError(err instanceof Error ? err.message : ui(uiCopy, 'register.err.failed'))
    } finally {
      setBusy(false)
    }
  }

  const title = heading ?? ui(uiCopy, 'register.heading', { name: program.name })

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-[#1A1A1A]">{title}</p>
            <p
              className="text-sm font-bold mt-1 whitespace-pre-line"
              style={{ color: 'var(--brand-green)' }}
            >
              {feeTbd
                ? ui(uiCopy, 'register.tuitionTbd')
                : fee <= 0
                  ? ui(uiCopy, 'register.free')
                  : springAddon
                    ? ui(uiCopy, 'register.fallPlusSpring', { total: `$${checkoutTotal.toFixed(2)}` })
                    : ui(uiCopy, 'register.feeOnly', { total: `$${fee.toFixed(2)}` })}
            </p>
            {!feeTbd && fee > 0 && String(program.memberDiscountNote ?? '').trim() ? (
              <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
                {String(program.memberDiscountNote).trim()}
              </p>
            ) : null}
            {scheduleLine ? (
              <p className="text-xs text-[#5A6070] mt-2 leading-relaxed whitespace-pre-line">
                {scheduleLine.replace(/ · /g, '\n')}
              </p>
            ) : null}
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4 text-[#5A6070]" />
            </button>
          ) : null}
        </div>

        {!program.registrationOpen ? (
          <p className="text-sm text-[#5A6070]">{ui(uiCopy, 'register.notOpen')}</p>
        ) : null}

        {program.registrationOpen && priorityUntilLabel ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {blockedByPriority
              ? ui(uiCopy, 'register.priorityBlocked', { until: priorityUntilLabel })
              : ui(uiCopy, 'register.priorityWindow', { until: priorityUntilLabel })}
          </p>
        ) : null}

        {program.registrationOpen && loading ? (
          <div className="flex items-center gap-2 text-xs text-[#5A6070]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {ui(uiCopy, 'register.loading')}
          </div>
        ) : null}

        {program.registrationOpen && !loading && blockedByPriority ? (
          <Button
            type="button"
            className="w-full text-white font-bold"
            style={{ backgroundColor: 'var(--brand-green)' }}
            onClick={() => {
              window.location.href = MEMBERSHIP_CHOOSE_PATH
            }}
          >
            {ui(uiCopy, 'register.viewMemberships')}
          </Button>
        ) : null}

        {program.registrationOpen && !loading && !blockedByPriority && students.length === 0 ? (
          <p className="text-sm text-[#5A6070]">
            {ui(uiCopy, 'register.addStudent')}
          </p>
        ) : null}

        {program.registrationOpen && !loading && !blockedByPriority && students.length > 0 ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-[#5A6070] mb-1">
                {ui(uiCopy, 'register.studentLabel')}
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
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

            {companion &&
            (resolveProgramSeason(program) === 'fall-2026' ||
              resolveProgramSeason(program) === 'spring-2027') ? (
              <SpringCompanionOffer
                companion={companion}
                variant="checkout"
                selectable={resolveProgramSeason(companion) === 'spring-2027'}
                selected={Boolean(springAddon)}
                onSelectedChange={setAddCompanion}
              />
            ) : null}

            {fee > 0 && !feeTbd ? (
              <label className="block text-xs font-semibold text-[#5A6070]">
                Discount code
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Optional override"
                  autoComplete="off"
                  className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono tracking-wide uppercase"
                />
                <span className="mt-1.5 block text-[11px] font-normal text-[#5A6070] whitespace-pre-line">
                  {`Membership tier % applies automatically.
Board 75% (one enrichment program per season) also applies automatically when unused.
Only paste a code here if you need to override.`}
                </span>
              </label>
            ) : null}

            <CheckoutConsent kind="program" onChange={onConsentChange} />

            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            {success ? (
              <p className="text-xs font-semibold text-green-700 whitespace-pre-line">{success}</p>
            ) : null}

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                disabled={!studentId || feeTbd}
                className="w-full font-bold"
                onClick={() => {
                  const title = springAddon
                    ? `${displayProgramName(program.name)} + ${displayProgramName(springAddon.name)}`
                    : displayProgramName(program.name)
                  cart.add({
                    kind: 'program',
                    title,
                    amount: checkoutTotal,
                    href: programPublicPath(program),
                    programId: program._id,
                    addonProgramIds: springAddon?._id ? [springAddon._id] : undefined,
                    studentId: studentId || undefined,
                  })
                  setCartNote(ui(uiCopy, 'register.addToCartNote'))
                  onClose?.()
                }}
              >
                {ui(uiCopy, 'register.addToCart', { total: `$${checkoutTotal.toFixed(2)}` })}
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={busy || !studentId || !consentComplete || feeTbd}
                className="w-full text-white font-bold"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : fee > 0 && !feeTbd ? (
                  ui(uiCopy, 'register.payNow', { total: `$${checkoutTotal.toFixed(2)}` })
                ) : (
                  ui(uiCopy, 'register.complete')
                )}
              </Button>
              {cartNote ? (
                <p className="text-xs font-semibold text-green-700 whitespace-pre-line">{cartNote}</p>
              ) : null}
            </div>
          </>
        ) : null}

        {error && !program.registrationOpen ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : null}
      </div>

      <PortalCardCheckout
        open={payOpen}
        onClose={() => setPayOpen(false)}
        amount={payAmount}
        title={displayProgramName(program.name)}
        subtitle={ui(uiCopy, 'register.checkoutSubtitle')}
        payBody={{
          kind: 'program',
          programId: program._id,
          studentId,
          addonProgramIds: springAddon?._id ? [springAddon._id] : undefined,
          couponCode: couponCode.trim() || undefined,
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
                ? ui(uiCopy, 'register.success.paidWaitlist', {
                    positionLine: ui(uiCopy, 'register.success.paidWaitlistPosition', { position }),
                  })
                : ui(uiCopy, 'register.success.paidWaitlistNoPosition'),
            )
          } else {
            setSuccess(ui(uiCopy, 'register.success.paidEnrolled', { name: program.name }))
          }
          onRegistered?.()
          if (onClose) setTimeout(() => onClose(), waitlisted ? 3200 : 1400)
        }}
        containerId={checkoutId}
      />
    </>
  )
}

/** Landing-page checkout card. Visitors log in, then the same pay flow as the catalog. */
export function ProgramLandingCheckout({
  program,
  companion = null,
}: {
  program: Program
  companion?: Program | null
}) {
  const uiCopy = useProgramUiCopy()
  const comingSoon = !program.registrationOpen
  return (
    <div
      id="register"
      className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm scroll-mt-28"
    >
      {comingSoon ? (
        <>
          <ProgramRegisterForm
            program={program}
            companion={companion}
            checkoutId={`program-square-page-${program._id}`}
            heading={ui(uiCopy, 'register.checkoutHeading')}
          />
          <div className="mt-4">
            <MemberGate label={ui(uiCopy, 'landing.checkoutComingSoonGate')}>
              <p className="text-sm text-[#5A6070]">{ui(uiCopy, 'landing.checkoutSignedIn')}</p>
            </MemberGate>
          </div>
        </>
      ) : (
        <MemberGate label={ui(uiCopy, 'landing.checkoutGate')}>
          <ProgramRegisterForm
            program={program}
            companion={companion}
            checkoutId={`program-square-page-${program._id}`}
            heading={ui(uiCopy, 'register.checkoutHeading')}
          />
        </MemberGate>
      )}
    </div>
  )
}
