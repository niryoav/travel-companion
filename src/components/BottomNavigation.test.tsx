import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { primaryNavigation } from '../app/navigation/primaryNavigation'
import { BottomNavigation } from './BottomNavigation'

describe('BottomNavigation', () => {
  it('marks the matching destination as the current page', () => {
    render(
      <MemoryRouter initialEntries={['/trip']}>
        <BottomNavigation items={primaryNavigation} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Trip' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getAllByRole('link')).toHaveLength(5)
    expect(screen.queryByRole('link', { name: 'Ship' })).not.toBeInTheDocument()
  })

  it('preserves a shared simulation selection without changing destinations', () => {
    render(
      <MemoryRouter initialEntries={['/home?simulation=sea-day']}>
        <BottomNavigation
          items={primaryNavigation}
          preservedSearch="?simulation=sea-day"
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/home?simulation=sea-day',
    )
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute(
      'href',
      '/today?simulation=sea-day',
    )
    expect(screen.getAllByRole('link')).toHaveLength(5)
    expect(screen.queryByRole('link', { name: 'Ship' })).not.toBeInTheDocument()
  })
})
