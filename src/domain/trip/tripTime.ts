export function isValidInstant(value: string): boolean {
  return Number.isFinite(Date.parse(value))
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
