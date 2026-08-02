import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { VoyageProgressViewModel } from '../../../domain/trip/selectors/selectVoyageProgress'
import { VoyageProgressCard } from './VoyageProgressCard'

const voyageProgress: VoyageProgressViewModel = {
  dayNumber: 4,
  totalDays: 14,
  imagePath: '/images/voyage-progress/voyage-day-04.png',
  currentPort: 'Húsavík',
  nextPort: 'Djúpivogur',
}

describe('VoyageProgressCard', () => {
  it('shows the title, day count, image, and current and next port', () => {
    render(<VoyageProgressCard voyageProgress={voyageProgress} />)

    expect(screen.getByText('Journey progress')).toBeInTheDocument()
    expect(screen.getByText('Journey day 4 of 14')).toBeInTheDocument()
    const image = screen.getByRole('img', {
      name: 'Voyage progress map for day 4',
    })
    expect(image).toHaveAttribute(
      'src',
      '/images/voyage-progress/voyage-day-04.png',
    )
    expect(screen.getByText('Today: Húsavík')).toBeInTheDocument()
    expect(screen.getByText('Next: Djúpivogur')).toBeInTheDocument()
  })

  it('shows Journey day 14 of 14 and omits the next-port line on the final day of the trip', () => {
    render(
      <VoyageProgressCard
        voyageProgress={{
          ...voyageProgress,
          dayNumber: 14,
          nextPort: undefined,
        }}
      />,
    )

    expect(screen.getByText('Journey day 14 of 14')).toBeInTheDocument()
    expect(screen.getByText('Today: Húsavík')).toBeInTheDocument()
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument()
  })

  it('hides the whole card if the image fails to load', () => {
    render(<VoyageProgressCard voyageProgress={voyageProgress} />)

    const image = screen.getByRole('img', {
      name: 'Voyage progress map for day 4',
    })
    fireEvent.error(image)

    expect(screen.queryByText('Journey progress')).not.toBeInTheDocument()
  })
})
