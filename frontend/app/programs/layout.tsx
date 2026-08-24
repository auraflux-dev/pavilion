import { ProgramUiCopyBoundary } from '@/components/programs/program-ui-copy-boundary'

export default async function ProgramsLayout({ children }: { children: React.ReactNode }) {
  return <ProgramUiCopyBoundary>{children}</ProgramUiCopyBoundary>
}
