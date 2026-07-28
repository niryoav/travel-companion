import { DocumentActionLink } from '../../documents/components/DocumentActionLink'
import type {
  TripContentSourceViewModel,
  TripDayViewModel,
  TripDestinationViewModel,
  TripEventViewModel,
} from '../tripTypes'
import { DestinationImage } from './DestinationImage'

interface TripDayDetailsProps {
  day: TripDayViewModel
}

function Sources({
  sources,
  reviewedAt,
}: {
  sources: TripContentSourceViewModel[]
  reviewedAt: string
}) {
  return (
    <details className="trip-content-sources">
      <summary>Sources · reviewed {reviewedAt}</summary>
      <ul>
        {sources.map((source) => (
          <li key={source.id}>
            {source.url ? (
              <a href={source.url} rel="noreferrer" target="_blank">
                {source.name}
              </a>
            ) : source.name}
          </li>
        ))}
      </ul>
    </details>
  )
}

function ContentList({
  title,
  items,
}: {
  title: string
  items?: string[]
}) {
  return items?.length ? (
    <section>
      <h5>{title}</h5>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  ) : null
}

function DestinationContent({
  destination,
}: {
  destination: TripDestinationViewModel
}) {
  return (
    <details className="trip-enrichment">
      <summary>About {destination.title}</summary>
      <div className="trip-enrichment-body">
        {destination.image ? (
          <DestinationImage image={destination.image} />
        ) : null}
        <p>{destination.introduction}</p>
        <ContentList title="Highlights" items={destination.highlights} />
        <dl>
          {destination.practicalFacts.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <ContentList title="Good to know" items={destination.goodToKnow} />
        <Sources
          sources={destination.sources}
          reviewedAt={destination.reviewedAt}
        />
      </div>
    </details>
  )
}

function TripEventDetail({ event }: { event: TripEventViewModel }) {
  return (
    <li className="trip-event">
      <div className="trip-event-time">
        {event.time ? (
          <time dateTime={event.startsAt}>{event.time}</time>
        ) : event.timingStatusLabel ? (
          <span>{event.timingStatusLabel}</span>
        ) : (
          <span>Time unavailable</span>
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
        {event.organizer ? <p>{event.organizer}</p> : null}
        {event.timingConfidenceLabel ? (
          <p>{event.timingConfidenceLabel}</p>
        ) : null}
        {event.bookingTypeLabel ||
        event.bookingStatusLabel ||
        event.publicCode ? (
          <p>
            {[
              event.bookingTypeLabel,
              event.bookingStatusLabel,
              event.publicCode,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        {event.checkInTime ? (
          <p>
            Check in <time dateTime={event.checkInAt}>{event.checkInTime}</time>
          </p>
        ) : null}
        {event.meetingTime ? (
          <p>
            Meet <time dateTime={event.meetingAt}>{event.meetingTime}</time>
          </p>
        ) : null}
        {event.meetingContext ? <p>{event.meetingContext}</p> : null}
        {event.leaveBy ? (
          <p className="trip-operational-note">
            {event.leaveBy.label}
            {event.leaveBy.time ? (
              <>
                {' '}
                <time dateTime={event.leaveBy.dateTime}>
                  {event.leaveBy.time}
                </time>
              </>
            ) : null}
            {' · '}
            {event.leaveBy.detail}
          </p>
        ) : null}
        {event.timeZoneNote ? <p>{event.timeZoneNote}</p> : null}
        {event.operationalNotes?.map((note) => (
          <p className="trip-operational-note" key={note}>{note}</p>
        ))}
        {event.location ? <p>{event.location}</p> : null}
        {event.transport ? <p>{event.transport}</p> : null}
        {event.experience ? (
          <details className="trip-enrichment trip-experience">
            <summary>About this experience</summary>
            <div className="trip-enrichment-body">
              <p>{event.experience.summary}</p>
              {event.experience.context ? (
                <p>{event.experience.context}</p>
              ) : null}
              <ContentList title="Highlights" items={event.experience.highlights} />
              <ContentList title="Look out for" items={event.experience.lookOutFor} />
              <ContentList title="Fun facts" items={event.experience.funFacts} />
              <ContentList title="Preparation" items={event.experience.preparation} />
              {event.experience.seasonalNote ? (
                <aside className="trip-seasonal-note">
                  <strong>Seasonal note</strong>
                  <p>{event.experience.seasonalNote}</p>
                </aside>
              ) : null}
              <Sources
                sources={event.experience.sources}
                reviewedAt={event.experience.reviewedAt}
              />
            </div>
          </details>
        ) : null}
        {event.documentActions?.map((action) => (
          <DocumentActionLink
            action={action}
            className="trip-document-link"
            key={action.id}
          />
        ))}
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

      {day.destination ? (
        <DestinationContent destination={day.destination} />
      ) : null}

      {day.documentActions?.length ? (
        <section aria-labelledby={`${day.id}-documents-title`}>
          <p className="trip-card-label">Travel documents</p>
          <h4 id={`${day.id}-documents-title`}>For this day</h4>
          <div className="trip-day-document-actions">
            {day.documentActions.map((action) => (
              <DocumentActionLink
                action={action}
                className="trip-document-link"
                key={action.id}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
