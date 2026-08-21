'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

interface Props {
  text: string
  link6: string
  link7: string
  link8: string
}

function renderAnnouncementText(text: string) {
  // Turn a trailing https URL into a link (event cards, schedule pages).
  const match = text.match(/^(.*?)(https:\/\/\S+)\s*$/)
  if (!match) return text
  const [, before, href] = match
  return (
    <>
      {before}
      <a href={href} className="underline font-bold hover:opacity-80">
        Details
      </a>
    </>
  )
}

export function AnnouncementBarClient({ text, link6, link7, link8 }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const { status } = useAuth()

  if (dismissed) return null

  const hasGradeLinks = Boolean(link6 || link7 || link8)
  const isWhatsAppPromo = hasGradeLinks || /whatsapp/i.test(text)
  // Free + paid members see grade group links; visitors never see WhatsApp promo.
  if (isWhatsAppPromo && status !== 'member') return null

  return (
    <div
      className="relative flex items-center justify-center px-4 py-2.5 text-white text-sm font-medium"
      style={{ backgroundColor: 'var(--brand-green)' }}
      role="banner"
    >
      <p className="text-center pr-8 leading-relaxed">
        {renderAnnouncementText(text)}
        {hasGradeLinks && (
          <>
            {' '}
            {link6 && (
              <a
                href={link6}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold hover:opacity-80"
              >
                6th Grade
              </a>
            )}
            {link6 && link7 && <span className="mx-1.5 opacity-40">·</span>}
            {link7 && (
              <a
                href={link7}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold hover:opacity-80"
              >
                7th Grade
              </a>
            )}
            {link7 && link8 && <span className="mx-1.5 opacity-40">·</span>}
            {link8 && (
              <a
                href={link8}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold hover:opacity-80"
              >
                8th Grade
              </a>
            )}
          </>
        )}
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
