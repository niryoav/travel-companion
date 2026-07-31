import type { TripDayViewModel } from '../tripTypes'
import { TripDayCard } from './TripDayCard'

interface TripDayListProps {
  days: TripDayViewModel[]
  onAddMoment?: (dayId: string) => void
  onEditDinner?: (eventId: string) => void
  onEditDay?: (dayId: string) => void
}

export function TripDayList({
  days,
  onAddMoment,
  onEditDinner,
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
              day={day}
              onAddMoment={onAddMoment}
              onEditDinner={onEditDinner}
              onEdit={onEditDay}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
