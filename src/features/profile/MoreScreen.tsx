import { useState } from 'react'
import { Link } from 'react-router'

import { AppIcon } from '../../components/AppIcon'
import { PageHeader } from '../../components/PageHeader'
import { SurfaceCard } from '../../components/SurfaceCard'
import type {
  Traveler,
  TravelerId,
} from '../../domain/trip/tripTypes'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { CalendarPocSection } from '../calendarPoc/CalendarPocSection'
import { TravelerChoice } from './TravelerChoice'
import type { AppBuildInfo } from '../../app/buildInfo'
import type { PwaUpdateManager } from '../../pwa/PwaUpdateManager'
import { AppInformationCard } from './AppInformationCard'
import { PwaStatusCard } from './PwaStatusCard'
import type { TripOverrideRepository } from '../../storage/TripOverrideRepository'
import { TripDataSyncStatus } from './TripDataSyncStatus'

interface MoreScreenProps {
  appBuildInfo: AppBuildInfo
  pwaUpdateManager: PwaUpdateManager
  tripDataVersion: string
  tripOverrideRepository: TripOverrideRepository
  travelers: Traveler[]
  tripStateRepository: TripStateRepository
}

export function MoreScreen({
  appBuildInfo,
  pwaUpdateManager,
  tripDataVersion,
  tripOverrideRepository,
  travelers,
  tripStateRepository,
}: MoreScreenProps) {
  const [travelerId, setTravelerId] = useState<TravelerId | null>(
    () => tripStateRepository.getTravelerId(),
  )

  const chooseTraveler = (nextTravelerId: TravelerId) => {
    tripStateRepository.setTravelerId(nextTravelerId)
    setTravelerId(nextTravelerId)
    tripOverrideRepository.travelerChanged?.()
  }

  return (
    <main className="page-container" id="main-content">
      <PageHeader
        eyebrow="More"
        title="More"
        description="Personal preferences and supporting information."
      />

      <SurfaceCard className="more-tools">
        <p className="card-eyebrow">Tools</p>
        <Link className="more-menu-item" to="/more/simulation-preview">
          <AppIcon name="compass" />
          <span>Simulation Preview</span>
          <span aria-hidden="true" className="more-menu-chevron">›</span>
        </Link>
      </SurfaceCard>

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

      {travelerId ? (
        <TripDataSyncStatus
          repository={tripOverrideRepository}
          travelerId={travelerId}
        />
      ) : null}
      <PwaStatusCard manager={pwaUpdateManager} />
      <AppInformationCard
        buildInfo={appBuildInfo}
        tripDataVersion={tripDataVersion}
      />
      <CalendarPocSection />
    </main>
  )
}
