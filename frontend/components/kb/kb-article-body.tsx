import type { ReactNode } from 'react'

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <strong key={`b-${key++}`} className="font-semibold text-[#1A1A1A]">
        {m[1]}
      </strong>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/** Lightweight article body renderer (no markdown dependency). */
export function KbArticleBody({ body }: { body: string }) {
  const lines = body.replace(/\r\n/g, '\n').trim().split('\n')
  const blocks: ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  const flushList = () => {
    if (!listItems.length) return
    blocks.push(
      <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1.5 text-sm text-[#5A6070] leading-relaxed">
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    )
    listItems = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      continue
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2))
      continue
    }

    flushList()

    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h3 key={`h-${key++}`} className="text-sm font-bold text-[#1A1A1A] pt-2">
          {trimmed.slice(3)}
        </h3>,
      )
      continue
    }

    blocks.push(
      <p key={`p-${key++}`} className="text-sm text-[#5A6070] leading-relaxed">
        {renderInline(trimmed)}
      </p>,
    )
  }
  flushList()

  return <div className="space-y-3">{blocks}</div>
}
