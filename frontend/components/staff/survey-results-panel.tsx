'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { SurveyBranding, SurveyField, SurveyFieldType } from '@/lib/surveys/types'

type SurveySummary = {
  id: string
  slug: string
  title: string
  description: string
  showInPortal: boolean
  active: boolean
  responseCount: number
}

type SurveyDefinition = {
  id: string
  slug: string
  title: string
  description: string
  intro: string
  fields: SurveyField[]
  branding: SurveyBranding
  audience: 'all' | 'members'
  showInPortal: boolean
  requireLogin: boolean
  active: boolean
  responseCount?: number
}

type SurveyResponse = {
  id: string
  surveySlug: string
  surveyTitle: string
  respondentEmail: string
  respondentName: string
  answers: Record<string, string>
  channel: string
  submittedAt: string
}

type Mode = 'list' | 'create' | 'edit'

const FIELD_TYPES: { value: SurveyFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'choice', label: 'Multiple choice' },
  { value: 'grade', label: 'Grade (6/7/8)' },
]

function emptyField(): SurveyField {
  return { id: '', type: 'text', label: '', required: false, options: [] }
}

function slugify(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function SurveyResultsPanel() {
  const [mode, setMode] = useState<Mode>('list')
  const [surveys, setSurveys] = useState<SurveySummary[]>([])
  const [definitions, setDefinitions] = useState<SurveyDefinition[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [selectedSlug, setSelectedSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [shareStatus, setShareStatus] = useState('')

  const [editId, setEditId] = useState('')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [intro, setIntro] = useState('')
  const [showInPortal, setShowInPortal] = useState(true)
  const [requireLogin, setRequireLogin] = useState(false)
  const [active, setActive] = useState(true)
  const [thankYou, setThankYou] = useState('Thank you — your response was recorded.')
  const [accentColor, setAccentColor] = useState('#085508')
  const [fields, setFields] = useState<SurveyField[]>([emptyField()])

  const load = useCallback(async (slugFilter = selectedSlug) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ includeInactive: 'true' })
      if (slugFilter) params.set('slug', slugFilter)
      const response = await fetch(`/api/staff/surveys?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not load surveys')
      setSurveys(data.surveys ?? [])
      setDefinitions(data.definitions ?? [])
      setResponses(data.responses ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load surveys')
    } finally {
      setLoading(false)
    }
  }, [selectedSlug])

  useEffect(() => {
    void load()
  }, [load])

  const answerKeys = useMemo(
    () => Array.from(new Set(responses.flatMap((response) => Object.keys(response.answers)))),
    [responses],
  )
  const selectedSurvey = surveys.find((survey) => survey.slug === selectedSlug)
  const exportUrl = `/api/staff/surveys?format=csv${
    selectedSlug ? `&slug=${encodeURIComponent(selectedSlug)}` : ''
  }`

  function resetForm() {
    setEditId('')
    setTitle('')
    setSlug('')
    setSlugTouched(false)
    setDescription('')
    setIntro('')
    setShowInPortal(true)
    setRequireLogin(false)
    setActive(true)
    setThankYou('Thank you — your response was recorded.')
    setAccentColor('#085508')
    setFields([emptyField()])
  }

  function startCreate() {
    resetForm()
    setMode('create')
    setStatus('')
  }

  function startEdit(defSlug: string) {
    const def = definitions.find((d) => d.slug === defSlug)
    if (!def) {
      setError('Could not load that survey for editing.')
      return
    }
    setEditId(def.id)
    setTitle(def.title)
    setSlug(def.slug)
    setSlugTouched(true)
    setDescription(def.description)
    setIntro(def.intro)
    setShowInPortal(def.showInPortal)
    setRequireLogin(def.requireLogin)
    setActive(def.active !== false)
    setThankYou(def.branding?.thankYouMessage || 'Thank you — your response was recorded.')
    setAccentColor(def.branding?.accentColor || '#085508')
    setFields(def.fields.length ? def.fields.map((f) => ({ ...f, options: f.options ?? [] })) : [emptyField()])
    setSelectedSlug(def.slug)
    setMode('edit')
    setStatus('')
  }

  function updateField(index: number, patch: Partial<SurveyField> & { optionsText?: string }) {
    setFields((prev) =>
      prev.map((field, i) => {
        if (i !== index) return field
        const next = { ...field, ...patch }
        if (patch.optionsText != null) {
          next.options = patch.optionsText
            .split(/[,\n]/)
            .map((o) => o.trim())
            .filter(Boolean)
        }
        if (patch.label != null && !field.id) {
          next.id = slugify(patch.label)
        }
        return next
      }),
    )
  }

  async function saveSurvey() {
    setBusy(true)
    setStatus('')
    setError('')
    try {
      const payload = {
        id: editId || undefined,
        title,
        slug: slug || slugify(title),
        description,
        intro: intro || description,
        showInPortal,
        requireLogin,
        active,
        fields: fields
          .filter((f) => f.label.trim())
          .map((f) => ({
            ...f,
            id: f.id || slugify(f.label),
            options: f.type === 'grade' && !(f.options?.length) ? ['6', '7', '8'] : f.options,
          })),
        branding: { accentColor, thankYouMessage: thankYou },
      }
      const response = await fetch('/api/staff/surveys', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not save survey')
      const savedSlug = String(data.survey?.slug ?? payload.slug)
      setStatus(mode === 'edit' ? 'Survey updated.' : 'Survey created — share it below.')
      setMode('list')
      setSelectedSlug(savedSlug)
      await load(savedSlug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save survey')
    } finally {
      setBusy(false)
    }
  }

  function shareDetails(channel: 'email' | 'sms' | 'whatsapp') {
    if (!selectedSurvey) return null
    const url = `${window.location.origin}/survey/${selectedSurvey.slug}?from=${channel}`
    const message = `${selectedSurvey.title}\n\n${selectedSurvey.description || 'Please share your feedback with SHMS PTO.'}\n\n${url}`
    return { url, message }
  }

  async function copyShare(channel: 'email' | 'sms' | 'whatsapp') {
    const details = shareDetails(channel)
    if (!details) return
    try {
      await navigator.clipboard.writeText(details.message)
      setShareStatus(`${channel.toUpperCase()} message copied.`)
    } catch {
      setShareStatus(`Copy failed. Use this link: ${details.url}`)
    }
  }

  function openShare(channel: 'email' | 'sms' | 'whatsapp') {
    const details = shareDetails(channel)
    if (!details) return
    if (channel === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(selectedSurvey!.title)}&body=${encodeURIComponent(details.message)}`
    } else if (channel === 'sms') {
      window.location.href = `sms:?&body=${encodeURIComponent(details.message)}`
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(details.message)}`, '_blank', 'noopener,noreferrer')
    }
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {mode === 'edit' ? 'Edit survey' : 'Create survey'}
            </h2>
            <p className="text-xs text-[#5A6070]">
              Build questions here — no Wix CMS JSON. Parents take it at /survey/your-slug.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setMode('list')}>
            Cancel
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-[#5A6070] sm:col-span-2">
            Title
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (!slugTouched) setSlug(slugify(e.target.value))
              }}
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              placeholder="Spring PTO Feedback"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070]">
            URL slug
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(slugify(e.target.value))
              }}
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              placeholder="spring-feedback"
            />
            <span className="font-normal text-[11px]">
              Live link: /survey/{slug || '…'}
            </span>
          </label>
          <label className="block text-xs font-bold text-[#5A6070]">
            Accent color
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="mt-1 block h-10 w-full border border-[#E8E4DC] rounded-lg"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070] sm:col-span-2">
            Short description (used in share messages)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070] sm:col-span-2">
            Intro on the survey page
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={2}
              placeholder="Shown above the questions"
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
            />
          </label>
          <label className="block text-xs font-bold text-[#5A6070] sm:col-span-2">
            Thank-you message
            <input
              value={thankYou}
              onChange={(e) => setThankYou(e.target.value)}
              className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (accepting responses)
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={showInPortal}
              onChange={(e) => setShowInPortal(e.target.checked)}
            />
            Show in member portal
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={requireLogin}
              onChange={(e) => setRequireLogin(e.target.checked)}
            />
            Require login
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold">Questions</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setFields((prev) => [...prev, emptyField()])}
            >
              Add question
            </Button>
          </div>
          {fields.map((field, index) => (
            <div key={index} className="rounded-lg border border-[#E8E4DC] p-3 space-y-2 bg-[#FAFAF8]">
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Question label"
                  className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={field.type}
                  onChange={(e) =>
                    updateField(index, { type: e.target.value as SurveyFieldType })
                  }
                  className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              {(field.type === 'choice' || field.type === 'grade') && (
                <input
                  value={(field.options ?? []).join(', ')}
                  onChange={(e) => updateField(index, { optionsText: e.target.value })}
                  placeholder={
                    field.type === 'grade'
                      ? 'Options (default 6, 7, 8)'
                      : 'Choices separated by commas'
                  }
                  className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                  />
                  Required
                </label>
                <button
                  type="button"
                  className="text-xs font-bold text-red-700 underline"
                  onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                  disabled={fields.length <= 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          disabled={busy || !title.trim() || !fields.some((f) => f.label.trim())}
          onClick={() => void saveSurvey()}
          className="text-white"
          style={{ backgroundColor: '#085508' }}
        >
          {busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create survey'}
        </Button>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Surveys</h2>
          <p className="text-xs text-[#5A6070]">
            Create and edit surveys here, then share, review responses, or download CSV.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={startCreate} className="text-white" style={{ backgroundColor: '#085508' }}>
            Create survey
          </Button>
          <Button asChild variant="outline" disabled={loading || responses.length === 0}>
            <a href={exportUrl}>Download CSV</a>
          </Button>
        </div>
      </div>

      {status ? <p className="text-xs text-[#085508]">{status}</p> : null}

      <label className="block text-xs font-bold text-[#5A6070]">
        Survey
        <select
          value={selectedSlug}
          onChange={(event) => {
            setSelectedSlug(event.target.value)
            setShareStatus('')
          }}
          className="mt-1 block w-full sm:max-w-md border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
        >
          <option value="">
            All surveys ({surveys.reduce((sum, item) => sum + item.responseCount, 0)})
          </option>
          {surveys.map((survey) => (
            <option key={survey.slug} value={survey.slug}>
              {survey.title}
              {!survey.active ? ' (inactive)' : ''} ({survey.responseCount})
            </option>
          ))}
        </select>
      </label>

      {selectedSurvey ? (
        <div className="rounded-lg border border-[#DCE9DC] bg-[#FAFCF9] p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold">{selectedSurvey.title}</p>
              <p className="text-xs text-[#5A6070]">
                {selectedSurvey.showInPortal ? 'Visible in the member portal.' : 'Direct-link only.'}
                {!selectedSurvey.active ? ' · Inactive' : ''}
              </p>
              <Link
                href={`/survey/${selectedSurvey.slug}`}
                className="text-xs font-bold underline text-[#085508]"
                target="_blank"
              >
                Open live survey
              </Link>
            </div>
            {selectedSurvey.id ? (
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(selectedSurvey.slug)}>
                Edit
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['email', 'sms', 'whatsapp'] as const).map((channel) => (
              <div
                key={channel}
                className="inline-flex rounded-lg border border-[#E8E4DC] overflow-hidden bg-white"
              >
                <button
                  type="button"
                  onClick={() => openShare(channel)}
                  className="px-3 py-2 text-xs font-bold capitalize hover:bg-[#F5F2EC]"
                >
                  Open {channel}
                </button>
                <button
                  type="button"
                  onClick={() => void copyShare(channel)}
                  className="border-l border-[#E8E4DC] px-2 py-2 text-xs hover:bg-[#F5F2EC]"
                  aria-label={`Copy ${channel} message`}
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
          {shareStatus ? <p className="text-xs text-[#085508]">{shareStatus}</p> : null}
        </div>
      ) : (
        <p className="text-xs text-[#5A6070]">
          Choose a survey to edit, share, or filter responses — or create a new one.
        </p>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-[#5A6070]">Loading…</p> : null}
      {!loading && !error && responses.length === 0 ? (
        <p className="text-sm text-[#5A6070]">No survey responses yet.</p>
      ) : null}

      {!loading && responses.length > 0 ? (
        <div className="overflow-x-auto border border-[#F0EBE3] rounded-lg">
          <table className="min-w-full text-xs">
            <thead className="bg-[#FAFCF9] text-left">
              <tr>
                <th className="px-3 py-2">Submitted</th>
                {!selectedSlug ? <th className="px-3 py-2">Survey</th> : null}
                <th className="px-3 py-2">Respondent</th>
                <th className="px-3 py-2">Channel</th>
                {answerKeys.map((key) => (
                  <th key={key} className="px-3 py-2">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => (
                <tr key={response.id} className="border-t border-[#F0EBE3] align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {response.submittedAt ? new Date(response.submittedAt).toLocaleString() : '—'}
                  </td>
                  {!selectedSlug ? <td className="px-3 py-2">{response.surveyTitle}</td> : null}
                  <td className="px-3 py-2">
                    {response.respondentName || 'Anonymous'}
                    {response.respondentEmail ? (
                      <span className="block text-[#5A6070]">{response.respondentEmail}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{response.channel}</td>
                  {answerKeys.map((key) => (
                    <td key={key} className="px-3 py-2 min-w-40 whitespace-pre-wrap">
                      {response.answers[key] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
