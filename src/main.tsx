import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { App } from './app/App'
import { BundledTripRepository } from './data/trips/BundledTripRepository'
import { BundledTripContentRepository } from './data/content/BundledTripContentRepository'
import { LocalTripStateRepository } from './storage/LocalTripStateRepository'
import { oceaniaMarina2026TripData } from './trips/oceania-marina-2026/tripData'
import { oceaniaMarina2026TripContent } from './content/oceania-marina-2026/tripContent'
import { oceaniaMarina2026DailyLoveMessages } from './content/oceania-marina-2026/dailyLoveMessages'
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

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      loveMessageSchedule={oceaniaMarina2026DailyLoveMessages}
      tripRepository={tripRepository}
      tripContentRepository={tripContentRepository}
      tripStateRepository={tripStateRepository}
    />
  </StrictMode>,
)
