import { useState } from 'react'

import { PageHeader } from '../../components/PageHeader'
import { SurfaceCard } from '../../components/SurfaceCard'
import type {
  Traveler,
  TravelerId,
} from '../../domain/trip/tripTypes'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { TravelerChoice } from './TravelerChoice'

interface MoreScreenProps {
  travelers: Traveler[]
  tripStateRepository: TripStateRepository
}

export function MoreScreen({
  travelers,
  tripStateRepository,
}: MoreScreenProps) {
  const [travelerId, setTravelerId] = useState<TravelerId | null>(
    () => tripStateRepository.getTravelerId(),
  )

  const chooseTraveler = (nextTravelerId: TravelerId) => {
    tripStateRepository.setTravelerId(nextTravelerId)
    setTravelerId(nextTravelerId)
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
          selectedTravelerId={travelerId}
          travelers={travelers}
        />
      </SurfaceCard>
    </main>
  )
}
