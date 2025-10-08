/**
 * Timezone Utilities
 *
 * Centralized timezone handling for the application.
 * All date operations should use Central Time (America/Chicago) for consistency.
 *
 * WHY CENTRAL TIME?
 * - Dashboard already uses Central Time for displaying "today's" check-ins
 * - Prevents timezone mismatches between check-in creation and querying
 * - Consistent user experience across the application
 *
 * IMPORTANT: Do NOT use `new Date().toISOString().split('T')[0]` directly
 * for check-in dates. Always use getCentralTimeToday() instead.
 */

/**
 * Get today's date in Central Time Zone (America/Chicago)
 *
 * This ensures consistent date handling across the application.
 * Use this for:
 * - Setting checkin_date when creating check-ins
 * - Querying for "today's" check-ins
 * - Any date comparison logic
 *
 * @returns Date string in YYYY-MM-DD format (Central Time)
 *
 * @example
 * const today = getCentralTimeToday();
 * // Returns: "2025-10-06" (when it's Oct 6 in Central, even if Oct 7 in UTC)
 */
export function getCentralTimeToday(): string {
  const now = new Date();

  // Get date components in Central Time using Intl.DateTimeFormat
  // This avoids the bug where toLocaleString + new Date + toISOString causes timezone shifts
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Get current timestamp in Central Time Zone
 *
 * @returns ISO timestamp string in Central Time
 *
 * @example
 * const now = getCentralTimeNow();
 * // Returns: "10/6/2025, 10:30:45 PM"
 */
export function getCentralTimeNow(): string {
  const now = new Date();
  return now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
}

/**
 * Convert a UTC date to Central Time date
 *
 * @param utcDate - Date object or ISO string in UTC
 * @returns Date string in YYYY-MM-DD format (Central Time)
 *
 * @example
 * const centralDate = convertUTCToCentralDate(new Date('2025-10-07T00:30:00Z'));
 * // Returns: "2025-10-06" (7:30 PM Oct 6 in Central)
 */
export function convertUTCToCentralDate(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  // Get date components in Central Time using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Check if a given date string matches today in Central Time
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns true if the date is today in Central Time
 *
 * @example
 * const isToday = isTodayCentral('2025-10-06');
 * // Returns: true (if it's Oct 6 in Central Time)
 */
export function isTodayCentral(dateString: string): boolean {
  return dateString === getCentralTimeToday();
}



/**
 * Get the Central Time date string for N days ago (including today as N=0)
 * Returns YYYY-MM-DD in America/Chicago
 */
export function getCentralDateNDaysAgo(n: number): string {
  const now = new Date();

  // Calculate N days ago in milliseconds
  const nDaysAgoMs = now.getTime() - (n * 24 * 60 * 60 * 1000);
  const nDaysAgo = new Date(nDaysAgoMs);

  // Get date components in Central Time using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(nDaysAgo);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}
