'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffSectionTab } from '@/components/staff/staff-exclusive-section'

type SettingKey = { key: string; label: string; multiline?: boolean }
type Group = {
  id: string
  label: string
  placement?: 'workspace' | 'site' | 'advanced'
  keys: SettingKey[]
}

export function StaffSiteSettingsPanel({
  title = 'Site settings',
  groupIds,
  sectionId,
  bare = false,
}: {
  title?: string
  /** When set, only show these SiteSettings groups (still role-filtered by API). */
  groupIds?: string[]
  /** Anchor for Jump to links on multi-section staff views. */
  sectionId?: string
  /** Inside StaffReveal — skip outer title card (reveal already labels Show/Hide). */
  bare?: boolean
}) {
  const [groups, setGroups] = useState<Group[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/site-settings')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    let g = (d.groups ?? []) as Group[]
    if (groupIds?.length) {
      g = g.filter((x) => groupIds.includes(x.id))
    } else {
      // Site hub: only site + advanced. Workspace groups live in their Staff area.
      g = g.filter((x) => x.placement !== 'workspace')
    }
    setGroups(g)
    setSettings(d.settings ?? {})
    setOpenId((prev) => {
      if (g.length === 1) return g[0]!.id
      if (prev && g.some((x) => x.id === prev)) return prev
      // Many groups: stay collapsed until staff picks one.
      return ''
    })
  }, [groupIds])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  async function saveKey(key: string) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settings[key] ?? '' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setStatus(`Saved ${key}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const group = groups.find((g) => g.id === openId)

  const intro = groupIds?.length
    ? 'Empty fields show live code defaults until you Save.'
    : 'Site hub keeps contact + advanced backups. Day-to-day settings live in Programs, Membership, Cove, Content, Social, Newsletter, Fundraising, and Wellness.'

  return (
    <section
      id={sectionId}
      className={
        bare
          ? `space-y-4${sectionId ? ' scroll-mt-28' : ''}`
          : `rounded-xl border border-[var(--border)] bg-white p-5 space-y-4${sectionId ? ' scroll-mt-28' : ''}`
      }
    >
      {!bare ? (
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-xs text-[#5A6070]">
            {intro} Open one group at a time.
          </p>
        </div>
      ) : (
        <p className="text-xs text-[#5A6070]">{intro}</p>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-[#5A6070]">No site settings for your role.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {groups.map((g) => (
            <StaffSectionTab
              key={g.id}
              active={openId === g.id}
              title={g.label}
              hint={`${g.keys.length} setting${g.keys.length === 1 ? '' : 's'}`}
              onSelect={() => setOpenId(openId === g.id ? '' : g.id)}
            />
          ))}
        </div>
      )}

      {group ? (
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[#FAFCF9] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">{group.label}</p>
            {groups.length > 1 ? (
              <button
                type="button"
                className="text-xs font-bold underline text-[#5A6070]"
                onClick={() => setOpenId('')}
              >
                Hide group
              </button>
            ) : null}
          </div>
          <div className="max-h-[420px] overflow-auto space-y-3 pr-1">
            {group.keys.map((k) => (
              <div
                key={k.key}
                className="space-y-1 rounded-lg border border-[var(--border)] bg-white p-3"
              >
                <label className="text-xs text-[#5A6070]">{k.label}</label>
                {k.multiline ? (
                  <textarea
                    value={settings[k.key] ?? ''}
                    onChange={(e) => setSettings((s) => ({ ...s, [k.key]: e.target.value }))}
                    rows={4}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    value={settings[k.key] ?? ''}
                    onChange={(e) => setSettings((s) => ({ ...s, [k.key]: e.target.value }))}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  className="text-xs h-8"
                  onClick={() => void saveKey(k.key)}
                >
                  Save
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : groups.length > 1 ? (
        <p className="text-sm text-[#5A6070]">Choose a settings group above to edit.</p>
      ) : null}

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
