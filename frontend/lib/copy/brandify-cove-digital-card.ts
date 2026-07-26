/**
 * Canonical product name: **Cove Digital Card**.
 * Normalizes CMS / legacy shorthand so visitors never see "Cove card",
 * "store card", or bare "family card" for this product.
 *
 * Leaves payment language alone (credit card, debit card, saved card, etc.).
 */
export function brandifyCoveDigitalCard(input: string): string {
  if (typeof input !== 'string' || !input) return input
  let s = input

  const protectedChunks: string[] = []
  const protect = (re: RegExp) => {
    s = s.replace(re, (m) => {
      protectedChunks.push(m)
      return `«C${protectedChunks.length - 1}»`
    })
  }

  // Payment / verb phrases that must not become the product name
  protect(/\bcredit\s+cards?\b/gi)
  protect(/\bdebit\s+cards?\b/gi)
  protect(/\bpayment\s+cards?\b/gi)
  protect(/\bsaved\s+cards?\b/gi)
  protect(/\bpay\s+with\s+(?:a\s+)?card\b/gi)
  protect(/\bcould not store card\b/gi)
  protect(/\bstore card amounts?\b/gi)

  // Already-correct full name — protect so we don't double-rewrite
  protect(/\bCove Digital Cards?\b/g)

  s = s
    .replace(/\bfamily digital cards\b/gi, 'Cove Digital Cards')
    .replace(/\bfamily digital card\b/gi, 'Cove Digital Card')
    .replace(/\bstudent store cards\b/gi, 'Cove Digital Cards')
    .replace(/\bstudent store card\b/gi, 'Cove Digital Card')
    .replace(/\bprepaid (?:student )?store cards\b/gi, 'Cove Digital Cards')
    .replace(/\bprepaid (?:student )?store card\b/gi, 'Cove Digital Card')
    .replace(/\bLoad the Store Card\b/gi, 'Load the Cove Digital Card')
    .replace(/\bLoad (?:a |the )?Store Card\b/gi, 'Load a Cove Digital Card')
    .replace(/\bstore cards\b/gi, 'Cove Digital Cards')
    .replace(/\bstore card\b/gi, 'Cove Digital Card')
    .replace(/\bfamily Cove cards\b/gi, 'Cove Digital Cards')
    .replace(/\bfamily Cove card\b/gi, 'Cove Digital Card')
    .replace(/\bfamily cards\b/gi, 'Cove Digital Cards')
    .replace(/\bfamily card\b/gi, 'Cove Digital Card')
    .replace(/\bCove cards\b/gi, 'Cove Digital Cards')
    .replace(/\bCove card\b/gi, 'Cove Digital Card')
    .replace(/\bthe digital card\b/gi, 'the Cove Digital Card')
    .replace(/\ba digital card\b/gi, 'a Cove Digital Card')
    .replace(/\bdigital card (credit|balance|code|reloads?)\b/gi, 'Cove Digital Card $1')
    .replace(/\bLoad digital card\b/gi, 'Load Cove Digital Card')
    .replace(/\bCove Digital Card Digital Card\b/g, 'Cove Digital Card')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return s.replace(/«C(\d+)»/g, (_, i) => protectedChunks[Number(i)] ?? '')
}
