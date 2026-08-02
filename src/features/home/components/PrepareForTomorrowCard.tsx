import { Link } from 'react-router'

import type { TomorrowPreparationCardViewModel } from '../homeTypes'

interface PrepareForTomorrowCardProps {
  card: TomorrowPreparationCardViewModel
  search?: string
}

export function PrepareForTomorrowCard({
  card,
  search = '',
}: PrepareForTomorrowCardProps) {
  const { prominent, preparation } = card
  const detailHref = { pathname: '/prepare-tomorrow', search }

  if (!prominent) {
    return (
      <section
        className="home-card prepare-tomorrow-card prepare-tomorrow-card-compact"
        aria-label="Prepare for tomorrow"
      >
        <p className="home-card-label">Prepare for tomorrow</p>
        <Link className="prepare-tomorrow-preview-link" to={detailHref}>
          Preview {preparation.title}
        </Link>
      </section>
    )
  }

  return (
    <section
      className="home-card prepare-tomorrow-card prepare-tomorrow-card-prominent"
      aria-labelledby="prepare-tomorrow-title"
    >
      <p className="home-card-label" id="prepare-tomorrow-title">
        Prepare for tomorrow
      </p>
      <p className="prepare-tomorrow-day-title">{preparation.title}</p>
      <p className="prepare-tomorrow-date">{preparation.date}</p>

      {preparation.isEmpty ? (
        <p>{preparation.emptyMessage}</p>
      ) : (
        <ul className="prepare-tomorrow-summary">
          {preparation.port ? (
            <li>
              {preparation.port.location} · {preparation.port.accessLabel}
            </li>
          ) : null}
          {preparation.excursions.map((excursion) => (
            <li key={excursion.eventId}>
              {excursion.title}
              {excursion.timeLabel ? ` · ${excursion.timeLabel}` : ''}
            </li>
          ))}
          {preparation.restaurantReservation ? (
            <li>
              Dinner at {preparation.restaurantReservation.restaurant}
              {preparation.restaurantReservation.time
                ? ` · ${preparation.restaurantReservation.time}`
                : ''}
            </li>
          ) : null}
          {preparation.timeline.map((item) => (
            <li key={item.id}>
              {item.title} · {item.timeLabel}
            </li>
          ))}
        </ul>
      )}

      {preparation.motionSicknessReminder ? (
        <p className="prepare-tomorrow-motion-sickness">
          {preparation.motionSicknessReminder}
        </p>
      ) : null}

      <Link className="prepare-tomorrow-detail-link" to={detailHref}>
        View full preparation
      </Link>
    </section>
  )
}
