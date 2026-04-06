export const TZ = 'America/Detroit'

/**
 * Convert a local date + time-of-day string to a UTC ISO string.
 * e.g. localToUTC('2026-04-06', '09:30:00') → UTC ISO for 9:30 AM EDT
 */
export function localToUTC(dateStr: string, time: string): string {
  const naive = new Date(`${dateStr}T${time}`)
  const utc = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' }))
  const local = new Date(naive.toLocaleString('en-US', { timeZone: TZ }))
  const offsetMs = utc.getTime() - local.getTime()
  return new Date(naive.getTime() + offsetMs).toISOString()
}

/** Start of day in local TZ as UTC ISO string */
export function dayStartUTC(dateStr: string): string {
  return localToUTC(dateStr, '00:00:00')
}

/** End of day in local TZ as UTC ISO string */
export function dayEndUTC(dateStr: string): string {
  return localToUTC(dateStr, '23:59:59')
}

/** Convert a UTC ISO string to a local date string (YYYY-MM-DD) in America/Detroit */
export function utcToLocalDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Convert a UTC ISO string to a local time string (e.g. "9:30 AM") in America/Detroit */
export function utcToLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Get hours and minutes from a UTC ISO string in America/Detroit timezone */
export function utcToLocalHoursMinutes(iso: string): { hours: number; minutes: number } {
  const parts = new Date(iso).toLocaleTimeString('en-US', {
    timeZone: TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).split(':')
  return { hours: parseInt(parts[0], 10), minutes: parseInt(parts[1], 10) }
}
