import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { ThemeProvider } from './theme/ThemeProvider'
import { HomeScreen } from '../features/home/HomeScreen'
import { DestinationScreen } from '../features/placeholders/DestinationScreen'
import { destinationDefinitions } from '../features/placeholders/placeholderScreens'
import type { PreferencesRepository } from '../storage/PreferencesRepository'

interface AppProps {
  preferencesRepository: PreferencesRepository
}

export function App({ preferencesRepository }: AppProps) {
  return (
    <ThemeProvider repository={preferencesRepository}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomeScreen />} />
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
    </ThemeProvider>
  )
}
