import Image from 'next/image'

type BrowserFrameProps = {
  src: string
  alt: string
  priority?: boolean
  className?: string
  large?: boolean
  hostLabel?: string
}

export function BrowserFrame({
  src,
  alt,
  priority = false,
  className = '',
  large = false,
  hostLabel = 'demo.onpavilion.com',
}: BrowserFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-zinc-300" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-zinc-300" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-zinc-300" aria-hidden />
        <span className="ml-2 flex-1 truncate rounded-full bg-white px-2.5 py-0.5 text-[10px] text-zinc-500 ring-1 ring-zinc-200">
          {hostLabel}
        </span>
      </div>
      <div className={`relative w-full bg-white ${large ? 'aspect-[16/11]' : 'aspect-[16/10]'}`}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 760px"
          className="object-cover object-top"
        />
      </div>
    </div>
  )
}
