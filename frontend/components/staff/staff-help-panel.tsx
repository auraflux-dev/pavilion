'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { KnowledgeBase, type KbGroup } from '@/components/kb/knowledge-base'
import { StaffCmsCollectionPanel } from '@/components/staff/staff-cms-collection-panel'
import { Button } from '@/components/ui/button'
import {
  articlesByCategoryWithExtras,
  getCategory,
  type KbArticle,
} from '@/lib/kb'
import { staffVideoForHelpArticle } from '@/lib/videos/staff-videos'

export function StaffHelpPanel({
  isAdmin,
  canMessage,
  canMembership,
  canDiscounts,
  canSite,
  canMarketing,
  canRetail,
  canEditKb,
}: {
  isAdmin: boolean
  canMessage: boolean
  canMembership: boolean
  canDiscounts: boolean
  canSite: boolean
  canMarketing: boolean
  canRetail: boolean
  canEditKb?: boolean
}) {
  const searchParams = useSearchParams()
  const articleSlug = searchParams.get('article') || ''
  const [articles, setArticles] = useState<KbArticle[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [seedBusy, setSeedBusy] = useState(false)
  const [seedNote, setSeedNote] = useState('')
  const [ensureBusy, setEnsureBusy] = useState(false)

  const gates = useMemo(
    () => ({
      isAdmin,
      canMessage,
      canMembership,
      canDiscounts,
      canSite,
      canMarketing,
      canRetail,
    }),
    [isAdmin, canMessage, canMembership, canDiscounts, canSite, canMarketing, canRetail],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/kb?audience=staff')
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not load help')
        if (!cancelled) {
          setArticles(d.articles ?? [])
          setLoadError('')
        }
      } catch (err) {
        if (!cancelled) {
          setArticles([])
          setLoadError(err instanceof Error ? err.message : 'Could not load help')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const groups: KbGroup[] = useMemo(() => {
    if (!articles) return []
    return articlesByCategoryWithExtras('staff', articles, gates)
  }, [articles, gates])

  const active = articleSlug
    ? articles?.find((a) => a.slug === articleSlug) ?? null
    : null
  const allowed =
    !active || groups.some((g) => g.articles.some((a) => a.slug === active.slug))
  const visibleActive = allowed ? active : null
  const activeCategory = visibleActive
    ? getCategory('staff', visibleActive.categoryId)
    : null
  const staffVideo = visibleActive ? staffVideoForHelpArticle(visibleActive.slug) : null

  async function ensureCollection() {
    setEnsureBusy(true)
    setSeedNote('')
    try {
      const r = await fetch('/api/staff/cms/ensure-fields', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not create collection')
      setSeedNote('KbArticles collection is ready. You can seed starter articles next.')
    } catch (err) {
      setSeedNote(err instanceof Error ? err.message : 'Ensure failed')
    } finally {
      setEnsureBusy(false)
    }
  }

  async function seedDefaults() {
    setSeedBusy(true)
    setSeedNote('')
    try {
      const r = await fetch('/api/staff/kb/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Seed failed')
      setSeedNote(
        `Seeded ${d.inserted ?? 0} new article(s), skipped ${d.skipped ?? 0} existing.` +
          (d.errors?.length ? ` Issues: ${d.errors[0]}` : ''),
      )
      const reload = await fetch('/api/kb?audience=staff')
      const data = await reload.json()
      if (reload.ok) setArticles(data.articles ?? [])
    } catch (err) {
      setSeedNote(err instanceof Error ? err.message : 'Seed failed')
    } finally {
      setSeedBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          {loadError}
        </p>
      ) : null}

      <KnowledgeBase
        title="Staff Help"
        subtitle="Logged-in staff knowledge base. Articles open here in Staff. PayPal, Square, MoneyMinder, and Bank of America stay separate Treasurer/President logins."
        groups={groups}
        indexHref="/staff?view=help"
        articleHrefTemplate="/staff?view=help&article={slug}"
        active={visibleActive}
        activeCategory={activeCategory}
        staffVideo={staffVideo}
      />

      {canEditKb ? (
        <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-3">
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A]">Edit help articles</h2>
            <p className="text-xs text-[#5A6070] mt-1 leading-relaxed">
              Change Member Help and Staff Help here. Saves go live without a code deploy. First time:
              create the collection, then seed starter articles, then edit titles and full article text.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={ensureBusy}
              onClick={() => void ensureCollection()}
            >
              {ensureBusy ? 'Creating…' : '1. Create KbArticles collection'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={seedBusy}
              onClick={() => void seedDefaults()}
            >
              {seedBusy ? 'Seeding…' : '2. Seed starter articles'}
            </Button>
          </div>
          {seedNote ? <p className="text-xs text-[#5A6070]">{seedNote}</p> : null}
          <StaffCmsCollectionPanel
            collection="KbArticles"
            title="Knowledge base articles (member + staff)"
          />
        </section>
      ) : null}
    </div>
  )
}
