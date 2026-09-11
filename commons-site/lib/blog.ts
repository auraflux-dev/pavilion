import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import { DEMO_URL, DEMO_URL_LEGACY } from '@/lib/pricing'

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  date: string
  category: string
  minutes: number
  /** Raw markdown body (no frontmatter). */
  markdown: string
  /** Simple HTML for article body. */
  html: string
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')
const FETCH_MS = 2500

type CmsPost = {
  slug: string
  title: string
  date: string
  category: string
  excerpt: string
  minutes: number
  bodyMarkdown: string
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const trimmed = raw.replace(/^\uFEFF/, '')
  if (!trimmed.startsWith('---')) {
    return { data: {}, body: trimmed.trim() }
  }
  const end = trimmed.indexOf('\n---', 3)
  if (end === -1) {
    return { data: {}, body: trimmed.trim() }
  }
  const matter = trimmed.slice(3, end).trim()
  const body = trimmed.slice(end + 4).trim()
  const data: Record<string, string> = {}
  for (const line of matter.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    data[key] = value
  }
  return { data, body }
}

/** Minimal markdown → HTML for blog posts (paragraphs, headings, bold, links, lists). */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let paragraph: string[] = []
  let listItems: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    const text = inline(paragraph.join(' ').trim())
    if (text) blocks.push(`<p>${text}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (!listItems.length) return
    blocks.push(`<ul>${listItems.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`)
    listItems = []
  }

  const inline = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1].length
      blocks.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`)
      continue
    }
    const list = /^[-*]\s+(.+)$/.exec(line)
    if (list) {
      flushParagraph()
      listItems.push(list[1].trim())
      continue
    }
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    flushList()
    paragraph.push(line.trim())
  }
  flushParagraph()
  flushList()
  return blocks.join('\n')
}

function cmsToPost(row: CmsPost): BlogPost {
  const minutes = Number(row.minutes)
  return {
    slug: row.slug,
    title: row.title,
    date: row.date,
    category: row.category,
    excerpt: row.excerpt,
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 3,
    markdown: row.bodyMarkdown || '',
    html: markdownToHtml(row.bodyMarkdown || ''),
  }
}

function loadPostFromFile(filePath: string): BlogPost | null {
  const slug = path.basename(filePath, '.md')
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, body } = parseFrontmatter(raw)
  const title = data.title?.trim()
  const date = data.date?.trim()
  const category = data.category?.trim()
  const excerpt = data.excerpt?.trim()
  if (!title || !date || !category || !excerpt) return null
  const minutes = Number.parseInt(data.minutes || '3', 10)
  return {
    slug,
    title,
    date,
    category,
    excerpt,
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 3,
    markdown: body,
    html: markdownToHtml(body),
  }
}

function getMarkdownPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => loadPostFromFile(path.join(BLOG_DIR, name)))
    .filter((post): post is BlogPost => Boolean(post))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

async function fetchCmsPosts(): Promise<{ ok: true; posts: BlogPost[] } | { ok: false }> {
  const bases = [DEMO_URL, DEMO_URL_LEGACY]
  for (const base of bases) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), FETCH_MS)
      const res = await fetch(`${base}/api/public/marketing-blog`, {
        next: { revalidate: 60 },
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (!res.ok) continue
      const data = (await res.json()) as { posts?: CmsPost[]; source?: string }
      if (data.source === 'unavailable' || data.source === 'error') continue
      const posts = (data.posts ?? [])
        .filter((p) => p?.slug && p?.title && p?.date && p?.category && p?.excerpt)
        .map(cmsToPost)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
      return { ok: true, posts }
    } catch {
      // try next base / fall back to markdown
    }
  }
  return { ok: false }
}

async function fetchCmsPost(
  slug: string,
): Promise<{ ok: true; post: BlogPost | null } | { ok: false }> {
  const bases = [DEMO_URL, DEMO_URL_LEGACY]
  for (const base of bases) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), FETCH_MS)
      const res = await fetch(`${base}/api/public/marketing-blog/${encodeURIComponent(slug)}`, {
        next: { revalidate: 60 },
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (res.status === 404) return { ok: true, post: null }
      if (!res.ok) continue
      const data = (await res.json()) as { post?: CmsPost }
      if (!data.post?.slug) continue
      return { ok: true, post: cmsToPost(data.post) }
    } catch {
      // try next
    }
  }
  return { ok: false }
}

/** Prefer Pavilion CMS (via demo public API). Fall back to content/blog/*.md. */
export async function getAllPosts(): Promise<BlogPost[]> {
  const cms = await fetchCmsPosts()
  if (cms.ok) return cms.posts
  return getMarkdownPosts()
}

export async function getPost(slug: string): Promise<BlogPost | undefined> {
  const safe = slug.replace(/[^a-z0-9-]/gi, '')
  if (!safe || safe !== slug) return undefined
  const cms = await fetchCmsPost(safe)
  if (cms.ok) return cms.post ?? undefined
  const filePath = path.join(BLOG_DIR, `${safe}.md`)
  if (!fs.existsSync(filePath)) return undefined
  return loadPostFromFile(filePath) ?? undefined
}
