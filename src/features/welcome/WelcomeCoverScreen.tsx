import { Link } from 'react-router'

import { useTripLifecycle } from '../../app/TripLifecycleContext'
import { DailyLoveMessage } from '../../components/DailyLoveMessage'
import {
  selectDailyLoveMessage,
  type DailyLoveMessageSchedule,
} from '../../domain/content/dailyLoveMessage'
import { selectCurrentLocalDate } from '../../domain/trip/selectors/selectCurrentLocalDate'
import { formatDateRange } from '../../domain/trip/tripTime'
import type { TripData } from '../../domain/trip/tripTypes'
import { daysUntilDeparture, formatDaysToGo } from './countdown'

interface WelcomeCoverScreenProps {
  loveMessageSchedule: DailyLoveMessageSchedule
  now: Date
  tripData: TripData
}

export function WelcomeCoverScreen({
  loveMessageSchedule,
  now,
  tripData,
}: WelcomeCoverScreenProps) {
  const { activateTrip } = useTripLifecycle()
  const cruise = tripData.cruises.find(
    ({ id }) => id === tripData.trip.cruiseId,
  )
  const shipName =
    cruise?.shipName ?? 'Cruise details available in Trip'
  const localDate = selectCurrentLocalDate(tripData, now)
  const loveMessage =
    localDate < tripData.trip.startDate
      ? selectDailyLoveMessage(loveMessageSchedule, localDate)
      : null
  const countdown = formatDaysToGo(
    daysUntilDeparture(
      new Date(`${tripData.trip.startDate}T00:00:00`),
      now,
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
        <div className="welcome-card-content">
          <p className="welcome-label">Travel Companion</p>
          <p className="welcome-family">Your trip</p>
          <h1 id="welcome-trip-title">{tripData.trip.title}</h1>
          <p className="welcome-ship">{shipName}</p>
          <p className="welcome-dates">
            {formatDateRange(
              tripData.trip.startDate,
              tripData.trip.endDate,
            )}
          </p>
          <p className="welcome-countdown">{countdown}</p>
          {loveMessage ? (
            <DailyLoveMessage message={loveMessage} variant="welcome" />
          ) : null}
          <Link
            className="welcome-enter"
            onClick={activateTrip}
            to="/home"
          >
            Enter trip
          </Link>
        </div>
      </section>
    </main>
  )
}
