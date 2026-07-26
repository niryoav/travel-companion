import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { DestinationScreen } from '../features/placeholders/DestinationScreen'
import { destinationDefinitions } from '../features/placeholders/placeholderScreens'
import { HomeProfileGate } from '../features/profile/HomeProfileGate'
import { MoreScreen } from '../features/profile/MoreScreen'
import { TravelerSetupScreen } from '../features/profile/TravelerSetupScreen'
import { WelcomeCoverScreen } from '../features/welcome/WelcomeCoverScreen'
import type { PreferencesRepository } from '../storage/PreferencesRepository'

interface AppProps {
  preferencesRepository: PreferencesRepository
}

export function App({ preferencesRepository }: AppProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeCoverScreen />} />
        <Route
          path="/profile-setup"
          element={
            <TravelerSetupScreen
              preferencesRepository={preferencesRepository}
            />
          }
        />
        <Route element={<AppShell />}>
          <Route
            path="home"
            element={
              <HomeProfileGate
                preferencesRepository={preferencesRepository}
              />
            }
          />
          <Route
            path="more"
            element={
              <MoreScreen preferencesRepository={preferencesRepository} />
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
    </BrowserRouter>
  )
}
