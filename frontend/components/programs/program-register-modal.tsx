'use client'

import { ProgramRegisterForm } from '@/components/programs/program-register-form'
import type { Program } from '@/lib/api/programs'

interface Props {
  program: Program
  open: boolean
  onClose: () => void
  onRegistered?: () => void
}

export function ProgramRegisterModal({ program, open, onClose, onRegistered }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-register-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-[var(--border)] p-5 max-h-[90vh] overflow-y-auto">
        <div id="program-register-title" className="sr-only">
          Register for {program.name}
        </div>
        <ProgramRegisterForm
          program={program}
          onClose={onClose}
          onRegistered={onRegistered}
          checkoutId={`program-square-modal-${program._id}`}
        />
      </div>
    </div>
  )
}
