import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { DestinationScreen } from '../features/placeholders/DestinationScreen'
import { destinationDefinitions } from '../features/placeholders/placeholderScreens'
import { HomeProfileGate } from '../features/profile/HomeProfileGate'
import { MoreScreen } from '../features/profile/MoreScreen'
import { TodayScreen } from '../features/today/TodayScreen'
import { TravelerSetupScreen } from '../features/profile/TravelerSetupScreen'
import { WelcomeCoverScreen } from '../features/welcome/WelcomeCoverScreen'
import type { TripRepository } from '../data/trips/TripRepository'
import type { TripStateRepository } from '../storage/TripStateRepository'

interface AppProps {
  tripRepository: TripRepository
  tripStateRepository: TripStateRepository
}

export function App({
  tripRepository,
  tripStateRepository,
}: AppProps) {
  const tripData = tripRepository.getActiveTrip()

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
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
            element={<TodayScreen tripData={tripData} />}
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
    </BrowserRouter>
  )
}
