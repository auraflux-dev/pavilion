import { notFound, redirect } from 'next/navigation'
import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { SurveyForm } from '@/components/surveys/survey-form'
import { getSurveyBySlug } from '@/lib/api/surveys'
import { cookies } from 'next/headers'
import { TOKENS_COOKIE } from '@/lib/auth-cookies'
import { isMemberTokens, parseTokensCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const survey = await getSurveyBySlug(slug)
  return {
    title: survey ? survey.title : 'Survey',
    description: survey?.description ?? 'SHMS PTO survey',
  }
}

export default async function SurveyPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { from } = await searchParams
  const survey = await getSurveyBySlug(slug)
  if (!survey) notFound()

  if (survey.requireLogin) {
    const cookieStore = await cookies()
    const tokens = parseTokensCookie(cookieStore.get(TOKENS_COOKIE)?.value)
    if (!tokens || !isMemberTokens(tokens)) {
      redirect(`/auth/join?mode=login&returnTo=${encodeURIComponent(`/survey/${slug}`)}`)
    }
  }

  const channel = from ?? 'link'

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content" className="flex-1 py-12 md:py-16" style={{ backgroundColor: 'var(--brand-warm)' }}>
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-green)' }}>
              SHMS PTO
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-balance">{survey.title}</h1>
            {survey.description ? (
              <p className="text-sm text-[#5A6070] mt-2">{survey.description}</p>
            ) : null}
          </div>
          <SurveyForm survey={survey} channel={channel} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
