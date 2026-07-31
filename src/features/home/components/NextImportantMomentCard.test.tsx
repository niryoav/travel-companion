import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import type { ImportantMoment } from '../nextImportantMoment'
import { NextImportantMomentCard } from './NextImportantMomentCard'

const now = new Date('2030-05-11T12:00:00Z')

function moment(overrides: Partial<ImportantMoment> = {}): ImportantMoment {
  return {
    id: 'dinner',
    dayId: 'day-2030-05-11',
    kind: 'MEAL',
    title: 'Polo Grill',
    startsAt: '2030-05-11T18:30:00Z',
    timeZone: 'UTC',
    ...overrides,
  }
}

describe('NextImportantMomentCard deck label', () => {
  it('shows the restaurant name with its deck next to it', () => {
    render(
      <MemoryRouter>
        <NextImportantMomentCard moment={moment({ deck: 14 })} now={now} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Polo Grill · Deck 14' }),
    ).toBeInTheDocument()
  })

  it('shows only the name when no deck is known', () => {
    render(
      <MemoryRouter>
        <NextImportantMomentCard moment={moment()} now={now} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Polo Grill' }),
    ).toBeInTheDocument()
  })
})
