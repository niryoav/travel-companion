import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { ApplicationErrorBoundary } from './app/ApplicationErrorBoundary'
import { appBuildInfo } from './app/buildInfo'
import { BundledTripRepository } from './data/trips/BundledTripRepository'
import { BundledTripContentRepository } from './data/content/BundledTripContentRepository'
import { LocalTripStateRepository } from './storage/LocalTripStateRepository'
import { IndexedDbTripSnapshotCache } from './storage/IndexedDbTripSnapshotCache'
import { activeTripConfiguration } from './trips/activeTrip'
import { PwaUpdateManager } from './pwa/PwaUpdateManager'
import { registerPwaUpdates } from './pwa/registerPwa'
import { HttpTripSnapshotApiClient } from './services/TripSnapshotApiClient'
import { bootstrapTripSync } from './sync/bootstrapTripSync'
import { TripSyncRefreshController } from './sync/TripSyncRefreshController'
import './styles/index.css'

const { tripData: activeTripData, tripContent, dailyLoveMessages } =
  activeTripConfiguration

const tripRepository = new BundledTripRepository(activeTripData)
const tripContentRepository = new BundledTripContentRepository(
  tripContent,
  activeTripData,
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
          loveMessageSchedule={dailyLoveMessages}
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
