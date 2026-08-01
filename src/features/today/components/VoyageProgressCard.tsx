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
      className="today-card today-voyage-progress"
      aria-labelledby={titleId}
    >
      <p className="today-card-label" id={titleId}>
        Voyage progress
      </p>
      <img
        alt={`Voyage progress map for day ${voyageProgress.dayNumber}`}
        className="today-voyage-progress-image"
        src={voyageProgress.imagePath}
        onError={() => setImageFailed(true)}
      />
      <p className="today-voyage-progress-detail">
        Today: {voyageProgress.currentPort}
      </p>
      {voyageProgress.nextPort ? (
        <p className="today-voyage-progress-detail">
          Next: {voyageProgress.nextPort}
        </p>
      ) : null}
    </section>
  )
}
