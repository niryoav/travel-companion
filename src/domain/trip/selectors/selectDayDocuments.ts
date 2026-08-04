import type {
  DocumentReference,
  TripData,
  TripEvent,
} from '../tripTypes.js'

export function selectDayDocuments(
  data: TripData,
  events: TripEvent[],
): DocumentReference[] {
  const referenceIds = new Set(
    events.flatMap(({ documentReferenceIds = [] }) => documentReferenceIds),
  )

  return data.documentReferences.filter(({ id }) => referenceIds.has(id))
}
