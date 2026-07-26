import Image from 'next/image'

/**
 * The Cove brand mark. transparent PNGs in /public/brand/.
 *
 * Use cases:
 * - Web UI: `sm` / `md` / `lg`
 * - WhatsApp group: upload `cove-logo-640.png` or `cove-logo-512.png`
 * - Video overlays: `cove-logo-1080.png` (or master)
 */
export const COVE_LOGO = {
 /** Trimmed transparent master (variable aspect). web / video overlays */
  master: '/brand/cove-logo-master.png',
  /** Default web square (transparent) */
  default: '/brand/cove-logo.png',
  /**
 * WhatsApp group image. opaque cream JPEG (circle-safe, simplified).
   * Do NOT use transparent PNGs for WhatsApp; they often look black/muddy.
   */
  whatsapp: '/brand/cove-logo-whatsapp.jpg',
  whatsappPng: '/brand/cove-logo-whatsapp.png',
  whatsappAlt: '/brand/cove-logo-whatsapp-512.jpg',
  /** Video / large overlay (transparent) */
  video: '/brand/cove-logo-1080.png',
  /** Portal / compact UI (transparent) */
  ui: '/brand/cove-logo-256.png',
  uiSm: '/brand/cove-logo-128.png',
} as const

export type CoveLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_PX: Record<CoveLogoSize, number> = {
  xs: 48,
  sm: 72,
  md: 112,
  lg: 160,
  xl: 220,
}

const SIZE_SRC: Record<CoveLogoSize, string> = {
  xs: COVE_LOGO.uiSm,
  sm: COVE_LOGO.ui,
  md: COVE_LOGO.default,
  lg: COVE_LOGO.whatsapp,
  xl: COVE_LOGO.video,
}

type Props = {
  size?: CoveLogoSize
  className?: string
  priority?: boolean
}

export function CoveLogo({ size = 'md', className = '', priority = false }: Props) {
  const px = SIZE_PX[size]
  return (
    <Image
      src={SIZE_SRC[size]}
 alt="The Cove. SHMS PTO"
      width={px}
      height={px}
      priority={priority}
      className={`object-contain ${className}`}
    />
  )
}
