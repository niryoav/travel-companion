import { Navigate, useNavigate } from 'react-router'

import type { Traveler, TravelerId } from '../../domain/trip/tripTypes'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { TravelerChoice } from './TravelerChoice'

interface TravelerSetupScreenProps {
  onTravelerChanged?: () => void
  travelers: Traveler[]
  tripStateRepository: TripStateRepository
}

export function TravelerSetupScreen({
  onTravelerChanged,
  travelers,
  tripStateRepository,
}: TravelerSetupScreenProps) {
  const navigate = useNavigate()
  const savedTravelerId = tripStateRepository.getTravelerId()

  if (savedTravelerId) {
    return <Navigate to="/home" replace />
  }

  const chooseTraveler = (travelerId: TravelerId) => {
    tripStateRepository.setTravelerId(travelerId)
    onTravelerChanged?.()
    navigate('/home', { replace: true })
  }

  return (
    <main className="profile-setup" id="main-content">
      <section
        className="profile-setup-card"
        aria-labelledby="profile-setup-title"
      >
        <p className="profile-kicker">Travel Companion</p>
        <h1 id="profile-setup-title">Who is using this device?</h1>
        <p className="profile-setup-description">
          Choose your name so Home can greet you personally. You can change this
          later under More.
        </p>
        <TravelerChoice
          legend="Choose your traveler profile"
          onChoose={chooseTraveler}
          travelers={travelers}
        />
        <p className="profile-local-note">
          This choice stays only on this device.
        </p>
      </section>
    </main>
  )
}
