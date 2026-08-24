import { ProgramUiCopyProvider } from '@/components/programs/program-ui-copy-context'
import { getProgramUiCopy } from '@/lib/api/program-ui-copy'

/** Server wrapper so contact forms on events/fundraising get CMS program strings. */
export async function ProgramUiCopyBoundary({ children }: { children: React.ReactNode }) {
  const copy = await getProgramUiCopy()
  return <ProgramUiCopyProvider copy={copy}>{children}</ProgramUiCopyProvider>
}
