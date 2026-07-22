/**
 * Soft photo wash for cream / white section dead space.
 * Real campus imagery, faded and masked — not pattern ribbons.
 */
export function BrandImageWash({
  src,
  side = 'right',
  className = '',
}: {
  src: string
  side?: 'left' | 'right'
  className?: string
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-y-0 ${
        side === 'right' ? 'right-0' : 'left-0'
      } w-[42%] max-w-lg hidden md:block ${className}`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover opacity-[0.14]"
        style={{
          maskImage:
            side === 'right'
              ? 'linear-gradient(to left, black 10%, transparent 92%)'
              : 'linear-gradient(to right, black 10%, transparent 92%)',
          WebkitMaskImage:
            side === 'right'
              ? 'linear-gradient(to left, black 10%, transparent 92%)'
              : 'linear-gradient(to right, black 10%, transparent 92%)',
        }}
      />
    </div>
  )
}
