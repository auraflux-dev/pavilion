/** Best Runners partnership — school code bridge for parents. */
export const RUN_FOR_CHARITY_SCHOOL_CODE = 'SHMS'

/** Our on-site bridge (copy code → continue to Best Runners). */
export const RUN_FOR_CHARITY_BRIDGE_PATH = '/run-for-charity'

/** Same destination as the bridge; homepage promo imports this name. */
export const RUN_FOR_CHARITY_REGISTER_PATH = RUN_FOR_CHARITY_BRIDGE_PATH

export const RUN_FOR_CHARITY_BRIDGE_URL = 'https://www.shmspto.org/run-for-charity'

/**
 * Best Runners race page (cold-load safe).
 * Direct /register/signup hard-loads blank on their SPA; /run4charity works, and
 * parents tap Register Now there (client nav) to reach the form. School code is
 * not accepted via URL — paste SHMS in School / Referral Code on the form.
 */
export const BEST_RUNNERS_SIGNUP_URL = 'https://www.bestrunners.org/run4charity'
