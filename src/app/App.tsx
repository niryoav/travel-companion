import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { DestinationScreen } from '../features/placeholders/DestinationScreen'
import { destinationDefinitions } from '../features/placeholders/placeholderScreens'
import { HomeProfileGate } from '../features/profile/HomeProfileGate'
import { MoreScreen } from '../features/profile/MoreScreen'
import { TodayScreen } from '../features/today/TodayScreen'
import { TripScreen } from '../features/trip/TripScreen'
import { TravelerSetupScreen } from '../features/profile/TravelerSetupScreen'
import { WelcomeCoverScreen } from '../features/welcome/WelcomeCoverScreen'
import type { TripRepository } from '../data/trips/TripRepository'
import type { TripContentRepository } from '../data/content/TripContentRepository'
import type { TripStateRepository } from '../storage/TripStateRepository'
import { StartupRouteGate } from './StartupRouteGate'

interface AppProps {
  tripRepository: TripRepository
  tripContentRepository: TripContentRepository
  tripStateRepository: TripStateRepository
  now?: Date
}

export function App({
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
      <StartupRouteGate tripData={tripData} now={now}>
        <Routes>
          <Route
            path="/"
            element={<WelcomeCoverScreen tripData={tripData} />}
          />
          <Route
            path="/welcome"
            element={<WelcomeCoverScreen tripData={tripData} />}
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
            {destinationDefinitions.map(
              ({ path, title, description, icon, placeholder }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <DestinationScreen
                      title={title}
                      description={description}
                      icon={icon}
                      placeholder={placeholder}
                    />
                  }
                />
              ),
            )}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </StartupRouteGate>
    </BrowserRouter>
  )
}
