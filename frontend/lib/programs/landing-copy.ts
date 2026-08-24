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
  /** Optional YouTube embed or uploaded MP4 URL (Wix Media). */
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

  mathcounts: `Contest math on campus with Janet Bih.
MATHCOUNTS and AMC-style rounds for grades 6 to 8.

• Week 1 diagnostic, then number theory through geometry
• Sprint, Target, Team, and Countdown practice
• Weekly problem sets and a Fall mock at week 12
• Cap 10 to 30.

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
      'Janet Bih at Stone Hill. Contest prep for grades 6 to 8.',
      'Sprint, Target, Team, and Countdown practice every arc.',
      'Twelve Thursday nights. Cap 10 to 30.',
    ],
    curriculumTitle: 'Fall curriculum. Foundations & speed mechanics',
    curriculum: [
      {
        week: 1,
        title: 'Diagnostic & speed mindset',
        focus: 'Baseline assessment, mental estimation, working backward, answer checking.',
      },
      {
        week: 2,
        title: 'Number theory: factors & divisibility',
        focus: 'Prime factorization, GCF/LCM shortcuts, divisor counting, digit sums.',
      },
      {
        week: 3,
        title: 'Number theory: modular arithmetic',
        focus: 'Remainders, units digits, clock arithmetic, repeating cyclical patterns.',
      },
      {
        week: 4,
        title: 'Sprint speed hacks (no calculator)',
        focus: 'Rapid mental math, fraction-decimal conversions, squaring tricks.',
      },
      {
        week: 5,
        title: 'Algebraic expressions & manipulations',
        focus: 'Linear equations, combining like terms, algebraic identities, shortcut evaluation.',
      },
      {
        week: 6,
        title: 'Word problem decomposition',
        focus: 'Rate-time-distance, work problems, proportions, mixtures, age problems.',
      },
      {
        week: 7,
        title: 'Sequences & series',
        focus: 'Arithmetic and geometric sequences, term formulas, series summation tricks.',
      },
      {
        week: 8,
        title: 'Combinatorics & counting',
        focus: 'Permutations, combinations, Venn diagrams, fundamental counting principle.',
      },
      {
        week: 9,
        title: 'Probability & expected value',
        focus: 'Dependent and independent events, geometric probability, probability trees.',
      },
      {
        week: 10,
        title: 'Competition geometry I: angles',
        focus: 'Angle chasing, triangle properties, parallel lines, Pythagorean shortcuts.',
      },
      {
        week: 11,
        title: 'Target round strategy (calculator)',
        focus: 'Multi-step problem decomposition, calculator judgment, time budgeting.',
      },
      {
        week: 12,
        title: 'Mid-year Sprint/Target showcase',
        focus: 'Timed individual assessment, parent-facing scorecard, error analysis.',
      },
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

const SPRING: Record<string, ProgramLandingCopy> = {
  ye: {
    eyebrow: 'Spring 2027 · Business',
    pitch:
      'Young Entrepreneurs II.\nCapital, investor practice, and Stingray Tank pitch night.',
    highlights: [
      'Continues Missy Spears from Fall. Same Tuesday night.',
      'Startup costs, pricing, elevator pitches, and public speaking.',
      'Twelve Tuesday nights. Cap 30. Culminating Stingray Tank.',
    ],
    curriculumTitle: 'Spring curriculum (Part II outline)',
    curriculum: [
      { week: 1, title: 'Fall review & spring goals' },
      { week: 2, title: 'Startup costs & basic financials' },
      { week: 3, title: 'Pricing & value' },
      { week: 4, title: 'Customer discovery refresh' },
      { week: 5, title: 'Investor questions' },
      { week: 6, title: 'Elevator pitch craft' },
      { week: 7, title: 'Public speaking drills' },
      { week: 8, title: 'Pitch deck structure' },
      { week: 9, title: 'Practice rounds' },
      { week: 10, title: 'Stingray Tank rehearsal' },
      { week: 11, title: 'Final polish' },
      { week: 12, title: 'Stingray Tank showcase' },
    ],
  },
  essay: {
    eyebrow: 'Spring 2027 · Academic',
    pitch:
      'Analytical and high-school ready writing.\nEvidence, MLA basics, and persuasive essays.',
    highlights: [
      'Lumi. Andrew Martineau. Cap 10 to 14.',
      'Research habits, comparative essays, and editing.',
      'Twelve Tuesday nights. Continues Fall composition.',
    ],
    curriculumTitle: 'Spring curriculum (Lumi Part II)',
    curriculum: [
      { week: 1, title: 'Fall portfolio warm-up' },
      { week: 2, title: 'Claims with evidence' },
      { week: 3, title: 'MLA basics' },
      { week: 4, title: 'Research notes that stick' },
      { week: 5, title: 'Persuasive essay structure' },
      { week: 6, title: 'Comparative analysis' },
      { week: 7, title: 'Counterarguments' },
      { week: 8, title: 'High-school prompt practice' },
      { week: 9, title: 'Revision loops' },
      { week: 10, title: 'Voice under pressure' },
      { week: 11, title: 'Peer edit clinic' },
      { week: 12, title: 'Spring portfolio review' },
    ],
  },
  mathcounts: {
    eyebrow: 'Spring 2027 · Competition',
    pitch:
      'Competitive Math Part II.\nAdvanced systems, team tactics, and full mocks.',
    highlights: [
      'Same Thursday night with Janet Bih. Cap 10 to 30.',
      'Sprint, Target, Team, and Countdown under time.',
      'Full mock competitions and a Spring showcase.',
    ],
    curriculumTitle: 'Spring curriculum. Advanced systems & scrimmages',
    curriculum: [
      {
        week: 1,
        title: 'Advanced number theory',
        focus: 'Base conversions, multi-concept remainder systems, digit logic.',
      },
      {
        week: 2,
        title: 'Advanced algebra & systems',
        focus: 'Systems of equations, strategic substitutions, quadratic applications.',
      },
      {
        week: 3,
        title: 'Competition geometry II: area',
        focus: 'Circle geometry, similar triangles, coordinate geometry, shadow methods.',
      },
      {
        week: 4,
        title: '3D geometry & spatial reasoning',
        focus: 'Surface area, nets, volume of composite solids, spatial visualization.',
      },
      {
        week: 5,
        title: 'Advanced counting & casework',
        focus: 'Restricted arrangements, complementary counting, pigeonhole principle.',
      },
      {
        week: 6,
        title: 'Unlabeled problem solving',
        focus: 'Identifying hidden math domains in ambiguous competition problems.',
      },
      {
        week: 7,
        title: 'Sprint round simulation',
        focus: 'High-pressure, 40-minute, 30-problem no-calculator timed speed run.',
      },
      {
        week: 8,
        title: 'Target round deep-dive',
        focus: 'Eight complex multi-step problems with full student solution presentations.',
      },
      {
        week: 9,
        title: 'Team round dynamics & tactics',
        focus: 'Workload division, cross-checking protocols, collaborative practice.',
      },
      {
        week: 10,
        title: 'Head-to-head countdown scrimmage',
        focus: 'Rapid-fire, buzzer-style oral speed round under time pressure.',
      },
      {
        week: 11,
        title: 'Full mock competition',
        focus: 'Integrated Sprint, Target, and Team round simulation.',
      },
      {
        week: 12,
        title: 'Final showcase & awards',
        focus: 'Post-assessment growth review, parent presentation, awards.',
      },
    ],
  },
  robotics: {
    eyebrow: 'Spring 2027 · STEM',
    pitch:
      'Blocks to Python and advanced autonomy.\nSame team kit model. Nothing to buy.',
    highlights: [
      'Loudoun Robotics Part II. Teams of 3.',
      'Functions, gyro, line following, and attachments.',
      'Engineering notebook and Spring showcase.',
    ],
    curriculumTitle: 'Spring curriculum (Loudoun Part II)',
    curriculum: [
      { week: 1, title: 'Fall hardware refresh' },
      { week: 2, title: 'Functions in Blocks' },
      { week: 3, title: 'Gyro turns' },
      { week: 4, title: 'Line following' },
      { week: 5, title: 'Python intro on SPIKE' },
      { week: 6, title: 'Sensors in Python' },
      { week: 7, title: 'Attachment design' },
      { week: 8, title: 'Mission course planning' },
      { week: 9, title: 'Notebook standards' },
      { week: 10, title: 'Full mission runs' },
      { week: 11, title: 'Troubleshooting clinic' },
      { week: 12, title: 'Spring family showcase' },
    ],
  },
}

export function programLandingCopy(
  epId: string | undefined,
  season?: 'fall-2026' | 'spring-2027' | string,
): ProgramLandingCopy | null {
  if (!epId) return null
  if (season === 'spring-2027') return SPRING[epId] ?? null
  return FALL[epId] ?? null
}

export function fallCatalogDescription(epId: string | undefined): string | null {
  if (!epId) return null
  return FALL_2026_CATALOG_DESCRIPTIONS[epId] ?? null
}
