import { Link } from 'react-router'

import type { TodayEventViewModel } from '../todayTypes'

interface NextEventCardProps {
  event: TodayEventViewModel
  showDocumentAction?: boolean
}

export function NextEventCard({
  event,
  showDocumentAction = false,
}: NextEventCardProps) {
  return (
    <section className="today-card today-next-event" aria-labelledby="next-event-title">
      <p className="today-card-label">
        {event.state === 'CURRENT' ? 'Happening now' : 'Next event'}
      </p>
      <div className="today-event-heading">
        {event.time ? (
          <time dateTime={event.startsAt}>{event.time}</time>
        ) : null}
        <div>
          <p className="today-event-kind">{event.kindLabel}</p>
          <h2 id="next-event-title">{event.title}</h2>
        </div>
      </div>
      {event.endTime ? (
        <p className="today-event-detail">
          Until <time dateTime={event.endsAt}>{event.endTime}</time>
        </p>
      ) : null}
      {event.location ? (
        <p className="today-event-detail">Meet at {event.location}</p>
      ) : null}
      {event.transport ? (
        <p className="today-event-detail">{event.transport}</p>
      ) : null}
      {showDocumentAction && event.hasRelatedDocuments ? (
        <Link className="today-event-document-link" to="/documents">
          View related documents
        </Link>
      ) : null}
    </section>
  )
}
