import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function TrialLockedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#F7F5F0]">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Trial ended</h1>
        <p className="text-sm text-[#5A6070] whitespace-pre-line">
          {`Reads stay for a short hold window.
Writes are off until you subscribe.
Your data is not gone yet.`}
        </p>
        <p className="text-sm">
          <Link href="/login" className="underline font-semibold" style={{ color: 'var(--brand-green, #1B6B45)' }}>
            Sign in
          </Link>
          {' · '}
          <Link href="/trial" className="underline font-semibold" style={{ color: 'var(--brand-green, #1B6B45)' }}>
            Start a new trial
          </Link>
        </p>
      </div>
    </main>
  )
}
