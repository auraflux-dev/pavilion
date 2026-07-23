'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { KnowledgeBase } from '@/components/kb/knowledge-base'
import { articlesByCategory, getArticle, getCategory } from '@/lib/kb'

export function StaffHelpPanel({
  isAdmin,
  canMessage,
  canMembership,
  canDiscounts,
  canSite,
  canMarketing,
}: {
  isAdmin: boolean
  canMessage: boolean
  canMembership: boolean
  canDiscounts: boolean
  canSite: boolean
  canMarketing: boolean
}) {
  const searchParams = useSearchParams()
  const articleSlug = searchParams.get('article') || ''

  const gates = useMemo(
    () => ({
      isAdmin,
      canMessage,
      canMembership,
      canDiscounts,
      canSite,
      canMarketing,
    }),
    [isAdmin, canMessage, canMembership, canDiscounts, canSite, canMarketing],
  )

  const groups = useMemo(() => articlesByCategory('staff', gates), [gates])
  const active = articleSlug ? getArticle('staff', articleSlug) : null
  const allowed =
    !active || groups.some((g) => g.articles.some((a) => a.slug === active.slug))
  const visibleActive = allowed ? active : null
  const activeCategory = visibleActive
    ? getCategory('staff', visibleActive.categoryId)
    : null

  return (
    <KnowledgeBase
      title="Staff Help"
      subtitle="Logged-in staff knowledge base. Articles open here in Staff. PayPal, Square, MoneyMinder, and Bank of America stay separate Treasurer/President logins."
      groups={groups}
      indexHref="/staff?view=help"
      articleHref={(slug) => `/staff?view=help&article=${encodeURIComponent(slug)}`}
      active={visibleActive}
      activeCategory={activeCategory}
    />
  )
}
