import { useLocation } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import {
  tripReviewFixtures,
} from './fixtures/tripReviewFixtures'
import { reviewStateFromSearch } from './fixtures/reviewStateFromSearch'
import { selectTripViewModel } from './selectors/selectTripViewModel'
import { TripView } from './TripView'

interface TripScreenProps {
  now?: Date
  tripData: TripData
}

export function TripScreen({ now, tripData }: TripScreenProps) {
  const { search } = useLocation()
  const reviewState = reviewStateFromSearch(search)
  const viewModel = reviewState
    ? tripReviewFixtures[reviewState]
    : selectTripViewModel(tripData, now)

  return <TripView viewModel={viewModel} />
}
