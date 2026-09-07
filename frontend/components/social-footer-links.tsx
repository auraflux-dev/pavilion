'use client'

import { useId } from 'react'
import {
  DEFAULT_SOCIAL_FACEBOOK,
  DEFAULT_SOCIAL_INSTAGRAM,
  resolveSocialLink,
} from '@/lib/social/public-links'

type Props = {
  facebook?: string
  instagram?: string
  /** When false, empty URLs stay empty (demo / trials). Never fall back to SHMS profiles. */
  allowDefaults?: boolean
  /** dark = public marketing footer; light = member/staff chrome */
  variant?: 'dark' | 'light'
  className?: string
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path
        fill="#FFFFFF"
        d="M16.5 12.1h-2.1v7.4h-3.1v-7.4H9.5V9.5h1.8V8c0-1.5.7-3.8 3.8-3.8h2.3v2.6h-1.6c-.5 0-1.2.2-1.2 1.3v1.4h2.8l-.4 2.6z"
      />
    </svg>
  )
}

function InstagramMark({ className, gradId }: { className?: string; gradId: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={gradId} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gradId})`} />
      <path
        fill="#FFFFFF"
        d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zm5.1-8.2a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM12 5.1c-1.3 0-4.2-.1-5.4.4a3.4 3.4 0 0 0-2 2C4.1 8.7 4.2 11.6 4.2 12s-.1 3.3.4 4.5a3.4 3.4 0 0 0 2 2c1.2.5 4.1.4 5.4.4s4.2.1 5.4-.4a3.4 3.4 0 0 0 2-2c.5-1.2.4-4.1.4-5.4s.1-4.2-.4-5.4a3.4 3.4 0 0 0-2-2c-1.2-.5-4.1-.4-5.4-.4zm0 1.5c1.3 0 4 .1 4.8.4.8.3 1.3.7 1.5 1.5.3.8.4 3.5.4 4.8s-.1 4-.4 4.8c-.2.8-.7 1.2-1.5 1.5-.8.3-3.5.4-4.8.4s-4-.1-4.8-.4c-.8-.3-1.3-.7-1.5-1.5-.3-.8-.4-3.5-.4-4.8s.1-4 .4-4.8c.2-.8.7-1.2 1.5-1.5.8-.3 3.5-.4 4.8-.4z"
      />
    </svg>
  )
}

export function SocialFooterLinks({
  facebook,
  instagram,
  allowDefaults = true,
  variant = 'light',
  className,
}: Props) {
  const igGradId = useId().replace(/:/g, '')
  const links = [
    {
      label: 'Facebook',
      href: allowDefaults
        ? resolveSocialLink(facebook, DEFAULT_SOCIAL_FACEBOOK)
        : (facebook || '').trim(),
      node: <FacebookMark className="w-full h-full block" />,
    },
    {
      label: 'Instagram',
      href: allowDefaults
        ? resolveSocialLink(instagram, DEFAULT_SOCIAL_INSTAGRAM)
        : (instagram || '').trim(),
      node: <InstagramMark className="w-full h-full block" gradId={`ig-${igGradId}`} />,
    },
  ].filter((link) => link.href)

  const isDark = variant === 'dark'
  const size = isDark ? 'w-9 h-9' : 'w-7 h-7'

  return (
    <div
      className={`flex items-center gap-2.5 ${className ?? ''}`.trim()}
      aria-label="Social media"
    >
      {links.map(({ label, href, node }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={`${size} rounded-lg overflow-hidden shrink-0 shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]`}
        >
          {node}
        </a>
      ))}
    </div>
  )
}
