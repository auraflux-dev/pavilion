import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DemoBookingLink } from '@/components/demo-booking-link'
import { getAllPosts, getPost } from '@/lib/blog'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: 'Blog' }
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
    },
  }
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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <article className="bg-zinc-50">
      <header className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-3xl px-5 pt-16 pb-10 md:pt-20">
          <Link
            href="/blog"
            className="text-sm font-semibold text-emerald-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-emerald-900"
          >
            ← Blog
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-900">
              {post.category}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {formatDate(post.date)} · {post.minutes} min read
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base font-normal leading-relaxed text-slate-600 md:text-lg">
            {post.excerpt}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 pb-20">
        <div
          className="space-y-4 text-base font-normal leading-relaxed text-slate-700 md:text-lg [&_a]:font-semibold [&_a]:text-emerald-900 [&_a]:underline [&_a]:decoration-zinc-300 [&_a]:underline-offset-2 [&_em]:italic [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_ul]:space-y-2"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
        <div className="mt-12 flex flex-wrap gap-3 border-t border-zinc-200 pt-8">
          <DemoBookingLink className="btn-primary">Book a demo</DemoBookingLink>
          <Link href="/product" className="btn-secondary">
            See the product
          </Link>
        </div>
      </div>
    </article>
  )
}
