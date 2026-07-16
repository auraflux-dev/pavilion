'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type StaffHome = {
  role: string
  title: string
  owns: string
  thisWeek: string[]
}

type StaffMe = {
  email: string
  name: string
  boardTitle: string
  roles: string[]
  isAdmin: boolean
  homes: StaffHome[]
}

type MemberHit = {
  parentEmail: string
  students: { id: string; firstName: string; lastName: string; grade: string; membershipTier: string }[]
}

export function StaffDashboard() {
  const [me, setMe] = useState<StaffMe | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<MemberHit[]>([])
  const [lookupBusy, setLookupBusy] = useState(false)
  const [actAsStatus, setActAsStatus] = useState('')

  const [platform, setPlatform] = useState<'facebook' | 'instagram'>('facebook')
  const [postText, setPostText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [socialMsg, setSocialMsg] = useState('')
  const [socialBusy, setSocialBusy] = useState(false)
  const [publishEnabled, setPublishEnabled] = useState(false)

  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgEmail, setMsgEmail] = useState('')
  const [msgGrade, setMsgGrade] = useState('')
  const [msgProgram, setMsgProgram] = useState('')
  const [msgStatus, setMsgStatus] = useState('')
  const [msgBusy, setMsgBusy] = useState(false)

  useEffect(() => {
    fetch('/api/staff/me')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Not authorized')
        setMe(data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Not authorized'))
  }, [])

  useEffect(() => {
    if (!me?.roles.some((r) => r === 'marketing' || r === 'admin')) return
    fetch('/api/staff/social')
      .then((r) => r.json())
      .then((d) => setPublishEnabled(Boolean(d.publishEnabled)))
      .catch(() => undefined)
  }, [me])

  async function lookup() {
    setLookupBusy(true)
    setActAsStatus('')
    try {
      const r = await fetch(`/api/staff/members?q=${encodeURIComponent(query)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Lookup failed')
      setMembers(d.members ?? [])
    } catch (err) {
      setActAsStatus(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLookupBusy(false)
    }
  }

  async function actAs(parentEmail: string) {
    setActAsStatus('')
    const r = await fetch('/api/staff/act-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentEmail }),
    })
    const d = await r.json()
    if (!r.ok) {
      setActAsStatus(d.error ?? 'Could not act as member')
      return
    }
    window.location.href = '/member-portal'
  }

  async function publish(saveOnly: boolean) {
    setSocialBusy(true)
    setSocialMsg('')
    try {
      const r = await fetch('/api/staff/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, text: postText, imageUrl, linkUrl, saveOnly }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Publish failed')
      if (d.ok) {
        setSocialMsg(saveOnly ? 'Draft saved.' : 'Published.')
        setPostText('')
      } else {
        setSocialMsg(d.error ?? 'Saved as failed — connect accounts in Wix Social and enable socialPublishEnabled.')
      }
    } catch (err) {
      setSocialMsg(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setSocialBusy(false)
    }
  }

  async function sendMessage() {
    setMsgBusy(true)
    setMsgStatus('')
    try {
      const r = await fetch('/api/staff/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: msgSubject,
          body: msgBody,
          parentEmail: msgEmail,
          grade: msgGrade,
          programName: msgProgram,
          audience: msgEmail ? 'parent' : msgGrade ? 'grade' : msgProgram ? 'program' : 'all',
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Send failed')
      setMsgStatus('Message sent to parent inbox.')
      setMsgSubject('')
      setMsgBody('')
    } catch (err) {
      setMsgStatus(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setMsgBusy(false)
    }
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Staff access required</h1>
        <p className="text-sm text-[#5A6070] mb-6">{error}</p>
        <Link href="/member-portal" className="text-sm font-bold" style={{ color: '#085508' }}>
          Back to member portal
        </Link>
      </div>
    )
  }

  if (!me) {
    return <p className="text-center py-16 text-sm text-[#5A6070]">Loading staff workspace…</p>
  }

  const canMarketing = me.roles.includes('marketing') || me.isAdmin
  const canMessage =
    me.roles.includes('programs') ||
    me.roles.includes('instructor') ||
    me.roles.includes('secretary') ||
    me.isAdmin

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#085508' }}>
          Staff workspace
        </p>
        <h1 className="text-3xl font-bold text-[#1A1A1A] mt-1">
          {me.name || 'Board member'}
          {me.boardTitle ? <span className="text-lg font-semibold text-[#5A6070]"> · {me.boardTitle}</span> : null}
        </h1>
        <p className="text-sm text-[#5A6070] mt-2">
          Roles: {me.roles.join(', ')} · <Link href="/member-portal" className="underline">Parent portal</Link>
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {me.homes.map((home) => (
          <div key={home.role} className="rounded-xl border border-[#E8E4DC] bg-white p-5">
            <h2 className="text-lg font-bold text-[#1A1A1A]">{home.title}</h2>
            <p className="text-xs text-[#5A6070] mt-1 mb-3">{home.owns}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#085508] mb-2">This week</p>
            <ul className="space-y-1.5">
              {home.thisWeek.map((item) => (
                <li key={item} className="text-sm text-[#1A1A1A]">• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {me.isAdmin ? (
        <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
          <h2 className="text-lg font-bold">Admin · Member lookup & act-as</h2>
          <p className="text-xs text-[#5A6070]">
            Search parents by email or student name, then open their portal view to troubleshoot.
          </p>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="email or student name"
              className="flex-1 border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
            <Button onClick={lookup} disabled={lookupBusy} className="text-white" style={{ backgroundColor: '#085508' }}>
              {lookupBusy ? '…' : 'Search'}
            </Button>
          </div>
          {actAsStatus ? <p className="text-xs text-red-600">{actAsStatus}</p> : null}
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.parentEmail} className="flex items-start justify-between gap-3 border-t border-[#F0EBE3] pt-2">
                <div>
                  <p className="text-sm font-semibold">{m.parentEmail}</p>
                  <p className="text-xs text-[#5A6070]">
                    {m.students.map((s) => `${s.firstName} ${s.lastName} (G${s.grade})`).join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => actAs(m.parentEmail)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white shrink-0"
                  style={{ backgroundColor: '#085508' }}
                >
                  Act as
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canMarketing ? (
        <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
          <h2 className="text-lg font-bold">Marketing · Facebook & Instagram</h2>
          <p className="text-xs text-[#5A6070]">
            Compose from your staff login. Live publish needs Wix Social connected and{' '}
            <code>socialPublishEnabled=true</code>. You can always save drafts.
            {publishEnabled ? ' · Live publish enabled.' : ' · Live publish currently off.'}
          </p>
          <div className="flex gap-2">
            {(['facebook', 'instagram'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${
                  platform === p ? 'border-[#085508] bg-[#EEF6EE]' : 'border-[#E8E4DC]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            rows={4}
            placeholder="Post text"
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Link URL (Facebook; Instagram use bio/story)"
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={socialBusy || !postText} onClick={() => publish(true)} variant="outline">
              Save draft
            </Button>
            <Button
              disabled={socialBusy || !postText}
              onClick={() => publish(false)}
              className="text-white"
              style={{ backgroundColor: '#085508' }}
            >
              {socialBusy ? '…' : 'Publish'}
            </Button>
          </div>
          {socialMsg ? <p className="text-xs text-[#5A6070]">{socialMsg}</p> : null}
          <p className="text-xs">
            Surveys: <Link href="/survey/spring-feedback" className="underline">open sample</Link> · manage in Wix CMS
            Surveys
          </p>
        </section>
      ) : null}

      {canMessage ? (
        <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
          <h2 className="text-lg font-bold">Programs / Instructor · Message parents</h2>
          <p className="text-xs text-[#5A6070]">
            Messages appear in the parent portal inbox. Leave email blank and set grade or program to broadcast.
          </p>
          <input
            value={msgSubject}
            onChange={(e) => setMsgSubject(e.target.value)}
            placeholder="Subject"
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
            rows={4}
            placeholder="Message body"
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid sm:grid-cols-3 gap-2">
            <input
              value={msgEmail}
              onChange={(e) => setMsgEmail(e.target.value)}
              placeholder="Parent email (optional)"
              className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={msgGrade}
              onChange={(e) => setMsgGrade(e.target.value)}
              placeholder="Grade e.g. 6"
              className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={msgProgram}
              onChange={(e) => setMsgProgram(e.target.value)}
              placeholder="Program name"
              className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <Button
            disabled={msgBusy || !msgSubject || !msgBody}
            onClick={sendMessage}
            className="text-white"
            style={{ backgroundColor: '#085508' }}
          >
            {msgBusy ? 'Sending…' : 'Send to inbox'}
          </Button>
          {msgStatus ? <p className="text-xs text-[#5A6070]">{msgStatus}</p> : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-[#E8E4DC] bg-[#FAFCF9] p-5">
        <h2 className="text-lg font-bold mb-2">Quick links for your role</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/privacy" className="underline">Privacy</Link>
          <Link href="/terms" className="underline">Terms</Link>
          <Link href="/photo-release" className="underline">Photo release</Link>
          <Link href="/board" className="underline">Public board page</Link>
          <Link href="/programs" className="underline">Programs</Link>
          <Link href="/store" className="underline">Store</Link>
        </div>
      </section>
    </div>
  )
}
