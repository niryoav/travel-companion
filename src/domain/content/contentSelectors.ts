import type {
  DestinationGuide,
  ExcursionGuide,
  TripContentBundle,
} from './contentTypes'

export function selectDestinationGuide(
  content: TripContentBundle,
  locationId: string | undefined,
): DestinationGuide | null {
  if (!locationId) {
    return null
  }

  return (
    content.destinationGuides.find(
      (guide) => guide.locationId === locationId,
    ) ?? null
  )
}

export function selectExcursionGuide(
  content: TripContentBundle,
  eventId: string | undefined,
): ExcursionGuide | null {
  if (!eventId) {
    return null
  }

  return (
    content.excursionGuides.find((guide) => guide.eventId === eventId) ??
    null
  )
}
