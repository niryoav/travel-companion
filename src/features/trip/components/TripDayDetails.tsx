import { DocumentActionLink } from '../../documents/components/DocumentActionLink'
import { MealMenuActions } from '../../documents/components/MealMenuActions'
import { formatRestaurantTitle } from '../../../domain/trip/mealEvents'
import { PortAccessIndicator } from '../../../components/PortAccessIndicator'
import type {
  TripContentSourceViewModel,
  TripDayViewModel,
  TripDestinationViewModel,
  TripEventViewModel,
} from '../tripTypes'
import { DestinationImage } from './DestinationImage'

interface TripDayDetailsProps {
  canAddMoment?: (dayId: string) => boolean
  day: TripDayViewModel
  onAddMoment?: (dayId: string) => void
  onEditMoment?: (eventId: string) => void
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

function TripEventDetail({
  event,
  onEditMoment,
}: {
  event: TripEventViewModel
  onEditMoment?: (eventId: string) => void
}) {
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
        <h4>{formatRestaurantTitle(event.title, event.deck)}</h4>
        {event.organizer ? <p>{event.organizer}</p> : null}
        {event.timingConfidenceLabel ? (
          <p>{event.timingConfidenceLabel}</p>
        ) : null}
        {event.scheduleStatusLabel ? (
          <p>{event.scheduleStatusLabel}</p>
        ) : null}
        {event.operationalStatusLabel ? (
          <p>{event.operationalStatusLabel}</p>
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
        {event.duration ? (
          <p className="trip-event-note">
            {event.duration.label} · {event.duration.value}
          </p>
        ) : null}
        {event.estimatedTiming ? (
          <dl className="trip-estimated-timing">
            <div>
              <dt>Expected departure</dt>
              <dd>Approximately {event.estimatedTiming.departureWindow}</dd>
            </div>
            {event.estimatedTiming.arrivalWindow ? (
              <div>
                <dt>Estimated hotel arrival</dt>
                <dd>Approximately {event.estimatedTiming.arrivalWindow}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {event.operationalTimingNote ? (
          <p className="trip-event-note">{event.operationalTimingNote}</p>
        ) : null}
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
        {event.operationalNotes?.map((note) => (
          <p className="trip-event-note" key={note}>{note}</p>
        ))}
        {event.localOperationalNote ? (
          <p className="trip-event-note">
            {event.localOperationalNote}
          </p>
        ) : null}
        {event.operationalUpdateLabel ? (
          <p className="trip-event-updated">
            {event.operationalUpdateLabel}
          </p>
        ) : null}
        {event.location ? <p>{event.location}</p> : null}
        {event.mealLabels?.length ? (
          <p className="trip-dinner-labels">
            {event.mealLabels.join(' · ')}
          </p>
        ) : null}
        <MealMenuActions
          localStartTime={event.time}
          mealType={event.kindLabel}
          restaurantName={event.title}
        />
        {event.isUserCreatedMoment && onEditMoment ? (
          <button
            className="trip-edit-action trip-dinner-edit-action"
            type="button"
            onClick={() => onEditMoment(event.id)}
          >
            Edit moment
          </button>
        ) : null}
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

export function TripDayDetails({
  canAddMoment,
  day,
  onAddMoment,
  onEditMoment,
}: TripDayDetailsProps) {
  const hasPortTimes =
    day.port?.arrivalTime ||
    day.port?.departureTime ||
    day.port?.allAboardTime

  return (
    <div className="trip-day-details">
      {onAddMoment && (canAddMoment?.(day.id) ?? true) ? (
        <button
          className="trip-add-moment-action"
          type="button"
          onClick={() => onAddMoment(day.id)}
        >
          + Add moment
        </button>
      ) : null}
      {day.port ? (
        <section aria-labelledby={`${day.id}-port-title`}>
          <p className="trip-card-label">Port context</p>
          <h4 id={`${day.id}-port-title`}>{day.port.location}</h4>
          {day.port.accessLabel && day.port.accessStatus ? (
            <p className="trip-port-access">
              <PortAccessIndicator
                label={day.port.accessLabel}
                status={day.port.accessStatus}
              />
            </p>
          ) : null}
          {day.port.arrivalTime ? (
            <dl className="trip-port-times">
              <div>
                <dt>Arrival</dt>
                <dd>
                  <time dateTime={day.port.arrivalAt}>
                    {day.port.arrivalTime}
                  </time>
                </dd>
              </div>
            </dl>
          ) : !hasPortTimes && !day.port.tender ? (
            <p className="trip-supporting-copy">
              No verified operational times are configured.
            </p>
          ) : null}
          {day.port.tender ? (
            <dl className="trip-tender-times">
              {day.port.tender.firstTender ? (
                <div>
                  <dt>First tender</dt>
                  <dd>
                    {day.port.tender.firstTender.time ? (
                      <time
                        dateTime={day.port.tender.firstTender.dateTime}
                      >
                        {day.port.tender.firstTender.time}
                      </time>
                    ) : day.port.tender.firstTender.statusLabel}
                  </dd>
                </div>
              ) : null}
              {day.port.tender.tenderReport ? (
                <div>
                  <dt>Tender report</dt>
                  <dd>
                    {day.port.tender.tenderReport.time ? (
                      <time
                        dateTime={day.port.tender.tenderReport.dateTime}
                      >
                        {day.port.tender.tenderReport.time}
                      </time>
                    ) : day.port.tender.tenderReport.statusLabel}
                  </dd>
                </div>
              ) : null}
              {day.port.tender.ourTenderAshore ? (
                <div>
                  <dt>Our tender ashore</dt>
                  <dd>
                    {day.port.tender.ourTenderAshore.time ? (
                      <time
                        dateTime={
                          day.port.tender.ourTenderAshore.dateTime
                        }
                      >
                        {day.port.tender.ourTenderAshore.time}
                      </time>
                    ) : day.port.tender.ourTenderAshore.statusLabel}
                  </dd>
                </div>
              ) : null}
              {day.port.tender.meetingPoint ? (
                <div>
                  <dt>Tender meeting point</dt>
                  <dd>{day.port.tender.meetingPoint}</dd>
                </div>
              ) : null}
              {day.port.tender.crossingLabel ? (
                <div>
                  <dt>Crossing time</dt>
                  <dd>{day.port.tender.crossingLabel}</dd>
                </div>
              ) : null}
              {day.port.tender.expectedArrivalAshore ? (
                <div>
                  <dt>Expected arrival ashore</dt>
                  <dd>
                    <time
                      dateTime={
                        day.port.tender.expectedArrivalAshore.dateTime
                      }
                    >
                      {day.port.tender.expectedArrivalAshore.time}
                    </time>
                    {' · Estimated'}
                  </dd>
                </div>
              ) : null}
              {day.port.tender.ourTenderBack ? (
                <div>
                  <dt>Our tender back</dt>
                  <dd>
                    {day.port.tender.ourTenderBack.time ? (
                      <time
                        dateTime={
                          day.port.tender.ourTenderBack.dateTime
                        }
                      >
                        {day.port.tender.ourTenderBack.time}
                      </time>
                    ) : day.port.tender.ourTenderBack.statusLabel}
                  </dd>
                </div>
              ) : null}
              {day.port.tender.lastTender ? (
                <div>
                  <dt>Last tender</dt>
                  <dd>
                    {day.port.tender.lastTender.time ? (
                      <time
                        dateTime={day.port.tender.lastTender.dateTime}
                      >
                        {day.port.tender.lastTender.time}
                      </time>
                    ) : day.port.tender.lastTender.statusLabel}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {day.port.allAboardTime || day.port.departureTime ? (
            <dl className="trip-port-times">
              {day.port.allAboardTime ? (
                <div className="trip-port-critical">
                  <dt>All Aboard</dt>
                  <dd>
                    <time dateTime={day.port.allAboardAt}>
                      {day.port.allAboardTime}
                    </time>
                    {day.port.allAboardStatusLabel
                      ? ` · ${day.port.allAboardStatusLabel}`
                      : null}
                  </dd>
                </div>
              ) : null}
              {day.port.departureTime ? (
                <div>
                  <dt>Ship departure</dt>
                  <dd>
                    <time dateTime={day.port.departureAt}>
                      {day.port.departureTime}
                    </time>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {day.port.tender?.note ? (
            <p className="trip-supporting-copy">
              {day.port.tender.note}
            </p>
          ) : null}
          {day.port.operationalNote ? (
            <p className="trip-supporting-copy">
              {day.port.operationalNote}
            </p>
          ) : null}
        </section>
      ) : null}

      {day.events.length > 0 ? (
        <section aria-labelledby={`${day.id}-events-title`}>
          <p className="trip-card-label">Configured plans</p>
          <h4 id={`${day.id}-events-title`}>Events</h4>
          <ol className="trip-event-list">
            {day.events.map((event) => (
              <TripEventDetail
                key={event.id}
                event={event}
                onEditMoment={onEditMoment}
              />
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
