import { useLocation } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import {
  TODAY_REVIEW_STATES,
  todayReviewFixtures,
  type TodayReviewState,
} from './fixtures/todayReviewFixtures'
import { selectTodayViewModel } from './selectors/selectTodayViewModel'
import { TodayView } from './TodayView'

interface TodayScreenProps {
  now?: Date
  tripData: TripData
}

function reviewStateFromSearch(search: string): TodayReviewState | null {
  const value = new URLSearchParams(search).get('state')
  return TODAY_REVIEW_STATES.find((state) => state === value) ?? null
}

export function TodayScreen({ now, tripData }: TodayScreenProps) {
  const { search } = useLocation()
  const reviewState = reviewStateFromSearch(search)
  const viewModel = reviewState
    ? todayReviewFixtures[reviewState]
    : selectTodayViewModel(tripData, now)

  return <TodayView viewModel={viewModel} />
}

