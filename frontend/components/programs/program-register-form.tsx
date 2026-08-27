'use client'

/**
 * Program registration + Square pay. Used in the catalog modal and on class landing pages.
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CheckoutConsent } from '@/components/checkout/checkout-consent'
import { MemberGate } from '@/components/member-gate'
import { useRouter } from 'next/navigation'
import type { ConsentAck } from '@/lib/checkout-consent'
import type { Program } from '@/lib/api/programs'
import { programHasPublicMeetingDates } from '@/lib/programs/ep-meeting-dates-shared'
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
import { useProgramUiCopy, ui, CmsProgram } from '@/components/programs/program-ui-copy-context'
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
  heading?: React.ReactNode
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
  const P = ({
    k,
    vars,
    className,
    inlineTarget,
  }: {
    k: string
    vars?: Record<string, string | number | undefined | null>
    className?: string
    inlineTarget?: boolean
  }) => (
    <CmsProgram k={k} fallback={ui(uiCopy, k, vars)} vars={vars} className={className} inlineTarget={inlineTarget} />
  )
  const router = useRouter()
  const { hasPaidMembership } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [consents, setConsents] = useState<ConsentAck[] | null>(null)
  const [consentComplete, setConsentComplete] = useState(false)
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
  const scheduleLine = formatProgramSchedule(program, {
    includeCalendarDates: programHasPublicMeetingDates(program),
  })
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

  function addProgramLine() {
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
  }

  async function submit() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (!studentId) throw new Error(ui(uiCopy, 'register.err.selectStudent'))

      // Paid programs: express Buy now (single-line checkout).
      if (fee > 0 && !feeTbd) {
        cart.clear()
        addProgramLine()
        onClose?.()
        router.push('/checkout?express=1')
        return
      }

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

  const title = heading ?? (
    <P k="register.heading" vars={{ name: program.name }} />
  )

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
              {feeTbd ? (
                <P k="register.tuitionTbd" />
              ) : fee <= 0 ? (
                <P k="register.free" />
              ) : springAddon ? (
                <P k="register.fallPlusSpring" vars={{ total: `$${checkoutTotal.toFixed(2)}` }} />
              ) : (
                <P k="register.feeOnly" vars={{ total: `$${fee.toFixed(2)}` }} />
              )}
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
          <p className="text-sm text-[#5A6070]"><P k="register.notOpen" /></p>
        ) : null}

        {program.registrationOpen && priorityUntilLabel ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {blockedByPriority ? (
              <P k="register.priorityBlocked" vars={{ until: priorityUntilLabel }} />
            ) : (
              <P k="register.priorityWindow" vars={{ until: priorityUntilLabel }} />
            )}
          </p>
        ) : null}

        {program.registrationOpen && loading ? (
          <div className="flex items-center gap-2 text-xs text-[#5A6070]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> <P k="register.loading" />
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
            <P k="register.viewMemberships" inlineTarget />
          </Button>
        ) : null}

        {program.registrationOpen && !loading && !blockedByPriority && students.length === 0 ? (
          <p className="text-sm text-[#5A6070]">
            <P k="register.addStudent" />
          </p>
        ) : null}

        {program.registrationOpen && !loading && !blockedByPriority && students.length > 0 ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-[#5A6070] mb-1">
                <P k="register.studentLabel" />
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
                <P k="register.profileHint" />
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
                <P k="register.couponLabel" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={ui(uiCopy, 'register.couponPlaceholder')}
                  autoComplete="off"
                  className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono tracking-wide uppercase"
                />
                <span className="mt-1.5 block text-[11px] font-normal text-[#5A6070] whitespace-pre-line">
                  <P k="register.discountHint" />
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
                  addProgramLine()
                  setCartNote(ui(uiCopy, 'register.addToCartNote'))
                  onClose?.()
                  cart.setOpen(true)
                }}
              >
                <P k="register.addToCart" vars={{ total: `$${checkoutTotal.toFixed(2)}` }} inlineTarget />
              </Button>
              <Button
                type="button"
                onClick={() => {
                  // Paid enroll: express Buy now (single-line checkout).
                  if (fee > 0 || checkoutTotal > 0) {
                    cart.clear()
                    addProgramLine()
                    onClose?.()
                    router.push('/checkout?express=1')
                    return
                  }
                  void submit()
                }}
                disabled={
                  busy ||
                  !studentId ||
                  feeTbd ||
                  (fee <= 0 && !consentComplete)
                }
                className="w-full text-white font-bold"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : fee > 0 && !feeTbd ? (
                  <P k="register.payNow" vars={{ total: `$${checkoutTotal.toFixed(2)}` }} inlineTarget />
                ) : (
                  <P k="register.complete" inlineTarget />
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
  const checkoutHeading = (
    <CmsProgram k="register.checkoutHeading" fallback={ui(uiCopy, 'register.checkoutHeading')} />
  )
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
            heading={checkoutHeading}
          />
          <div className="mt-4">
            <MemberGate label={ui(uiCopy, 'landing.checkoutComingSoonGate')}>
              <p className="text-sm text-[#5A6070]">
                <CmsProgram k="landing.checkoutSignedIn" fallback={ui(uiCopy, 'landing.checkoutSignedIn')} />
              </p>
            </MemberGate>
          </div>
        </>
      ) : (
        <MemberGate label={ui(uiCopy, 'landing.checkoutGate')}>
          <ProgramRegisterForm
            program={program}
            companion={companion}
            checkoutId={`program-square-page-${program._id}`}
            heading={checkoutHeading}
          />
        </MemberGate>
      )}
    </div>
  )
}
