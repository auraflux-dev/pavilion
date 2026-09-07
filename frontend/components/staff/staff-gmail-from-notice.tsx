'use client'

/**
 * One-time modal after staff login / session refresh: connect Google as your @shmspto.org
 * mailbox so From / Reply-To match the logged-in staffer (not the shared PTO sender).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_VERSION = 'v1'

function storageKey(email: string) {
  return `staff-notice-gmail-from-reply-${STORAGE_VERSION}:${email.trim().toLowerCase()}`
}

export function StaffGmailFromNotice({ email }: { email: string }) {
  const [visible, setVisible] = useState(false)

  const commons =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true'

  useEffect(() => {
    if (commons || !email.trim()) return
    try {
      if (window.localStorage.getItem(storageKey(email)) === 'dismissed') return
    } catch {
      /* private mode — still show */
    }
    setVisible(true)
  }, [commons, email])

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey(email), 'dismissed')
    } catch {
      /* ok */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-gmail-from-notice-title"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-white shadow-xl p-5 sm:p-6 space-y-4">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 rounded-lg p-1.5 text-[#5A6070] hover:bg-[#F7F5F0]"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3 pr-8">
          <Mail
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: 'var(--brand-green)' }}
            aria-hidden
          />
          <div className="space-y-3 min-w-0">
            <h2 id="staff-gmail-from-notice-title" className="text-lg font-bold text-[#1A1A1A]">
              Email sends as you
            </h2>
            <p className="text-sm leading-relaxed text-[#5A6070]">
              When you email a parent from Staff, <strong className="text-[#1A1A1A]">From</strong>{' '}
              and <strong className="text-[#1A1A1A]">Reply-To</strong> use the @shmspto.org account
              you are signed in with — not the shared PTO mailbox.
            </p>
            <ul className="text-sm leading-relaxed text-[#5A6070] list-disc pl-5 space-y-1.5">
              <li>
                Sign in to Staff as <span className="font-semibold text-[#1A1A1A]">{email}</span>{' '}
                (your board mailbox).
              </li>
              <li>
                Open <strong className="text-[#1A1A1A]">Inbox → Connect Google</strong> once per
                mailbox. Use the same Google account as that @shmspto.org address.
              </li>
              <li>
                Membership outreach, newsletter test sends, and one-off emails from the roster all
                use this identity when Google is connected.
              </li>
              <li>
                Automated receipts and form notifications still send from the shared SHMS PTO
                mailbox.
              </li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" className="text-white" style={{ backgroundColor: 'var(--brand-green)' }}>
                <a href="/api/staff/workspace/connect">Connect Google</a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/staff?view=inbox">Open Inbox</Link>
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={dismiss} className="text-[#5A6070]">
                Got it
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
