import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { getPageContent } from '@/lib/api/page-content'
import { PageThemeRoot, PageThemeStyles } from '@/components/site/page-theme'

type Props = {
  /** PageContent.page key for CSS + string overrides */
  pageKey: string
  children: React.ReactNode
  showFooter?: boolean
  mainClassName?: string
  mainStyle?: React.CSSProperties
}

/** Standard visitor shell with per-page theme CSS from CMS. */
export async function VisitorChrome({
  pageKey,
  children,
  showFooter = true,
  mainClassName = 'flex-1',
  mainStyle,
}: Props) {
  const content = await getPageContent(pageKey)
  return (
    <div className="min-h-screen flex flex-col">
      <PageThemeStyles pageKey={pageKey} css={content.customCss ?? ''} />
      <AnnouncementBar />
      <Navbar />
      <PageThemeRoot pageKey={pageKey} className="flex-1 flex flex-col">
        <main id="main-content" className={mainClassName} style={mainStyle}>
          {children}
        </main>
      </PageThemeRoot>
      {showFooter ? <Footer /> : null}
    </div>
  )
}
