import type { TripData } from '../tripTypes'
import { classifyTripDayState } from './classifyTripDayState'
import { selectTripDays } from './selectTripDays'

export interface TripProgress {
  state: 'PRE_TRIP' | 'ACTIVE' | 'COMPLETED'
  completedDays: number
  totalDays: number
  currentDayNumber?: number
  percentage: number
}

export function selectTripProgress(
  data: TripData,
  now = new Date(),
): TripProgress {
  const days = selectTripDays(data)
  const states = days.map((day) => classifyTripDayState(day, now))
  const completedDays = states.filter((state) => state === 'PAST').length
  const currentDayIndex = states.findIndex((state) => state === 'TODAY')
  const totalDays = days.length
  const percentage =
    totalDays === 0 ? 0 : Math.round((completedDays / totalDays) * 100)

  if (currentDayIndex >= 0) {
    return {
      state: 'ACTIVE',
      completedDays,
      totalDays,
      currentDayNumber: currentDayIndex + 1,
      percentage,
    }
  }

  if (totalDays > 0 && completedDays === totalDays) {
    return {
      state: 'COMPLETED',
      completedDays,
      totalDays,
      percentage: 100,
    }
  }

  return {
    state: 'PRE_TRIP',
    completedDays: 0,
    totalDays,
    percentage: 0,
  }
}
