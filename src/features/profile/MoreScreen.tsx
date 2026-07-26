import { useState } from 'react'

import { PageHeader } from '../../components/PageHeader'
import { SurfaceCard } from '../../components/SurfaceCard'
import type {
  PreferencesRepository,
  TravelerProfile,
} from '../../storage/PreferencesRepository'
import { TravelerChoice } from './TravelerChoice'

interface MoreScreenProps {
  preferencesRepository: PreferencesRepository
}

export function MoreScreen({
  preferencesRepository,
}: MoreScreenProps) {
  const [traveler, setTraveler] = useState<TravelerProfile | null>(
    () => preferencesRepository.getTravelerProfile(),
  )

  const chooseTraveler = (nextTraveler: TravelerProfile) => {
    preferencesRepository.setTravelerProfile(nextTraveler)
    setTraveler(nextTraveler)
  }

  return (
    <main className="page-container" id="main-content">
      <PageHeader
        eyebrow="More"
        title="More"
        description="Personal preferences and supporting information."
      />

      <SurfaceCard className="profile-settings">
        <p className="card-eyebrow">Profile</p>
        <h2>Traveler on this device</h2>
        <p>
          Home uses this name in its greeting. This local choice is not an
          account and is not synchronized.
        </p>
        <TravelerChoice
          legend="Change traveler profile"
          onChoose={chooseTraveler}
          selectedTraveler={traveler}
        />
      </SurfaceCard>
    </main>
  )
}
