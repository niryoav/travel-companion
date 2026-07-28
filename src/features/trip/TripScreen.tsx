import { useLocation } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import type { TripContentBundle } from '../../domain/content/contentTypes'
import {
  tripReviewFixtures,
} from './fixtures/tripReviewFixtures'
import { reviewStateFromSearch } from './fixtures/reviewStateFromSearch'
import { selectTripViewModel } from './selectors/selectTripViewModel'
import { TripView } from './TripView'

interface TripScreenProps {
  now?: Date
  tripData: TripData
  tripContent: TripContentBundle
}

export function TripScreen({ now, tripData, tripContent }: TripScreenProps) {
  const { search } = useLocation()
  const reviewState = reviewStateFromSearch(search)
  const viewModel = reviewState
    ? tripReviewFixtures[reviewState]
    : selectTripViewModel(tripData, now, tripContent)

  return <TripView viewModel={viewModel} />
}
