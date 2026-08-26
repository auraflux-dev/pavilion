'use client'

/**
 * Full cart page. Same lines as the header drawer; checkout continues on /checkout.
 */
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart/store'

export function CartPageClient() {
  const { lines, count, total, remove, clear } = useCart()

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Bag</h1>
        <p className="mt-2 text-sm text-[#5A6070] whitespace-pre-line">
          {count === 0
            ? 'Your bag is empty.'
            : `${count} item${count === 1 ? '' : 's'} · $${total.toFixed(2)}.
One checkout pays for the whole bag.`}
        </p>
      </div>

      {lines.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-[#5A6070] whitespace-pre-line">
            {`Browse Programs, Membership, or The Cove.
Add something and it will stay here until you check out.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/programs">Programs</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/membership">Membership</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/cove">The Cove</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {lines.map((line) => (
            <li
              key={line.id}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-bold text-[#1A1A1A]">{line.title}</p>
                <p className="text-xs text-[#5A6070] mt-0.5 capitalize">{line.kind}</p>
                {line.studentId ? (
                  <p className="text-xs text-[#5A6070] mt-1">
                    Student assigned on this line (change in the bag drawer if needed).
                  </p>
                ) : line.kind === 'program' ? (
                  <p className="text-xs text-amber-800 mt-1">
                    Pick a student in the bag drawer before checkout.
                  </p>
                ) : null}
                <p className="text-sm font-semibold mt-2" style={{ color: 'var(--brand-green)' }}>
                  ${Number(line.amount || 0).toFixed(2)}
                  {line.quantity && line.quantity > 1 ? ` × ${line.quantity}` : ''}
                </p>
                {line.href ? (
                  <Link href={line.href} className="text-xs font-semibold text-[var(--brand-green)] hover:underline mt-1 inline-block">
                    View item
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-[#5A6070] hover:text-[#1A1A1A] shrink-0"
                onClick={() => remove(line.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {lines.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            asChild
            className="text-white font-bold"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            <Link href="/checkout">{`Check out · $${total.toFixed(2)}`}</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => clear()}>
            Empty bag
          </Button>
        </div>
      ) : null}
    </div>
  )
}
