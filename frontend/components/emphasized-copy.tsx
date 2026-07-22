import type { ReactNode } from 'react'

/** Bold dollar amounts, percents, counts, and the word free in marketing copy. */
export function EmphasizedCopy({ text, className }: { text: string; className?: string }): ReactNode {
  const parts = text.split(/(\$\d+(?:\.\d+)?|\d+(?:\.\d+)?%|\b\d+\b|\bfree\b)/gi)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^(\$\d+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+)$/.test(part) || /^free$/i.test(part) ? (
          <strong key={i} className="font-bold text-[#085508]">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}
