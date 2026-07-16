'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

type SurveySummary = {
  slug: string
  title: string
  description: string
  showInPortal: boolean
  responseCount: number
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

export function SurveyResultsPanel() {
  const [surveys, setSurveys] = useState<SurveySummary[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [selectedSlug, setSelectedSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareStatus, setShareStatus] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(`/api/staff/surveys${selectedSlug ? `?slug=${encodeURIComponent(selectedSlug)}` : ''}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Could not load responses')
        if (!selectedSlug) setSurveys(data.surveys ?? [])
        setResponses(data.responses ?? [])
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [selectedSlug])

  const answerKeys = useMemo(
    () => Array.from(new Set(responses.flatMap((response) => Object.keys(response.answers)))),
    [responses],
  )
  const selectedSurvey = surveys.find((survey) => survey.slug === selectedSlug)
  const exportUrl = `/api/staff/surveys?format=csv${
    selectedSlug ? `&slug=${encodeURIComponent(selectedSlug)}` : ''
  }`

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

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Surveys · Share, review & export</h2>
          <p className="text-xs text-[#5A6070]">
            Send a branded survey link, review responses here, or download a CSV for analysis.
          </p>
        </div>
        <Button asChild variant="outline" disabled={loading || responses.length === 0}>
          <a href={exportUrl}>Download CSV</a>
        </Button>
      </div>

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
          <option value="">All surveys ({surveys.reduce((sum, item) => sum + item.responseCount, 0)})</option>
          {surveys.map((survey) => (
            <option key={survey.slug} value={survey.slug}>
              {survey.title} ({survey.responseCount})
            </option>
          ))}
        </select>
      </label>

      {selectedSurvey ? (
        <div className="rounded-lg border border-[#DCE9DC] bg-[#FAFCF9] p-4 space-y-3">
          <div>
            <p className="text-sm font-bold">Share {selectedSurvey.title}</p>
            <p className="text-xs text-[#5A6070]">
              {selectedSurvey.showInPortal ? 'Visible in the member portal.' : 'Direct-link only; not shown in the member portal.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['email', 'sms', 'whatsapp'] as const).map((channel) => (
              <div key={channel} className="inline-flex rounded-lg border border-[#E8E4DC] overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => openShare(channel)}
                  className="px-3 py-2 text-xs font-bold capitalize hover:bg-[#F5F2EC]"
                >
                  Open {channel}
                </button>
                <button
                  type="button"
                  onClick={() => copyShare(channel)}
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
        <p className="text-xs text-[#5A6070]">Choose a survey to open or copy its email, SMS, and WhatsApp message.</p>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-[#5A6070]">Loading responses…</p> : null}
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
                  <th key={key} className="px-3 py-2">{key}</th>
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
