/**
 * Parent-facing marketing for program landing pages.
 * Catalog cards stay short. LPs use pitch + highlights + curriculum, not a second essay.
 * YE Fall copy is RFP Part I placeholder until Melissa Spears sends an updated packet.
 */

export type ProgramCurriculumWeek = {
  week: number
  title: string
  focus?: string
}

export type ProgramLandingCopy = {
  eyebrow: string
  /** One or two short beats. Not the full catalog blurb. */
  pitch: string
  /** Max three conversion highlights. */
  highlights: string[]
  /** Optional YouTube / Vimeo embed URL. Empty = video placeholder. */
  videoUrl?: string
  curriculumTitle: string
  curriculum: ProgramCurriculumWeek[]
}

/**
 * Short Programs-card descriptions (CMS / catalog).
 * Keep bullets light. Landing pages own the curriculum detail.
 */
export const FALL_2026_CATALOG_DESCRIPTIONS: Record<string, string> = {
  ye: `Startup fundamentals, branding, and founding execution.
Part I of Young Entrepreneurs for grades 6 to 8.

• Ideation, market research, and target audiences
• Brand identity, mission, and marketing basics
• Founding requirements, business structures, and ethics
• Safe, simulated digital presence strategy

Cap 30. Instructor packet pending from Missy Spears.`,

  essay: `From free writing to full essays with weekly draft feedback.
Lumi Education. Andrew Martineau leads.

• Cap 10 to 14 so every paper gets real notes
• Voice, structure, thesis, and paragraph craft
• Grammar that sticks: active voice and sentence variety
• Fall portfolio review at week 12

Spring analytical writing sold separately.`,

  mathcounts: `Contest math on campus with RSM Ashburn.
MATHCOUNTS and AMC-style rounds for grades 6 to 8.

• Week 1 diagnostic, then number theory through geometry
• Sprint, Target, Team, and Countdown practice
• Weekly problem sets and a Fall mock at week 12
• Not a center membership. Cap 30.

Pre-algebra helps. No contest experience required.`,

  robotics: `Teams of 3. Robot and laptop included. Nothing to buy or bring.
Loudoun Robotics at Stone Hill.

• Four adults every night, including an LCPS-sub lead
• SPIKE Prime kits and vendor laptops
• Engineering notebook students keep
• Fall family showcase at week 12

Cap 30. Spring continues Blocks to Python.`,
}

const FALL: Record<string, ProgramLandingCopy> = {
  ye: {
    eyebrow: 'Fall 2026 · Business',
    pitch:
      'Turn a business idea into a brand and a founding plan.\nHands-on Young Entrepreneurs nights in the library.',
    highlights: [
      'Missy Spears, Academies of Loudoun (packet update coming soon).',
      'Ideation, branding, founding basics, and safe digital practice.',
      'Twelve Tuesday nights. Cap 30. Grades 6 to 8.',
    ],
    curriculumTitle: 'Fall curriculum (RFP Part I placeholder)',
    curriculum: [
      { week: 1, title: 'Ideation & opportunity spotting' },
      { week: 2, title: 'Market research basics' },
      { week: 3, title: 'Target audiences' },
      { week: 4, title: 'Business structures & founding' },
      { week: 5, title: 'Ethics & responsibility' },
      { week: 6, title: 'Brand identity' },
      { week: 7, title: 'Mission & messaging' },
      { week: 8, title: 'Marketing basics' },
      { week: 9, title: 'Safe, simulated digital presence' },
      { week: 10, title: 'Pitch foundations' },
      { week: 11, title: 'Practice presentations' },
      { week: 12, title: 'Fall wrap & showcase prep' },
    ],
  },
  essay: {
    eyebrow: 'Fall 2026 · Academic',
    pitch:
      'From paragraphs to real essays.\nWeekly comments on every draft.',
    highlights: [
      'Andrew Martineau of Lumi Education (NOVA; 30+ years teaching writing).',
      'Cap 10 to 14 so feedback stays personal.',
      'Twelve Tuesday nights. One hour each.',
    ],
    curriculumTitle: 'Fall curriculum (Lumi proposal)',
    curriculum: [
      { week: 1, title: 'Free writing & overcoming writer’s block' },
      { week: 2, title: 'Descriptive & sensory writing' },
      { week: 3, title: 'Mechanics & grammar foundations' },
      { week: 4, title: 'Narrative writing & personal voice' },
      { week: 5, title: 'Outlining & graphic organizers' },
      { week: 6, title: 'Prompt analysis & brainstorming' },
      { week: 7, title: 'Thesis statements & main claims' },
      { week: 8, title: 'Topic sentences & paragraph structure' },
      { week: 9, title: 'Building body paragraphs' },
      { week: 10, title: 'Introduction & conclusion strategies' },
      { week: 11, title: 'Editing & self-proofreading' },
      { week: 12, title: 'Fall portfolio review & feedback' },
    ],
  },
  mathcounts: {
    eyebrow: 'Fall 2026 · Competition',
    pitch:
      'Contest math on campus.\nBuild toward MATHCOUNTS and AMC-style rounds.',
    highlights: [
      'RSM Ashburn at Stone Hill. Not a center membership.',
      'Sprint, Target, Team, and Countdown practice every arc.',
      'Twelve Wednesday nights. Cap 30.',
    ],
    curriculumTitle: 'Fall curriculum (RSM Ashburn proposal)',
    curriculum: [
      { week: 1, title: 'Diagnostic & competition mindset' },
      { week: 2, title: 'Number theory I' },
      { week: 3, title: 'Number theory II' },
      { week: 4, title: 'Ratios, rates, proportions & percents' },
      { week: 5, title: 'Algebraic expressions & equations' },
      { week: 6, title: 'Advanced word problems' },
      { week: 7, title: 'Sequences & patterns' },
      { week: 8, title: 'Counting principles' },
      { week: 9, title: 'Probability & combinatorics' },
      { week: 10, title: 'Geometry I' },
      { week: 11, title: 'Geometry II' },
      { week: 12, title: 'Fall mock competition & review' },
    ],
  },
  robotics: {
    eyebrow: 'Fall 2026 · STEM',
    pitch:
      'Teams of 3. Robot and laptop included.\nNothing to buy or bring.',
    highlights: [
      'Loudoun Robotics. Four adults every night, including an LCPS-sub lead.',
      'SPIKE Prime kits and vendor laptops. Engineering notebook you keep.',
      'Twelve Wednesday nights. Fall showcase at week 12.',
    ],
    curriculumTitle: 'Fall curriculum (Loudoun Robotics proposal)',
    curriculum: [
      { week: 1, title: 'Hardware assembly', focus: 'Kit orientation and driving base' },
      { week: 2, title: 'Structural integrity', focus: 'Bracing and load paths' },
      { week: 3, title: 'Gear ratios', focus: 'Speed vs pulling power' },
      { week: 4, title: 'Programming motors', focus: 'Sequence and exact distance' },
      { week: 5, title: 'Programming loops', focus: 'Repeatable paths and turns' },
      { week: 6, title: 'Force / touch sensors', focus: 'Stop on contact' },
      { week: 7, title: 'Color / light sensors', focus: 'Line detection' },
      { week: 8, title: 'Distance sensors', focus: 'Stop before an obstacle' },
      { week: 9, title: 'Logic pathways', focus: 'If/else with two sensors' },
      { week: 10, title: 'Driver vs autonomous', focus: 'Remote then pre-programmed' },
      { week: 11, title: 'Team design challenge', focus: 'Simple attachment on a mat task' },
      { week: 12, title: 'Troubleshooting & Fall showcase', focus: 'Final runs for families' },
    ],
  },
}

export function programLandingCopy(epId: string | undefined): ProgramLandingCopy | null {
  if (!epId) return null
  return FALL[epId] ?? null
}

export function fallCatalogDescription(epId: string | undefined): string | null {
  if (!epId) return null
  return FALL_2026_CATALOG_DESCRIPTIONS[epId] ?? null
}
