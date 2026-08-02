import type { TripData, TripDay } from '../tripTypes.js'
import { selectTripDays } from './selectTripDays.js'

export interface VoyageProgressViewModel {
  dayNumber: number
  totalDays: number
  imagePath: string
  currentPort: string
  nextPort?: string
}

export function voyageProgressImagePath(dayNumber: number): string {
  return `/images/voyage-progress/voyage-day-${String(dayNumber).padStart(2, '0')}.png`
}

export function listVoyageProgressImagePaths(data: TripData): string[] {
  return selectTripDays(data).map((_, index) =>
    voyageProgressImagePath(index + 1),
  )
}

export function selectVoyageProgress(
  data: TripData,
  today: TripDay,
): VoyageProgressViewModel | null {
  const days = selectTripDays(data)
  const index = days.findIndex(({ id }) => id === today.id)
  if (index === -1) {
    return null
  }

  const dayNumber = index + 1
  const nextDay = days[index + 1]

  return {
    dayNumber,
    totalDays: days.length,
    imagePath: voyageProgressImagePath(dayNumber),
    currentPort: today.title,
    nextPort: nextDay?.title,
  }
}
