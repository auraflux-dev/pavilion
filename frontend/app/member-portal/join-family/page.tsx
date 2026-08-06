import { Suspense } from 'react'
import { MemberShell } from '@/components/shells/member-shell'
import { JoinFamilyClient } from '@/components/member-portal/join-family-client'

export default function JoinFamilyPage() {
  return (
    <MemberShell>
      <Suspense fallback={<p className="p-8 text-sm text-[#5A6070]">Loading…</p>}>
        <JoinFamilyClient />
      </Suspense>
    </MemberShell>
  )
}
