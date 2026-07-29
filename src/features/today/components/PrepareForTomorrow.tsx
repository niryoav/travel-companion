import { Link } from 'react-router'

import { DocumentActionLink } from '../../documents/components/DocumentActionLink'
import type { TomorrowPreparationViewModel } from '../todayTypes'

interface PrepareForTomorrowProps {
  tomorrow: TomorrowPreparationViewModel
}

export function PrepareForTomorrow({
  tomorrow,
}: PrepareForTomorrowProps) {
  return (
    <details className="today-card tomorrow-preparation">
      <summary>
        <span>
          <span className="today-card-label">Prepare for tomorrow</span>
          <strong>{tomorrow.title}</strong>
        </span>
        <time dateTime={tomorrow.dateTime}>{tomorrow.date}</time>
      </summary>
      <div className="tomorrow-preparation-content">
        {tomorrow.firstEvent ? (
          <section aria-labelledby="tomorrow-first-event-title">
            <p className="today-card-label">First configured event</p>
            <h3 id="tomorrow-first-event-title">
              {tomorrow.firstEvent.title}
            </h3>
            <p>
              {tomorrow.firstEvent.time ??
                tomorrow.firstEvent.timingLabel ??
                'Time unavailable'}
              {tomorrow.earlyStart ? ' · Early start' : ''}
            </p>
            {tomorrow.firstEvent.meetingPointLabel ? (
              <p>{tomorrow.firstEvent.meetingPointLabel}</p>
            ) : null}
          </section>
        ) : null}

        {tomorrow.timingNote ? <p>{tomorrow.timingNote}</p> : null}
        {tomorrow.portAccessNote ? (
          <p>{tomorrow.portAccessNote}</p>
        ) : null}
        {tomorrow.allAboardNote ? (
          <p>{tomorrow.allAboardNote}</p>
        ) : null}
        {tomorrow.emptyMessage ? <p>{tomorrow.emptyMessage}</p> : null}

        {tomorrow.requiredItems.length > 0 ? (
          <section aria-labelledby="tomorrow-items-title">
            <h3 id="tomorrow-items-title">Required items</h3>
            <ul>
              {tomorrow.requiredItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {tomorrow.preparationNotes.length > 0 ? (
          <section aria-labelledby="tomorrow-notes-title">
            <h3 id="tomorrow-notes-title">Preparation</h3>
            <ul>
              {tomorrow.preparationNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {tomorrow.documentActions.map((action) => (
          <DocumentActionLink
            action={action}
            className="today-event-document-link"
            key={action.id}
          />
        ))}

        <Link className="tomorrow-trip-link" to={tomorrow.tripHref}>
          View tomorrow’s trip day
        </Link>
      </div>
    </details>
  )
}
