export type SignupSheetStatus = 'draft' | 'published' | 'closed'

export type SignupSlotType = 'time' | 'item' | 'quantity'

export type SignupFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox'

export type SignupSheetSettings = {
  reminderDaysBefore?: number
  allowMultipleSlotsPerPerson?: boolean
  sendConfirmationEmail?: boolean
}

export type SignupSheetFieldInput = {
  fieldKey?: string
  label: string
  fieldType?: SignupFieldType
  required?: boolean
  options?: string[]
  sortOrder?: number
}

export type SignupSlotInput = {
  slotType?: SignupSlotType
  title: string
  description?: string
  startsAt?: string | null
  endsAt?: string | null
  quantityNeeded?: number
  itemUnit?: string
  sortOrder?: number
}

export type CreateSignupSheetInput = {
  title: string
  description?: string
  location?: string
  startsAt?: string | null
  endsAt?: string | null
  timezone?: string
  status?: SignupSheetStatus
  slug?: string
  settings?: SignupSheetSettings
  fields?: SignupSheetFieldInput[]
  slots?: SignupSlotInput[]
}

export type SignupSheetField = {
  id: string
  sheetId: string
  fieldKey: string
  label: string
  fieldType: SignupFieldType
  required: boolean
  options: string[]
  sortOrder: number
}

export type SignupSlot = {
  id: string
  sheetId: string
  slotType: SignupSlotType
  title: string
  description: string
  startsAt: string | null
  endsAt: string | null
  quantityNeeded: number
  quantityClaimed: number
  itemUnit: string
  sortOrder: number
}

export type SignupSheet = {
  id: string
  organizationId: string
  slug: string
  title: string
  description: string
  location: string
  startsAt: string | null
  endsAt: string | null
  timezone: string
  status: SignupSheetStatus
  settings: SignupSheetSettings
  createdByEmail: string
  createdAt: string
  updatedAt: string
  fields: SignupSheetField[]
  slots: SignupSlot[]
  publicPath: string
}

export type SignupSheetSummary = Pick<
  SignupSheet,
  'id' | 'slug' | 'title' | 'location' | 'startsAt' | 'endsAt' | 'status' | 'updatedAt' | 'publicPath'
> & { slotCount: number; registrationCount: number }

export type SignupRegistration = {
  id: string
  sheetId: string
  slotId: string
  slotTitle: string
  participantName: string
  participantEmail: string
  participantPhone: string
  customAnswers: Record<string, string>
  quantity: number
  confirmationToken: string
  createdAt: string
}

export type ClaimSlotInput = {
  slotId: string
  quantity?: number
}

export type ClaimSignupInput = {
  name: string
  email: string
  phone?: string
  customAnswers?: Record<string, string>
  slots: ClaimSlotInput[]
}
