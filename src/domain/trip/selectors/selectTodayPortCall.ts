import type { PortCall, TripData, TripDay } from '../tripTypes'

export function selectTodayPortCall(
  data: TripData,
  day: TripDay | null,
): PortCall | null {
  if (!day?.portCallId) {
    return null
  }

  return (
    data.portCalls.find(({ id }) => id === day.portCallId) ?? null
  )
}

