import type { TripDayViewModel } from '../tripTypes'
import { TripDayDetails } from './TripDayDetails'

interface TripDayCardProps {
  day: TripDayViewModel
}

export function TripDayCard({ day }: TripDayCardProps) {
  const additionalLabel =
    day.additionalEventCount === 1
      ? '1 more event'
      : `${day.additionalEventCount} more events`

  return (
    <details
      id={day.id}
      className={`trip-day-card trip-day-card-${day.state.toLowerCase()}`}
      open={day.isOpenByDefault}
    >
      <summary>
        <div className="trip-day-primary">
          <div className="trip-day-meta">
            <span>Day {day.dayNumber}</span>
            <span className="trip-day-status">{day.stateLabel}</span>
          </div>
          <time dateTime={day.dateTime}>{day.date}</time>
          <h3>{day.title}</h3>
          <p>{day.kindLabel} · {day.summary}</p>
        </div>

        {day.leadEvent ? (
          <div className="trip-lead-event">
            <span>{day.leadEvent.kindLabel}</span>
            <strong>
              {day.leadEvent.time ? (
                <time dateTime={day.leadEvent.startsAt}>
                  {day.leadEvent.time}
                </time>
              ) : (
                day.leadEvent.timingStatusLabel
              )}
              {day.leadEvent.time || day.leadEvent.timingStatusLabel
                ? ' · '
                : null}
              {day.leadEvent.title}
            </strong>
            {day.additionalEventCount > 0 ? (
              <small>{additionalLabel}</small>
            ) : null}
          </div>
        ) : null}

        {day.summaryAllAboardTime ? (
          <div className="trip-all-aboard">
            <span>Verified all aboard</span>
            <time dateTime={day.summaryAllAboardAt}>
              {day.summaryAllAboardTime}
            </time>
          </div>
        ) : null}

        <span className="trip-disclosure-label" aria-hidden="true">
          <span className="trip-show-details">Show details</span>
          <span className="trip-hide-details">Hide details</span>
        </span>
      </summary>

      <TripDayDetails day={day} />
    </details>
  )
}
