import { selectDayDocuments } from './selectDayDocuments'
import type {
  DocumentReference,
  TripData,
  TripDay,
  TripEvent,
} from '../tripTypes'

export function selectTripDayDocuments(
  data: TripData,
  day: TripDay,
  events: TripEvent[],
): DocumentReference[] {
  const linkedIds = new Set(
    selectDayDocuments(data, events).map(({ id }) => id),
  )

  return data.documentReferences.filter(
    ({ id, dayId }) => dayId === day.id || linkedIds.has(id),
  )
}
