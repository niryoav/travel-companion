import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it.each([
    ['neutral', 'UI preview'],
    ['positive', 'Available offline'],
    ['attention', 'Needs attention'],
  ] as const)('renders the %s tone with a text label', (tone, label) => {
    render(<StatusBadge label={label} tone={tone} />)

    expect(screen.getByText(label)).toHaveClass(`status-badge-${tone}`)
  })
})
