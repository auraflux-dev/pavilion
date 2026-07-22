export type SurveyFieldType = 'text' | 'textarea' | 'choice' | 'email' | 'grade'

export interface SurveyField {
  id: string
  type: SurveyFieldType
  label: string
  required?: boolean
  options?: string[]
  placeholder?: string
}

export interface SurveyBranding {
  accentColor?: string
  thankYouMessage?: string
}

export interface SurveyDefinition {
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
  createdBy: string
  /** POWR embed HTML (or iframe src) — when set, portal/page shows POWR instead of built-in fields */
  powrEmbedHtml?: string
}

export interface SurveyResponsePayload {
  answers: Record<string, string>
  channel?: 'portal' | 'email' | 'sms' | 'whatsapp' | 'link'
}
