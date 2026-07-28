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
          <span>Any time</span>
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
          <span className="timeline-state">{event.stateLabel}</span>
        </div>
        <h3>{event.title}</h3>
        {event.location ? <p>{event.location}</p> : null}
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
