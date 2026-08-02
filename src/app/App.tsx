import { useSyncExternalStore } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { ActivitiesEntertainmentScreen } from '../features/documents/ActivitiesEntertainmentScreen'
import { DeckPlansScreen } from '../features/documents/DeckPlansScreen'
import { DocumentOfflineSync } from '../features/documents/DocumentOfflineSync'
import { DocumentsScreen } from '../features/documents/DocumentsScreen'
import { FinalCruiseSummaryScreen } from '../features/documents/FinalCruiseSummaryScreen'
import { RestaurantMenusScreen } from '../features/documents/RestaurantMenusScreen'
import { RestaurantMenuProvider } from '../features/documents/RestaurantMenuProvider'
import { HomeProfileGate } from '../features/profile/HomeProfileGate'
import { MoreScreen } from '../features/profile/MoreScreen'
import { TodayScreen } from '../features/today/TodayScreen'
import { TripScreen } from '../features/trip/TripScreen'
import { TravelerSetupScreen } from '../features/profile/TravelerSetupScreen'
import { WelcomeCoverScreen } from '../features/welcome/WelcomeCoverScreen'
import type { DailyLoveMessageSchedule } from '../domain/content/dailyLoveMessage'
import type { TripRepository } from '../data/trips/TripRepository'
import type { TripContentRepository } from '../data/content/TripContentRepository'
import type { TripStateRepository } from '../storage/TripStateRepository'
import {
  unavailableTripOverrideRepository,
  type TripOverrideRepository,
} from '../storage/TripOverrideRepository'
import { applyTripOverrides } from '../domain/trip/tripOverrides'
import { withPlanningAllAboardEstimates } from '../domain/trip/allAboardPlanning'
import { listVoyageProgressImagePaths } from '../domain/trip/selectors/selectVoyageProgress'
import { StartupRouteGate } from './StartupRouteGate'
import { TripLifecycleProvider } from './TripLifecycleProvider'
import {
  appBuildInfo as defaultAppBuildInfo,
  type AppBuildInfo,
} from './buildInfo'
import {
  unavailablePwaUpdateManager,
  type PwaUpdateManager,
} from '../pwa/PwaUpdateManager'

interface AppProps {
  appBuildInfo?: AppBuildInfo
  loveMessageSchedule: DailyLoveMessageSchedule
  pwaUpdateManager?: PwaUpdateManager
  tripRepository: TripRepository
  tripContentRepository: TripContentRepository
  tripOverrideRepository?: TripOverrideRepository
  tripStateRepository: TripStateRepository
  now?: Date
}

export function App({
  appBuildInfo = defaultAppBuildInfo,
  loveMessageSchedule,
  pwaUpdateManager = unavailablePwaUpdateManager,
  tripRepository,
  tripContentRepository,
  tripOverrideRepository = unavailableTripOverrideRepository,
  tripStateRepository,
  now = new Date(),
}: AppProps) {
  const canonicalTripData = tripRepository.getActiveTrip()
  const baselineTripData =
    withPlanningAllAboardEstimates(canonicalTripData)
  const tripOverrides = useSyncExternalStore(
    tripOverrideRepository.subscribe,
    tripOverrideRepository.getSnapshot,
    tripOverrideRepository.getSnapshot,
  )
  const tripData = withPlanningAllAboardEstimates(
    applyTripOverrides(canonicalTripData, tripOverrides),
  )
  const tripContent = tripContentRepository.getContentForTrip(
    tripData.trip.id,
  )

  if (!tripContent) {
    throw new Error(`Missing bundled content for trip ${tripData.trip.id}`)
  }

  return (
    <BrowserRouter>
      <TripLifecycleProvider
        activeTripId={tripData.trip.id}
        tripStateRepository={tripStateRepository}
      >
        <DocumentOfflineSync
          documentReferences={tripData.documentReferences}
          additionalHrefs={listVoyageProgressImagePaths(tripData)}
        />
        <StartupRouteGate
          tripData={tripData}
          tripStateRepository={tripStateRepository}
          now={now}
        >
          <Routes>
          <Route
            path="/"
            element={
              <WelcomeCoverScreen
                loveMessageSchedule={loveMessageSchedule}
                now={now}
                tripData={tripData}
              />
            }
          />
          <Route
            path="/welcome"
            element={
              <WelcomeCoverScreen
                loveMessageSchedule={loveMessageSchedule}
                now={now}
                tripData={tripData}
              />
            }
          />
          <Route
            path="/profile-setup"
            element={
              <TravelerSetupScreen
                onTravelerChanged={() =>
                  tripOverrideRepository.travelerChanged?.()
                }
                travelers={tripData.travelers}
                tripStateRepository={tripStateRepository}
              />
            }
          />
          <Route element={<AppShell />}>
            <Route
              path="home"
              element={
                <RestaurantMenuProvider mealRestaurants={tripData.mealRestaurants}>
                  <HomeProfileGate
                    loveMessageSchedule={loveMessageSchedule}
                    now={now}
                    tripData={tripData}
                    tripStateRepository={tripStateRepository}
                  />
                </RestaurantMenuProvider>
              }
            />
            <Route
              path="more"
              element={
                <MoreScreen
                  appBuildInfo={appBuildInfo}
                  pwaUpdateManager={pwaUpdateManager}
                  tripDataVersion={tripData.dataVersion}
                  tripOverrideRepository={tripOverrideRepository}
                  travelers={tripData.travelers}
                  tripStateRepository={tripStateRepository}
                />
              }
            />
            <Route
              path="more/simulation-preview"
              element={
                <RestaurantMenuProvider mealRestaurants={tripData.mealRestaurants}>
                  <HomeProfileGate
                    loveMessageSchedule={loveMessageSchedule}
                    now={now}
                    showSimulationPreview
                    tripData={tripData}
                    tripStateRepository={tripStateRepository}
                  />
                </RestaurantMenuProvider>
              }
            />
            <Route
              path="today"
              element={
                <RestaurantMenuProvider
                  mealRestaurants={tripData.mealRestaurants}
                >
                  <TodayScreen now={now} tripData={tripData} />
                </RestaurantMenuProvider>
              }
            />
            <Route
              path="trip"
              element={
                <RestaurantMenuProvider
                  mealRestaurants={tripData.mealRestaurants}
                >
                  <TripScreen
                    baselineTripData={baselineTripData}
                    now={now}
                    tripData={tripData}
                    tripContent={tripContent}
                    tripOverrideRepository={
                      tripOverrideRepository ===
                      unavailableTripOverrideRepository
                        ? undefined
                        : tripOverrideRepository
                    }
                    tripOverrides={tripOverrides}
                    tripStateRepository={tripStateRepository}
                  />
                </RestaurantMenuProvider>
              }
            />
            <Route
              path="documents"
              element={<DocumentsScreen tripData={tripData} />}
            />
            <Route
              path="documents/restaurant-menus"
              element={<RestaurantMenusScreen />}
            />
            <Route
              path="documents/activities"
              element={<ActivitiesEntertainmentScreen />}
            />
            <Route
              path="documents/deckplans"
              element={<DeckPlansScreen />}
            />
            <Route
              path="documents/final-cruise-vacation-summary"
              element={<FinalCruiseSummaryScreen />}
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
          </Routes>
        </StartupRouteGate>
      </TripLifecycleProvider>
    </BrowserRouter>
  )
}
