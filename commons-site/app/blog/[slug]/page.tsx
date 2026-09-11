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
  return { title: post.title, description: post.excerpt }
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
      <div className="mx-auto max-w-3xl px-5 pt-16 pb-20 md:pt-20">
        <Link
          href="/blog"
          className="text-sm font-semibold text-emerald-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-emerald-900"
        >
          ← Blog
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-emerald-700">
          {formatDate(post.date)} · {post.minutes} min read
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-base font-normal leading-relaxed text-slate-600 md:text-lg">
          {post.excerpt}
        </p>
        <div className="mt-10 space-y-4">
          {post.body.map((para) => (
            <p key={para} className="text-base font-normal leading-relaxed text-slate-700 md:text-lg">
              {para}
            </p>
          ))}
        </div>
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
