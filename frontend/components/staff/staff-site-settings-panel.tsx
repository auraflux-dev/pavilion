'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type SettingKey = { key: string; label: string; multiline?: boolean }
type Group = { id: string; label: string; keys: SettingKey[] }

export function StaffSiteSettingsPanel({
  title = 'Site settings',
  groupIds,
  sectionId,
}: {
  title?: string
  /** When set, only show these SiteSettings groups (still role-filtered by API). */
  groupIds?: string[]
  /** Anchor for Jump to links on multi-section staff views. */
  sectionId?: string
}) {
  const [groups, setGroups] = useState<Group[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [activeGroup, setActiveGroup] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/site-settings')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    let g = (d.groups ?? []) as Group[]
    if (groupIds?.length) g = g.filter((x) => groupIds.includes(x.id))
    setGroups(g)
    setSettings(d.settings ?? {})
    setActiveGroup((prev) => (prev && g.some((x) => x.id === prev) ? prev : g[0]?.id ?? ''))
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

  const group = groups.find((g) => g.id === activeGroup) ?? groups[0]

  return (
    <section
      id={sectionId}
      className={`rounded-xl border border-[var(--border)] bg-white p-5 space-y-4${sectionId ? ' scroll-mt-28' : ''}`}
    >
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-xs text-[#5A6070]">
          Visitor-facing SiteSettings for your role. Empty fields show live code defaults until you Save.
        </p>
      </div>
      {groups.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGroup(g.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                (group?.id ?? '') === g.id
                  ? 'border-[var(--brand-green)] bg-[#E8F3E8] text-[var(--brand-green)]'
                  : 'border-[var(--border)] text-[#5A6070]'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      ) : null}
      {group ? (
        <div className="space-y-3">
          <p className="text-sm font-bold">{group.label}</p>
          {group.keys.map((k) => (
            <div key={k.key} className="space-y-1">
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
      ) : (
        <p className="text-sm text-[#5A6070]">No site settings for your role.</p>
      )}
      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </section>
  )
}
