import { DocumentActionLink } from '../../documents/components/DocumentActionLink'
import type { TodayEventViewModel } from '../todayTypes'

interface TimelineEventProps {
  event: TodayEventViewModel
}

export function TimelineEvent({ event }: TimelineEventProps) {
  return (
    <li className={`timeline-event timeline-event-${event.state.toLowerCase()}`}>
      <div className="timeline-marker" aria-hidden="true" />
      <div className="timeline-time">
        {event.time ? (
          <time dateTime={event.startsAt}>{event.time}</time>
        ) : (
          <span>{event.timingLabel ?? 'Time unavailable'}</span>
        )}
        {event.endTime ? (
          <span>
            to <time dateTime={event.endsAt}>{event.endTime}</time>
          </span>
        ) : null}
      </div>
      <div className="timeline-copy">
        <div className="timeline-meta">
          <span>{event.kindLabel}</span>
          {event.publicCode ? <span>{event.publicCode}</span> : null}
          <span className="timeline-state">{event.stateLabel}</span>
        </div>
        <h3>{event.title}</h3>
        {event.timingConfidenceLabel ? (
          <p>{event.timingConfidenceLabel}</p>
        ) : null}
        {event.location ? <p>{event.location}</p> : null}
        {event.meetingPointLabel ? <p>{event.meetingPointLabel}</p> : null}
        {event.transport ? <p>{event.transport}</p> : null}
        {event.documentActions?.map((action) => (
          <DocumentActionLink
            action={action}
            className="today-event-document-link"
            key={action.id}
          />
        ))}
      </div>
    </li>
  )
}
