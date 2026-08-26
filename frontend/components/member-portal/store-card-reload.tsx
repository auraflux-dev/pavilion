'use client'

/**
 * Cove Digital Card load → add store-card line and continue on /checkout.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { useLiveCommerceGate } from '@/lib/demo/commons-surface-context'
import { useCart } from '@/lib/cart/store'

type Student = {
  id: string
  firstName: string
  lastName: string
}

interface Props {
  students?: Student[]
  amounts?: number[]
  /** Max whole-dollar load (default 500). */
  maxAmount?: number
  onLoaded?: () => void
  triggerLabel?: string
  triggerClassName?: string
  /** Configured first-load / membership bonus % (reloads are 1:1). */
  bonusPercent?: number
}

export function StoreCardReload({
  students = [],
  amounts = [20, 40, 75],
  maxAmount = 500,
  triggerLabel = vanillaizeIfDemo('Load Cove Digital Card'),
  triggerClassName = '',
  bonusPercent = 10,
}: Props) {
  const router = useRouter()
  const cart = useCart()
  const { allowed, loading, note } = useLiveCommerceGate()
  const [studentList, setStudentList] = useState(students)
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [amount, setAmount] = useState(amounts[0] ?? 10)
  const [customAmount, setCustomAmount] = useState('')
  const [appliedBonus, setAppliedBonus] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (!students.length) {
      fetch('/api/students')
        .then((r) => r.json())
        .then((data) => {
          const loaded = data.students ?? []
          setStudentList(loaded)
          setStudentId((current) => current || loaded[0]?.id || '')
        })
        .catch(() => setError('Students could not be loaded.'))
    }
  }, [open, students.length])

  useEffect(() => {
    if (!open) {
      setAppliedBonus(0)
      return
    }
    let cancelled = false
    fetch('/api/gift-card/bonus')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setAppliedBonus(Number(data.bonusPercent ?? 0) || 0)
      })
      .catch(() => {
        if (!cancelled) setAppliedBonus(0)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  function goToCheckout() {
    const loadStudentId = studentId || studentList[0]?.id || ''
    if (!loadStudentId) {
      setError(vanillaizeIfDemo('Add a student in the portal before loading the Cove Digital Card.'))
      return
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > maxAmount) {
      setError(`Enter a whole-dollar amount from $1 to $${maxAmount}.`)
      return
    }
    setError('')
    const student = studentList.find((s) => s.id === loadStudentId)
    const who = student ? `${student.firstName} ${student.lastName}`.trim() : 'student'
    cart.add({
      kind: 'store-card',
      title: vanillaizeIfDemo(`Cove Digital Card · $${amount} (${who})`),
      amount,
      href: '/cove',
      studentId: loadStudentId,
      amountCents: amount * 100,
    })
    setOpen(false)
    router.push('/checkout')
  }

  if (!allowed && !loading) {
    return (
      <p className="text-xs text-[#5A6070] whitespace-pre-line">
        {note || 'Online Cove loads stay off until Square is connected.'}
      </p>
    )
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-white font-bold ${triggerClassName}`}
        style={{ backgroundColor: 'var(--brand-green)' }}
      >
        {triggerLabel}
      </Button>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-[#1A1A1A]">
            {vanillaizeIfDemo('Load Cove Digital Card')}
          </p>
          <p className="text-xs text-[#5A6070] mt-0.5">
            {appliedBonus > 0
              ? `First load bonus ${appliedBonus}% · then continue to checkout`
              : bonusPercent > 0
                ? `Reloads are 1:1 · up to ${bonusPercent}% on first load`
                : 'Continue to checkout to pay with card or PayPal'}
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-semibold text-[#5A6070]"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>

      <label className="block text-xs font-semibold text-[#5A6070]">
        Student
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[#1A1A1A]"
        >
          {studentList.length === 0 ? <option value="">Loading…</option> : null}
          {studentList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        {amounts.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setAmount(preset)
              setCustomAmount('')
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-bold border"
            style={
              amount === preset && !customAmount
                ? { backgroundColor: 'var(--brand-green)', color: '#fff', borderColor: 'var(--brand-green)' }
                : { backgroundColor: 'var(--brand-warm)', borderColor: 'var(--border)' }
            }
          >
            ${preset}
          </button>
        ))}
      </div>

      <label className="block text-xs font-semibold text-[#5A6070]">
        Other amount ($)
        <input
          type="number"
          min={1}
          max={maxAmount}
          step={1}
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value)
            const n = Number(e.target.value)
            if (Number.isInteger(n)) setAmount(n)
          }}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          placeholder={`1–${maxAmount}`}
        />
      </label>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {!studentId ? (
        <p className="text-[11px] text-[#5A6070]">Choose a student above to load the Cove Digital Card.</p>
      ) : null}

      <Button
        type="button"
        onClick={goToCheckout}
        disabled={!studentId || loading}
        className="w-full text-white font-bold"
        style={{ backgroundColor: 'var(--brand-green)' }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : appliedBonus > 0 ? (
          `Check out · pay $${amount} · load $${(amount * (1 + appliedBonus / 100)).toFixed(2).replace(/\.00$/, '')}`
        ) : (
          `Check out · $${amount}`
        )}
      </Button>

      <p className="text-[10px] text-[#5A6070] text-center">
        {vanillaizeIfDemo(
          `Pay with credit/debit card or PayPal on the checkout page. One family Cove Digital Card and balance.`,
        )}
      </p>
    </div>
  )
}
