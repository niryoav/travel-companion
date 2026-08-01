import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { deckPlans } from './deckPlans'
import { DeckPlansScreen } from './DeckPlansScreen'

describe('DeckPlansScreen', () => {
  it('lists every deck plan highest to lowest, each opening its own PDF', () => {
    render(
      <MemoryRouter initialEntries={['/documents/deckplans']}>
        <DeckPlansScreen />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Deck plans' }),
    ).toBeInTheDocument()

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map(({ textContent }) => textContent)
    expect(headings).toEqual(deckPlans.map(({ label }) => label))

    const deck14Link = screen.getByRole('link', {
      name: 'Open Deck 14 plan',
    })
    expect(deck14Link).toHaveAttribute(
      'href',
      '/documents/deckplans/marina-deck-plan-level-14.pdf',
    )
    expect(deck14Link).toHaveAttribute('target', '_blank')
    expect(deck14Link).toHaveAttribute('rel', 'noreferrer')

    expect(
      screen.getByRole('link', { name: 'Back to Documents' }),
    ).toHaveAttribute('href', '/documents')
  })
})
