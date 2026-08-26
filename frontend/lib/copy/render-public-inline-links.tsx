import type { ReactNode } from 'react'

const ARROW_LINK_RE = /^(.+?)\s*(?:→|->)\s*(https?:\/\/\S+|\/\S+)\s*$/
const URL_RE = /(https?:\/\/[^\s]+)/g
const INLINE_ARROW_RE = /(.+?)\s*(?:→|->)\s*(https?:\/\/\S+|\/\S+)/g

const INTERNAL_HOSTS = new Set(['www.shmspto.org', 'shmspto.org', 'shmspto.vercel.app'])

function normalizeHref(raw: string): string {
  const href = raw.trim()
  if (href.startsWith('/')) return href
  try {
    const u = new URL(href)
    if (INTERNAL_HOSTS.has(u.hostname)) {
      return `${u.pathname}${u.search}${u.hash}`
    }
  } catch {
    /* keep raw */
  }
  return href
}

function isExternalHref(href: string): boolean {
  if (href.startsWith('/')) return false
  try {
    const u = new URL(href)
    return !INTERNAL_HOSTS.has(u.hostname)
  } catch {
    return false
  }
}

function PublicLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className: string
}) {
  const normalized = normalizeHref(href)
  const external = isExternalHref(href)
  return (
    <a
      href={normalized}
      className={className}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

/** Turn Site Settings / banner strings into clickable links (`label → url` or bare URLs). */
export function renderPublicInlineLinks(
  text: string,
  linkClassName = 'underline font-bold hover:opacity-80',
): ReactNode {
  const trimmed = text.trim()
  if (!trimmed) return null

  const whole = trimmed.match(ARROW_LINK_RE)
  if (whole) {
    return (
      <PublicLink href={whole[2]} className={linkClassName}>
        {whole[1].trim()}
      </PublicLink>
    )
  }

  const parts: ReactNode[] = []
  let key = 0

  const pushPlain = (chunk: string) => {
    if (!chunk) return
    parts.push(<span key={`t-${key++}`}>{chunk}</span>)
  }

  const pushFromArrowMatches = (segment: string) => {
    let last = 0
    let matched = false
    INLINE_ARROW_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = INLINE_ARROW_RE.exec(segment))) {
      matched = true
      if (m.index > last) pushPlain(segment.slice(last, m.index))
      parts.push(
        <PublicLink key={`a-${key++}`} href={m[2]} className={linkClassName}>
          {m[1].trim()}
        </PublicLink>,
      )
      last = m.index + m[0].length
    }
    if (matched) {
      if (last < segment.length) pushPlain(segment.slice(last))
      return
    }

    URL_RE.lastIndex = 0
    last = 0
    while ((m = URL_RE.exec(segment))) {
      if (m.index > last) pushPlain(segment.slice(last, m.index))
      parts.push(
        <PublicLink key={`u-${key++}`} href={m[1]} className={linkClassName}>
          {m[1]}
        </PublicLink>,
      )
      last = m.index + m[0].length
    }
    if (last < segment.length) pushPlain(segment.slice(last))
  }

  const lines = text.split('\n')
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) parts.push(<br key={`br-${key++}`} />)
    pushFromArrowMatches(line)
  })

  return parts.length === 1 ? parts[0] : <>{parts}</>
}
