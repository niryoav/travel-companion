import { Navigate } from 'react-router'

import type { TripData } from '../../domain/trip/tripTypes'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { HomeScreen } from '../home/HomeScreen'

interface HomeProfileGateProps {
  tripData: TripData
  tripStateRepository: TripStateRepository
}

export function HomeProfileGate({
  tripData,
  tripStateRepository,
}: HomeProfileGateProps) {
  const travelerId = tripStateRepository.getTravelerId()
  const traveler = tripData.travelers.find(({ id }) => id === travelerId)

  return traveler ? (
    <HomeScreen
      travelerName={traveler.displayName}
      tripData={tripData}
    />
  ) : (
    <Navigate to="/profile-setup" replace />
  )
}
