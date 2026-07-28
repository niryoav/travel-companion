import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApplicationErrorBoundary } from './ApplicationErrorBoundary'
import { RouteErrorBoundary } from './RouteErrorBoundary'

function BrokenScreen(): never {
  throw new Error('Fictional render failure')
}

describe('error boundaries', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a root recovery action when application rendering fails', () => {
    const retry = vi.fn()

    render(
      <ApplicationErrorBoundary onRetry={retry}>
        <BrokenScreen />
      </ApplicationErrorBoundary>,
    )

    expect(
      screen.getByRole('heading', { name: 'The app could not start' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('keeps route recovery navigation available after a screen failure', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <BrokenScreen />
        </RouteErrorBoundary>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'This screen could not be displayed',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to Home' })).toHaveAttribute(
      'href',
      '/home',
    )
  })
})
