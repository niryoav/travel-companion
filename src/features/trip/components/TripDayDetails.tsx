import { Link } from 'react-router'

import type {
  TripDayViewModel,
  TripEventViewModel,
} from '../tripTypes'

interface TripDayDetailsProps {
  day: TripDayViewModel
}

function TripEventDetail({ event }: { event: TripEventViewModel }) {
  return (
    <li className="trip-event">
      <div className="trip-event-time">
        {event.time ? (
          <time dateTime={event.startsAt}>{event.time}</time>
        ) : (
          <span>Any time</span>
        )}
        {event.endTime ? (
          <small>
            to <time dateTime={event.endsAt}>{event.endTime}</time>
          </small>
        ) : null}
      </div>
      <div>
        <span className="trip-event-kind">{event.kindLabel}</span>
        <h4>{event.title}</h4>
        {event.location ? <p>{event.location}</p> : null}
        {event.transport ? <p>{event.transport}</p> : null}
        {event.relatedDocumentCount > 0 ? (
          <Link className="trip-document-link" to="/documents">
            View related documents
          </Link>
        ) : null}
      </div>
    </li>
  )
}

export function TripDayDetails({ day }: TripDayDetailsProps) {
  const hasPortTimes =
    day.port?.arrivalTime ||
    day.port?.departureTime ||
    day.port?.allAboardTime

  return (
    <div className="trip-day-details">
      <p className="trip-time-zone">Local time · {day.timeZoneLabel}</p>

      {day.port ? (
        <section aria-labelledby={`${day.id}-port-title`}>
          <p className="trip-card-label">Port context</p>
          <h4 id={`${day.id}-port-title`}>{day.port.location}</h4>
          {hasPortTimes ? (
            <dl className="trip-port-times">
              {day.port.arrivalTime ? (
                <div>
                  <dt>Arrival</dt>
                  <dd>
                    <time dateTime={day.port.arrivalAt}>
                      {day.port.arrivalTime}
                    </time>
                  </dd>
                </div>
              ) : null}
              {day.port.departureTime ? (
                <div>
                  <dt>Departure</dt>
                  <dd>
                    <time dateTime={day.port.departureAt}>
                      {day.port.departureTime}
                    </time>
                  </dd>
                </div>
              ) : null}
              {day.port.allAboardTime ? (
                <div className="trip-port-critical">
                  <dt>Verified all aboard</dt>
                  <dd>
                    <time dateTime={day.port.allAboardAt}>
                      {day.port.allAboardTime}
                    </time>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="trip-supporting-copy">
              No verified operational times are configured.
            </p>
          )}
        </section>
      ) : null}

      {day.events.length > 0 ? (
        <section aria-labelledby={`${day.id}-events-title`}>
          <p className="trip-card-label">Configured plans</p>
          <h4 id={`${day.id}-events-title`}>Events</h4>
          <ol className="trip-event-list">
            {day.events.map((event) => (
              <TripEventDetail key={event.id} event={event} />
            ))}
          </ol>
        </section>
      ) : day.emptyMessage ? (
        <section aria-labelledby={`${day.id}-empty-title`}>
          <p className="trip-card-label">Day details</p>
          <h4 id={`${day.id}-empty-title`}>A calm day</h4>
          <p className="trip-supporting-copy">{day.emptyMessage}</p>
        </section>
      ) : null}
    </div>
  )
}
