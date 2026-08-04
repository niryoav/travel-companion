import { Link, useLocation } from 'react-router'

import { PageHeader } from '../../components/PageHeader'
import { selectToday } from '../../domain/trip/selectors/selectToday'
import { selectTomorrowTripDay } from '../../domain/trip/selectors/selectTomorrowTripDay'
import type { TripData } from '../../domain/trip/tripTypes'
import { DocumentActionLink } from '../documents/components/DocumentActionLink'
import {
  cruiseDayFromSearch,
  cruiseTimeFromSearch,
  resolveCruiseDaySimulationDate,
} from '../simulation/cruiseDaySimulation'
import { PreparationChecklist } from './components/PreparationChecklist'
import { selectDayPreparation } from './selectors/selectDayPreparation'

interface PreparationScreenProps {
  now: Date
  tripData: TripData
}

export function PreparationScreen({ now, tripData }: PreparationScreenProps) {
  const { search } = useLocation()
  const cruiseDayNumber = cruiseDayFromSearch(search)
  const cruiseDayNow = cruiseDayNumber
    ? resolveCruiseDaySimulationDate(
        tripData,
        cruiseDayNumber,
        cruiseTimeFromSearch(search),
      )
    : null
  const effectiveNow = cruiseDayNow ?? now
  const today = selectToday(tripData, effectiveNow)
  const tomorrow = today
    ? selectTomorrowTripDay(tripData, today)
    : undefined

  if (!tomorrow) {
    return (
      <main className="page-container preparation-screen" id="main-content">
        <PageHeader
          eyebrow="Prepare for tomorrow"
          title="Nothing left to prepare"
          description="This is the final day of the trip."
        />
        <Link className="documents-back-link" to="/home">
          Back to Home
        </Link>
      </main>
    )
  }

  const preparation = selectDayPreparation(tripData, tomorrow)

  return (
    <main className="page-container preparation-screen" id="main-content">
      <PageHeader
        eyebrow="Prepare for tomorrow"
        title={preparation.title}
        description={preparation.date}
      />
      <Link className="documents-back-link" to="/home">
        Back to Home
      </Link>

      {preparation.isEmpty ? (
        <p>{preparation.emptyMessage}</p>
      ) : (
        <>
          {preparation.port ? (
            <section
              className="home-card"
              aria-labelledby="preparation-port-title"
            >
              <p className="home-card-label" id="preparation-port-title">
                Port
              </p>
              <p>
                {preparation.port.location} · {preparation.port.accessLabel}
              </p>
              {preparation.port.arrivalTime ? (
                <p>
                  Arrive {preparation.port.arrivalTime}
                  {preparation.port.departureTime
                    ? ` · Depart ${preparation.port.departureTime}`
                    : ''}
                </p>
              ) : null}
              {preparation.allAboard ? (
                <p>
                  All Aboard {preparation.allAboard.time} ·{' '}
                  {preparation.allAboard.label}
                </p>
              ) : null}
            </section>
          ) : null}

          {preparation.timeline.length > 0 ? (
            <section
              className="home-card"
              aria-labelledby="preparation-timeline-title"
            >
              <p className="home-card-label" id="preparation-timeline-title">
                Timeline
              </p>
              <ul>
                {preparation.timeline.map((item) => (
                  <li key={item.id}>
                    {item.timeLabel} — {item.title}
                    {item.detail ? ` · ${item.detail}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {preparation.excursions.map((excursion) => (
            <section
              className="home-card"
              key={excursion.eventId}
              aria-label={excursion.title}
            >
              <p className="home-card-label">Excursion</p>
              <p>
                {excursion.title}
                {excursion.publicCode ? ` · ${excursion.publicCode}` : ''}
              </p>
              <p>
                {excursion.timeLabel}
                {excursion.durationLabel ? ` · ${excursion.durationLabel}` : ''}
              </p>
              {excursion.meetingContext ? (
                <p>{excursion.meetingContext}</p>
              ) : null}
            </section>
          ))}

          {preparation.restaurantReservation ? (
            <section className="home-card" aria-label="Restaurant reservation">
              <p className="home-card-label">Dinner reservation</p>
              <p>
                {preparation.restaurantReservation.restaurant}
                {preparation.restaurantReservation.time
                  ? ` · ${preparation.restaurantReservation.time}`
                  : ''}
              </p>
            </section>
          ) : null}

          {preparation.documents.length > 0 ? (
            <section
              className="home-card"
              aria-labelledby="preparation-documents-title"
            >
              <p
                className="home-card-label"
                id="preparation-documents-title"
              >
                Documents
              </p>
              <div className="document-action-row">
                {preparation.documents.map((action) => (
                  <DocumentActionLink action={action} key={action.id} />
                ))}
              </div>
            </section>
          ) : null}

          {preparation.checklist.length > 0 ? (
            <section
              className="home-card"
              aria-labelledby="preparation-checklist-title"
            >
              <p
                className="home-card-label"
                id="preparation-checklist-title"
              >
                Preparation checklist
              </p>
              <PreparationChecklist groups={preparation.checklist} />
            </section>
          ) : null}

          {preparation.beforeYouLeave.length > 0 ? (
            <section
              className="home-card"
              aria-labelledby="preparation-before-you-leave-title"
            >
              <p
                className="home-card-label"
                id="preparation-before-you-leave-title"
              >
                Before you leave
              </p>
              <ul>
                {preparation.beforeYouLeave.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <Link className="tomorrow-trip-link" to={preparation.tripHref}>
        View {preparation.title} in Trip
      </Link>
    </main>
  )
}
