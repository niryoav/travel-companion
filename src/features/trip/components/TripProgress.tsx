import type { TripProgressViewModel } from '../tripTypes'

interface TripProgressProps {
  progress: TripProgressViewModel
}

export function TripProgress({ progress }: TripProgressProps) {
  return (
    <section
      className="trip-progress"
      aria-labelledby="trip-progress-title"
    >
      <div>
        <p className="trip-card-label">Journey progress</p>
        <h2 id="trip-progress-title">{progress.label}</h2>
        <p>{progress.detail}</p>
      </div>
      <div
        className="trip-progress-track"
        role="progressbar"
        aria-label="Completed travel days"
        aria-valuemin={0}
        aria-valuemax={progress.totalDays}
        aria-valuenow={progress.completedDays}
        aria-valuetext={progress.detail}
      >
        <span style={{ width: `${progress.percentage}%` }} />
      </div>
    </section>
  )
}
