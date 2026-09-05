import Image from 'next/image'

type BrowserFrameProps = {
  src: string
  alt: string
  priority?: boolean
  className?: string
  float?: boolean
}

export function BrowserFrame({
  src,
  alt,
  priority = false,
  className = '',
  float = false,
}: BrowserFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--paper)] shadow-[0_24px_60px_-28px_rgba(18,35,31,0.55)] ${
        float ? 'motion-float' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--line)] bg-[var(--paper-deep)] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[var(--line)]" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-[var(--line)]" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-[var(--line)]" aria-hidden />
        <span className="ml-2 flex-1 truncate rounded bg-[var(--paper)] px-2 py-0.5 text-[10px] text-[var(--ink-muted)]">
          demo.onpavilion.com
        </span>
      </div>
      <div className="relative aspect-[16/10] w-full bg-[var(--paper-deep)]">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover object-top"
        />
      </div>
    </div>
  )
}
