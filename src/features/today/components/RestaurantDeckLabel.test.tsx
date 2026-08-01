import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { TodayEventViewModel } from '../todayTypes'
import { NextEventCard } from './NextEventCard'
import { TimelineEvent } from './TimelineEvent'

function event(overrides: Partial<TodayEventViewModel> = {}): TodayEventViewModel {
  return {
    id: 'dinner',
    kindLabel: 'Dinner',
    title: 'Polo Grill',
    state: 'UPCOMING',
    stateLabel: 'Later',
    time: '19:30',
    startsAt: '2026-08-31T19:30:00Z',
    hasRelatedDocuments: false,
    ...overrides,
  }
}

describe('restaurant deck label on Today cards', () => {
  it('shows the deck next to the restaurant name in the timeline', () => {
    render(
      <ol><TimelineEvent event={event({ deck: 14 })} /></ol>,
    )

    expect(
      screen.getByRole('heading', { name: 'Polo Grill · Deck 14' }),
    ).toBeInTheDocument()
  })

  it('shows the deck next to the restaurant name on the next-event card', () => {
    render(<NextEventCard event={event({ deck: 14 })} />)

    expect(
      screen.getByRole('heading', { name: 'Polo Grill · Deck 14' }),
    ).toBeInTheDocument()
  })

  it('omits the deck label when no deck is known', () => {
    render(
      <ol><TimelineEvent event={event({ deck: undefined })} /></ol>,
    )

    expect(
      screen.getByRole('heading', { name: 'Polo Grill' }),
    ).toBeInTheDocument()
  })
})
