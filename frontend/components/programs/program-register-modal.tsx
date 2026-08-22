'use client'

import { useRef } from 'react'
import { ProgramRegisterForm } from '@/components/programs/program-register-form'
import type { Program } from '@/lib/api/programs'
import { useDialogA11y } from '@/lib/hooks/use-dialog-a11y'

interface Props {
  program: Program
  companion?: Program | null
  open: boolean
  onClose: () => void
  onRegistered?: () => void
}

export function ProgramRegisterModal({
  program,
  companion = null,
  open,
  onClose,
  onRegistered,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogA11y(open, onClose, panelRef)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-register-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-[var(--border)] p-5 max-h-[90vh] overflow-y-auto"
      >
        <div id="program-register-title" className="sr-only">
          Register for {program.name}
        </div>
        <ProgramRegisterForm
          program={program}
          companion={companion}
          onClose={onClose}
          onRegistered={onRegistered}
          checkoutId={`program-square-modal-${program._id}`}
        />
      </div>
    </div>
  )
}
