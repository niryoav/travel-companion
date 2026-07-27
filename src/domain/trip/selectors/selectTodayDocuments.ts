import type {
  DocumentReference,
  TripData,
  TripEvent,
} from '../tripTypes'
import { selectDayDocuments } from './selectDayDocuments'

export function selectTodayDocuments(
  data: TripData,
  events: TripEvent[],
): DocumentReference[] {
  return selectDayDocuments(data, events)
}
