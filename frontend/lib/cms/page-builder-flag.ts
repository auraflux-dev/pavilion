/**
 * Pavilion CMS page builder (section composer + brand controls).
 * Demo / platform trials only. Never on SHMS production builds.
 */
import {
  isPavilionProductPlatform,
  isPavilionProductPlatformPublic,
} from '@/lib/crm/platform-env'
import { isDemoInstance, isPublicDemoInstance } from '@/lib/demo/instance'

/** Server: true on commons-pto-demo and Pavilion product platform only. */
export function cmsPageBuilderEnabled(): boolean {
  return isDemoInstance() || isPavilionProductPlatform()
}

/** Client-safe: NEXT_PUBLIC_DEMO_INSTANCE or platform public flag. */
export function cmsPageBuilderEnabledPublic(): boolean {
  return isPublicDemoInstance() || isPavilionProductPlatformPublic()
}
