import type { TripData, TripDay } from '../tripTypes'

export function selectToday(
  data: TripData,
  now = new Date(),
): TripDay | null {
  const instant = now.getTime()

  return (
    data.days.find(
      (day) =>
        Date.parse(day.startsAt) <= instant &&
        instant < Date.parse(day.endsAt),
    ) ?? null
  )
}
