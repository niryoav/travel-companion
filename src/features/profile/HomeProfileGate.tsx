import { Navigate } from 'react-router'

import type { PreferencesRepository } from '../../storage/PreferencesRepository'
import { HomeScreen } from '../home/HomeScreen'

interface HomeProfileGateProps {
  preferencesRepository: PreferencesRepository
}

export function HomeProfileGate({
  preferencesRepository,
}: HomeProfileGateProps) {
  const traveler = preferencesRepository.getTravelerProfile()

  return traveler ? (
    <HomeScreen traveler={traveler} />
  ) : (
    <Navigate to="/profile-setup" replace />
  )
}
