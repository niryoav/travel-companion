import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { ApplicationErrorBoundary } from './app/ApplicationErrorBoundary'
import { appBuildInfo } from './app/buildInfo'
import { BundledTripRepository } from './data/trips/BundledTripRepository'
import { BundledTripContentRepository } from './data/content/BundledTripContentRepository'
import { LocalTripStateRepository } from './storage/LocalTripStateRepository'
import { IndexedDbTripSnapshotCache } from './storage/IndexedDbTripSnapshotCache'
import { oceaniaMarina2026TripData } from './trips/oceania-marina-2026/tripData'
import { oceaniaMarina2026TripContent } from './content/oceania-marina-2026/tripContent'
import { oceaniaMarina2026DailyLoveMessages } from './content/oceania-marina-2026/dailyLoveMessages'
import { PwaUpdateManager } from './pwa/PwaUpdateManager'
import { registerPwaUpdates } from './pwa/registerPwa'
import { HttpTripSnapshotApiClient } from './services/TripSnapshotApiClient'
import { bootstrapTripSync } from './sync/bootstrapTripSync'
import { TripSyncRefreshController } from './sync/TripSyncRefreshController'
import './styles/index.css'

const tripRepository = new BundledTripRepository(
  oceaniaMarina2026TripData,
)
const tripContentRepository = new BundledTripContentRepository(
  oceaniaMarina2026TripContent,
  oceaniaMarina2026TripData,
)
const tripData = tripRepository.getActiveTrip()
const tripStateRepository = new LocalTripStateRepository(
  window.localStorage,
  tripData.trip.id,
  new Set(tripData.travelers.map(({ id }) => id)),
)
const pwaUpdateManager = new PwaUpdateManager(
  'serviceWorker' in navigator,
)

registerPwaUpdates(pwaUpdateManager)

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Travel Companion root element is unavailable')
}
const applicationRootElement = rootElement

async function startApplication(): Promise<void> {
  const cache = new IndexedDbTripSnapshotCache(tripData)
  const apiClient = new HttpTripSnapshotApiClient(tripData)
  const { tripOverrideRepository } = await bootstrapTripSync({
    tripData,
    cache,
    apiClient,
    getTravelerId: () => tripStateRepository.getTravelerId(),
    localStorage: window.localStorage,
  })

  createRoot(applicationRootElement).render(
    <StrictMode>
      <ApplicationErrorBoundary>
        <App
          appBuildInfo={appBuildInfo}
          loveMessageSchedule={oceaniaMarina2026DailyLoveMessages}
          pwaUpdateManager={pwaUpdateManager}
          tripRepository={tripRepository}
          tripContentRepository={tripContentRepository}
          tripOverrideRepository={tripOverrideRepository}
          tripStateRepository={tripStateRepository}
        />
      </ApplicationErrorBoundary>
    </StrictMode>,
  )

  const refreshController = new TripSyncRefreshController({
    synchronize: () =>
      tripOverrideRepository.synchronizeForCurrentRole(),
  })
  refreshController.start()
  void refreshController.requestRefresh()
}

void startApplication()
