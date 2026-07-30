import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PwaUpdateManager } from '../../pwa/PwaUpdateManager'
import { PwaStatusCard } from './PwaStatusCard'

describe('PwaStatusCard', () => {
  it('renders an accessible unavailable state without a misleading action', () => {
    render(<PwaStatusCard manager={new PwaUpdateManager(false)} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Browser-managed updates',
    )
    expect(screen.getByText('Offline status could not be verified')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Updates are managed automatically. No action is required unless an update is offered here.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers one explicit update action when a worker is waiting', () => {
    const manager = new PwaUpdateManager(true)
    const applyUpdate = vi.fn().mockResolvedValue(undefined)
    manager.attachApplyUpdate(applyUpdate)
    manager.updateAvailable()
    const { rerender } = render(<PwaStatusCard manager={manager} />)

    expect(screen.getByRole('status')).toHaveTextContent('Update available')
    expect(screen.getByRole('status')).toHaveTextContent(
      'The page will reload afterward.',
    )
    expect(screen.getByRole('status')).not.toHaveTextContent('reopen')
    rerender(<PwaStatusCard manager={manager} />)
    expect(screen.getAllByRole('button', { name: 'Update now' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))

    expect(applyUpdate).toHaveBeenCalledWith(true)
  })

  it('labels the software control explicitly as an app update', () => {
    const manager = new PwaUpdateManager(true)
    manager.registered(
      { update: vi.fn(async () => {}) } as unknown as ServiceWorkerRegistration,
      true,
    )
    render(<PwaStatusCard manager={manager} />)

    expect(screen.getByText('App update')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Check for app update' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Check for update' }),
    ).not.toBeInTheDocument()
  })
})
