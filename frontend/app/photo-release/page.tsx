import { LegalPageShell } from '@/components/legal/legal-page-shell'

export const revalidate = 3600

export default function PhotoReleasePage() {
  return <LegalPageShell slug="photo-release" />
}
