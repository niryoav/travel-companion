import { Link } from 'react-router'

import { formatDateRange } from '../../domain/trip/tripTime'
import type { TripData } from '../../domain/trip/tripTypes'
import { daysUntilDeparture, formatDaysToGo } from './countdown'

interface WelcomeCoverScreenProps {
  tripData: TripData
}

export function WelcomeCoverScreen({
  tripData,
}: WelcomeCoverScreenProps) {
  const cruise = tripData.cruises.find(
    ({ id }) => id === tripData.trip.cruiseId,
  )
  const countdown = formatDaysToGo(
    daysUntilDeparture(
      new Date(`${tripData.trip.startDate}T00:00:00`),
    ),
  )

  return (
    <main className="welcome-cover">
      <img
        className="welcome-hero"
        src={tripData.trip.welcomeHeroImage}
        alt=""
        aria-hidden="true"
      />
      <div className="welcome-overlay" aria-hidden="true" />

      <section className="welcome-card" aria-labelledby="welcome-trip-title">
        <p className="welcome-label">Travel Companion</p>
        <p className="welcome-family">{tripData.trip.familyLabel}</p>
        <h1 id="welcome-trip-title">{tripData.trip.title}</h1>
        <p className="welcome-ship">{cruise?.shipName}</p>
        <p className="welcome-dates">
          {formatDateRange(
            tripData.trip.startDate,
            tripData.trip.endDate,
          )}
        </p>
        <p className="welcome-countdown">{countdown}</p>
        <Link className="welcome-enter" to="/home">
          Enter trip
        </Link>
      </section>
    </main>
  )
}
