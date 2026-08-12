/** Best Runners partnership — school code bridge for parents. */
export const RUN_FOR_CHARITY_SCHOOL_CODE = 'SHMS'

/** Our on-site bridge (copy code → continue to Best Runners). */
export const RUN_FOR_CHARITY_BRIDGE_PATH = '/run-for-charity'

export const RUN_FOR_CHARITY_BRIDGE_URL = 'https://www.shmspto.org/run-for-charity'

/**
 * Best Runners signup. Their form does not read school codes from query params
 * (schoolReferralCode defaults to empty). We still append the param in case they
 * add support later; the bridge page is what makes the code hard to miss.
 */
export const BEST_RUNNERS_SIGNUP_URL =
  'https://www.bestrunners.org/register/signup?schoolReferralCode=SHMS'
