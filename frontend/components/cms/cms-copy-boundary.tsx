import { getPageStrings } from '@/lib/api/page-strings'
import { CmsCopyProvider } from '@/components/cms/cms-copy-provider'

type Props = {
  /** PageContent.page keys (same as Staff → Page CSS & strings). */
  pages: string[]
  children: React.ReactNode
}

/** Server fetch + client provider for CMS string bundles on a route. */
export async function CmsCopyBoundary({ pages, children }: Props) {
  const unique = [...new Set(pages.filter(Boolean))]
  if (unique.length === 0) {
    return <>{children}</>
  }
  const entries = await Promise.all(
    unique.map(async (page) => [page, await getPageStrings(page)] as const),
  )
  const bundles = Object.fromEntries(entries)
  return <CmsCopyProvider bundles={bundles}>{children}</CmsCopyProvider>
}
