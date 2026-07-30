import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hasActiveTripEditSession,
  TripSyncRefreshController,
} from './TripSyncRefreshController'

describe('TripSyncRefreshController', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })

  afterEach(() => {
    document
      .querySelectorAll('[data-test-trip-edit]')
      .forEach((element) => element.remove())
  })

  it('refreshes when a visible document becomes active', async () => {
    const refreshFromRemote = vi.fn(async () => {})
    const controller = new TripSyncRefreshController({
      canRefresh: () => true,
      refreshFromRemote,
    })
    controller.start()

    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() =>
      expect(refreshFromRemote).toHaveBeenCalledTimes(1),
    )

    controller.dispose()
  })

  it('deduplicates concurrent events and throttles repeated refreshes', async () => {
    let finishRefresh: (() => void) | undefined
    let now = 10_000
    const refreshFromRemote = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRefresh = resolve
        }),
    )
    const controller = new TripSyncRefreshController({
      canRefresh: () => true,
      now: () => now,
      refreshFromRemote,
      throttleMs: 5_000,
    })
    controller.start()

    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(refreshFromRemote).toHaveBeenCalledTimes(1)

    finishRefresh?.()
    await Promise.resolve()
    now += 4_999
    window.dispatchEvent(new Event('focus'))
    expect(refreshFromRemote).toHaveBeenCalledTimes(1)

    now += 1
    window.dispatchEvent(new Event('focus'))
    expect(refreshFromRemote).toHaveBeenCalledTimes(2)

    controller.dispose()
  })

  it('does not refresh while local changes are protected', () => {
    const refreshFromRemote = vi.fn(async () => {})
    const controller = new TripSyncRefreshController({
      canRefresh: () => false,
      refreshFromRemote,
    })
    controller.start()

    window.dispatchEvent(new Event('focus'))

    expect(refreshFromRemote).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('recognizes an active edit dialog and resumes after it closes', async () => {
    const dialog = document.createElement('div')
    dialog.dataset.testTripEdit = 'true'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    document.body.append(dialog)

    const refreshFromRemote = vi.fn(async () => {})
    const controller = new TripSyncRefreshController({
      canRefresh: () => !hasActiveTripEditSession(),
      refreshFromRemote,
    })
    controller.start()

    window.dispatchEvent(new Event('focus'))
    expect(refreshFromRemote).not.toHaveBeenCalled()

    dialog.remove()
    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() =>
      expect(refreshFromRemote).toHaveBeenCalledTimes(1),
    )

    controller.dispose()
  })
})
