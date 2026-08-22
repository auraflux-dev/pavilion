'use client'

/**
 * Persistent Staff chrome note on the sample demo: money/mail workspaces stay hidden.
 */
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { HelpTip } from '@/components/ui/help-tip'

export function StaffDemoBanner() {
  if (!isPublicDemoInstance()) return null
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#FFF8E8] px-4 py-3 text-sm whitespace-pre-line">
      Sample school preview.
      {'\n'}
      Live payments, POS, and mass email stay off here so nothing can charge or send.
      {' '}
      <HelpTip tipKey="demo.preview.only" label="About demo preview" />
    </div>
  )
}
