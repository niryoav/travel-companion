import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { App } from './app/App'
import { LocalPreferencesRepository } from './storage/LocalPreferencesRepository'
import './styles/index.css'

const preferencesRepository = new LocalPreferencesRepository(window.localStorage)

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App preferencesRepository={preferencesRepository} />
  </StrictMode>,
)
