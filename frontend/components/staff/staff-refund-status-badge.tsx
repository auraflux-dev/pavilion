type Props = {
  refundStatus: string
  refundedAmountDollars?: number
  amount?: number
}

export function StaffRefundStatusBadge({ refundStatus, refundedAmountDollars = 0, amount = 0 }: Props) {
  const s = refundStatus.trim().toLowerCase()
  if (!s) return null

  const labels: Record<string, { text: string; className: string }> = {
    pending: { text: 'Refund pending', className: 'bg-amber-100 text-amber-900 border-amber-200' },
    denied: { text: 'Refund denied', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    failed: { text: 'Refund failed', className: 'bg-red-100 text-red-800 border-red-200' },
    refunded: { text: 'Refunded', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    partial: {
      text: `Partial refund ($${refundedAmountDollars.toFixed(2)} of $${amount.toFixed(2)})`,
      className: 'bg-sky-100 text-sky-900 border-sky-200',
    },
  }

  const badge = labels[s]
  if (!badge) return null

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}
    >
      {badge.text}
    </span>
  )
}
