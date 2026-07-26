import { Navigate, useNavigate } from 'react-router'

import type {
  PreferencesRepository,
  TravelerProfile,
} from '../../storage/PreferencesRepository'
import { TravelerChoice } from './TravelerChoice'

interface TravelerSetupScreenProps {
  preferencesRepository: PreferencesRepository
}

export function TravelerSetupScreen({
  preferencesRepository,
}: TravelerSetupScreenProps) {
  const navigate = useNavigate()
  const savedTraveler = preferencesRepository.getTravelerProfile()

  if (savedTraveler) {
    return <Navigate to="/home" replace />
  }

  const chooseTraveler = (traveler: TravelerProfile) => {
    preferencesRepository.setTravelerProfile(traveler)
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
        />
        <p className="profile-local-note">
          This choice stays only on this device.
        </p>
      </section>
    </main>
  )
}
