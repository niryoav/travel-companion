import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PortAccessIndicator } from './PortAccessIndicator'

describe('PortAccessIndicator', () => {
  it.each([
    ['DOCKED', 'Docked'],
    ['TENDER_REQUIRED', 'Tender required'],
    ['TO_BE_CONFIRMED', 'Port access to be confirmed'],
  ] as const)('pairs the %s cue with its visible label', (status, label) => {
    const { container } = render(
      <PortAccessIndicator status={status} />,
    )

    expect(screen.getByText(label)).toBeVisible()
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })
})
