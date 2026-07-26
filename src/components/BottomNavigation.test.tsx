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
  })
})
