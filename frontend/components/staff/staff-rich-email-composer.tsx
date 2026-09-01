'use client'

/**
 * Staff rich email body: toolbar + contentEditable.
 * Emits sanitized HTML for branded sends; plain text derived for portal/WhatsApp.
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Bold, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Underline } from 'lucide-react'
import { sanitizeEmailHtml } from '@/lib/staff/email-html'

type Props = {
  html: string
  onChange: (html: string) => void
  placeholder?: string
  minHeightClass?: string
}

function runCommand(command: string, value?: string) {
  try {
    document.execCommand(command, false, value)
  } catch {
    // Older browsers / restricted contexts
  }
}

export function StaffRichEmailComposer({
  html,
  onChange,
  placeholder = 'Write your email… Use the toolbar for bold, lists, and links.',
  minHeightClass = 'min-h-[180px]',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(html)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (html === lastEmitted.current) return
    if (el.innerHTML === html) return
    el.innerHTML = html || ''
  }, [html])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const next = sanitizeEmailHtml(el.innerHTML)
    lastEmitted.current = next
    onChange(next)
  }, [onChange])

  const wrap = (command: string, value?: string) => {
    ref.current?.focus()
    runCommand(command, value)
    emit()
  }

  const addLink = () => {
    const url = window.prompt('Link URL (https://…)', 'https://')
    if (!url?.trim()) return
    wrap('createLink', url.trim())
  }

  return (
    <div className="rounded-lg border border-[var(--border)] overflow-hidden bg-white">
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)] bg-[#FAFCF9] px-2 py-1.5">
        <ToolbarBtn label="Bold" onClick={() => wrap('bold')}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Italic" onClick={() => wrap('italic')}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Underline" onClick={() => wrap('underline')}>
          <Underline className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Heading" onClick={() => wrap('formatBlock', 'h2')}>
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Bullet list" onClick={() => wrap('insertUnorderedList')}>
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Numbered list" onClick={() => wrap('insertOrderedList')}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Insert link" onClick={addLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline
        aria-label="Email body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        className={`${minHeightClass} px-3 py-2 text-sm text-[#1A1A1A] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#9AA0A6] [&_a]:text-[var(--brand-green)] [&_a]:underline [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5`}
      />
    </div>
  )
}

function ToolbarBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md border border-transparent hover:border-[var(--border)] hover:bg-white px-2 py-1 text-[#5A6070]"
    >
      {children}
    </button>
  )
}
