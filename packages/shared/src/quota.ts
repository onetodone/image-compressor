/** Number of jobs a user may submit per UTC day. */
export const DAILY_JOB_LIMITS = {
  anonymous: 5,
  signedIn: 30,
} as const

/**
 * Returns the daily job limit for a user.
 * @param isAnonymous whether the user signed in anonymously
 */
export function dailyJobLimit(isAnonymous: boolean): number {
  return isAnonymous ? DAILY_JOB_LIMITS.anonymous : DAILY_JOB_LIMITS.signedIn
}

/**
 * Returns the UTC calendar date of `date` as `YYYY-MM-DD`, the key that daily quotas reset on.
 * @param date point in time to convert
 */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Returns how many jobs a user has already used today, treating a counter from an earlier day as zero.
 * @param stored the day key and counter saved for the user, or `undefined` if none exists yet
 * @param now current time
 */
export function jobsUsedToday(stored: { dayKey: string; jobsToday: number } | undefined, now: Date): number {
  return stored?.dayKey === utcDayKey(now) ? stored.jobsToday : 0
}
