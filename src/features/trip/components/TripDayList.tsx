import type { TripDayViewModel } from '../tripTypes'
import { TripDayCard } from './TripDayCard'

interface TripDayListProps {
  canAddMoment?: (dayId: string) => boolean
  days: TripDayViewModel[]
  onAddMoment?: (dayId: string) => void
  onEditMoment?: (eventId: string) => void
  onEditDay?: (dayId: string) => void
}

export function TripDayList({
  canAddMoment,
  days,
  onAddMoment,
  onEditMoment,
  onEditDay,
}: TripDayListProps) {
  return (
    <section aria-labelledby="trip-days-title">
      <div className="trip-list-heading">
        <p className="trip-card-label">Day by day</p>
        <h2 id="trip-days-title">Your journey</h2>
      </div>
      <ol className="trip-day-list">
        {days.map((day) => (
          <li key={day.id}>
            <TripDayCard
              canAddMoment={canAddMoment}
              day={day}
              onAddMoment={onAddMoment}
              onEditMoment={onEditMoment}
              onEdit={onEditDay}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
