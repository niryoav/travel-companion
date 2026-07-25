import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { ThemeProvider } from './theme/ThemeProvider'
import { placeholderScreens } from '../features/placeholders/placeholderScreens'
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
            <Route index element={<Navigate to="/today" replace />} />
            {placeholderScreens.map(({ path, title, description }) => (
              <Route
                key={path}
                path={path}
                element={
                  <main className="page-container" id="main-content">
                    <p className="eyebrow">Sprint 1 foundation</p>
                    <h1 className="page-title">{title}</h1>
                    <p className="page-description">{description}</p>
                    <div className="placeholder-card" role="status">
                      <span className="placeholder-mark" aria-hidden="true" />
                      <div>
                        <h2>Ready for a future sprint</h2>
                        <p>
                          This space is intentionally quiet while the travel
                          experience takes shape.
                        </p>
                      </div>
                    </div>
                  </main>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
