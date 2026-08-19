/**
 * Parent-facing marketing for program landing pages.
 * Logistics stay on the catalog card. This is the story, not vendor worksheets.
 */

export type ProgramLandingCopy = {
  eyebrow: string
  pitch: string
  why: string[]
  night: string
  photo: string
}

const FALL: Record<string, ProgramLandingCopy> = {
  essay: {
    eyebrow: 'Fall 2026 · Academic',
    pitch:
      'From paragraphs to high-school essays.\nWeekly comments on every draft.',
    why: [
      'Cap 10 to 14 so the instructor can mark every paper.',
      'Spring analytical writing is sold separately.',
    ],
    night:
      'Tuesdays, 7:00 to 8:00 p.m., in the SHMS library.\nTwelve sessions. One hour each night.',
    photo: '/home/hero-a.jpg',
  },
  ye: {
    eyebrow: 'Fall 2026 · Business',
    pitch:
      'Startup basics: brand, social, and founding a business.\nA first look at how a company is built.',
    why: [
      'Exploring support with Young Entrepreneur Academy (YEA!).',
    ],
    night:
      'Tuesdays, 5:30 to 6:45 p.m., in the SHMS library.\nTwelve sessions. 75 minutes each night.',
    photo: '/home/community.jpg',
  },
  mathcounts: {
    eyebrow: 'Fall 2026 · Competition',
    pitch:
      'MATHCOUNTS and AMC 8.\nPre-algebra helps. No contest experience required.',
    why: [
      'An after-school contest math night at Stone Hill, not a Mathnasium center membership.',
    ],
    night:
      'Wednesdays, 5:30 to 6:45 p.m., in the SHMS library.\nTwelve sessions. 75 minutes each night.',
    photo: '/home/hero-b.jpg',
  },
  robotics: {
    eyebrow: 'Fall 2026 · STEM',
    pitch:
      'Teams of 3. Nothing to buy or bring.\nRobot and laptop for each team.',
    why: [
      'Notebook they keep, two showcases here.',
      'Blocks to Python in spring.',
      'Path onto FTC: Circuit Breakers 13353, BeaverBots 26073.',
    ],
    night:
      'Wednesdays, 7:00 to 8:00 p.m., in the SHMS library.\nTwelve sessions. One hour each night.',
    photo: '/home/volunteer.jpg',
  },
}

export function programLandingCopy(epId: string | undefined): ProgramLandingCopy | null {
  if (!epId) return null
  return FALL[epId] ?? null
}
