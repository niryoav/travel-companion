interface TodayEmptyStateProps {
  message: string
}

export function TodayEmptyState({ message }: TodayEmptyStateProps) {
  return (
    <section className="today-card today-empty" aria-labelledby="today-empty-title">
      <p className="today-card-label">Today’s plan</p>
      <h2 id="today-empty-title">A calm day</h2>
      <p>{message}</p>
    </section>
  )
}

