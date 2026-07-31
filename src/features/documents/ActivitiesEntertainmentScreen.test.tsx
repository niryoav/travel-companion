import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { ActivitiesEntertainmentScreen } from './ActivitiesEntertainmentScreen'

describe('ActivitiesEntertainmentScreen', () => {
  it('lists every activity location with its deck, in alphabetical order', () => {
    render(
      <MemoryRouter initialEntries={['/documents/activities']}>
        <ActivitiesEntertainmentScreen />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Activities & entertainment',
      }),
    ).toBeInTheDocument()

    const cards = screen.getAllByText(/^Deck \d+$/).map(
      (node) => node.closest('li')?.querySelector('span')?.textContent,
    )
    expect(cards).toEqual([
      'Aquamar Spa & Vitality',
      'Artist Loft',
      'Casino & Casino Bar',
      'Culinary Center',
      'Fitness Track & Sport',
      'Horizons',
      'Library',
      'Lounge',
      'Marina Lounge',
      'Martinis',
      'Pool Deck',
      'Sports Deck',
    ])

    expect(screen.getAllByText('Deck 14', { selector: 'span' }).length)
      .toBeGreaterThan(0)
    expect(
      screen.getByText(
        'Roulette, blackjack, poker and slot machines',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to Documents' }),
    ).toHaveAttribute('href', '/documents')
  })
})
