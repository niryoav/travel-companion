import type { TripHeaderViewModel } from '../tripTypes'

interface TripHeaderProps {
  header: TripHeaderViewModel
}

export function TripHeader({ header }: TripHeaderProps) {
  return (
    <header className="trip-header">
      <p className="trip-eyebrow">Full journey</p>
      <h1>{header.title}</h1>
      <p className="trip-date-range">{header.dateRange}</p>
      {header.cruiseContext ? (
        <p className="trip-cruise-context">{header.cruiseContext}</p>
      ) : null}
    </header>
  )
}
