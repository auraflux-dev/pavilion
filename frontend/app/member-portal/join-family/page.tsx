import { Suspense } from 'react'
import { MemberShell } from '@/components/shells/member-shell'
import { JoinFamilyClient } from '@/components/member-portal/join-family-client'
import { MemberInlineEdit } from '@/components/site/member-inline-edit'

export default function JoinFamilyPage() {
  return (
    <MemberInlineEdit pageSlug="member-portal">
      <MemberShell>
        <Suspense fallback={<p className="p-8 text-sm text-[#5A6070]">Loading…</p>}>
          <JoinFamilyClient />
        </Suspense>
      </MemberShell>
    </MemberInlineEdit>
  )
}
