const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function calendarDayUtc(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysUntilDeparture(departure: Date, today = new Date()) {
  const difference =
    calendarDayUtc(departure) - calendarDayUtc(today)

  return Math.max(0, Math.round(difference / MILLISECONDS_PER_DAY))
}

export function formatDaysToGo(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'} to go`
}
