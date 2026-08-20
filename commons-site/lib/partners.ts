import partnersJson from '../content/partners.json'

export type Partner = {
  name: string
  category: string
  blurb: string
  url: string
  note?: string
}

export function loadPartners(): Partner[] {
  return partnersJson as Partner[]
}

/** Prefer loadPartners() in pages. */
export const PARTNERS: Partner[] = loadPartners()
