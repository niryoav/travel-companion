import { PortAccessIndicator } from '../../../components/PortAccessIndicator'
import type { TripDayViewModel } from '../tripTypes'
import { TripDayDetails } from './TripDayDetails'

interface TripDayCardProps {
  canAddMoment?: (dayId: string) => boolean
  day: TripDayViewModel
  onAddMoment?: (dayId: string) => void
  onEditMoment?: (eventId: string) => void
  onEdit?: (dayId: string) => void
}

export function TripDayCard({
  canAddMoment,
  day,
  onAddMoment,
  onEditMoment,
  onEdit,
}: TripDayCardProps) {
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

        {day.summaryPortAccessLabel && day.summaryPortAccessStatus ? (
          <div className="trip-port-access-summary">
            <PortAccessIndicator
              label={day.summaryPortAccessLabel}
              status={day.summaryPortAccessStatus}
            />
            {day.summaryOurTenderAshoreTime ? (
              <span>
                Our tender ashore:{' '}
                <time dateTime={day.summaryOurTenderAshoreAt}>
                  {day.summaryOurTenderAshoreTime}
                </time>
              </span>
            ) : null}
            {day.summaryOurTenderBackTime ? (
              <span>
                Our tender back:{' '}
                <time dateTime={day.summaryOurTenderBackAt}>
                  {day.summaryOurTenderBackTime}
                </time>
              </span>
            ) : null}
            {!day.summaryOurTenderAshoreTime &&
            !day.summaryOurTenderBackTime &&
            day.summaryPortAccessLabel === 'Tender required' ? (
              <span>Tender timing still to be confirmed.</span>
            ) : null}
          </div>
        ) : null}

        {day.summaryAllAboardTime ? (
          <div className="trip-all-aboard">
            <span>All Aboard</span>
            <strong>
              <time dateTime={day.summaryAllAboardAt}>
                {day.summaryAllAboardTime}
              </time>
              {day.summaryAllAboardStatusLabel
                ? ` · ${day.summaryAllAboardStatusLabel}`
                : null}
            </strong>
          </div>
        ) : null}

        {day.operationalUpdateLabel ? (
          <span className="trip-updated-locally">
            {day.operationalUpdateLabel}
          </span>
        ) : null}

        <span className="trip-card-actions">
          {day.isEditable && onEdit ? (
            <button
              className="trip-edit-action"
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onEdit(day.id)
              }}
            >
              Edit
            </button>
          ) : (
            <span />
          )}
          <span className="trip-disclosure-label" aria-hidden="true">
            <span className="trip-show-details">Show details</span>
            <span className="trip-hide-details">Hide details</span>
          </span>
        </span>
      </summary>

      <TripDayDetails
        canAddMoment={canAddMoment}
        day={day}
        onAddMoment={onAddMoment}
        onEditMoment={onEditMoment}
      />
    </details>
  )
}
