import { DocumentActionLink } from '../../documents/components/DocumentActionLink'
import { MealMenuActions } from '../../documents/components/MealMenuActions'
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
        {event.operationalStatusLabel ? (
          <p>{event.operationalStatusLabel}</p>
        ) : null}
        {event.timingConfidenceLabel ? (
          <p>{event.timingConfidenceLabel}</p>
        ) : null}
        {event.location ? <p>{event.location}</p> : null}
        {event.mealLabels?.length ? (
          <p className="timeline-event-labels">
            {event.mealLabels.join(' · ')}
          </p>
        ) : null}
        <MealMenuActions
          isMeal={event.mealLabels !== undefined}
          mealType={event.kindLabel}
          restaurantName={event.title}
        />
        {event.meetingPointLabel ? <p>{event.meetingPointLabel}</p> : null}
        {event.transport ? <p>{event.transport}</p> : null}
        {event.operationalNotes?.map((note) => (
          <p key={note}>{note}</p>
        ))}
        {event.localOperationalNote ? (
          <p>{event.localOperationalNote}</p>
        ) : null}
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
