import { Facebook, Instagram } from 'lucide-react'
import {
  DEFAULT_SOCIAL_FACEBOOK,
  DEFAULT_SOCIAL_INSTAGRAM,
  resolveSocialLink,
} from '@/lib/social/public-links'

type Props = {
  facebook?: string
  instagram?: string
  /** Compact row for member/staff chrome footers */
  variant?: 'dark' | 'light'
}

export function SocialFooterLinks({
  facebook,
  instagram,
  variant = 'light',
}: Props) {
  const links = [
    {
      icon: Facebook,
      label: 'Facebook',
      href: resolveSocialLink(facebook, DEFAULT_SOCIAL_FACEBOOK),
    },
    {
      icon: Instagram,
      label: 'Instagram',
      href: resolveSocialLink(instagram, DEFAULT_SOCIAL_INSTAGRAM),
    },
  ]

  const isDark = variant === 'dark'

  return (
    <div className="flex items-center gap-2" aria-label="Social media">
      {links.map(({ icon: Icon, label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={
            isDark
              ? 'w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-white'
              : 'inline-flex items-center justify-center text-[#5A6070] hover:text-[#085508] transition-colors'
          }
          style={isDark ? { backgroundColor: '#2a2a2a', color: '#5A6070' } : undefined}
        >
          <Icon className={isDark ? 'w-4 h-4' : 'w-3.5 h-3.5'} aria-hidden="true" />
        </a>
      ))}
    </div>
  )
}
