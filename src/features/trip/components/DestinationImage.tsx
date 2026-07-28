import { useState } from 'react'

import type { TripDestinationViewModel } from '../tripTypes'

interface DestinationImageProps {
  image: NonNullable<TripDestinationViewModel['image']>
}
export function DestinationImage({ image }: DestinationImageProps) {
  const [unavailable, setUnavailable] = useState(false)

  if (unavailable) {
    return (
      <p className="trip-image-unavailable">
        Destination image unavailable. The guide remains available below.
      </p>
    )
  }

  return (
    <figure
      className="trip-destination-image"
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      <img
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading="lazy"
        onError={() => setUnavailable(true)}
      />
      {image.credit ? <figcaption>{image.credit}</figcaption> : null}
    </figure>
  )
}
