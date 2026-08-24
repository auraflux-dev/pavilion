import {
  pageThemeClassName,
  sanitizePageCustomCss,
} from '@/lib/copy/page-custom-css'

type StylesProps = {
  pageKey: string
  css: string
}

/** Injects sanitized per-page CSS from PageContent.customCss. */
export function PageThemeStyles({ pageKey, css }: StylesProps) {
  const safe = sanitizePageCustomCss(css)
  if (!safe) return null
  return (
    <style
      data-page-theme={pageKey}
      dangerouslySetInnerHTML={{
        __html: `/* page theme: ${pageKey} · scope with .${pageThemeClassName(pageKey)} */\n${safe}`,
      }}
    />
  )
}

type RootProps = {
  pageKey: string
  className?: string
  children: React.ReactNode
}

/** Wrap page content so custom CSS scopes under .page-{slug}. */
export function PageThemeRoot({ pageKey, className = '', children }: RootProps) {
  const scope = pageThemeClassName(pageKey)
  return <div className={`${scope} ${className}`.trim()}>{children}</div>
}
