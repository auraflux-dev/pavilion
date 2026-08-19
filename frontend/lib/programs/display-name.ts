/** Drop season year from catalog titles when the page already says Fall 2026. */
export function displayProgramName(name: string) {
  return name.replace(/\s*\((Fall|Spring|Winter|Summer)\s+20\d{2}\)\s*$/i, '').trim()
}
