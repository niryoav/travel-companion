import {
  TRIP_REVIEW_STATES,
  type TripReviewState,
} from './tripReviewFixtures'

export function reviewStateFromSearch(
  search: string,
): TripReviewState | null {
  const value = new URLSearchParams(search).get('state')
  return TRIP_REVIEW_STATES.find((state) => state === value) ?? null
}
