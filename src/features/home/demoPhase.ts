import {
  DEFAULT_REVIEW_HOME_STATE,
  homeReviewFixtures,
  type ReviewHomeState,
} from './fixtures/homeReviewFixtures'

export function demoHomeStateFromSearch(
  search: string,
): ReviewHomeState | null {
  const value = new URLSearchParams(search).get('phase')

  return value && Object.hasOwn(homeReviewFixtures, value)
    ? (value as ReviewHomeState)
    : null
}

export { DEFAULT_REVIEW_HOME_STATE }
