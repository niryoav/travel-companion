import { Navigate } from 'react-router'

import type { DailyLoveMessageSchedule } from '../../domain/content/dailyLoveMessage'
import type { TripData } from '../../domain/trip/tripTypes'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { HomeScreen } from '../home/HomeScreen'

interface HomeProfileGateProps {
  loveMessageSchedule: DailyLoveMessageSchedule
  now: Date
  showSimulationPreview?: boolean
  tripData: TripData
  tripStateRepository: TripStateRepository
}

export function HomeProfileGate({
  loveMessageSchedule,
  now,
  showSimulationPreview = false,
  tripData,
  tripStateRepository,
}: HomeProfileGateProps) {
  const travelerId = tripStateRepository.getTravelerId()
  const traveler = tripData.travelers.find(({ id }) => id === travelerId)

  return traveler ? (
    <HomeScreen
      loveMessageSchedule={loveMessageSchedule}
      now={now}
      showSimulationPreview={showSimulationPreview}
      travelerName={traveler.displayName}
      tripData={tripData}
    />
  ) : (
    <Navigate to="/profile-setup" replace />
  )
}
