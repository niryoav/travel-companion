import type {
  Cruise,
  PortCall,
  TripData,
  TripDay,
} from '../tripTypes'

export interface CruiseContext {
  cruise: Cruise
  day: number
  totalDays: number
  daysRemaining: number
  portCall: PortCall | null
}

export function selectCruiseContext(
  data: TripData,
  today: TripDay | null,
): CruiseContext | null {
  if (!today || !data.trip.cruiseId) {
    return null
  }

  const cruise = data.cruises.find(({ id }) => id === data.trip.cruiseId)
  if (!cruise) {
    return null
  }

  const cruiseDays = data.days.filter(
    ({ localDate }) =>
      localDate >= cruise.embarkationDate &&
      localDate <= cruise.disembarkationDate,
  )
  const dayIndex = cruiseDays.findIndex(({ id }) => id === today.id)
  if (dayIndex < 0) {
    return null
  }

  return {
    cruise,
    day: dayIndex + 1,
    totalDays: cruiseDays.length,
    daysRemaining: cruiseDays.length - dayIndex - 1,
    portCall:
      data.portCalls.find(({ id }) => id === today.portCallId) ?? null,
  }
}
