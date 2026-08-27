/**
 * Enrichment list tuition. Prefer Wix Stores catalog when Programs.productId is set
 * (same pattern as MembershipTiers → catalog). CMS fee is the fallback / mirror.
 */
export { resolveProgramListFee } from '@/lib/staff/program-catalog-product'
