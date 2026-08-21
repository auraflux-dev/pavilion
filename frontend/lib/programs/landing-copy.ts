/**
 * Parent-facing marketing for program landing pages.
 * Logistics stay on the catalog card. This is the story, not vendor worksheets.
 * Keep in sync with live Programs.description until full curricula / videos land.
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
      'Led by Andrew Martineau of Lumi Education (NOVA; decades of writing instruction).',
      'Cap 10 to 14 so every paper gets real feedback.',
      'Free writing, personal voice, and sensory narrative craft.',
      'Grammar that sticks: active voice, sentence variety, punctuation.',
      'Brain-mapping, outlining, thesis, and full essay construction.',
      'Spring analytical writing sold separately.',
    ],
    night:
      'Tuesdays, 7:00 to 8:00 p.m., in the SHMS library.\nTwelve sessions. One hour each night.',
    photo: '/home/hero-a.jpg',
  },
  ye: {
    eyebrow: 'Fall 2026 · Business',
    pitch:
      'Startup basics: brand, audience, and founding a business.\nA first look at how a company is built.',
    why: [
      'Led by Missy Spears from the Academies of Loudoun.',
      'Ideation, market research, and target audiences.',
      'Brand identity, mission, and marketing basics.',
      'Founding requirements, business structures, and ethics.',
      'Safe, simulated social and digital presence strategy.',
      'Exploring support with Young Entrepreneur Academy (YEA!).',
    ],
    night:
      'Tuesdays, 5:30 to 6:45 p.m., in the SHMS library.\nTwelve sessions. 75 minutes each night.',
    photo: '/home/community.jpg',
  },
  mathcounts: {
    eyebrow: 'Fall 2026 · Competition',
    pitch:
      'MATHCOUNTS and AMC 8 prep on campus.\nPre-algebra helps. No contest experience required.',
    why: [
      'Led by RSM Ashburn at Stone Hill. Not a center membership.',
      'Contest formats: Sprint, Target, Team, and Countdown.',
      'Counting, probability, number theory, algebra, and contest geometry.',
      'Sprint time management and mental math. Target multi-step routines.',
      'Weekly timed drills plus conceptual deep-dives.',
      'Mock competitions built into the year plan.',
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
      'Four adults every night, including an LCPS substitute as lead.',
      'SPIKE Prime kits and vendor laptops included.',
      'Engineering notebook students keep.',
      'Two family showcases at Stone Hill (Fall and Spring).',
      'Blocks to Python in Spring.',
      'Path onto FTC: Circuit Breakers 13353 and BeaverBots 26073.',
      '24-week year arc. Fall and Spring sold together when registration opens.',
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
