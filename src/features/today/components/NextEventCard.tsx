import { DocumentActionLink } from '../../documents/components/DocumentActionLink'
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
        ) : (
          <span className="today-event-time-pending">
            {event.timingLabel ?? 'Time unavailable'}
          </span>
        )}
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
      {event.timingConfidenceLabel ? (
        <p className="today-event-detail">
          {event.timingConfidenceLabel}
        </p>
      ) : null}
      {event.location ? (
        <p className="today-event-detail">Location · {event.location}</p>
      ) : null}
      {event.meetingTime ? (
        <p className="today-event-detail">
          Meeting/check-in{' '}
          <time dateTime={event.meetingAt}>{event.meetingTime}</time>
        </p>
      ) : null}
      {event.meetingPointLabel ? (
        <p className="today-event-detail">{event.meetingPointLabel}</p>
      ) : null}
      {event.leaveBy ? (
        <div className="today-leave-by">
          <strong>
            {event.leaveBy.label}
            {event.leaveBy.time ? (
              <>
                {' '}
                <time dateTime={event.leaveBy.dateTime}>
                  {event.leaveBy.time}
                </time>
              </>
            ) : null}
          </strong>
          <span>{event.leaveBy.detail}</span>
        </div>
      ) : null}
      {event.timeZoneNote ? (
        <p className="today-event-detail">{event.timeZoneNote}</p>
      ) : null}
      {event.transport ? (
        <p className="today-event-detail">{event.transport}</p>
      ) : null}
      {showDocumentAction
        ? event.documentActions?.map((action) => (
            <DocumentActionLink
              action={action}
              className="today-event-document-link"
              key={action.id}
            />
          ))
        : null}
    </section>
  )
}
