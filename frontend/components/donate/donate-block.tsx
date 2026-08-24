'use client'

/**
 * Flexible PTO donation block. presets + custom amount, Square/PayPal via portal checkout.
 * Requires free or paid member login (MemberGate).
 */
import { useMemo, useState } from 'react'
import { Heart } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { formString } from '@/lib/copy/form-string'
import { DONATE_FORM_DEFAULTS } from '@/lib/defaults/visitor-string-defaults'
import { EditableStringField } from '@/components/cms/editable-string-field'
import {
  DONATION_MAX_DOLLARS,
  DONATION_MIN_DOLLARS,
  DONATION_PRESETS,
  isAllowedDonationAmount,
} from '@/lib/donation'

type Props = {
  /** Page section id for deep links (#donate) */
  id?: string
  eyebrow?: string
  title?: string
  body?: string
  /** CMS stringOverrides from donate-form PageContent */
  copy?: Record<string, string>
  /** Compact layout for home / narrow columns */
  compact?: boolean
}

export function DonateBlock({
  id = 'donate',
  eyebrow,
  title,
  body,
  copy = {},
  compact = false,
}: Props) {
  const merged = { ...DONATE_FORM_DEFAULTS, ...copy }
  const s = (key: string, fallback: string, vars?: Record<string, string | number | undefined | null>) =>
    formString(merged, key, fallback, vars)

  const resolvedEyebrow = vanillaizeIfDemo(eyebrow ?? s('donate.defaultEyebrow', 'Support SHMS PTO'))
  const resolvedTitle = vanillaizeIfDemo(title ?? s('donate.defaultTitle', 'Donate to the PTO'))
  const resolvedBody = vanillaizeIfDemo(
    body ??
      s(
        'donate.defaultBody',
        'Give any amount to SHMS PTO. Every dollar funds enrichment, The Cove, and events for Stone Hill students.',
      ),
  )

  const [amount, setAmount] = useState<number>(DONATION_PRESETS[0] ?? 5)
  const [other, setOther] = useState(false)
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [thanks, setThanks] = useState('')

  const effectiveAmount = useMemo(() => {
    if (other) {
      const n = Number(custom)
      return Number.isFinite(n) ? n : 0
    }
    return amount
  }, [amount, other, custom])

  const amountLabel =
    effectiveAmount > 0
      ? effectiveAmount.toFixed(effectiveAmount % 1 ? 2 : 0)
      : '-'

  function startCheckout() {
    setError('')
    setThanks('')
    if (!isAllowedDonationAmount(effectiveAmount)) {
      setError(
        s('donate.amountError', `Enter an amount between $${DONATION_MIN_DOLLARS} and $${DONATION_MAX_DOLLARS.toLocaleString()}.`, {
          min: DONATION_MIN_DOLLARS,
          max: DONATION_MAX_DOLLARS.toLocaleString(),
        }),
      )
      return
    }
    setOpen(true)
  }

  return (
    <section
      id={id}
      className={`scroll-mt-28 ${compact ? 'py-12 md:py-16' : 'py-14 md:py-20'}`}
      style={{ backgroundColor: compact ? 'var(--brand-soft)' : 'var(--brand-green)' }}
    >
      <div className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 ${compact ? '' : 'text-center'}`}>
        <div
          className={`inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3 ${
            compact ? '' : ''
          }`}
          style={
            compact
              ? { backgroundColor: 'var(--brand-green)', color: '#FFFFFF' }
              : { backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }
          }
        >
          {eyebrow != null ? (
            resolvedEyebrow
          ) : (
            <EditableStringField
              page="donate-form"
              stringKey="donate.defaultEyebrow"
              value={resolvedEyebrow}
              className={compact ? 'text-white' : 'text-white'}
            />
          )}
        </div>
        <h2
          className={`font-bold mb-3 ${compact ? 'text-2xl md:text-3xl text-[#1A1A1A]' : 'text-3xl md:text-4xl text-white'}`}
        >
          {title != null ? (
            resolvedTitle
          ) : (
            <EditableStringField
              page="donate-form"
              stringKey="donate.defaultTitle"
              value={resolvedTitle}
              className={compact ? 'text-[#1A1A1A]' : 'text-white'}
            />
          )}
        </h2>
        <p
          className={`mb-8 max-w-xl ${compact ? 'text-[#5A6070]' : 'text-white/85 mx-auto'}`}
        >
          {body != null ? (
            resolvedBody
          ) : (
            <EditableStringField
              page="donate-form"
              stringKey="donate.defaultBody"
              value={resolvedBody}
              className={compact ? 'text-[#5A6070]' : 'text-white/85'}
            />
          )}
        </p>

        <div
          className={`rounded-2xl p-6 md:p-8 border text-left ${
            compact ? 'bg-white border-[var(--border)]' : 'bg-white border-transparent shadow-lg'
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5" style={{ color: 'var(--brand-green)' }} aria-hidden />
            <p className="text-sm font-bold text-[#1A1A1A]">{s('donate.chooseAmount', 'Choose an amount')}</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {DONATION_PRESETS.map((preset) => {
              const selected = !other && amount === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setOther(false)
                    setCustom('')
                    setAmount(preset)
                    setError('')
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-bold border transition-colors"
                  style={
                    selected
                      ? { backgroundColor: 'var(--brand-green)', color: '#FFFFFF', borderColor: 'var(--brand-green)' }
                      : { backgroundColor: 'var(--brand-warm)', color: '#1A1A1A', borderColor: 'var(--border)' }
                  }
                >
                  ${preset}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => {
                setOther(true)
                setError('')
              }}
              className="px-4 py-2 rounded-lg text-sm font-bold border transition-colors"
              style={
                other
                  ? { backgroundColor: 'var(--brand-green)', color: '#FFFFFF', borderColor: 'var(--brand-green)' }
                  : { backgroundColor: 'var(--brand-warm)', color: '#1A1A1A', borderColor: 'var(--border)' }
              }
            >
              {s('donate.other', 'Other')}
            </button>
          </div>

          {other ? (
            <>
              <label className="block text-sm text-[#5A6070] mb-1" htmlFor={`${id}-custom`}>
                {s('donate.amountLabel', 'Amount ($)')}
              </label>
              <input
                id={`${id}-custom`}
                type="number"
                min={DONATION_MIN_DOLLARS}
                max={DONATION_MAX_DOLLARS}
                step="0.01"
                inputMode="decimal"
                placeholder={s('donate.amountPlaceholder', 'Enter any amount')}
                autoFocus
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value)
                  setError('')
                }}
                className="w-full mb-4 rounded-lg border border-[var(--border)] px-3 py-2.5 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/40"
              />
            </>
          ) : null}

          <label className="block text-sm text-[#5A6070] mb-1" htmlFor={`${id}-note`}>
            {s('donate.noteLabel', 'Optional note')}
          </label>
          <input
            id={`${id}-note`}
            type="text"
            maxLength={120}
            placeholder={s('donate.notePlaceholder', 'Add a note if you like')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full mb-5 rounded-lg border border-[var(--border)] px-3 py-2.5 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/40"
          />

          {error ? <p className="text-sm text-red-700 mb-3">{error}</p> : null}
          {thanks ? (
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--brand-green)' }}>
              {thanks}
            </p>
          ) : null}

          <MemberGate label={s('donate.signIn', 'Sign in to donate')} returnToQuery={`${id}=1`}>
            <button
              type="button"
              onClick={startCheckout}
              className="w-full inline-flex items-center justify-center font-bold text-sm px-4 py-3 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              {s('donate.button', `Donate $${amountLabel}`, { amount: amountLabel })}
            </button>
          </MemberGate>

          <p className="text-xs text-[#5A6070] mt-3 whitespace-pre-line">
            {vanillaizeIfDemo(
              s(
                'donate.giftNote',
                'Gifts go to SHMS PTO (501(c)(3)), not Loudoun County Public Schools. You will receive a receipt. Consult your tax advisor about deductibility.',
              ),
            )}
          </p>
        </div>
      </div>

      <PortalCardCheckout
        open={open}
        onClose={() => setOpen(false)}
        amount={effectiveAmount}
        title={s('donate.checkoutTitle', 'PTO Donation')}
        subtitle={note ? `Note: ${note}` : vanillaizeIfDemo(s('donate.thankYou', 'Thank you for supporting SHMS PTO.'))}
        containerId={`donate-pay-${id}`}
        payBody={{
          kind: 'donation',
          amountCents: Math.round(effectiveAmount * 100),
          note: note.trim() || undefined,
        }}
        onPaid={() => {
          setOpen(false)
          setThanks(
            s('donate.thanksComplete', `Thank you. Your $${effectiveAmount.toFixed(2)} donation is complete.`, {
              amount: effectiveAmount.toFixed(2),
            }),
          )
        }}
      />
    </section>
  )
}
