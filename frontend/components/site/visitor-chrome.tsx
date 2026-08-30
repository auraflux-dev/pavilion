import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { getPageContent } from '@/lib/api/page-content'
import { PageThemeRoot, PageThemeStyles } from '@/components/site/page-theme'
import { VisitorInlineEdit } from '@/components/site/visitor-inline-edit'
import { CmsCopyBoundary } from '@/components/cms/cms-copy-boundary'
import { LivePageMain } from '@/components/cms/live-page-main'
import { cmsBundlesForPage } from '@/lib/copy/cms-pages'

type Props = {
  /** PageContent.page key for CSS + string overrides */
  pageKey: string
  /** Extra PageContent string bundles (same keys as Staff → Page CSS & strings). */
  cmsPages?: string[]
  children: React.ReactNode
  showFooter?: boolean
  mainClassName?: string
  mainStyle?: React.CSSProperties
}

/** Standard visitor shell with per-page theme CSS from CMS. */
export async function VisitorChrome({
  pageKey,
  cmsPages = [],
  children,
  showFooter = true,
  mainClassName = 'flex-1',
  mainStyle,
}: Props) {
  const content = await getPageContent(pageKey)
  const bundles = [...new Set([...cmsBundlesForPage(pageKey, cmsPages), 'site-chrome'])]
  return (
    <VisitorInlineEdit pageSlug={pageKey}>
      <CmsCopyBoundary pages={bundles}>
        <div className="min-h-screen flex flex-col">
          <PageThemeStyles pageKey={pageKey} css={content.customCss ?? ''} />
          <AnnouncementBar />
          <Navbar />
          <PageThemeRoot pageKey={pageKey} className="flex-1 flex flex-col">
            <main id="main-content" className={mainClassName} style={mainStyle}>
              <LivePageMain>{children}</LivePageMain>
            </main>
          </PageThemeRoot>
          {showFooter ? <Footer /> : null}
        </div>
      </CmsCopyBoundary>
    </VisitorInlineEdit>
  )
}
