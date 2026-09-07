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
  hostLabel = 'riversidepto.demo.onpavilion.com',
}: BrowserFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[#1a433a] bg-[#0d1e1a] shadow-[0_20px_50px_-20px_rgba(8,23,20,0.65)] ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-[#1a433a] bg-[#122821] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#3a5a52]" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-[#3a5a52]" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-[#3a5a52]" aria-hidden />
        <span className="ml-2 flex-1 truncate rounded-full bg-[#0d1e1a] px-2.5 py-0.5 text-[10px] text-[#9bb0a8]">
          {hostLabel}
        </span>
      </div>
      <div className={`relative w-full bg-[#0d1e1a] ${large ? 'aspect-[16/11]' : 'aspect-[16/10]'}`}>
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
