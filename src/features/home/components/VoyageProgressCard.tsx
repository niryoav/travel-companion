import { useId, useState } from 'react'

import type { VoyageProgressViewModel } from '../../../domain/trip/selectors/selectVoyageProgress'

interface VoyageProgressCardProps {
  voyageProgress: VoyageProgressViewModel
}

export function VoyageProgressCard({
  voyageProgress,
}: VoyageProgressCardProps) {
  const titleId = useId()
  const [imageFailed, setImageFailed] = useState(false)

  if (imageFailed) {
    return null
  }

  return (
    <section
      className="home-card voyage-progress-card"
      aria-labelledby={titleId}
    >
      <p className="home-card-label" id={titleId}>
        Journey progress
      </p>
      <p className="voyage-progress-day-count">
        Journey day {voyageProgress.dayNumber} of {voyageProgress.totalDays}
      </p>
      <img
        alt={`Voyage progress map for day ${voyageProgress.dayNumber}`}
        className="voyage-progress-image"
        src={voyageProgress.imagePath}
        onError={() => setImageFailed(true)}
      />
      <p className="voyage-progress-detail">
        Today: {voyageProgress.currentPort}
      </p>
      {voyageProgress.nextPort ? (
        <p className="voyage-progress-detail">
          Next: {voyageProgress.nextPort}
        </p>
      ) : null}
    </section>
  )
}
