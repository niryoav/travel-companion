interface TripEmptyStateProps {
  message: string
}

export function TripEmptyState({ message }: TripEmptyStateProps) {
  return (
    <section className="trip-empty" aria-labelledby="trip-empty-title">
      <p className="trip-card-label">Full journey</p>
      <h2 id="trip-empty-title">No itinerary available</h2>
      <p>{message}</p>
    </section>
  )
}
