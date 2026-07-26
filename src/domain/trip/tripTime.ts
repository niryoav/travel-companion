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
