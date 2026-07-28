import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { DocumentsScreen } from '../features/documents/DocumentsScreen'
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
  tripStateRepository: TripStateRepository
  now?: Date
}

export function App({
  appBuildInfo = defaultAppBuildInfo,
  loveMessageSchedule,
  pwaUpdateManager = unavailablePwaUpdateManager,
  tripRepository,
  tripContentRepository,
  tripStateRepository,
  now = new Date(),
}: AppProps) {
  const tripData = tripRepository.getActiveTrip()
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
                travelers={tripData.travelers}
                tripStateRepository={tripStateRepository}
              />
            }
          />
          <Route element={<AppShell />}>
            <Route
              path="home"
              element={
                <HomeProfileGate
                  loveMessageSchedule={loveMessageSchedule}
                  now={now}
                  tripData={tripData}
                  tripStateRepository={tripStateRepository}
                />
              }
            />
            <Route
              path="more"
              element={
                <MoreScreen
                  appBuildInfo={appBuildInfo}
                  pwaUpdateManager={pwaUpdateManager}
                  tripDataVersion={tripData.dataVersion}
                  travelers={tripData.travelers}
                  tripStateRepository={tripStateRepository}
                />
              }
            />
            <Route
              path="today"
              element={<TodayScreen now={now} tripData={tripData} />}
            />
            <Route
              path="trip"
              element={
                <TripScreen
                  now={now}
                  tripData={tripData}
                  tripContent={tripContent}
                />
              }
            />
            <Route
              path="documents"
              element={<DocumentsScreen tripData={tripData} />}
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
          </Routes>
        </StartupRouteGate>
      </TripLifecycleProvider>
    </BrowserRouter>
  )
}
