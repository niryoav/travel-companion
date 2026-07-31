import { Link } from 'react-router'

import { MealMenuActions } from '../../documents/components/MealMenuActions'
import type { ImportantMoment } from '../nextImportantMoment'
import { formatRemainingDuration } from '../nextImportantMoment'

interface Props { moment: ImportantMoment; now: Date }

function dateLabel(moment: ImportantMoment, now: Date): string {
  const parts = (date: Date) => new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: moment.timeZone,
  }).format(date)
  const targetDay = parts(new Date(moment.startsAt))
  const today = parts(now)
  const tomorrow = parts(new Date(now.getTime() + 86_400_000))
  if (targetDay === today) return 'Today'
  if (targetDay === tomorrow) return 'Tomorrow'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: moment.timeZone,
  }).format(new Date(moment.startsAt))
}

function eventTime(moment: ImportantMoment): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: moment.timeZone,
  }).format(new Date(moment.startsAt))
}

export function NextImportantMomentCard({ moment, now }: Props) {
  const remaining = formatRemainingDuration(moment.startsAt, now)
  if (!remaining) return null
  return (
    <section className="home-card important-moment-card" aria-labelledby="important-moment-title">
      <p className="home-card-label">Next important moment</p>
      <h2 id="important-moment-title">
        <Link to={`/trip#${moment.dayId}`}>{moment.title}</Link>
      </h2>
      <p className="important-moment-when">
        {dateLabel(moment, now)} at <time dateTime={moment.startsAt}>{eventTime(moment)}</time>
      </p>
      <p className="important-moment-countdown" aria-live="polite">{remaining}</p>
      {moment.location ? <p className="important-moment-location">{moment.location}</p> : null}
      {moment.note ? <p className="important-moment-note">{moment.note}</p> : null}
      {moment.meal ? <MealMenuActions {...moment.meal} /> : null}
    </section>
  )
}
