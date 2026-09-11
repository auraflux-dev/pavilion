import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Guides for PTO and school community leaders running public, family, and Staff surfaces.',
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${iso}T12:00:00`))
  } catch {
    return iso
  }
}

export default function BlogIndexPage() {
  const posts = getAllPosts()
  const [featured, ...rest] = posts

  return (
    <div className="bg-zinc-50">
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 md:pt-20">
          <span className="mb-4 inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Blog
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Continuity, launch, and school brand ops.
          </h1>
          <p className="mt-3 mb-6 max-w-2xl text-base font-normal leading-relaxed text-slate-600 md:text-lg">
            Practical notes for officers who want one system instead of five tools.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl space-y-6 px-5">
          {featured ? (
            <Link
              href={`/blog/${featured.slug}`}
              className="card-surface block border-emerald-200 bg-emerald-50/40 transition-colors hover:bg-emerald-50/70"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Featured · {formatDate(featured.date)} · {featured.minutes} min
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-3 max-w-3xl text-base font-normal leading-relaxed text-slate-600">
                {featured.excerpt}
              </p>
            </Link>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="card-surface block">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {formatDate(post.date)} · {post.minutes} min
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
                  {post.title}
                </h2>
                <p className="mt-2 text-base font-normal leading-relaxed text-slate-600">
                  {post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
