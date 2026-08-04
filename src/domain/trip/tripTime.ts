export function isValidInstant(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

/**
 * Pure calendar-date arithmetic on a 'YYYY-MM-DD' string — no timezone or
 * clock time involved. Returns null for a malformed input rather than an
 * Invalid Date, so callers can fail safe.
 */
export function addCalendarDays(localDate: string, days: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate)
  if (!match) {
    return null
  }
  const utcDate = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  )
  utcDate.setUTCDate(utcDate.getUTCDate() + days)
  return utcDate.toISOString().slice(0, 10)
}

export function isSupportedTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function formatLocalTime(
  instant: string,
  timeZone: string,
  locale = 'en-GB',
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(instant))
}

export function formatLocalDate(
  instant: string,
  timeZone: string,
  locale = 'en-GB',
): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(instant))
}

export function formatCalendarDate(
  localDate: string,
  locale = 'en-GB',
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${localDate}T12:00:00Z`))
}

export function formatDateRange(
  startDate: string,
  endDate: string,
  locale = 'en-GB',
): string {
  const start = new Date(`${startDate}T12:00:00Z`)
  const end = new Date(`${endDate}T12:00:00Z`)
  const startLabel = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(start)
  const endLabel = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(end)
  return `${startLabel} – ${endLabel}`
}

export function calendarDateInTimeZone(
  instant: Date,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).formatToParts(instant)
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  )

  return `${values.year}-${values.month}-${values.day}`
}

export function hourInTimeZone(instant: Date | string, timeZone: string): number {
  const date = instant instanceof Date ? instant : new Date(instant)
  const hour = new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone,
  })
    .formatToParts(date)
    .find(({ type }) => type === 'hour')?.value

  return Number(hour)
}

export function minuteInTimeZone(
  instant: Date | string,
  timeZone: string,
): number {
  const date = instant instanceof Date ? instant : new Date(instant)
  const minute = new Intl.DateTimeFormat('en', {
    minute: '2-digit',
    timeZone,
  })
    .formatToParts(date)
    .find(({ type }) => type === 'minute')?.value

  return Number(minute)
}

/**
 * True when `instant` falls at or after `hour:minute` local time in
 * `timeZone`, on whatever calendar day it happens to be. Used to gate
 * evening-only features (e.g. "Prepare for tomorrow") on the active trip
 * day's own local clock rather than the device's timezone.
 */
export function isAtOrAfterLocalTime(
  instant: Date,
  timeZone: string,
  hour: number,
  minute = 0,
): boolean {
  const currentHour = hourInTimeZone(instant, timeZone)
  const currentMinute = minuteInTimeZone(instant, timeZone)
  return (
    currentHour > hour || (currentHour === hour && currentMinute >= minute)
  )
}
