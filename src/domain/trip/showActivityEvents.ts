import type { TripData, TripEvent } from './tripTypes.js'

export function showActivityEventPresentation(
  data: TripData,
  event: TripEvent,
) {
  if (!event.showActivityLocationId) {
    return null
  }
  const location = data.activityLocations?.find(
    ({ id }) => id === event.showActivityLocationId,
  )
  if (!location) {
    return {
      kindLabel: 'Show / activity',
      location: 'Unknown location',
    }
  }
  return {
    kindLabel: 'Show / activity',
    location: [location.name, location.deck].filter(Boolean).join(' · '),
  }
}
