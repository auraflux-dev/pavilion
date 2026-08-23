#!/usr/bin/env npx tsx
/**
 * Export curriculum-only markdown files for email attachments.
 *
 *   cd frontend && npx tsx scripts/programs/export-curriculum-docs.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { curriculumShareEntries } from '@/lib/programs/curriculum-share'
import { programLandingCopy } from '@/lib/programs/landing-copy'

const outDir = resolve(
  process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : join(process.cwd(), '..', 'docs', 'programs', 'curriculum'),
)

mkdirSync(outDir, { recursive: true })

for (const entry of curriculumShareEntries()) {
  const copy = programLandingCopy(entry.epId, entry.season)
  if (!copy?.curriculum.length) continue

  const lines = [
    `# ${entry.programName}`,
    '',
    `${entry.seasonLabel} enrichment curriculum`,
    `${entry.vendor} · ${entry.dayOfWeek} ${entry.classTime}`,
    '',
    `## ${copy.curriculumTitle}`,
    '',
  ]

  for (const row of copy.curriculum) {
    lines.push(`**Week ${row.week}: ${row.title}**`)
    if (row.focus) lines.push(row.focus)
    lines.push('')
  }

  lines.push('---')
  lines.push('Stone Hill Middle School PTO · www.shmspto.org')

  const filename = `${entry.season}-${entry.slug}.md`
  writeFileSync(join(outDir, filename), lines.join('\n'), 'utf8')
  console.log(`Wrote ${filename}`)
}

console.log(`\nDone. Files in ${outDir}`)
