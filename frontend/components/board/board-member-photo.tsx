import Image from 'next/image'
import { BOARD_PHOTO_SIZE_PX } from '@/lib/board-photo'

export function BoardMemberPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-full aspect-square overflow-hidden bg-[var(--brand-soft)]">
      <Image
        src={src}
        alt={alt}
        width={BOARD_PHOTO_SIZE_PX}
        height={BOARD_PHOTO_SIZE_PX}
        className="h-full w-full object-cover object-center"
      />
    </div>
  )
}
