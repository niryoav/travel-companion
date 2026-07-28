import { calendarDateInTimeZone, formatLocalTime } from './tripTime'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function partsInTimeZone(instant: Date, timeZone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZone,
    })
      .formatToParts(instant)
      .map(({ type, value }) => [type, value]),
  )
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

export function instantFromLocalTime(
  localDate: string,
  time: string,
  timeZone: string,
): string | null {
  const timeMatch = TIME_PATTERN.exec(time)
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate)
  if (!timeMatch || !dateMatch) {
    return null
  }

  const target = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
  }
  const targetAsUtc = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
  )
  let candidate = targetAsUtc

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const local = partsInTimeZone(new Date(candidate), timeZone)
    const representedAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    )
    candidate = targetAsUtc - (representedAsUtc - candidate)
  }

  const instant = new Date(candidate)
  if (
    calendarDateInTimeZone(instant, timeZone) !== localDate ||
    formatLocalTime(instant.toISOString(), timeZone) !== time
  ) {
    return null
  }
  return instant.toISOString()
}

export function timeInputValue(
  instant: string | undefined,
  timeZone: string,
): string {
  return instant ? formatLocalTime(instant, timeZone) : ''
}
