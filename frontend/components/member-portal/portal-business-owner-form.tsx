'use client'

import { useState } from 'react'
import { Briefcase, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  memberName?: string
  memberEmail?: string
  /** `portal` = Member Portal; `public` = Fundraising sponsorship section */
  mode?: 'portal' | 'public'
}

/**
 * Business owner / family business interest → VP Membership Experience.
 */
export function PortalBusinessOwnerForm({
  memberName = '',
  memberEmail = '',
  mode = 'portal',
}: Props) {
  const isPublic = mode === 'public'
  const [name, setName] = useState(memberName)
  const [email, setEmail] = useState(memberEmail)
  const [isOwner, setIsOwner] = useState<'yes' | 'no' | ''>('')
  const [businessName, setBusinessName] = useState('')
  const [website, setWebsite] = useState('')
  const [details, setDetails] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isOwner) {
      setError('Please choose Yes or No.')
      return
    }
    setStatus('loading')
    setError('')
    try {
      if (isPublic) {
        const messageParts = [
          `Business owner / family owns a business: ${isOwner === 'yes' ? 'Yes' : 'No'}`,
        ]
        if (isOwner === 'yes') {
          messageParts.push(`Business name: ${businessName.trim()}`)
          if (website.trim()) messageParts.push(`Website: ${website.trim()}`)
          if (details.trim()) messageParts.push('', 'More about the business:', details.trim())
        } else if (details.trim()) {
          messageParts.push('', details.trim())
        }
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            topic:
              isOwner === 'yes'
                ? 'Business owner · membership experience'
                : 'Not a business owner · membership experience',
            message: messageParts.join('\n'),
            department: 'membership-experience',
            assignedTo: 'vp-membershipexperience@shmspto.org',
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not send')
      } else {
        const res = await fetch('/api/portal/business-owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: memberName || name,
            email: memberEmail || email,
            isBusinessOwner: isOwner === 'yes',
            businessName,
            website,
            details,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not send')
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        id="business"
        className="scroll-mt-28 mx-auto max-w-xl rounded-2xl border border-[#E8E4DC] bg-white p-8 text-center shadow-sm"
      >
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: '#EEF6EE' }}
        >
          <CheckCircle2 className="h-7 w-7" style={{ color: '#085508' }} aria-hidden />
        </div>
        <h3 className="mb-2 text-xl font-bold text-[#1A1A1A]">Thanks for sharing</h3>
        <p className="text-sm text-[#5A6070]">
          {isOwner === 'yes'
            ? 'Our VP of Membership Experience will review your business details and follow up soon.'
            : 'We’ve noted your response. If anything changes, you can update us anytime.'}
        </p>
      </div>
    )
  }

  const yesNo = (
    <fieldset>
      <legend className={`mb-1.5 block ${isPublic ? 'text-sm font-medium' : 'text-sm font-bold'} text-[#1A1A1A]`}>
        Are you a business owner, or does your family own a business?{' '}
        <span className="text-red-500">*</span>
      </legend>
      <div className="flex flex-wrap gap-3">
        {(
          [
            { value: 'yes' as const, label: 'Yes' },
            { value: 'no' as const, label: 'No' },
          ] as const
        ).map(({ value, label }) => {
          const selected = isOwner === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setIsOwner(value)}
              className={`min-w-[5.5rem] rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors ${
                selected
                  ? 'border-[#085508] text-white'
                  : 'border-[#E8E4DC] text-[#1A1A1A] bg-white hover:border-[#085508]/40'
              }`}
              style={selected ? { backgroundColor: '#085508' } : undefined}
              aria-pressed={selected}
            >
              {label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )

  const ownerFields =
    isOwner === 'yes' ? (
      <>
        <p className="text-sm text-[#5A6070] leading-relaxed">
          Tell us what you do and how you&apos;d like to show up for Stone Hill families. We&apos;ll
          follow up with ideas that fit. No commitment required.
        </p>
        <div>
          <label htmlFor="biz-name" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Business name <span className="text-red-500">*</span>
          </label>
          <input
            id="biz-name"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Local restaurant, family business"
            className="w-full rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 text-sm focus:border-[#085508] focus:outline-none focus:ring-2 focus:ring-[#085508]/20"
          />
        </div>
        <div>
          <label htmlFor="biz-web" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Website <span className="text-[#5A6070]">(optional)</span>
          </label>
          <input
            id="biz-web"
            type="text"
            inputMode="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            className="w-full rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 text-sm focus:border-[#085508] focus:outline-none focus:ring-2 focus:ring-[#085508]/20"
          />
        </div>
        <div>
          <label htmlFor="biz-details" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Anything else you&apos;d like to share
          </label>
          <textarea
            id="biz-details"
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Tell us about your business and how we might support you in the school community."
            className="w-full min-h-[96px] resize-y rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 text-sm focus:border-[#085508] focus:outline-none focus:ring-2 focus:ring-[#085508]/20"
          />
        </div>
      </>
    ) : null

  if (isPublic) {
    return (
      <form
        id="business"
        onSubmit={handleSubmit}
        className="scroll-mt-28 mx-auto max-w-xl space-y-4 rounded-2xl border border-[#E8E4DC] bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="text-left">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#085508' }}>
            For SHMS PTO families
          </p>
          <h3 className="mt-1 text-xl font-bold text-[#1A1A1A]">
            Own a business? We want to know you.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5A6070]">
            Many Stone Hill families run local businesses. Tell us yours so SHMS PTO can
            celebrate you in the community, connect you with other parents, and explore
            simple ways to help: shout-outs, event tables, or member-friendly offers.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#5A6070]">
            Share a yes/no below (and business details if yes). Our VP of Membership Experience
            replies within one business day. Formal sponsorship packages still go through
            the sponsor form above.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="biz-contact-name" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              id="biz-contact-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 text-sm focus:border-[#085508] focus:outline-none focus:ring-2 focus:ring-[#085508]/20"
            />
          </div>
          <div>
            <label htmlFor="biz-contact-email" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="biz-contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#E8E4DC] px-3.5 py-2.5 text-sm focus:border-[#085508] focus:outline-none focus:ring-2 focus:ring-[#085508]/20"
            />
          </div>
        </div>

        {yesNo}
        {ownerFields}
        {isOwner === 'no' ? (
          <p className="text-sm text-[#5A6070]">Thanks. You can still submit so we have your response on file.</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button
          type="submit"
          disabled={status === 'loading'}
          className="gap-2 text-white"
          style={{ backgroundColor: '#085508' }}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              Send introduction <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    )
  }

  return (
    <section
      id="business"
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white shadow-sm"
    >
      <div
        className="flex items-start gap-3 border-b border-[#F0EDE8] px-5 py-4"
        style={{ backgroundColor: '#FAFCF9' }}
      >
        <Briefcase className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#085508' }} aria-hidden />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A6070]">
            Membership experience
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-[#1A1A1A]">
            Own a business? We want to know you.
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5A6070]">
            Why we ask: many SHMS PTO families run local businesses, and we want to celebrate
            you in the school community: shout-outs, connections with other parents, and
            simple ways to help each other.
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5A6070]">
            What happens next: answer yes or no below. If yes, add your business name and
            anything you want us to know. Free and paid members welcome. Our VP of Membership
            Experience follows up within one business day.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
        {yesNo}
        {ownerFields}
        {isOwner === 'no' ? (
          <p className="text-sm leading-relaxed text-[#5A6070]">
            Thanks for letting us know. You can still submit so we have your response on file.
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="submit"
          disabled={status === 'loading'}
          className="gap-2 text-white"
          style={{ backgroundColor: '#085508' }}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              Submit <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
        <p className="text-[11px] text-[#5A6070]">
          Goes to our VP of Membership Experience · usually within one business day
        </p>
      </form>
    </section>
  )
}
